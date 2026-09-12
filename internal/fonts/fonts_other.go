//go:build !darwin

package fonts

import (
	"context"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

func systemFamilies() ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	command := exec.CommandContext(ctx, "fc-list", "--format=%{family[0]}\n")
	if runtime.GOOS == "windows" {
		command = exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-NonInteractive", "-Command", `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Add-Type -AssemblyName System.Drawing; $fonts = New-Object System.Drawing.Text.InstalledFontCollection; try { $fonts.Families | ForEach-Object { $_.Name } } finally { $fonts.Dispose() }`)
	}
	output, err := command.Output()
	if err != nil {
		return nil, err
	}
	return strings.Split(strings.TrimPrefix(string(output), "\ufeff"), "\n"), nil
}
