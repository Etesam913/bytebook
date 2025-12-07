package util

import (
	"net/http"
	"net/http/httptest"
	"path"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// SPAFallbackMiddleware rewrites 404s for extension-less paths to "/"
// (index.html) so deep links like "/notes/<folder>/<note>" still boot the app
// inside the packaged build.
//
// Flow:
//   - Only handles GET/HEAD; all other methods pass through unchanged.
//   - Runs the underlying asset handler in a recorder first.
//   - If the handler returned 404 AND the URL has no file extension
//     (indicating an SPA route, not a real asset like ".css" or ".js"),
//     it replays the request with path set to "/" so index.html is served.
//   - Otherwise, it forwards the original recorded response.
func SPAFallbackMiddleware() application.Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Only rewrite normal page requests
			if r.Method != http.MethodGet && r.Method != http.MethodHead {
				next.ServeHTTP(w, r)
				return
			}

			recorder := httptest.NewRecorder()
			next.ServeHTTP(recorder, r)

			isNotFound := recorder.Code == http.StatusNotFound
			isLikelyRoute := path.Ext(r.URL.Path) == ""

			if isNotFound && isLikelyRoute {
				// Retry against root to serve index.html
				clone := r.Clone(r.Context())
				clone.URL.Path = "/"
				next.ServeHTTP(w, clone)
				return
			}

			// Forward the original response
			for key, values := range recorder.Header() {
				for _, value := range values {
					w.Header().Add(key, value)
				}
			}
			w.WriteHeader(recorder.Code)
			_, _ = w.Write(recorder.Body.Bytes())
		})
	}
}
