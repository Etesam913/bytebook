package notes

import (
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"sort"
)

type FileOrFolder struct {
	Id          string   `json:"id"`
	Path        string   `json:"path"`
	Name        string   `json:"name"`
	ParentId    string   `json:"parentId"`
	Type        string   `json:"type"`
	ChildrenIds []string `json:"childrenIds"`
}

// GetAllPaths returns every file and folder path under notes/, relative to the
// notes directory, sorted, with directories marked by a trailing slash. Hidden
// files and folders (those starting with '.') are skipped entirely.
func GetAllPaths(projectPath string) ([]string, error) {
	notesRoot := filepath.Join(projectPath, "notes")
	fileInfo, err := os.Stat(notesRoot)
	if err != nil {
		return nil, fmt.Errorf("failed to read %s", notesRoot)
	}
	if !fileInfo.IsDir() {
		return nil, fmt.Errorf("%s is not a directory", notesRoot)
	}

	paths := make([]string, 0, 512)
	err = filepath.WalkDir(notesRoot, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			// A single unreadable entry must not blank the whole tree, which is
			// what returning the error here would do. Only the root is fatal.
			if p == notesRoot {
				return err
			}
			log.Printf("GetAllPaths: skipping %s: %v", p, err)
			if d != nil && d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if p == notesRoot {
			return nil
		}
		if len(d.Name()) > 0 && d.Name()[0] == '.' {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		rel, relErr := filepath.Rel(notesRoot, p)
		if relErr != nil {
			return relErr
		}
		rel = filepath.ToSlash(rel)
		if d.IsDir() {
			rel += "/"
		}
		paths = append(paths, rel)
		return nil
	})
	if err != nil {
		return nil, err
	}

	sort.Strings(paths)
	return paths, nil
}
