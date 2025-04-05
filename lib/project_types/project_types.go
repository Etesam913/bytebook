package project_types

import (
	"sync"
)

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
	EditorFontFamily    string   `json:"editorFontFamily"`
	CodeBlockVimMode    bool     `json:"codeBlockVimMode"`
}

type AllKernels struct {
	Python KernelJson
	Golang KernelJson
}

type KernelJson struct {
	Argv        []string `json:"argv"`
	DisplayName string   `json:"display_name"`
	Language    string   `json:"language"`
}

type TagJson struct {
	Notes []string `json:"notes"`
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

// Kernel Types
type LanguageToKernelConnectionInfo struct {
	Python KernelConnectionInfo `json:"python"`
	Golang KernelConnectionInfo `json:"golang"`
}

type KernelConnectionInfo struct {
	Language        string `json:"language"`
	SignatureScheme string `json:"signature_scheme"`
	Transport       string `json:"transport"`
	StdinPort       int    `json:"stdin_port"`
	ControlPort     int    `json:"control_port"`
	IOPubPort       int    `json:"iopub_port"`
	HBPort          int    `json:"hb_port"`
	ShellPort       int    `json:"shell_port"`
	Key             string `json:"key"`
	IP              string `json:"ip"`
}

// Kernel Events Types
type KernelCodeBlockExecuteReply struct {
	Status         string   `json:"status"`
	MessageId      string   `json:"messageId"`
	ErrorName      string   `json:"errorName"`
	ErrorValue     string   `json:"errorValue"`
	ErrorTraceback []string `json:"errorTraceback"`
}

type KernelHeartbeatState struct {
	Mutex  sync.RWMutex
	Status bool
}

type StreamEventType struct {
	MessageId string `json:"messageId"`
	Name      string `json:"name"`
	Text      string `json:"text"`
}

type ExecuteResultEventType struct {
	MessageId string `json:"messageId"`
	Data      any    `json:"data"`
}

type ShutdownReplyEventType struct {
	Status   string `json:"status"`
	Language string `json:"language"`
}
