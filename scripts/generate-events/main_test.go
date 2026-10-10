package main

import (
	"strings"
	"testing"
)

func TestGenerate(t *testing.T) {
	t.Run("Exports event names and preserves the frontend naming contract", func(t *testing.T) {
		source := []byte("package util\nconst (\nEventFileCreate = \"file:create\"\nEventCommandPalette = \"commands:open\"\nEventCodeBlockIopubError = \"code:code-block:iopub_error\"\nEventHTTPReady = `http:ready`\nOtherConstant = \"other\"\n)\n")

		output, err := generate(source)

		if err != nil {
			t.Fatal(err)
		}
		want := `export const FILE_CREATE = "file:create";
export const COMMAND_PALETTE_OPEN = "commands:open";
export const CODE_BLOCK_IOPUB_ERROR = "code:code-block:iopub_error";
export const HTTP_READY = "http:ready";
`
		if !strings.HasSuffix(string(output), want) {
			t.Fatalf("unexpected exports:\n%s", output)
		}
		if strings.Contains(string(output), "OTHER_CONSTANT") {
			t.Fatal("exported a non-event constant")
		}
	})

	t.Run("Rejects unsupported values instead of silently omitting an event", func(t *testing.T) {
		source := []byte(`package util
const EventFileCreate = "file:" + "create"
`)

		output, err := generate(source)

		if err == nil || !strings.Contains(err.Error(), "EventFileCreate") {
			t.Fatalf("expected an error naming the unsupported event, got %v", err)
		}
		if output != nil {
			t.Fatal("returned partial output on failure")
		}
	})
}
