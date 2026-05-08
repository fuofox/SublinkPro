package unlock

import (
	"net/http"
	"testing"

	"sublink/models"
)

func TestEvaluateOpenAIUnlockProbe(t *testing.T) {
	runtime := UnlockRuntime{LandingCountry: "US"}
	tests := []struct {
		name       string
		compliance string
		ios        string
		wantStatus string
		wantReason string
		wantDetail string
	}{
		{name: "available", wantStatus: models.UnlockStatusAvailable},
		{name: "blocked both", compliance: "unsupported_country", ios: "VPN", wantStatus: models.UnlockStatusRestricted, wantReason: "unsupported_country"},
		{name: "web only", ios: "VPN", wantStatus: models.UnlockStatusPartial, wantDetail: "web_only"},
		{name: "mobile app only", compliance: "unsupported_country", wantStatus: models.UnlockStatusPartial, wantDetail: "mobile_app_only"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := evaluateOpenAIUnlockProbe(runtime, unlockTestResponse(http.StatusOK, "", tt.compliance), unlockTestResponse(http.StatusOK, "", tt.ios))
			assertUnlockResult(t, result, models.UnlockProviderOpenAI, tt.wantStatus, runtime.LandingCountry, tt.wantReason, tt.wantDetail)
		})
	}
}
