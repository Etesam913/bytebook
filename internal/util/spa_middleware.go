package util

import (
	"net/http"
	"net/http/httptest"
	"path"
	"strings"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// SPAFallbackMiddleware serves the app shell for HTML note navigation and
// retries extensionless HTML routes at root when the asset handler returns 404.
func SPAFallbackMiddleware() application.Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Note routes share URLs with raw attachments. Document navigation must
			// reach the app shell before LocalFileMiddleware can serve file bytes.
			if isHTMLNavigation(r) && strings.HasPrefix(r.URL.Path, "/notes/") {
				clone := r.Clone(r.Context())
				clone.URL.Path = "/"
				clone.URL.RawPath = ""
				next.ServeHTTP(w, clone)
				return
			}

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
				clone.URL.RawPath = ""
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
	return isHTMLNavigation(r) && path.Ext(r.URL.Path) == ""
}

func isHTMLNavigation(r *http.Request) bool {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		return false
	}

	accept := r.Header.Get("Accept")
	return strings.Contains(accept, "text/html")
}
