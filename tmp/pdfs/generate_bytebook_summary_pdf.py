import os
from pathlib import Path

OUTPUT_PDF = Path('/Users/etesam/Coding/bytebook/output/pdf/bytebook-app-summary.pdf')

PAGE_WIDTH = 612
PAGE_HEIGHT = 792
LEFT = 42
RIGHT = 42
TOP = 758
BOTTOM = 42


def esc(text: str) -> str:
    return text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')


def line_cmd(x: float, y: float, font: str, size: float, text: str) -> str:
    return f"BT /{font} {size} Tf 1 0 0 1 {x:.2f} {y:.2f} Tm ({esc(text)}) Tj ET"


def build_lines():
    lines = []
    y = TOP

    def add(text: str, font: str = 'F1', size: float = 10.5, gap: float = 13.0, x: float = LEFT):
        nonlocal y
        lines.append((x, y, font, size, text))
        y -= gap

    add('Bytebook - One-Page App Summary', font='F2', size=18, gap=20)

    add('What it is', font='F2', size=12, gap=14)
    add('Bytebook is a local-first, open-source note-taking desktop app for developers.')
    add('It combines markdown notes, attachments, search, and executable code blocks in one app.', gap=16)

    add('Who it is for', font='F2', size=12, gap=14)
    add('Primary persona: developers who keep technical notes with code and want local file ownership.', gap=16)

    add('What it does', font='F2', size=12, gap=14)
    add('- Creates, renames, moves, and trashes notes/folders under a local notes workspace.')
    add('- Supports tags on notes and attachment files, including bulk tag updates.')
    add('- Provides full-text search with filters (file/folder, tag, type, language) and saved searches.')
    add('- Renders attachments in notes (image, video, pdf) and serves them from local /notes paths.')
    add('- Executes code blocks through kernels (python, go, javascript, java) with run/interrupt/shutdown.')
    add('- Stores project settings for theme, note width, editor font, and code execution options.', gap=16)

    add('How it works (repo-evidenced architecture)', font='F2', size=12, gap=14)
    add('- UI: React + TypeScript app (`frontend/src/App.tsx`) with routes for notes, search, saved searches, kernels.')
    add('- Bridge: Wails v3 bindings (`frontend/bindings/...`) call Go backend services registered in `internal/main.go`.')
    add('- Services: folder, note, file-tree, node/attachments, search, tags, settings, and code execution services.')
    add('- Data: local project directory at ~/Library/Application Support/Bytebook with notes/, settings/, code/, search/.')
    add('- Search: Bleve index over notes and attachments with extracted text/tags/code-language metadata.')
    add('- Sync flow: fsnotify watcher emits Wails events for note/folder/tag/settings updates to refresh UI/index.', gap=16)

    add('How to run (minimal)', font='F2', size=12, gap=14)
    add('1. Clone repo: `git clone https://github.com/etesam913/bytebook.git`')
    add('2. Install Go deps: `go mod tidy`')
    add('3. Install frontend deps: `cd frontend && bun install`')
    add('4. Start app from repo root: `wails3 dev --port 5173` (or `task dev`)')
    add('5. Not found in repo: explicit install instructions for `wails3` CLI and kernel runtimes.', gap=0)

    if y < BOTTOM:
        raise RuntimeError(f'Content overflow: y={y:.2f} < bottom={BOTTOM}')

    return lines


def build_pdf(lines):
    stream_lines = [line_cmd(x, y, font, size, text) for (x, y, font, size, text) in lines]
    content = ('\n'.join(stream_lines) + '\n').encode('ascii')

    objects = []

    def add_obj(payload: bytes):
        objects.append(payload)

    add_obj(b"<< /Type /Catalog /Pages 2 0 R >>")
    add_obj(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    add_obj(
        (
            "<< /Type /Page /Parent 2 0 R "
            f"/MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
            "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> "
            "/Contents 4 0 R >>"
        ).encode('ascii')
    )
    add_obj(b"<< /Length " + str(len(content)).encode('ascii') + b" >>\nstream\n" + content + b"endstream")
    add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    pdf = bytearray()
    pdf.extend(b"%PDF-1.4\n")

    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{i} 0 obj\n".encode('ascii'))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode('ascii'))
    pdf.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        pdf.extend(f"{off:010d} 00000 n \n".encode('ascii'))

    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_start}\n%%EOF\n"
        ).encode('ascii')
    )

    OUTPUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PDF.write_bytes(pdf)


if __name__ == '__main__':
    lines = build_lines()
    build_pdf(lines)
    print(str(OUTPUT_PDF))
