package unlock

import (
	"net/http"
	"testing"

	"sublink/models"
)

func TestEvaluateClaudeUnlockProbe(t *testing.T) {
	runtime := UnlockRuntime{LandingCountry: "US"}
	tests := []struct {
		name       string
		resp       *unlockHTTPResponse
		wantStatus string
		wantReason string
		wantDetail string
	}{
		{name: "available final URL", resp: unlockTestResponse(http.StatusOK, "https://claude.ai/", ""), wantStatus: models.UnlockStatusAvailable},
		{name: "unavailable redirect", resp: unlockTestResponse(http.StatusOK, "https://www.anthropic.com/app-unavailable-in-region", ""), wantStatus: models.UnlockStatusRestricted, wantReason: "app_unavailable_in_region"},
		{name: "unexpected success URL", resp: unlockTestResponse(http.StatusOK, "https://example.com/", ""), wantStatus: models.UnlockStatusUnknown, wantReason: "unexpected_final_url", wantDetail: "https://example.com/"},
		{name: "forbidden", resp: unlockTestResponse(http.StatusForbidden, "https://claude.ai/blocked", ""), wantStatus: models.UnlockStatusRestricted, wantReason: "status_403"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := evaluateClaudeUnlockProbe(runtime, tt.resp)
			assertUnlockResult(t, result, models.UnlockProviderClaude, tt.wantStatus, runtime.LandingCountry, tt.wantReason, tt.wantDetail)
		})
	}
}
