package io_helpers

import (
	"encoding/json"
	"os"
)

func WriteJsonToPath(pathname string, data interface{}) error {
	jsonData, err := json.MarshalIndent(data, "", "    ")
	if err != nil {
		return err
	}
	file, err := os.Create(pathname)
	if err != nil {
		return err
	}
	defer file.Close()
	_, err = file.Write(jsonData)
	if err != nil {
		return err
	}
	return nil
}
