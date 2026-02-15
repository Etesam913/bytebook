package util

import (
	"net/http"
	"net/http/httptest"
	"path"
	"strings"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// SPAFallbackMiddleware rewrites 404s for extension-less paths to "/"
// (index.html) so deep links like "/notes/<folder>/<note>" still boot the app
// inside the packaged build.
//
// Flow:
//   - Only handles likely SPA navigation requests (GET/HEAD, extension-less
//     path, and an Accept header that wants HTML).
//   - Runs the underlying asset handler in a recorder first for those requests.
//   - If the handler returned 404, it replays the request with path set to "/"
//     so index.html is served.
//   - All non-SPA-like requests are passed through directly (no buffering).
func SPAFallbackMiddleware() application.Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !shouldAttemptSPAFallback(r) {
				next.ServeHTTP(w, r)
				return
			}

			recorder := httptest.NewRecorder()
			next.ServeHTTP(recorder, r)

			isNotFound := recorder.Code == http.StatusNotFound

			if isNotFound {
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

func shouldAttemptSPAFallback(r *http.Request) bool {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		return false
	}

	// Route-like URLs don't have an asset extension.
	if path.Ext(r.URL.Path) != "" {
		return false
	}

	accept := r.Header.Get("Accept")
	return strings.Contains(accept, "text/html")
}
