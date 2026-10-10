package notes

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNoteNavigationServesApp(t *testing.T) {
	project := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(project, "notes", "folder.v1"), 0755))
	require.NoError(t, os.WriteFile(filepath.Join(project, "notes", "note.md"), []byte("# Note"), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(project, "notes", "image.svg"), []byte("<svg/>"), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(project, "notes", "doc.pdf"), []byte("%PDF-1.4"), 0644))
	assets := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			w.Header().Set("Content-Type", "text/html")
			_, _ = w.Write([]byte("<html>Bytebook</html>"))
			return
		}
		http.NotFound(w, r)
	})
	handler := util.SPAFallbackMiddleware()(LocalFileMiddleware(project)(assets))

	assertNavigation := func(t *testing.T, route string) {
		t.Helper()
		req := httptest.NewRequest(http.MethodGet, route, nil)
		req.Header.Set("Accept", "text/html,application/xhtml+xml,*/*;q=0.8")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "<html>Bytebook</html>", rec.Body.String())
	}
	t.Run("note navigation loads the app instead of raw markdown", func(t *testing.T) {
		assertNavigation(t, "/notes/note.md")
	})
	t.Run("attachment navigation loads the app instead of the image", func(t *testing.T) {
		assertNavigation(t, "/notes/image.svg")
	})
	t.Run("dotted folder navigation loads the app", func(t *testing.T) {
		assertNavigation(t, "/notes/folder.v1")
	})
	t.Run("missing note navigation loads the app not found page", func(t *testing.T) {
		assertNavigation(t, "/notes/missing.md")
	})
	t.Run("embedded images still receive raw file bytes", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/notes/image.svg", nil)
		req.Header.Set("Accept", "image/avif,image/webp,image/*,*/*;q=0.8")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "<svg/>", rec.Body.String())
	})
	t.Run("embedded PDF iframe receives raw file bytes", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/notes/doc.pdf?embed", nil)
		req.Header.Set("Accept", "text/html,application/xhtml+xml,*/*;q=0.8")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "%PDF-1.4", rec.Body.String())
	})
	t.Run("top-level PDF navigation still loads the app", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/notes/doc.pdf", nil)
		req.Header.Set("Accept", "text/html,application/xhtml+xml,*/*;q=0.8")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Equal(t, "<html>Bytebook</html>", rec.Body.String())
	})
}
