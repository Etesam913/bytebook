package util

import (
	"fmt"
	"time"
)

// FormatExecutionDuration calculates the duration between two time objects
// and returns it in a human-readable format suitable for code block execution.
// The format prioritizes precision for shorter durations (milliseconds, seconds)
// and readability for longer durations (minutes, hours).
func FormatExecutionDuration(startTime, endTime time.Time) string {
	duration := endTime.Sub(startTime)

	// Get total milliseconds for precision
	milliseconds := duration.Milliseconds()

	// Less than 1 second - show milliseconds
	if milliseconds < 1000 {
		return fmt.Sprintf("%dms", milliseconds)
	}

	// Get total seconds
	seconds := duration.Seconds()

	// Less than 1 minute - show seconds with decimal precision
	if seconds < 60 {
		if seconds < 10 {
			return fmt.Sprintf("%.2fs", seconds)
		}
		return fmt.Sprintf("%.1fs", seconds)
	}

	// Get minutes and remaining seconds
	minutes := int(duration.Minutes())
	remainingSeconds := int(seconds) % 60

	// Less than 1 hour - show minutes and seconds
	if minutes < 60 {
		if remainingSeconds == 0 {
			return fmt.Sprintf("%dm", minutes)
		}
		return fmt.Sprintf("%dm %ds", minutes, remainingSeconds)
	}

	// 1 hour or more - show hours and minutes
	hours := minutes / 60
	remainingMinutes := minutes % 60

	if remainingMinutes == 0 {
		return fmt.Sprintf("%dh", hours)
	}
	return fmt.Sprintf("%dh %dm", hours, remainingMinutes)
}
