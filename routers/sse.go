package routers

import (
	"sublink/api"
	"sublink/middlewares"

	"github.com/gin-gonic/gin"
)

// SSE registers the Server-Sent Events route.
func SSE(r *gin.Engine) {
	r.GET("/api/sse", middlewares.AuthToken, api.StreamSSE)
}
