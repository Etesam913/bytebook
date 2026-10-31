package util

import (
	"time"
)

// RetryWithExponentialBackoff attempts to execute a function multiple times with exponential backoff.
// It retries on any error until successful or max retries is reached.
//
// Parameters:
//   - fn: The function to execute that returns an error
//   - maxRetries: Maximum number of attempts (including the first try)
//   - initialDelay: Starting delay duration (will be doubled on each retry)
//
// Returns the last error encountered, or nil if successful.
func RetryWithExponentialBackoff(
	fn func() error,
	maxRetries int,
	initialDelay time.Duration,
) error {
	var err error
	delay := initialDelay

	for attempt := range maxRetries {
		err = fn()

		// If successful, break
		if err == nil {
			break
		}

		// Don't sleep after the last attempt
		if attempt < maxRetries-1 {
			time.Sleep(delay)
			delay *= 2 // Exponential backoff
		}
	}

	return err
}
