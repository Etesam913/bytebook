package util

import (
	"testing"
	"time"
)

func TestFormatExecutionDuration(t *testing.T) {
	baseTime := time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name     string
		duration time.Duration
		expected string
	}{
		// Milliseconds (< 1 second)
		{
			name:     "zero duration",
			duration: 0,
			expected: "0ms",
		},
		{
			name:     "1 millisecond",
			duration: 1 * time.Millisecond,
			expected: "1ms",
		},
		{
			name:     "10 milliseconds",
			duration: 10 * time.Millisecond,
			expected: "10ms",
		},
		{
			name:     "100 milliseconds",
			duration: 100 * time.Millisecond,
			expected: "100ms",
		},
		{
			name:     "999 milliseconds",
			duration: 999 * time.Millisecond,
			expected: "999ms",
		},

		// Seconds (< 1 minute)
		{
			name:     "exactly 1 second",
			duration: 1 * time.Second,
			expected: "1.00s",
		},
		{
			name:     "1.5 seconds",
			duration: 1500 * time.Millisecond,
			expected: "1.50s",
		},
		{
			name:     "2.345 seconds",
			duration: 2345 * time.Millisecond,
			expected: "2.34s", // rounded to 2 decimal places
		},
		{
			name:     "5.678 seconds",
			duration: 5678 * time.Millisecond,
			expected: "5.68s", // rounded to 2 decimal places
		},
		{
			name:     "9.999 seconds",
			duration: 9999 * time.Millisecond,
			expected: "10.00s", // rounds up to 10 seconds
		},
		{
			name:     "10.1 seconds",
			duration: 10100 * time.Millisecond,
			expected: "10.1s", // 1 decimal place for >= 10 seconds
		},
		{
			name:     "15.789 seconds",
			duration: 15789 * time.Millisecond,
			expected: "15.8s", // 1 decimal place, rounded
		},
		{
			name:     "59.9 seconds",
			duration: 59900 * time.Millisecond,
			expected: "59.9s",
		},

		// Minutes (< 1 hour)
		{
			name:     "exactly 1 minute",
			duration: 1 * time.Minute,
			expected: "1m",
		},
		{
			name:     "1 minute 30 seconds",
			duration: 1*time.Minute + 30*time.Second,
			expected: "1m 30s",
		},
		{
			name:     "2 minutes 0 seconds",
			duration: 2 * time.Minute,
			expected: "2m",
		},
		{
			name:     "5 minutes 45 seconds",
			duration: 5*time.Minute + 45*time.Second,
			expected: "5m 45s",
		},
		{
			name:     "15 minutes 1 second",
			duration: 15*time.Minute + 1*time.Second,
			expected: "15m 1s",
		},
		{
			name:     "30 minutes",
			duration: 30 * time.Minute,
			expected: "30m",
		},
		{
			name:     "59 minutes 59 seconds",
			duration: 59*time.Minute + 59*time.Second,
			expected: "59m 59s",
		},

		// Hours
		{
			name:     "exactly 1 hour",
			duration: 1 * time.Hour,
			expected: "1h",
		},
		{
			name:     "1 hour 30 minutes",
			duration: 1*time.Hour + 30*time.Minute,
			expected: "1h 30m",
		},
		{
			name:     "1 hour 1 minute",
			duration: 1*time.Hour + 1*time.Minute,
			expected: "1h 1m",
		},
		{
			name:     "2 hours",
			duration: 2 * time.Hour,
			expected: "2h",
		},
		{
			name:     "2 hours 15 minutes",
			duration: 2*time.Hour + 15*time.Minute,
			expected: "2h 15m",
		},
		{
			name:     "5 hours 45 minutes",
			duration: 5*time.Hour + 45*time.Minute,
			expected: "5h 45m",
		},
		{
			name:     "24 hours",
			duration: 24 * time.Hour,
			expected: "24h",
		},

		// Edge cases with seconds that get truncated in minute calculations
		{
			name:     "1 hour 30 minutes 45 seconds",
			duration: 1*time.Hour + 30*time.Minute + 45*time.Second,
			expected: "1h 30m", // seconds are ignored for hour+ durations
		},
		{
			name:     "3 hours 0 minutes 30 seconds",
			duration: 3*time.Hour + 30*time.Second,
			expected: "3h", // no minutes shown when 0, seconds ignored
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			startTime := baseTime
			endTime := baseTime.Add(tt.duration)

			result := FormatExecutionDuration(startTime, endTime)

			if result != tt.expected {
				t.Errorf("FormatExecutionDuration() = %v, expected %v", result, tt.expected)
			}
		})
	}
}

func TestFormatExecutionDurationNegativeDuration(t *testing.T) {
	// Test edge case where endTime is before startTime
	baseTime := time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)
	startTime := baseTime.Add(1 * time.Hour)
	endTime := baseTime // 1 hour before startTime

	result := FormatExecutionDuration(startTime, endTime)

	// Should handle negative durations gracefully
	// The result will be a negative duration, but let's verify it doesn't crash
	if result == "" {
		t.Error("FormatExecutionDuration() should not return empty string for negative duration")
	}
}

func TestFormatExecutionDurationRealWorldScenarios(t *testing.T) {
	baseTime := time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)

	scenarios := []struct {
		name        string
		description string
		duration    time.Duration
		expected    string
	}{
		{
			name:        "quick script execution",
			description: "A simple print statement in Python",
			duration:    150 * time.Millisecond,
			expected:    "150ms",
		},
		{
			name:        "medium computation",
			description: "Mathematical calculation or small data processing",
			duration:    3456 * time.Millisecond,
			expected:    "3.46s",
		},
		{
			name:        "long running analysis",
			description: "Data analysis or machine learning training",
			duration:    15*time.Minute + 23*time.Second,
			expected:    "15m 23s",
		},
		{
			name:        "very long batch job",
			description: "Large dataset processing or model training",
			duration:    2*time.Hour + 45*time.Minute,
			expected:    "2h 45m",
		},
	}

	for _, scenario := range scenarios {
		t.Run(scenario.name, func(t *testing.T) {
			startTime := baseTime
			endTime := baseTime.Add(scenario.duration)

			result := FormatExecutionDuration(startTime, endTime)

			if result != scenario.expected {
				t.Errorf("Scenario '%s': FormatExecutionDuration() = %v, expected %v",
					scenario.description, result, scenario.expected)
			}
		})
	}
}
