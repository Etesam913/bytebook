package bytebook

import (
	"embed"
)

// Frontend contains the embedded frontend files.
// The files are from the frontend/dist folder.
//
//go:embed frontend/dist
var Frontend embed.FS
