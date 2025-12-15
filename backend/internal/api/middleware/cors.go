package middleware

import (
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORS middleware handles Cross-Origin Resource Sharing
func CORS() gin.HandlerFunc {
	// Get allowed origins from environment variable
	allowedOriginsEnv := os.Getenv("CORS_ALLOWED_ORIGINS")
	if allowedOriginsEnv == "" {
		// Default allowed origins for development
		allowedOriginsEnv = "http://localhost:3000,http://127.0.0.1:3000"
	}
	allowedOrigins := strings.Split(allowedOriginsEnv, ",")

	// Trim spaces from origins
	for i := range allowedOrigins {
		allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		
		// Check if the origin is allowed
		isAllowed := false
		allowAllOrigins := false
		
		for _, allowedOrigin := range allowedOrigins {
			if allowedOrigin == "*" {
				allowAllOrigins = true
				isAllowed = true
				break
			}
			if origin == allowedOrigin {
				isAllowed = true
				break
			}
		}

		// Set CORS headers if origin is allowed
		if isAllowed {
			if allowAllOrigins {
				// When allowing all origins, use "*" but cannot use credentials
				c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
				// Note: credentials cannot be used with wildcard origin
			} else {
				// Specific origin - can use credentials
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
				c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
				c.Writer.Header().Set("Vary", "Origin")
			}
		}

		// Reflect requested headers to satisfy modern browser client hints (sec-ch-ua*)
		reqHeaders := c.Request.Header.Get("Access-Control-Request-Headers")
		if reqHeaders == "" {
			reqHeaders = "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Accept, Origin, Cache-Control, X-Requested-With, Sec-CH-UA, Sec-CH-UA-Mobile, Sec-CH-UA-Platform"
		}
		c.Writer.Header().Set("Access-Control-Allow-Headers", reqHeaders)
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
