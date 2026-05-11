package api

import (
	"io"
	"sublink/services/sse"

	"github.com/gin-gonic/gin"
)

// StreamSSE 处理服务端事件流连接。
func StreamSSE(c *gin.Context) {
	broker := sse.GetSSEBroker()

	clientChan := make(chan []byte, 50)
	broker.AddClient(clientChan)

	defer func() {
		broker.RemoveClient(clientChan)
		func() {
			defer func() {
				_ = recover()
			}()
			close(clientChan)
		}()
	}()

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Transfer-Encoding", "chunked")
	c.Writer.Flush()

	c.Stream(func(w io.Writer) bool {
		if msg, ok := <-clientChan; ok {
			_, _ = c.Writer.Write(msg)
			c.Writer.Flush()
			return true
		}
		return false
	})
}
