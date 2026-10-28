// Package apperr defines errors with messages safe to display to users.
package apperr

import "fmt"

// UserError carries an actionable message and an optional underlying cause.
type UserError struct {
	Msg string
	Err error
}

func (e *UserError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Msg, e.Err)
	}
	return e.Msg
}

func (e *UserError) Unwrap() error { return e.Err }

// Userf creates a user-facing error with a formatted message.
func Userf(format string, args ...any) *UserError {
	return &UserError{Msg: fmt.Sprintf(format, args...)}
}
