package notes

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// LocalFileMiddleware creates middleware that serves local filesystem files
// for img/video tags. It intercepts requests to /notes/* paths and serves
// files from the project's notes directory.
func LocalFileMiddleware(projectPath string) application.Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Only handle GET/HEAD requests for file paths
			if r.Method != http.MethodGet && r.Method != http.MethodHead {
				next.ServeHTTP(w, r)
				return
			}

			// Check if this is a file request (starts with /notes/)
			path := r.URL.Path
			if relativePath, found := strings.CutPrefix(path, "/notes/"); found {
				fullPath, err := util.SafeJoin(filepath.Join(projectPath, "notes"), relativePath)
				if err != nil {
					http.Error(w, "Forbidden", http.StatusForbidden)
					return
				}

				// Check if file exists
				info, err := os.Stat(fullPath)
				if err != nil {
					if os.IsNotExist(err) {
						// File doesn't exist, let the next handler try
						next.ServeHTTP(w, r)
						return
					}
					log.Printf("Error accessing file: %v", err)
					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
					return
				}

				// Don't serve directories
				if info.IsDir() {
					next.ServeHTTP(w, r)
					return
				}

				// Set appropriate headers
				w.Header().Set("Content-Type", getContentType(fullPath))
				// Note: Content-Length will be set automatically by http.ServeFile

				// Handle range requests for video streaming
				if r.Header.Get("Range") != "" {
					serveRangeRequest(w, r, fullPath, info)
					return
				}

				// Serve the file
				http.ServeFile(w, r, fullPath)
				return
			}

			// Not a file request, pass to next handler
			next.ServeHTTP(w, r)
		})
	}
}

// getContentType determines the MIME type based on file extension
func getContentType(filePath string) string {
	ext := strings.ToLower(filepath.Ext(filePath))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".svg":
		return "image/svg+xml"
	case ".mp4":
		return "video/mp4"
	case ".webm":
		return "video/webm"
	case ".ogg":
		return "video/ogg"
	case ".mov":
		return "video/quicktime"
	case ".avi":
		return "video/x-msvideo"
	case ".pdf":
		return "application/pdf"
	default:
		return "application/octet-stream"
	}
}

// serveRangeRequest handles HTTP range requests for video streaming
func serveRangeRequest(w http.ResponseWriter, r *http.Request, filePath string, info os.FileInfo) {
	file, err := os.Open(filePath)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// Set headers for partial content support
	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Content-Type", getContentType(filePath))

	// Use http.ServeContent which handles range requests automatically
	http.ServeContent(w, r, filepath.Base(filePath), info.ModTime(), file)
}
