package notes

import (
	"testing"

	"github.com/etesam913/bytebook/internal/util"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWatcherBatch(t *testing.T) {
	t.Run("renames suppress only their redundant creates and deletes", func(t *testing.T) {
		batch := watcherBatch{
			folderRenames: []util.FolderRenameEventData{{OldFolderPath: "old", NewFolderPath: "new"}, {OldFolderPath: "old", NewFolderPath: "new"}},
			fileRenames:   []util.FileRenameEventData{{OldFilePath: "a.md", NewFilePath: "b.md"}},
			folderDeletes: []util.FolderDeleteEventData{{FolderPath: "old"}, {FolderPath: "deleted"}},
			fileDeletes:   []util.FileDeleteEventData{{FilePath: "a.md"}, {FilePath: "deleted.md"}},
			folderCreates: []util.FolderCreateEventData{{FolderPath: "new"}, {FolderPath: "created"}},
			fileCreates:   []util.FileCreateEventData{{FilePath: "b.md"}, {FilePath: "created.md"}, {FilePath: "created.md"}},
			fileWrites:    []util.FileWriteEventData{{FilePath: "b.md", Markdown: "content"}},
		}

		events := batch.events()

		require.Len(t, events, 7)
		names := make([]string, len(events))
		for i, event := range events {
			names[i] = event.Name
		}
		assert.Equal(t, []string{util.EventFolderRename, util.EventFileRename, util.EventFolderDelete, util.EventFileDelete, util.EventFolderCreate, util.EventFileCreate, util.EventFileWrite}, names)
		assert.Equal(t, batch.folderRenames[:1], events[0].Data)
		assert.Equal(t, batch.fileRenames, events[1].Data)
		assert.Equal(t, batch.folderDeletes[1:], events[2].Data)
		assert.Equal(t, batch.fileDeletes[1:], events[3].Data)
		assert.Equal(t, batch.folderCreates[1:], events[4].Data)
		assert.Equal(t, batch.fileCreates[1:2], events[5].Data)
		assert.Equal(t, batch.fileWrites, events[6].Data)
	})
	t.Run("writes keep the latest content including empty markdown", func(t *testing.T) {
		batch := watcherBatch{fileWrites: []util.FileWriteEventData{
			{FilePath: "a.md", Markdown: "old"}, {FilePath: "b.md", Markdown: "other"}, {FilePath: "a.md", Markdown: ""},
		}}

		events := batch.events()

		require.Len(t, events, 1)
		assert.Equal(t, []util.FileWriteEventData{{FilePath: "a.md", Markdown: ""}, {FilePath: "b.md", Markdown: "other"}}, events[0].Data)
	})
}
