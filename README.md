## 🟩 Bytebook

- A beautiful fast note-taking app for developers

## 📦 Installation

### Clone the repo

```
git clone https://github.com/etesam913/bytebook.git
```

### Install dependencies

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

### golang

#### Run all Tests

With caching:

```bash
gotestsum --format=pkgname --format-icons=hivis ./internal/...
```

No caching:

```bash
gotestsum --format=pkgname --format-icons=hivis -- -count=1  ./internal/...
```

#### Run tests that are being developed in watch mode

```bash
gotestsum --watch
```

### react

tbd...
