package util

import (
	"errors"
	"testing"
	"time"
)

func TestRetryWithExponentialBackoff(t *testing.T) {
	t.Run("succeeds on first try", func(t *testing.T) {
		callCount := 0
		fn := func() error {
			callCount++
			return nil
		}

		err := RetryWithExponentialBackoff(fn, 5, 10*time.Millisecond)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if callCount != 1 {
			t.Errorf("Expected function to be called once, was called %d times", callCount)
		}
	})

	t.Run("succeeds on third try", func(t *testing.T) {
		callCount := 0
		retryableErr := errors.New("retryable error")
		fn := func() error {
			callCount++
			if callCount < 3 {
				return retryableErr
			}
			return nil
		}

		err := RetryWithExponentialBackoff(fn, 5, 1*time.Millisecond)

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}
		if callCount != 3 {
			t.Errorf("Expected function to be called 3 times, was called %d times", callCount)
		}
	})

	t.Run("fails after max retries", func(t *testing.T) {
		callCount := 0
		retryableErr := errors.New("retryable error")
		fn := func() error {
			callCount++
			return retryableErr
		}

		err := RetryWithExponentialBackoff(fn, 3, 1*time.Millisecond)

		if err == nil {
			t.Error("Expected error, got nil")
		}
		if err != retryableErr {
			t.Errorf("Expected retryable error, got %v", err)
		}
		if callCount != 3 {
			t.Errorf("Expected function to be called 3 times, was called %d times", callCount)
		}
	})

	t.Run("exponential backoff timing", func(t *testing.T) {
		callCount := 0
		retryableErr := errors.New("retryable error")
		fn := func() error {
			callCount++
			return retryableErr
		}

		start := time.Now()
		RetryWithExponentialBackoff(fn, 4, 10*time.Millisecond)
		elapsed := time.Since(start)

		// Expected delays: 10ms + 20ms + 40ms = 70ms minimum
		// Allow for some overhead (e.g., 100ms max)
		if elapsed < 70*time.Millisecond {
			t.Errorf("Expected at least 70ms delay, got %v", elapsed)
		}
		if elapsed > 150*time.Millisecond {
			t.Errorf("Expected less than 150ms delay, got %v", elapsed)
		}
	})
}
