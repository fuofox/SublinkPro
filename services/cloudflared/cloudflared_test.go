package cloudflared

import "testing"

func TestNormalizeToken(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "plain token", input: "  abc.def.ghi  ", want: "abc.def.ghi"},
		{name: "service install command", input: "cloudflared service install eyJhIjoiabc", want: "eyJhIjoiabc"},
		{name: "windows service install command", input: "cloudflared.exe service install eyJhIjoiabc", want: "eyJhIjoiabc"},
		{
			name:  "multiple pasted install commands",
			input: "sudo cloudflared service install eyJhIjoiold brew install cloudflared && sudo cloudflared service install eyJhIjoinew cloudflared.exe service install eyJhIjoifinal",
			want:  "eyJhIjoifinal",
		},
		{name: "empty", input: "   ", want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := normalizeToken(tt.input); got != tt.want {
				t.Fatalf("normalizeToken() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestTruncateMessage(t *testing.T) {
	short := "cloudflared started"
	if got := truncateMessage(short); got != short {
		t.Fatalf("truncateMessage(short) = %q, want %q", got, short)
	}

	long := make([]byte, maxMessageLength+20)
	for i := range long {
		long[i] = 'a'
	}
	got := truncateMessage(string(long))
	if len(got) != maxMessageLength+3 {
		t.Fatalf("truncateMessage(long) length = %d, want %d", len(got), maxMessageLength+3)
	}
}

func TestRedactAssignment(t *testing.T) {
	input := "failed with TUNNEL_TOKEN=secret-token"
	got := redactAssignment(input, "TUNNEL_TOKEN=")
	want := "failed with TUNNEL_TOKEN=[REDACTED]"
	if got != want {
		t.Fatalf("redacted message = %q, want %q", got, want)
	}
}

func TestParseVersionOutput(t *testing.T) {
	tests := []struct {
		name   string
		output string
		want   string
	}{
		{name: "standard output", output: "cloudflared version 2026.5.0 (built 2026-05-01)\n", want: "2026.5.0"},
		{name: "full version line fallback", output: "cloudflared dev-build\nextra", want: "cloudflared dev-build"},
		{name: "empty", output: "  ", want: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := parseVersionOutput(tt.output); got != tt.want {
				t.Fatalf("parseVersionOutput() = %q, want %q", got, tt.want)
			}
		})
	}
}
