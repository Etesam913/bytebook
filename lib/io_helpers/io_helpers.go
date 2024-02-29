package io_helpers

import (
	"encoding/json"
	"errors"
	"io"
	"os"
	"runtime"
	"strings"
)

func WriteJsonToPath(pathname string, data interface{}) error {
	jsonData, err := json.MarshalIndent(data, "", "    ")
	if err != nil {
		return err
	}
	file, err := os.Create(pathname)
	if err != nil {
		return err
	}
	defer file.Close()
	_, err = file.Write(jsonData)
	if err != nil {
		return err
	}
	return nil
}

func ReadJsonFromPath(pathname string, data interface{}) error {
	file, err := os.Open(pathname)
	if err != nil {
		return err
	}
	defer file.Close()
	byteValue, err := io.ReadAll(file)
	if err != nil {
		return err
	}
	err = json.Unmarshal(byteValue, data)
	if err != nil {
		return err
	}
	return nil
}

type ActionStruct struct {
	WindowsAction func()
	MacAction     func()
	LinuxAction   func()
}

func CompleteCustomActionForOS(action ActionStruct) error {
	var err error = nil
	switch os := runtime.GOOS; os {
	case "windows":
		action.WindowsAction()
	case "darwin":
		action.MacAction()
	case "linux":
		action.LinuxAction()
	default:
		// Fallback for other OS or as a default (can also decide to return an error instead)
		err = errors.New("unsupported os")
	}
	return err
}

// CopyFile copies a file from src to dst. If dst does not exist, it will be created.
// If dst exists, it will be overwritten.
func CopyFile(src, dst string) error {
	// Open the source file for reading.
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	// Create the destination file for writing. Use os.Create to create or truncate it before writing.
	destinationFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destinationFile.Close()

	// Copy the contents of the source file to the destination file.
	_, err = io.Copy(destinationFile, sourceFile)
	if err != nil {
		return err
	}

	// Ensure that any writes to the destination file are committed to stable storage.
	err = destinationFile.Sync()
	return err
}

// cleanFileName removes unsafe characters and trims spaces from a filename.
func CleanFileName(filename string) string {
	// Define a regular expression for characters you want to remove

	// Replace those characters with an empty string

	// Trim leading and trailing spaces
	cleaned := strings.ReplaceAll(filename, " ", "_")
	cleaned = strings.ReplaceAll(cleaned, ":", "_")
	cleaned = strings.ReplaceAll(cleaned, "/", "_")
	cleaned = strings.ReplaceAll(cleaned, "\\", "_")
	cleaned = strings.ReplaceAll(cleaned, "*", "_")
	cleaned = strings.ReplaceAll(cleaned, "?", "_")
	cleaned = strings.ReplaceAll(cleaned, "\"", "_")
	cleaned = strings.ReplaceAll(cleaned, "<", "_")
	cleaned = strings.ReplaceAll(cleaned, ">", "_")
	cleaned = strings.ReplaceAll(cleaned, "|", "_")
	cleaned = strings.ReplaceAll(cleaned, "[", "_")
	cleaned = strings.ReplaceAll(cleaned, "]", "_")
	cleaned = strings.ReplaceAll(cleaned, "(", "_")
	cleaned = strings.ReplaceAll(cleaned, ")", "_")
	cleaned = strings.ReplaceAll(cleaned, "_", "")

	// Further modifications could include truncating the filename if it's too long,
	// ensuring it does not start with a dot if hidden files are a concern, etc.
	return cleaned
}
