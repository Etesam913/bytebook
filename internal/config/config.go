package config

import (
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// GetApp retrieves the global application instance or exits on failure.
func GetApp() *application.App {
	app := application.Get()
	if app == nil {
		log.Fatalf("GetApp() Error: could not get application")
	}
	return app
}
