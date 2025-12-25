package middleware

import (
	"log"
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
	
	// Trim and split origins
	allowedOrigins := strings.Split(allowedOriginsEnv, ",")
	for i := range allowedOrigins {
		allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
	}
	
	// Log CORS configuration at startup
	log.Printf("[CORS] Configuration loaded - Allowed origins: %v", allowedOrigins)

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
		
		// Log CORS decision for debugging (only for non-empty origins)
		if origin != "" {
			if gin.Mode() == gin.DebugMode {
				if isAllowed {
					log.Printf("[CORS] ✓ Allowed: %s → %s %s", origin, c.Request.Method, c.Request.URL.Path)
				} else {
					log.Printf("[CORS] ✗ Blocked: %s → %s %s", origin, c.Request.Method, c.Request.URL.Path)
				}
			}
		}

		// Always set CORS headers for allowed origins (even for non-preflight requests)
		if isAllowed {
			if allowAllOrigins {
				// When allowing all origins with *, cannot use credentials
				c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			} else {
				// Specific origin - reflect it back and allow credentials
				c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
				c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			}
		}

		// Set Vary header to indicate that response varies based on Origin
		c.Writer.Header().Set("Vary", "Origin")

		// Set allowed methods
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")

		// Handle Access-Control-Request-Headers
		// Reflect whatever headers the client wants to send
		requestHeaders := c.Request.Header.Get("Access-Control-Request-Headers")
		if requestHeaders != "" {
			c.Writer.Header().Set("Access-Control-Allow-Headers", requestHeaders)
		} else {
			// Default headers if none specified
			c.Writer.Header().Set("Access-Control-Allow-Headers", 
				"Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, "+
				"Accept, Origin, Cache-Control, X-Requested-With, X-Request-Time, X-Client-Timezone")
		}

		// Set max age for preflight cache (24 hours)
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		// Handle preflight OPTIONS request
		if c.Request.Method == "OPTIONS" {
			if isAllowed {
				c.AbortWithStatus(204)
			} else {
				c.AbortWithStatus(403)
			}
			return
		}

		// If origin is not allowed, continue but without CORS headers
		// The browser will block the response
		c.Next()
	}
}
