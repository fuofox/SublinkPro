package api

import (
	"strings"
	"sublink/services/cloudflared"
	"sublink/utils"

	"github.com/gin-gonic/gin"
)

func requireSessionAuthForCloudflared(c *gin.Context) bool {
	if strings.TrimSpace(c.GetHeader("X-API-Key")) == "" {
		return true
	}
	utils.Forbidden(c, "Cloudflare Tunnel 设置仅支持登录会话访问")
	return false
}

// GetCloudflaredStatus 获取 Cloudflare Tunnel 配置和运行状态。
func GetCloudflaredStatus(c *gin.Context) {
	if !requireSessionAuthForCloudflared(c) {
		return
	}
	utils.OkDetailed(c, "获取 Cloudflare Tunnel 状态成功", cloudflared.DefaultManager().Status())
}

// UpdateCloudflaredConfig 保存 Cloudflare Tunnel 基础配置。
func UpdateCloudflaredConfig(c *gin.Context) {
	if !requireSessionAuthForCloudflared(c) {
		return
	}

	var req struct {
		Enabled bool   `json:"enabled"`
		Token   string `json:"token"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.FailWithMsg(c, "参数错误: "+err.Error())
		return
	}
	if strings.TrimSpace(req.Token) != "" {
		if err := cloudflared.SaveToken(req.Token); err != nil {
			utils.FailWithMsg(c, "保存 token 失败: "+err.Error())
			return
		}
	}
	if err := cloudflared.SaveEnabled(req.Enabled); err != nil {
		utils.FailWithMsg(c, "保存配置失败: "+err.Error())
		return
	}
	utils.OkDetailed(c, "保存 Cloudflare Tunnel 配置成功", cloudflared.DefaultManager().Status())
}

// StartCloudflared 启动 cloudflared 子进程。
func StartCloudflared(c *gin.Context) {
	if !requireSessionAuthForCloudflared(c) {
		return
	}

	var req struct {
		Token string `json:"token"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.FailWithMsg(c, "参数错误: "+err.Error())
		return
	}
	if err := cloudflared.DefaultManager().Start(req.Token); err != nil {
		utils.FailWithMsg(c, "启动 cloudflared 失败: "+err.Error())
		return
	}
	utils.OkDetailed(c, "cloudflared 已启动", cloudflared.DefaultManager().Status())
}

// StopCloudflared 停止 cloudflared 子进程并关闭自动启动。
func StopCloudflared(c *gin.Context) {
	if !requireSessionAuthForCloudflared(c) {
		return
	}
	if err := cloudflared.DefaultManager().Stop(); err != nil {
		utils.FailWithMsg(c, "停止 cloudflared 失败: "+err.Error())
		return
	}
	utils.OkDetailed(c, "cloudflared 已停止", cloudflared.DefaultManager().Status())
}

// RemoveCloudflaredToken 清空 Cloudflare Tunnel token。
func RemoveCloudflaredToken(c *gin.Context) {
	if !requireSessionAuthForCloudflared(c) {
		return
	}
	if err := cloudflared.DefaultManager().Stop(); err != nil {
		utils.FailWithMsg(c, "停止 cloudflared 失败: "+err.Error())
		return
	}
	if err := cloudflared.ClearToken(); err != nil {
		utils.FailWithMsg(c, "清除 token 失败: "+err.Error())
		return
	}
	utils.OkDetailed(c, "Cloudflare Tunnel token 已清除", cloudflared.DefaultManager().Status())
}
