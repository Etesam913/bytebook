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

#### Installing react dependencies

```
cd frontend && pnpm install
```

#### Configure husky

```
pnpm husky:prepare
```

## 🏃‍➡️ Run (in root bytebook/ directory)

```
wails3 dev --port 5173
```

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
