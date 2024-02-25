package file_server

import (
	"log"
	"net/http"
)

// corsMiddleware wraps an http.Handler and sets CORS headers
func corsMiddleware(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*") // Adjust this to allow specific domains
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		// Handle preflight OPTIONS request
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Serve the next handler
		handler.ServeHTTP(w, r)
	})
}

func LaunchFileServer(projectPath string) {
	// Create a file server handler
	fileServer := http.FileServer(http.Dir(projectPath))
	wrappedFileServer := corsMiddleware(fileServer)
	// Serve files from the root URL
	http.Handle("/", wrappedFileServer)

	// Specify the port to listen on
	port := ":5890"
	log.Printf("Serving files on http://localhost%s/", port)

	// Start the HTTP server
	err := http.ListenAndServe(port, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
