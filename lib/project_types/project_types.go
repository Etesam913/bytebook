package project_types

type WindowEventData struct {
	Folder string
	Note   string
}

type WindowOptions struct {
	Title string
}

type ProjectSettingsJson struct {
	PinnedNotes         []string `json:"pinnedNotes"`
	ProjectPath         string   `json:"projectPath"`
	RepositoryToSyncTo  string   `json:"repositoryToSyncTo"`
	DarkMode            string   `json:"darkMode"`
	NoteSidebarItemSize string   `json:"noteSidebarItemSize"`
	AccentColor         string   `json:"accentColor"`
}

type TagJson struct {
	Notes []string `json:"notes"`
}

type ProjectSettingsReponse struct {
	Success bool                `json:"success"`
	Message string              `json:"message"`
	Data    ProjectSettingsJson `json:"data"`
}

type BackendResponseWithData[T any] struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    T      `json:"data"`
}

type BackendResponseWithoutData struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

type NoteEntry struct {
	Name        string `json:"name"`
	LastUpdated string `json:"lastUpdated"`
	Size        int    `json:"size"`
}

type NoteResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    []NoteEntry `json:"data"`
}
