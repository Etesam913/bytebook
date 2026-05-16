package lsp

import (
	"strings"
	"testing"

	"go.lsp.dev/protocol"
)

func TestVirtualDocSingleBlock(t *testing.T) {
	v := NewVirtualDoc()
	v.UpsertBlock("a", 0, "x = 1\ny = 2")

	got := v.FullText()
	want := "x = 1\ny = 2"
	if got != want {
		t.Fatalf("FullText() = %q, want %q", got, want)
	}
	if v.Version() != 1 {
		t.Fatalf("Version() = %d, want 1", v.Version())
	}

	pos, ok := v.TranslateBlockToDoc("a", protocol.Position{Line: 1, Character: 3})
	if !ok {
		t.Fatal("translation failed for known block")
	}
	if pos.Line != 1 || pos.Character != 3 {
		t.Fatalf("got %+v, want line=1 char=3", pos)
	}
}

func TestVirtualDocMultipleBlocksOffsets(t *testing.T) {
	v := NewVirtualDoc()
	v.UpsertBlock("a", 0, "a = 1\nb = 2") // 2 lines
	v.UpsertBlock("b", 1, "c = 3")        // 1 line
	v.UpsertBlock("c", 2, "d = 4\ne = 5") // 2 lines

	// Block A occupies lines 0..1; separator + blank = 2 lines; B at line 4; etc.
	want := "a = 1\nb = 2" + "\n\n" + "# --- bytebook block 1 ---\n" + "c = 3" +
		"\n\n" + "# --- bytebook block 2 ---\n" + "d = 4\ne = 5"
	if got := v.FullText(); got != want {
		t.Fatalf("FullText mismatch:\n got: %q\nwant: %q", got, want)
	}

	// Block-local (b, 0, 0) → synthetic doc line 4 (after a's 2 lines + blank + separator).
	pos, ok := v.TranslateBlockToDoc("b", protocol.Position{Line: 0, Character: 0})
	if !ok {
		t.Fatal("translation failed for block b")
	}
	if pos.Line != 4 || pos.Character != 0 {
		t.Fatalf("block b origin: got %+v, want line=4 char=0", pos)
	}

	// Block-local (c, 1, 4) → synthetic doc line 7.
	pos, ok = v.TranslateBlockToDoc("c", protocol.Position{Line: 1, Character: 4})
	if !ok {
		t.Fatal("translation failed for block c")
	}
	if pos.Line != 8 || pos.Character != 4 {
		t.Fatalf("block c position: got %+v, want line=8 char=4", pos)
	}
}

func TestVirtualDocOrderingNotInsertionOrder(t *testing.T) {
	v := NewVirtualDoc()
	v.UpsertBlock("late", 5, "late_var = 1")
	v.UpsertBlock("early", 1, "early_var = 1")

	got := v.FullText()
	if !strings.HasPrefix(got, "early_var") {
		t.Fatalf("ordering broken; FullText starts with %q", got)
	}
	earlyIdx := strings.Index(got, "early_var")
	lateIdx := strings.Index(got, "late_var")
	if earlyIdx >= lateIdx {
		t.Fatalf("early block did not precede late block: early=%d late=%d", earlyIdx, lateIdx)
	}
}

func TestVirtualDocUpsertReplacesContent(t *testing.T) {
	v := NewVirtualDoc()
	v.UpsertBlock("a", 0, "old")
	v.UpsertBlock("a", 0, "new")
	if got := v.FullText(); got != "new" {
		t.Fatalf("after upsert FullText = %q, want %q", got, "new")
	}
	if v.blockCount() != 1 {
		t.Fatalf("block count = %d, want 1", v.blockCount())
	}
}

func TestVirtualDocVersionBumpsOnChange(t *testing.T) {
	v := NewVirtualDoc()
	v0 := v.Version()
	v.UpsertBlock("a", 0, "x")
	v1 := v.Version()
	v.UpsertBlock("a", 0, "y")
	v2 := v.Version()
	v.RemoveBlock("a")
	v3 := v.Version()

	if !(v0 < v1 && v1 < v2 && v2 < v3) {
		t.Fatalf("versions did not increase monotonically: %d %d %d %d", v0, v1, v2, v3)
	}
}

func TestVirtualDocRemoveBlock(t *testing.T) {
	v := NewVirtualDoc()
	v.UpsertBlock("a", 0, "a = 1")
	v.UpsertBlock("b", 1, "b = 2")
	v.RemoveBlock("a")

	if v.blockCount() != 1 {
		t.Fatalf("block count after remove = %d, want 1", v.blockCount())
	}
	got := v.FullText()
	if got != "b = 2" {
		t.Fatalf("FullText after removing a = %q, want %q", got, "b = 2")
	}
	// Block b should now start at line 0.
	pos, ok := v.TranslateBlockToDoc("b", protocol.Position{Line: 0, Character: 0})
	if !ok {
		t.Fatal("translation failed for block b after remove")
	}
	if pos.Line != 0 {
		t.Fatalf("after removing a, b should start at line 0, got %d", pos.Line)
	}
}

func TestVirtualDocRemoveUnknownBlockNoop(t *testing.T) {
	v := NewVirtualDoc()
	v.UpsertBlock("a", 0, "a = 1")
	before := v.Version()
	v.RemoveBlock("does-not-exist")
	if v.Version() != before {
		t.Fatalf("Version() bumped for no-op remove: before=%d after=%d", before, v.Version())
	}
}

func TestVirtualDocTranslateUnknownBlock(t *testing.T) {
	v := NewVirtualDoc()
	if _, ok := v.TranslateBlockToDoc("nope", protocol.Position{}); ok {
		t.Fatal("translation should fail for unknown block")
	}
}

func TestVirtualDocTranslateDocToBlock(t *testing.T) {
	v := NewVirtualDoc()
	v.UpsertBlock("a", 0, "a = 1\nb = 2") // doc lines 0,1
	v.UpsertBlock("b", 1, "c = 3")        // doc line 4

	id, pos, ok := v.TranslateDocToBlock(protocol.Position{Line: 1, Character: 2})
	if !ok || id != "a" || pos.Line != 1 || pos.Character != 2 {
		t.Fatalf("doc(1,2) -> %q %+v ok=%v, want a (1,2) true", id, pos, ok)
	}
	id, pos, ok = v.TranslateDocToBlock(protocol.Position{Line: 4, Character: 0})
	if !ok || id != "b" || pos.Line != 0 {
		t.Fatalf("doc(4,0) -> %q %+v ok=%v, want b (0,0) true", id, pos, ok)
	}
	// Separator lines belong to no block.
	if _, _, ok := v.TranslateDocToBlock(protocol.Position{Line: 2, Character: 0}); ok {
		t.Fatal("separator line 2 should not map to any block")
	}
	if _, _, ok := v.TranslateDocToBlock(protocol.Position{Line: 99, Character: 0}); ok {
		t.Fatal("out-of-range line should not map to any block")
	}
}

func TestCountLines(t *testing.T) {
	cases := []struct {
		in   string
		want int
	}{
		{"", 1},
		{"a", 1},
		{"a\nb", 2},
		{"a\n", 1},
		{"a\nb\n", 2},
		{"\n", 1},
	}
	for _, tc := range cases {
		if got := countLines(tc.in); got != tc.want {
			t.Errorf("countLines(%q) = %d, want %d", tc.in, got, tc.want)
		}
	}
}
