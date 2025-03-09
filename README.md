## 🟩 Bytebook

* A beautiful fast note-taking app for developers

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
```bash
gotestsum --watch
```

### react
tbd...
