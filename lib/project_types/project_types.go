package project_types

type WindowEventData struct{
	Folder string
	Note string
}

type WindowOptions struct {
	Title string
}

type ProjectSettingsJson struct {
	PinnedNotes []string `json:"pinnedNotes"`
	ProjectPath string   `json:"projectPath"`
}

type BackendResponseWithData struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	Data    []string `json:"data"`
}

type BackendResponseWithoutData struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
}
