package unlock

import (
	"strings"
	"testing"

	"sublink/models"
)

func unlockTestResponse(status int, finalURL string, body string) *unlockHTTPResponse {
	return &unlockHTTPResponse{StatusCode: status, FinalURL: finalURL, Body: strings.ToLower(body), RawBody: body}
}

func assertUnlockResult(t *testing.T, result models.UnlockProviderResult, provider string, status string, region string, reason string, detail string) {
	t.Helper()
	if result.Provider != provider {
		t.Fatalf("provider = %q, want %q", result.Provider, provider)
	}
	if result.Status != status {
		t.Fatalf("status = %q, want %q", result.Status, status)
	}
	if result.Region != region {
		t.Fatalf("region = %q, want %q", result.Region, region)
	}
	if result.Reason != reason {
		t.Fatalf("reason = %q, want %q", result.Reason, reason)
	}
	if result.Detail != detail {
		t.Fatalf("detail = %q, want %q", result.Detail, detail)
	}
}
