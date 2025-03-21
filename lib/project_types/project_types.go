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
	NoteWidth           string   `json:"noteWidth"`
}

type AllKernels struct {
	Python KernelJson
	Golang KernelJson
}

type KernelJson struct {
	Argv        []string `json:"argv"`
	DisplayName string   `json:"display_name"`
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

type NoteResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	Data    []string `json:"data"`
}

// Events Types
type KernelCodeBlockExecuteReply struct {
	Status         string   `json:"status"`
	MessageId      string   `json:"messageId"`
	ErrorName      string   `json:"errorName"`
	ErrorValue     string   `json:"errorValue"`
	ErrorTraceback []string `json:"errorTraceback"`
}

type StreamEventType struct {
	MessageId string `json:"messageId"`
	Name      string `json:"name"`
	Text      string `json:"text"`
}
