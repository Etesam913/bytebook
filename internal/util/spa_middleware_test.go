package util

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSPAFallbackMiddleware(t *testing.T) {
	t.Run("falls back for extensionless HTML navigation", func(t *testing.T) {
		calls := 0
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			calls++
			if r.URL.Path == "/" {
				w.WriteHeader(http.StatusOK)
				_, _ = w.Write([]byte("index"))
				return
			}
			http.NotFound(w, r)
		})

		handler := SPAFallbackMiddleware()(next)
		req := httptest.NewRequest(http.MethodGet, "/notes/folder/note", nil)
		req.Header.Set("Accept", "text/html")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "index", rec.Body.String())
		assert.Equal(t, 2, calls, "expected initial request + fallback request")
	})

	t.Run("does not fallback for extensionless non-HTML request", func(t *testing.T) {
		calls := 0
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			calls++
			http.NotFound(w, r)
		})

		handler := SPAFallbackMiddleware()(next)
		req := httptest.NewRequest(http.MethodGet, "/notes/folder/note", nil)
		req.Header.Set("Accept", "application/json")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusNotFound, rec.Code)
		assert.Equal(t, 1, calls, "expected direct pass-through")
	})

	t.Run("does not fallback for asset-like path", func(t *testing.T) {
		calls := 0
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			calls++
			http.NotFound(w, r)
		})

		handler := SPAFallbackMiddleware()(next)
		req := httptest.NewRequest(http.MethodGet, "/video/file.mp4", nil)
		req.Header.Set("Accept", "text/html")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusNotFound, rec.Code)
		assert.Equal(t, 1, calls, "expected direct pass-through for asset requests")
	})
}
