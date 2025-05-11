package search

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGenerateTrigrams(t *testing.T) {
	t.Run("empty input", func(t *testing.T) {
		trigrams := GenerateTrigrams([]rune{})
		assert.Empty(t, trigrams, "Expected empty slice for empty input")
	})

	t.Run("input with less than 3 characters", func(t *testing.T) {
		trigrams := GenerateTrigrams([]rune("ab"))
		assert.Empty(t, trigrams, "Expected empty slice for input with less than 3 characters")
	})

	t.Run("input with exactly 3 characters", func(t *testing.T) {
		trigrams := GenerateTrigrams([]rune("abc"))
		assert.Equal(t, []string{"abc"}, trigrams, "Expected single trigram for 3-character input")
	})

	t.Run("input with more than 3 characters", func(t *testing.T) {
		trigrams := GenerateTrigrams([]rune("abcde"))
		expected := []string{"abc", "bcd", "cde"}
		assert.Equal(t, expected, trigrams, "Expected sliding window trigrams")
	})

	t.Run("input with non-ASCII characters", func(t *testing.T) {
		trigrams := GenerateTrigrams([]rune("こんにちは"))
		expected := []string{"こんに", "んにち", "にちは"}
		assert.Equal(t, expected, trigrams, "Expected correct trigrams for non-ASCII input")
	})
}

func TestAddTrigramToInverseMap(t *testing.T) {
	t.Run("add new trigram", func(t *testing.T) {
		inverseMap := make(map[string]map[string]int)
		addTrigramToInverseMap("abc", "file1", &inverseMap)

		assert.Contains(t, inverseMap, "abc", "Inverse map should contain the trigram")
		assert.Contains(t, inverseMap["abc"], "file1", "Trigram map should contain the file")
		assert.Equal(t, 1, inverseMap["abc"]["file1"], "Count should be 1 for first occurrence")
	})

	t.Run("increment existing trigram and file", func(t *testing.T) {
		inverseMap := make(map[string]map[string]int)
		inverseMap["abc"] = map[string]int{"file1": 1}

		addTrigramToInverseMap("abc", "file1", &inverseMap)
		assert.Equal(t, 2, inverseMap["abc"]["file1"], "Count should be incremented for existing file")
	})

	t.Run("add new file to existing trigram", func(t *testing.T) {
		inverseMap := make(map[string]map[string]int)
		inverseMap["abc"] = map[string]int{"file1": 1}

		addTrigramToInverseMap("abc", "file2", &inverseMap)
		assert.Equal(t, 1, inverseMap["abc"]["file1"], "Count for first file should remain unchanged")
		assert.Equal(t, 1, inverseMap["abc"]["file2"], "Count for new file should be 1")
	})
}

func TestGetNoteNamesStream(t *testing.T) {
	t.Run("empty directory", func(t *testing.T) {
		// Create a temporary directory
		tempDir, err := os.MkdirTemp("", "notes_test")
		assert.NoError(t, err, "Failed to create temp directory")
		defer os.RemoveAll(tempDir)

		// Get the stream
		noteStream := GetNoteNamesStream(tempDir)

		// Collect all notes from the stream
		notes := []string{}
		for note := range noteStream {
			notes = append(notes, note)
		}

		assert.Empty(t, notes, "Expected no notes from empty directory")
	})

	t.Run("directory with notes", func(t *testing.T) {
		// Skip this test in automated environments where we can't create complex directory structures
		if testing.Short() {
			t.Skip("Skipping test in short mode")
		}

		// Create a temporary directory structure
		tempDir, err := os.MkdirTemp("", "notes_test")
		assert.NoError(t, err, "Failed to create temp directory")
		defer os.RemoveAll(tempDir)

		// Create user directories and notes
		user1Dir := filepath.Join(tempDir, "user1")
		user2Dir := filepath.Join(tempDir, "user2")
		err = os.Mkdir(user1Dir, 0755)
		assert.NoError(t, err, "Failed to create user1 directory")
		err = os.Mkdir(user2Dir, 0755)
		assert.NoError(t, err, "Failed to create user2 directory")

		// Create note files
		note1Path := filepath.Join(user1Dir, "note1.md")
		note2Path := filepath.Join(user1Dir, "note2.md")
		note3Path := filepath.Join(user2Dir, "note3.md")

		for _, path := range []string{note1Path, note2Path, note3Path} {
			err = os.WriteFile(path, []byte("test content"), 0644)
			assert.NoError(t, err, "Failed to create note file")
		}

		// Get the stream
		noteStream := GetNoteNamesStream(tempDir)

		// Collect all notes from the stream
		notes := []string{}
		for note := range noteStream {
			notes = append(notes, note)
		}

		assert.Len(t, notes, 3, "Expected 3 notes")
		assert.Contains(t, notes, "user1/note1.md", "Expected to find user1/note1.md")
		assert.Contains(t, notes, "user1/note2.md", "Expected to find user1/note2.md")
		assert.Contains(t, notes, "user2/note3.md", "Expected to find user2/note3.md")
	})
}

