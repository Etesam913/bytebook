---
trigger: glob
globs: *.go
---

When updating a function in a go file check if the function is in service as seen in main.go. If it is, then the frontend bindings have to be updated. Do this by deleting frontned/bindings and then running wails3 build.
