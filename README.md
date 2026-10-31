## 🟩 Bytebook

- A beautiful fast note-taking app for developers

## 📦 Installation

### Clone the repo

```
git clone https://github.com/etesam913/bytebook.git
```

### Install dependencies

Use Go 1.26 or newer and Bun 1.4.4. The Go module replaces Wails with
`../wails/v3`; check out Wails v3.1.0 there and build the `wails3` CLI from
that checkout so it matches the frontend runtime.

#### Install golang dependencies

```
go mod tidy
```

```
go install gotest.tools/gotestsum@latest
```

#### Installing react dependencies

```
cd frontend && bun install
```

## 🏃‍➡️ Run (in root bytebook/ directory)

```
task dev
```

Or from the frontend directory:

```bash
cd frontend
bun dev
```

On macOS, development launches `bin/Bytebook.dev.app` with its own Bytebook Dev
identity instead of a bare executable associated with the terminal. Wails still
captures logs and restarts the app after Go changes. Development builds enable
the local Wails fork's Web Inspector bridge; use **View → Open Developer Tools**
or **⌥⌘I**. After changing the development build or launch tasks, stop and restart
`bun dev` to apply them.

## 🧪 Tests

Run frontend and backend checks and tests from the repository root:

```bash
bun check
```

Use `bun check:fe` or `bun check:be` to check one layer.
