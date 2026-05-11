package node

import (
	"reflect"
	"strings"
	"sublink/models"
	"sublink/node/protocol"
	"testing"

	"gopkg.in/yaml.v3"
)

func TestGenerateProxyLinkReconstructsDNSStyleECH(t *testing.T) {
	proxy := protocol.Proxy{
		Name:       "导入节点-ECH-DNS",
		Type:       "vless",
		Server:     "example.com",
		Port:       443,
		Uuid:       "12345678-1234-1234-1234-123456789abc",
		Network:    "ws",
		Tls:        true,
		Servername: "example.com",
		ECH_opts: map[string]any{
			"enable":            true,
			"query-server-name": "encryptedsni.com",
		},
	}

	link := GenerateProxyLink(proxy)
	if link == "" {
		t.Fatal("生成链接失败")
	}

	if !strings.Contains(link, "ech=encryptedsni.com%2Bhttps%3A%2F%2Fdns.alidns.com%2Fdns-query") {
		t.Fatalf("ImportedECH 应包含重建后的 DNS ECH, 实际: %s", link)
	}
	decoded, err := protocol.DecodeVLESSURL(link)
	if err != nil {
		t.Fatalf("解码失败: %v", err)
	}
	if decoded.Query.Ech != "encryptedsni.com+https://dns.alidns.com/dns-query" {
		t.Fatalf("RestoredECH 不匹配: 期望 %s, 实际 %s", "encryptedsni.com+https://dns.alidns.com/dns-query", decoded.Query.Ech)
	}
}

func TestGenerateProxyLinkPreservesECHConfig(t *testing.T) {
	proxy := protocol.Proxy{
		Name:       "导入节点-ECH-Config",
		Type:       "vless",
		Server:     "example.com",
		Port:       443,
		Uuid:       "12345678-1234-1234-1234-123456789abc",
		Network:    "ws",
		Tls:        true,
		Servername: "example.com",
		ECH_opts: map[string]any{
			"enable": true,
			"config": "BASE64_ECH_CONFIG",
		},
	}

	link := GenerateProxyLink(proxy)
	if link == "" {
		t.Fatal("生成链接失败")
	}

	if !strings.Contains(link, "ech=BASE64_ECH_CONFIG") {
		t.Fatalf("ImportedECHConfig 应包含 config 形式 ECH, 实际: %s", link)
	}
}

func TestGenerateProxyLinkKeepsNonVLESSUnchanged(t *testing.T) {
	proxy := protocol.Proxy{
		Name:     "trojan-node",
		Type:     "trojan",
		Server:   "example.com",
		Port:     443,
		Password: "secret",
	}

	genericLink := GenerateProxyLink(proxy)
	reconstructedLink := GenerateProxyLink(proxy)
	if genericLink != reconstructedLink {
		t.Fatalf("NonVLESSLink 不匹配: 期望 %s, 实际 %s", genericLink, reconstructedLink)
	}
}

func TestGenerateProxyLinkDoesNotReconstructDisabledECH(t *testing.T) {
	proxy := protocol.Proxy{
		Name:       "导入节点-ECH-Disabled",
		Type:       "vless",
		Server:     "example.com",
		Port:       443,
		Uuid:       "12345678-1234-1234-1234-123456789abc",
		Network:    "ws",
		Tls:        true,
		Servername: "example.com",
		ECH_opts: map[string]any{
			"enable":            false,
			"query-server-name": "encryptedsni.com",
		},
	}

	link := GenerateProxyLink(proxy)
	if link == "" {
		t.Fatal("生成链接失败")
	}
	if strings.Contains(link, "ech=") {
		t.Fatalf("禁用 ECH 时不应重建顶层 ech, 实际: %s", link)
	}
}

