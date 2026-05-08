package unlock

import (
	"net/http"
	"testing"

	"sublink/models"
)

func TestEvaluateNetflixUnlockProbe(t *testing.T) {
	tests := []struct {
		name       string
		primary    *unlockHTTPResponse
		fallback   *unlockHTTPResponse
		wantStatus string
		wantRegion string
		wantReason string
		wantDetail string
	}{
		{name: "available", primary: unlockTestResponse(http.StatusOK, "https://www.netflix.com/us/title/81280792", `{"id":"US","countryName":"United States"}`), fallback: unlockTestResponse(http.StatusOK, "", "Oh no!"), wantStatus: models.UnlockStatusAvailable, wantRegion: "US"},
		{name: "originals only", primary: unlockTestResponse(http.StatusOK, "", "Oh no!"), fallback: unlockTestResponse(http.StatusOK, "", "Oh no!"), wantStatus: models.UnlockStatusPartial, wantDetail: "originals_only"},
		{name: "nsez restricted", primary: unlockTestResponse(http.StatusOK, "https://www.netflix.com/nsez-403", ""), fallback: unlockTestResponse(http.StatusOK, "", ""), wantStatus: models.UnlockStatusRestricted, wantReason: "nsez_403"},
		{name: "http restricted", primary: unlockTestResponse(http.StatusForbidden, "", ""), fallback: unlockTestResponse(http.StatusOK, "", ""), wantStatus: models.UnlockStatusRestricted, wantReason: "status_403_200"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := evaluateNetflixUnlockProbe(tt.primary, tt.fallback)
			assertUnlockResult(t, result, models.UnlockProviderNetflix, tt.wantStatus, tt.wantRegion, tt.wantReason, tt.wantDetail)
		})
	}
}
