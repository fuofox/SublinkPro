package unlock

import (
	"net/http"
	"testing"

	"sublink/models"
)

func TestEvaluateYouTubePremiumUnlockProbe(t *testing.T) {
	runtime := UnlockRuntime{LandingCountry: "US"}
	tests := []struct {
		name       string
		body       string
		wantStatus string
		wantRegion string
		wantReason string
	}{
		{name: "cn redirect", body: "https://www.google.cn", wantStatus: models.UnlockStatusRestricted, wantRegion: "CN", wantReason: "google_cn"},
		{name: "not available", body: "Premium is not available in your country", wantStatus: models.UnlockStatusUnsupported, wantRegion: "US", wantReason: "unsupported_country"},
		{name: "available with region", body: `"INNERTUBE_CONTEXT_GL":"JP" ad-free`, wantStatus: models.UnlockStatusAvailable, wantRegion: "JP"},
		{name: "missing marker", body: `"INNERTUBE_CONTEXT_GL":"HK"`, wantStatus: models.UnlockStatusUnknown, wantRegion: "HK", wantReason: "page_marker_missing"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := evaluateYouTubePremiumUnlockProbe(runtime, unlockTestResponse(http.StatusOK, "https://www.youtube.com/premium", tt.body))
			assertUnlockResult(t, result, models.UnlockProviderYouTube, tt.wantStatus, tt.wantRegion, tt.wantReason, "")
		})
	}
}

func TestYouTubePremiumProbeBodyLimitCoversCurrentMarkerOffset(t *testing.T) {
	if youtubePremiumProbeBodyLimit < 768*1024 {
		t.Fatalf("youtubePremiumProbeBodyLimit = %d, want at least 768 KiB to cover observed ad-free marker offset", youtubePremiumProbeBodyLimit)
	}
}