func TestApplyAirportNodeNamePrefixAddsPrefixOnly(t *testing.T) {
	airport := &models.Airport{
		ID:               27,
		NodeNameUniquify: true,
	}
	proxys := []protocol.Proxy{{Name: "香港节点-01"}, {Name: "香港节点-02"}}

	result := applyAirportNodeNamePrefix(airport, proxys)
	got := []string{result[0].Name, result[1].Name}
	want := []string{"[A27]香港节点-01", "[A27]香港节点-02"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("前缀唯一化结果不匹配: got=%v want=%v", got, want)
	}
}

func TestApplyAirportNodeNamePrefixFallsBackForWhitespacePrefix(t *testing.T) {
	airport := &models.Airport{
		ID:               27,
		NodeNameUniquify: true,
		NodeNamePrefix:   "   ",
	}
	proxys := []protocol.Proxy{{Name: "香港节点-01"}}

	result := applyAirportNodeNamePrefix(airport, proxys)
	if result[0].Name != "[A27]香港节点-01" {
		t.Fatalf("空白前缀应回退到默认前缀，实际: %s", result[0].Name)
	}
}

func TestApplyAirportIntraNodeUniquifyNumbersDuplicateNamesWithinAirport(t *testing.T) {
	airport := &models.Airport{
		NodeNameIntraUniquify: true,
	}
	proxys := []protocol.Proxy{{Name: "[A27]香港节点-01"}, {Name: "[A27]香港节点-01"}, {Name: "[A27]新加坡节点-01"}, {Name: "[A27]香港节点-01"}}

	result := applyAirportIntraNodeUniquify(airport, proxys)
	got := []string{result[0].Name, result[1].Name, result[2].Name, result[3].Name}
	want := []string{"[A27]香港节点-01-1", "[A27]香港节点-01-2", "[A27]新加坡节点-01", "[A27]香港节点-01-3"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("机场内编号唯一化结果不匹配: got=%v want=%v", got, want)
	}
}

func TestApplyAirportIntraNodeUniquifyCanNumberWithoutPrefix(t *testing.T) {
	airport := &models.Airport{
		NodeNameIntraUniquify: true,
	}
	proxys := []protocol.Proxy{{Name: "香港节点-01"}, {Name: "香港节点-01"}, {Name: "日本节点-01"}}

	result := applyAirportIntraNodeUniquify(airport, proxys)
	got := []string{result[0].Name, result[1].Name, result[2].Name}
	want := []string{"香港节点-01-1", "香港节点-01-2", "日本节点-01"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("无前缀时机场内编号结果不匹配: got=%v want=%v", got, want)
	}
}

func TestGenerateProxyLinkRoundTripsMieruClashYAML(t *testing.T) {
	var config ClashConfig
	if err := yaml.Unmarshal([]byte(`proxies:
  - name: mieru-import
    type: mieru
    server: mieru.example.com
    port-range: 2090-2099
    transport: TCP
    username: user
    password: password
    multiplexing: MULTIPLEXING_LOW
    traffic-pattern: dGVzdA==
`), &config); err != nil {
		t.Fatalf("yaml unmarshal failed: %v", err)
	}
	if len(config.Proxies) != 1 {
		t.Fatalf("proxy count = %d, want 1", len(config.Proxies))
	}

	link := GenerateProxyLink(config.Proxies[0])
	if link == "" {
		t.Fatal("GenerateProxyLink returned empty link")
	}
	decoded, err := protocol.DecodeMieruURL(link)
	if err != nil {
		t.Fatalf("DecodeMieruURL failed: %v", err)
	}
	if decoded.PortRange != "2090-2099" {
		t.Fatalf("port range = %q, want 2090-2099", decoded.PortRange)
	}
	if decoded.Transport != "TCP" {
		t.Fatalf("transport = %q, want TCP", decoded.Transport)
	}
	if decoded.Multiplexing != "MULTIPLEXING_LOW" {
		t.Fatalf("multiplexing = %q, want MULTIPLEXING_LOW", decoded.Multiplexing)
	}
	if decoded.TrafficPattern != "dGVzdA==" {
		t.Fatalf("traffic pattern = %q, want dGVzdA==", decoded.TrafficPattern)
	}
}
