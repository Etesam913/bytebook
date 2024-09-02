package project_types

type OpenNoteEventData struct {
	folder string
	note   string
}

type ProjectSettingsJson struct {
	PinnedNotes []string `json:"pinnedNotes"`
}
