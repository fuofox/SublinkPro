package routers

import (
	"sublink/api"

	"github.com/gin-gonic/gin"
)

func Version(r *gin.Engine, version string) {
	r.GET("/api/v1/version", api.GetVersion(version))
}
