package events

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/etesam913/bytebook/internal/search"
	"github.com/etesam913/bytebook/internal/util"
	"golang.org/x/sync/errgroup"
)

// EncodeLinkSegment percent-encodes a path segment using the same rules as the
// frontend's encodeLinkUrl (JS encodeURIComponent + ( )-escaping) so generated
// URL paths match the encoded form stored in markdown and indexed in bleve.
func EncodeLinkSegment(s string) string {
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch {
		case (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9'),
			c == '-', c == '_', c == '.', c == '~', c == '!', c == '*', c == '\'':
			b.WriteByte(c)
		default:
			fmt.Fprintf(&b, "%%%02X", c)
		}
	}
	return b.String()
}

// replaceLocalLinksInNotes finds all notes that contain internal links to
// renamed files and updates those links to reflect the new paths.
// It queries the bleve index to efficiently locate notes with matching links,
// then uses bounded parallelism to read/modify/write the affected files.
func replaceLocalLinksInNotes(params EventParams, data []map[string]string) {
	if params.Index == nil {
		return
	}

	type linkReplacement struct {
		oldURLPath string
		newURLPath string
	}

	var replacements []linkReplacement

	for _, note := range data {
		oldFolder, ok := note["oldFolder"]
		if !ok {
			continue
		}
		oldNoteName, ok := note["oldNote"]
		if !ok {
			continue
		}
		newFolder, ok := note["newFolder"]
		if !ok {
			continue
		}
		newNoteName, ok := note["newNote"]
		if !ok {
			continue
		}

		oldURLPath := "/notes/" + EncodeLinkSegment(oldFolder) + "/" + EncodeLinkSegment(oldNoteName)
		newURLPath := "/notes/" + EncodeLinkSegment(newFolder) + "/" + EncodeLinkSegment(newNoteName)

		if oldURLPath != newURLPath {
			replacements = append(replacements, linkReplacement{oldURLPath, newURLPath})
		}
	}

	if len(replacements) == 0 {
		return
	}

	// Map from relativePath -> list of replacements that apply to that note
	noteReplacements := make(map[string][]linkReplacement)

	idx := params.Index.RLock()
	for _, repl := range replacements {
		matchingPaths := FindNotesWithLink(idx, repl.oldURLPath, search.MaxDeleteSearchResults)
		for _, relPath := range matchingPaths {
			noteReplacements[relPath] = append(noteReplacements[relPath], repl)
		}
	}
	params.Index.RUnlock()

	if len(noteReplacements) == 0 {
		return
	}

	workerGroup := new(errgroup.Group)
	workerGroup.SetLimit(util.WORKER_COUNT)

	for relPath, repls := range noteReplacements {
		absPath := filepath.Join(params.ProjectPath, "notes", relPath)

		workerGroup.Go(func() error {
			content, err := os.ReadFile(absPath)
			if err != nil {
				log.Printf("Error reading note %s for link replacement: %v", relPath, err)
				return nil
			}

			markdown := string(content)
			updated := false
			for _, repl := range repls {
				var changed bool
				markdown, changed = replaceFilePathInMarkdown(markdown, repl.oldURLPath, repl.newURLPath)
				if changed {
					updated = true
				}
			}

			if updated {
				if err := os.WriteFile(absPath, []byte(markdown), 0644); err != nil {
					log.Printf("Error writing note %s after link replacement: %v", relPath, err)
				}
			}
			return nil
		})
	}

	if err := workerGroup.Wait(); err != nil {
		log.Printf("Error during link replacement: %v", err)
	}
}

// FindNotesWithLink queries the bleve index for markdown notes whose links field
// contains the given URL path. Returns a slice of relative note paths (e.g. "folder/note.md").
func FindNotesWithLink(index bleve.Index, urlPath string, pageSize int) []string {
	if index == nil {
		return nil
	}

	termQuery := bleve.NewTermQuery(urlPath)
	termQuery.SetField(search.FieldLinks)

	searchRequest := bleve.NewSearchRequest(termQuery)
	if pageSize > 0 {
		searchRequest.Size = pageSize
	} else {
		searchRequest.Size = search.MaxDeleteSearchResults
	}
	searchRequest.Fields = []string{}

	result, err := index.Search(searchRequest)
	if err != nil {
		log.Printf("Error searching for notes with link %s: %v", urlPath, err)
		return nil
	}

	paths := make([]string, 0, len(result.Hits))
	for _, hit := range result.Hits {
		paths = append(paths, hit.ID)
	}
	return paths
}

// replaceFilePathInMarkdown replaces exact URL paths in markdown links and images.
// It matches [text](oldURLPath) and ![alt](oldURLPath) patterns and replaces
// the URL with newURLPath. Returns the updated markdown and whether any changes were made.
func replaceFilePathInMarkdown(markdown, oldURLPath, newURLPath string) (string, bool) {
	updated := false

	// Replace in image/video URLs: ![alt](url)
	markdown = imageRegex.ReplaceAllStringFunc(markdown, func(match string) string {
		submatches := imageRegex.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match
		}
		altText := submatches[1]
		url := strings.TrimSpace(submatches[2])

		if url == oldURLPath {
			updated = true
			return "![" + altText + "](" + newURLPath + ")"
		}
		return match
	})

	// Replace in link URLs: [text](url)
	markdown = linkRegex.ReplaceAllStringFunc(markdown, func(match string) string {
		submatches := linkRegex.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match
		}
		linkText := submatches[1]
		url := strings.TrimSpace(submatches[2])

		if url == oldURLPath {
			updated = true
			return "[" + linkText + "](" + newURLPath + ")"
		}
		return match
	})

	return markdown, updated
}
