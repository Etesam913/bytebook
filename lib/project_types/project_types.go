package project_types

import (
	"sync"

	"github.com/pebbe/zmq4"
)

type WindowEventData struct {
	Folder string
	Note   string
}

type WindowOptions struct {
	Title string
}

type AppearanceProjectSettingsJson struct {
	Theme               string `json:"theme"`
	AccentColor         string `json:"accentColor"`
	NoteWidth           string `json:"noteWidth"`
	EditorFontFamily    string `json:"editorFontFamily"`
	NoteSidebarItemSize string `json:"noteSidebarItemSize"`
}

type CodeProjectSettingsJson struct {
	CodeBlockVimMode bool   `json:"codeBlockVimMode"`
	PythonVenvPath   string `json:"pythonVenvPath"`
}

type ProjectSettingsJson struct {
	PinnedNotes        []string                      `json:"pinnedNotes"`
	ProjectPath        string                        `json:"projectPath"`
	RepositoryToSyncTo string                        `json:"repositoryToSyncTo"`
	Appearance         AppearanceProjectSettingsJson `json:"appearance"`
	Code               CodeProjectSettingsJson       `json:"code"`
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
	MessageId string            `json:"messageId"`
	Data      map[string]string `json:"data"`
}

type KernelStatusEventType struct {
	Status   string `json:"status"`
	Language string `json:"language"`
}

type CodeBlockStatusEventType struct {
	MessageId string `json:"messageId"`
	Status    string `json:"status"`
}

type ShutdownReplyEventType struct {
	Status   string `json:"status"`
	Language string `json:"language"`
}

type InterruptReplyEventType struct {
	MessageId string `json:"messageId"`
	Status    string `json:"status"`
}

type SocketSet struct {
	ShellSocketDealer     *zmq4.Socket
	ControlSocketDealer   *zmq4.Socket
	IOPubSocketSubscriber *zmq4.Socket
	HeartbeatSocketReq    *zmq4.Socket
}
