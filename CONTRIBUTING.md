# Want to Contribute?


### Running GitHub Actions Locally
* Install [act](https://github.com/nektos/act)
```bash
brew install act
```
* Make sure docker is running
* Run the below to run the `biome` job
```bash
act -j biome
```

* Add `--container-architecture linux/amd64` if on Apple Silicon
```bash
act -j biome --container-architecture linux/amd64
```
