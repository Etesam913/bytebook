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

func readJSONBody[T any](w http.ResponseWriter, r *http.Request) (T, error) {
	var data T

	// Read the body of the request
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Unable to read request body", http.StatusBadRequest)
		return data, err
	}
	defer r.Body.Close()

	// Unmarshal the JSON data into the generic type T
	err = json.Unmarshal(body, &data)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return data, err
	}

	return data, nil
}

type authTokenBody struct {
	AuthToken string `json:"auth_token"`
}

func revokeAuthToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}
	url := fmt.Sprintf("https://api.github.com/applications/%s/grant", GithubClientId)

	bodyData, err := readJSONBody[authTokenBody](w, r)
	if err != nil {
		return
	}

	// Get the access token
	payload := map[string]string{
		"client_id":    GithubClientId,
		"acesss_token": bodyData.AuthToken,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		fmt.Println("Failed to marshal payload")
		http.Error(w, "Failed to marshal payload", http.StatusInternalServerError)
	}
	req, err := http.NewRequest("DELETE", url, bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Println("Failed to create request")
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
	}
	req.Header.Set("Content-Type", "application/json")

}

func loginToGithub(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}
	baseURL := "https://github.com/login/oauth/authorize"
	params := url.Values{}
	params.Add("client_id", GithubClientId)
	params.Add("scope", "repo")
	fullURL := fmt.Sprintf("%s?%s", baseURL, params.Encode())
	fmt.Println(fullURL)
	http.Redirect(w, r, fullURL, http.StatusSeeOther)
}

func githubAuthCallback(w http.ResponseWriter, r *http.Request) {
	codeParam := r.URL.Query().Get("code")
	referer := r.Header.Get("Referer")
	fmt.Println("referer: ", referer)
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

	http.Redirect(w, r, "https://google.com", http.StatusSeeOther)
	app := application.Get()
	app.EmitEvent("auth:access-token", accessToken)
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
