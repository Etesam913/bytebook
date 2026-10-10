package services

import "log"

// userFacingError logs the underlying error and returns a fixed message that is
// safe to show in the UI. Keeps absolute paths and internals out of responses.
func userFacingError(err error, message string) string {
	log.Printf("%s: %v", message, err)
	return message
}
