package notes

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLocalFileMiddleware(t *testing.T) {
	project := t.TempDir()
	require.NoError(t, os.Mkdir(filepath.Join(project, "notes"), 0755))
	require.NoError(t, os.Mkdir(filepath.Join(project, "notes-x"), 0755))
	require.NoError(t, os.WriteFile(filepath.Join(project, "notes", "image.svg"), []byte("<svg/>"), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(project, "notes-x", "secret.txt"), []byte("secret"), 0644))
	handler := LocalFileMiddleware(project)(http.NotFoundHandler())

	t.Run("rejects range requests that escape to a sibling notes directory", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/notes/../notes-x/secret.txt", nil)
		req.Header.Set("Range", "bytes=0-5")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusForbidden, rec.Code)
		assert.NotContains(t, rec.Body.String(), "secret")
	})

	t.Run("serves range requests for files inside notes", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/notes/image.svg", nil)
		req.Header.Set("Range", "bytes=0-3")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusPartialContent, rec.Code)
		assert.Equal(t, "<svg", rec.Body.String())
	})
}

func TestGetContentType(t *testing.T) {
	expectedTypes := map[string]string{
		"file.jpg":     "image/jpeg",
		"file.jpeg":    "image/jpeg",
		"file.png":     "image/png",
		"file.gif":     "image/gif",
		"file.webp":    "image/webp",
		"file.svg":     "image/svg+xml",
		"file.mp4":     "video/mp4",
		"file.webm":    "video/webm",
		"file.ogg":     "video/ogg",
		"file.OGG":     "video/ogg",
		"file.mov":     "video/quicktime",
		"file.avi":     "video/x-msvideo",
		"file.pdf":     "application/pdf",
		"file.unknown": "application/octet-stream",
		"README":       "application/octet-stream",
	}

	for path, expected := range expectedTypes {
		t.Run(path, func(t *testing.T) {
			contentType := getContentType(path)

			assert.Equal(t, expected, contentType)
		})
	}
}
