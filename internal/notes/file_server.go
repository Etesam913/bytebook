package notes

import (
	"log"
	"net/http"
)

var PORT = ":5890"

// CORSResponseWriter wraps http.ResponseWriter to modify headers after the handler writes them
type CORSResponseWriter struct {
	http.ResponseWriter
}

func corsMiddleware(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Handle preflight OPTIONS request
		if r.Method == "OPTIONS" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Range, X-Playback-Session-Id")
			w.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Range")
			w.WriteHeader(http.StatusOK)
			return
		}

		// Wrap the ResponseWriter
		cw := &CORSResponseWriter{ResponseWriter: w}
		handler.ServeHTTP(cw, r)
	})
}

func LaunchFileServer(projectPath string) {
	mux := http.NewServeMux()
	// Create a file server handler
	fileServer := http.FileServer(http.Dir(projectPath))
	wrappedFileServer := corsMiddleware(fileServer)
	// Serve files from the root URL
	mux.Handle("/", wrappedFileServer)

	// Specify the port to listen on

	log.Printf("Serving files on http://localhost%s/", PORT)

	// Start the HTTP server
	err := http.ListenAndServe(PORT, mux)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
