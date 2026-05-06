package node

import (
	"strings"
	"sublink/node/protocol"
	"testing"
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
		ECH_opts: map[string]interface{}{
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
		ECH_opts: map[string]interface{}{
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
		ECH_opts: map[string]interface{}{
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
