package auth_server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"

	"github.com/wailsapp/wails/v3/pkg/application"
)

var GithubClientId = os.Getenv("GITHUB_CLIENT_ID")

// CORSHandler is a middleware function that adds CORS headers to the response
func CORSHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func helloHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello, World!")
}

func loginToGithub(w http.ResponseWriter, r *http.Request) {
	baseURL := "https://github.com/login/oauth/authorize"
	params := url.Values{}
	params.Add("client_id", GithubClientId)
	fullURL := fmt.Sprintf("%s?%s", baseURL, params.Encode())
	fmt.Println(fullURL)
	http.Redirect(w, r, fullURL, http.StatusSeeOther)
}

func githubAuthCallback(w http.ResponseWriter, r *http.Request) {
	codeParam := r.URL.Query().Get("code")
	if codeParam == "" {
		fmt.Println("No code provided")
		http.Error(w, "No code provided", http.StatusBadRequest)
	}

	// Get the access token
	payload := map[string]string{
		"client_id":     GithubClientId,
		"client_secret": os.Getenv("GITHUB_CLIENT_SECRET"),
		"code":          codeParam,
		"redirect_uri":  os.Getenv("GITHUB_REDIRECT_URI"),
	}
	jsonData, err := json.Marshal(payload)
	if err != nil {
		fmt.Println("Failed to marshal payload")
		http.Error(w, "Failed to marshal payload", http.StatusInternalServerError)
	}

	req, err := http.NewRequest("POST", "https://github.com/login/oauth/access_token", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Println("Failed to create request")
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Failed to send request")
		http.Error(w, "Failed to send request", http.StatusInternalServerError)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Failed to read response body")
		http.Error(w, "Failed to read response body", http.StatusInternalServerError)
	}

	values, err := url.ParseQuery(string(body))
	if err != nil {
		fmt.Println("Failed to parse response body")
		http.Error(w, "Failed to parse response body", http.StatusInternalServerError)
	}

	accessToken := values.Get("access_token")

	if accessToken == "" {
		fmt.Println("No access token")
		http.Error(w, "No access token", http.StatusInternalServerError)
	}

	http.Redirect(w, r, "http://localhost:3000", http.StatusSeeOther)
	app := application.Get()
	app.Events.Emit(&application.WailsEvent{
		Name: "auth:access-token",
		Data: accessToken,
	})

}

func LaunchAuthServer() {
	mux := http.NewServeMux()
	mux.HandleFunc("/", helloHandler)
	mux.HandleFunc("/auth/github", loginToGithub)
	mux.HandleFunc("/auth/github/callback", githubAuthCallback)

	// Wrap the mux with the CORS middleware
	corsMux := CORSHandler(mux)

	port := "8000"
	fmt.Printf("Server is starting on port %s...\n", port)
	http.ListenAndServe(":"+port, corsMux)
}
