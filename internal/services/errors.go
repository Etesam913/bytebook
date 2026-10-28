package services

import (
	"errors"
	"log"

	"github.com/etesam913/bytebook/internal/apperr"
)

// responseMessage preserves explicitly user-facing messages and logs unexpected errors.
func responseMessage(err error, fallback string) string {
	var ue *apperr.UserError
	if errors.As(err, &ue) {
		return ue.Msg
	}
	log.Printf("%s: %v", fallback, err)
	return fallback
}

func userFacingError(err error, message string) string {
	return responseMessage(err, message)
}
