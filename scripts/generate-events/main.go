// Command generate-events exports the Go event names for frontend consumers.
// Run from the repository root with go run ./scripts/generate-events.
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

const sourcePath = "internal/util/events.go"
const outputPath = "frontend/bindings/github.com/etesam913/bytebook/internal/util/event-names.ts"

var acronymBoundary = regexp.MustCompile(`([A-Z]+)([A-Z][a-z])`)
var wordBoundary = regexp.MustCompile(`([a-z0-9])([A-Z])`)

func main() {
	source, err := os.ReadFile(sourcePath)
	if err != nil {
		log.Fatal(err)
	}
	output, err := generate(source)
	if err != nil {
		log.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Dir(outputPath), 0755); err != nil {
		log.Fatal(err)
	}
	if err := os.WriteFile(outputPath, output, 0644); err != nil {
		log.Fatal(err)
	}
}

func generate(source []byte) ([]byte, error) {
	file, err := parser.ParseFile(token.NewFileSet(), sourcePath, source, 0)
	if err != nil {
		return nil, fmt.Errorf("parse event constants: %w", err)
	}
	var output bytes.Buffer
	output.WriteString("// Generated from internal/util/events.go. DO NOT EDIT.\n")
	output.WriteString("// Regenerate with go run ./scripts/generate-events from the repository root.\n\n")
	count := 0
	for _, declaration := range file.Decls {
		group, ok := declaration.(*ast.GenDecl)
		if !ok || group.Tok != token.CONST {
			continue
		}
		for _, specification := range group.Specs {
			spec := specification.(*ast.ValueSpec)
			for i, identifier := range spec.Names {
				if !strings.HasPrefix(identifier.Name, "Event") {
					continue
				}
				if i >= len(spec.Values) {
					return nil, fmt.Errorf("%s must have an explicit string literal value", identifier.Name)
				}
				literal, ok := spec.Values[i].(*ast.BasicLit)
				if !ok || literal.Kind != token.STRING {
					return nil, fmt.Errorf("%s must have an explicit string literal value", identifier.Name)
				}
				value, err := strconv.Unquote(literal.Value)
				if err != nil {
					return nil, fmt.Errorf("decode %s: %w", identifier.Name, err)
				}
				name := strings.TrimPrefix(identifier.Name, "Event")
				name = acronymBoundary.ReplaceAllString(name, "${1}_${2}")
				name = strings.ToUpper(wordBoundary.ReplaceAllString(name, "${1}_${2}"))
				encoded, err := json.Marshal(value)
				if err != nil {
					return nil, fmt.Errorf("encode %s: %w", identifier.Name, err)
				}
				fmt.Fprintf(&output, "export const %s = %s;\n", name, encoded)
				count++
			}
		}
	}
	if count == 0 {
		return nil, fmt.Errorf("no event constants found in %s", sourcePath)
	}
	return output.Bytes(), nil
}
