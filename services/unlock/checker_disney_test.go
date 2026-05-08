package unlock

import (
	"net/http"
	"testing"

	"sublink/models"
)

func TestEvaluateDisneyUnlockProbe(t *testing.T) {
	device := unlockTestResponse(http.StatusOK, "", `{"assertion":"device-token"}`)
	token := unlockTestResponse(http.StatusOK, "", `{"refresh_token":"refresh-token"}`)
	tests := []struct {
		name       string
		device     *unlockHTTPResponse
		token      *unlockHTTPResponse
		graph      *unlockHTTPResponse
		preview    *unlockHTTPResponse
		wantStatus string
		wantRegion string
		wantReason string
		wantDetail string
	}{
		{name: "ip banned on device", device: unlockTestResponse(http.StatusForbidden, "", "403 ERROR"), wantStatus: models.UnlockStatusRestricted, wantReason: "ip_banned"},
		{name: "missing assertion", device: unlockTestResponse(http.StatusOK, "", "{}"), wantStatus: models.UnlockStatusUnknown, wantReason: "assertion_missing"},
		{name: "token forbidden location", device: device, token: unlockTestResponse(http.StatusForbidden, "", "forbidden-location"), wantStatus: models.UnlockStatusRestricted, wantReason: "ip_banned"},
		{name: "available jp", device: device, token: token, graph: unlockTestResponse(http.StatusOK, "", `{"countryCode":"JP","inSupportedLocation":false}`), preview: unlockTestResponse(http.StatusOK, "https://disneyplus.com/home", ""), wantStatus: models.UnlockStatusAvailable, wantRegion: "JP"},
		{name: "preview unavailable", device: device, token: token, graph: unlockTestResponse(http.StatusOK, "", `{"countryCode":"US","inSupportedLocation":true}`), preview: unlockTestResponse(http.StatusOK, "https://disneyplus.com/unavailable", ""), wantStatus: models.UnlockStatusRestricted, wantRegion: "US", wantReason: "preview_unavailable"},
		{name: "available soon", device: device, token: token, graph: unlockTestResponse(http.StatusOK, "", `{"countryCode":"KR","inSupportedLocation":false}`), preview: unlockTestResponse(http.StatusOK, "https://disneyplus.com/home", ""), wantStatus: models.UnlockStatusPartial, wantRegion: "KR", wantDetail: "available_soon"},
		{name: "available", device: device, token: token, graph: unlockTestResponse(http.StatusOK, "", `{"countryCode":"US","inSupportedLocation":true}`), preview: unlockTestResponse(http.StatusOK, "https://disneyplus.com/home", ""), wantStatus: models.UnlockStatusAvailable, wantRegion: "US"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := evaluateDisneyUnlockProbe(tt.device, tt.token, tt.graph, tt.preview)
			assertUnlockResult(t, result, models.UnlockProviderDisney, tt.wantStatus, tt.wantRegion, tt.wantReason, tt.wantDetail)
		})
	}
}
