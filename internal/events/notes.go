package events

import (
	"fmt"
	"log"
	"path/filepath"

	"github.com/etesam913/bytebook/internal/search"
	"github.com/wailsapp/wails/v3/pkg/application"
)

func handleNoteCreateEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]map[string]string)
	if !ok {
		log.Println("Note created event data is not a map")
		return
	}
	fmt.Println(data)
	addCreatedNotesToIndex(params, data)
}

func addCreatedNotesToIndex(params EventParams, data []map[string]string) {
	batch := params.Index.NewBatch()

	for _, note := range data {
		folder, ok := note["folder"]
		if !ok {
			log.Println("Note created event data is not a map")
			return
		}
		noteName, ok := note["note"]
		if !ok {
			log.Println("Note created event data is not a map")
			return
		}

		_, err := search.AddMarkdownNoteToBatch(
			batch,
			params.Index,
			filepath.Join(params.ProjectPath, folder, noteName),
			folder,
			noteName,
		)

		if err != nil {
			log.Println("Error adding markdown note to batch", err)
		}
	}

	err := params.Index.Batch(batch)
	if err != nil {
		log.Println("Error indexing batch", err)
	}
}

func handleNoteRenameEvent(params EventParams, event *application.CustomEvent) {
	data, ok := event.Data.([]map[string]string)
	if !ok {
		log.Println("Note rename event data is not a map")
		return
	}
	fmt.Println(data)
	renameNotesInIndex(params, data)
}

func renameNotesInIndex(params EventParams, data []map[string]string) {
	batch := params.Index.NewBatch()

	for _, note := range data {
		oldFolder, ok := note["oldFolder"]
		if !ok {
			log.Println("Note rename event data missing oldFolder")
			continue
		}
		oldNoteName, ok := note["oldNote"]
		if !ok {
			log.Println("Note rename event data missing oldNote")
			continue
		}
		newFolder, ok := note["newFolder"]
		if !ok {
			log.Println("Note rename event data missing newFolder")
			continue
		}
		newNoteName, ok := note["newNote"]
		if !ok {
			log.Println("Note rename event data missing newNote")
			continue
		}

		oldFileId := filepath.Join(oldFolder, oldNoteName)

		batch.Delete(oldFileId)

		newFilePath := filepath.Join(params.ProjectPath, "notes", newFolder, newNoteName)
		if filepath.Ext(newNoteName) == ".md" {
			_, err := search.AddMarkdownNoteToBatch(
				batch,
				params.Index,
				newFilePath,
				newFolder,
				newNoteName,
			)

			if err != nil {
				log.Println("Error adding renamed note to batch", err)
			}
		}

	}

	err := params.Index.Batch(batch)
	if err != nil {
		log.Println("Error batching rename operations", err)
	}
}