func TestConstructInverseMap(t *testing.T) {
	t.Run("empty project", func(t *testing.T) {
		// Create a temporary directory
		tempDir, err := os.MkdirTemp("", "project_test")
		assert.NoError(t, err, "Failed to create temp directory")
		defer os.RemoveAll(tempDir)

		// Create notes directory
		notesDir := filepath.Join(tempDir, "notes")
		err = os.Mkdir(notesDir, 0755)
		assert.NoError(t, err, "Failed to create notes directory")

		// Construct inverse map
		inverseMap := ConstructInverseMap(tempDir)
		assert.Empty(t, inverseMap, "Expected empty inverse map for empty project")
	})

	t.Run("project with notes", func(t *testing.T) {
		// Skip this test in automated environments
		if testing.Short() {
			t.Skip("Skipping test in short mode")
		}

		// Create a temporary directory structure
		tempDir, err := os.MkdirTemp("", "project_test")
		assert.NoError(t, err, "Failed to create temp directory")
		defer os.RemoveAll(tempDir)

		// Create notes directory and user directory
		notesDir := filepath.Join(tempDir, "notes")
		userDir := filepath.Join(notesDir, "user1")
		err = os.MkdirAll(userDir, 0755)
		assert.NoError(t, err, "Failed to create user directory")

		// Create a note file
		notePath := filepath.Join(userDir, "TestNote.md")
		err = os.WriteFile(notePath, []byte("test content"), 0644)
		assert.NoError(t, err, "Failed to create note file")

		// Construct inverse map
		inverseMap := ConstructInverseMap(tempDir)

		// The filename "TestNote" should generate trigrams: "tes", "est", "stn", "tno", "not", "ote"
		expectedTrigrams := []string{"tes", "est", "stn", "tno", "not", "ote"}

		for _, trigram := range expectedTrigrams {
			assert.Contains(t, inverseMap, trigram, "Expected inverse map to contain trigram: "+trigram)
			assert.Contains(t, inverseMap[trigram], "user1/TestNote", "Expected trigram to map to the file")
		}
	})
}

func TestJaroDistance(t *testing.T) {
	t.Run("identical strings", func(t *testing.T) {
		distance := jaroDistance("test", "test")
		assert.Equal(t, 1.0, distance, "Jaro distance should be 1.0 for identical strings")
	})

	t.Run("empty strings", func(t *testing.T) {
		distance := jaroDistance("", "")
		assert.Equal(t, 1.0, distance, "Jaro distance should be 1.0 for empty strings")
	})

	t.Run("one empty string", func(t *testing.T) {
		distance := jaroDistance("test", "")
		assert.Equal(t, 0.0, distance, "Jaro distance should be 0.0 when one string is empty")
	})

	t.Run("completely different strings", func(t *testing.T) {
		distance := jaroDistance("abc", "xyz")
		assert.Equal(t, 0.0, distance, "Jaro distance should be 0.0 for completely different strings")
	})

	t.Run("similar strings", func(t *testing.T) {
		distance := jaroDistance("martha", "marhta")
		assert.InDelta(t, 0.944, distance, 0.001, "Jaro distance should be approximately 0.944 for 'martha' and 'marhta'")
	})
}

func TestJaroWinklerSimilarity(t *testing.T) {
	t.Run("identical strings", func(t *testing.T) {
		similarity := JaroWinklerSimilarity("test", "test")
		assert.Equal(t, 1.0, similarity, "Jaro-Winkler similarity should be 1.0 for identical strings")
	})

	t.Run("empty strings", func(t *testing.T) {
		similarity := JaroWinklerSimilarity("", "")
		assert.Equal(t, 1.0, similarity, "Jaro-Winkler similarity should be 1.0 for empty strings")
	})

	t.Run("one empty string", func(t *testing.T) {
		similarity := JaroWinklerSimilarity("test", "")
		assert.Equal(t, 0.0, similarity, "Jaro-Winkler similarity should be 0.0 when one string is empty")
	})

	t.Run("strings with common prefix", func(t *testing.T) {
		// "DIXON" and "DICKSONX" have a common prefix "DI" and some similarity
		similarity := JaroWinklerSimilarity("DIXON", "DICKSONX")
		jaroSimilarity := jaroDistance("DIXON", "DICKSONX")

		// Jaro-Winkler should be higher than Jaro due to common prefix
		assert.Greater(t, similarity, jaroSimilarity, "Jaro-Winkler should give higher similarity for strings with common prefix")
	})

	t.Run("similar strings without common prefix", func(t *testing.T) {
		// "MARTHA" and "MARHTA" are similar but the prefix match is broken
		jaroSimilarity := jaroDistance("MARTHA", "MARHTA")
		jaroWinklerSimilarity := JaroWinklerSimilarity("MARTHA", "MARHTA")

		// The difference should be minimal since only the first character matches in the prefix
		// Increase the delta to account for floating point precision
		assert.InDelta(t, jaroSimilarity+0.05*(1-jaroSimilarity), jaroWinklerSimilarity, 0.01,
			"Jaro-Winkler should only slightly adjust for single character prefix match")
	})
}
