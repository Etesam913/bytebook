package git

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/wailsapp/wails/v3/pkg/application"
)

var GITHUB_CLIENT_ID = "Ov23liBxzSobDbxBY9UJ"

// corsHandler is a middleware function that adds CORS headers to the response
func corsHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// readJSONBody reads and unmarshals the JSON body of an HTTP request into the specified type T.
// It returns the unmarshaled data and any error encountered during reading or unmarshaling.
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

// makeHTTPRequest is a helper function for making HTTP requests with specified method, URL, headers, and body.
// It returns the HTTP response and any error encountered during the request creation or execution.
func makeHTTPRequest(method, url string, headers map[string]string, body []byte) (*http.Response, error) {
	client := &http.Client{}
	req, err := http.NewRequest(method, url, bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	for key, value := range headers {
		req.Header.Add(key, value)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}

	return resp, nil
}

// AccessTokenBody represents the structure for access token requests and responses
type AccessTokenBody struct {
	AccessToken string `json:"access_token"`
}

// revokeAuthToken handles HTTP requests to revoke a GitHub authentication token.
// It expects a DELETE request with an access token in the request body.
func revokeAuthToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	bodyData, err := readJSONBody[AccessTokenBody](w, r)
	if err != nil {
		return
	}

	accessToken := bodyData.AccessToken

	payload := map[string]string{
		"access_token": accessToken,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, "Failed to marshal payload", http.StatusInternalServerError)
		return
	}

	resp, err := makeHTTPRequest(
		http.MethodDelete,
		"https://us-central1-inner-radius-446219-f7.cloudfunctions.net/revoke-github-auth-token",
		map[string]string{},
		jsonData,
	)
	if err != nil {
		http.Error(w, "Failed to revoke token", http.StatusInternalServerError)
		return
	}

	defer resp.Body.Close()

	_, err = io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response body", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)

}

// loginToGithub handles HTTP requests to initiate GitHub OAuth login.
// It redirects the user to GitHub's authorization page with appropriate parameters.
func loginToGithub(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}
	baseURL := "https://github.com/login/oauth/authorize"
	params := url.Values{}
	params.Add("client_id", GITHUB_CLIENT_ID)
	params.Add("scope", "repo")
	fullURL := fmt.Sprintf("%s?%s", baseURL, params.Encode())
	http.Redirect(w, r, fullURL, http.StatusSeeOther)
}

// githubAuthCallback handles the OAuth callback from GitHub after user authorization.
// It exchanges the authorization code for an access token and emits an event with the token.
func githubAuthCallback(w http.ResponseWriter, r *http.Request) {
	codeParam := r.URL.Query().Get("code")
	if codeParam == "" {
		http.Error(w, "No code provided", http.StatusBadRequest)
		return
	}

	payload := map[string]string{
		"code": codeParam,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, "Failed to marshal payload", http.StatusInternalServerError)
		return
	}
	headers := map[string]string{
		"Content-Type": "application/json",
	}

	resp, err := makeHTTPRequest(
		http.MethodPost,
		"https://us-central1-inner-radius-446219-f7.cloudfunctions.net/get-github-access-token",
		headers,
		jsonData,
	)

	if err != nil {
		return
	}

	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response body", http.StatusInternalServerError)
		return
	}

	values, err := url.ParseQuery(string(body))
	if err != nil {
		http.Error(w, "Failed to parse response body", http.StatusInternalServerError)
		return
	}

	accessToken := values.Get("access_token")
	if accessToken == "" {
		http.Error(w, "No access token", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "https://google.com", http.StatusSeeOther)
	app := application.Get()
	app.EmitEvent("auth:access-token", accessToken)
}

// LaunchAuthServer starts an HTTP server on port 8000 to handle GitHub authentication.
// It sets up routes for login, callback, and logout endpoints with CORS support.
func LaunchAuthServer() {
	mux := http.NewServeMux()
	mux.HandleFunc("/auth/github/login", loginToGithub)
	mux.HandleFunc("/auth/github/callback", githubAuthCallback)
	mux.HandleFunc("/auth/github/logout", revokeAuthToken)

	corsMux := corsHandler(mux)

	port := "8000"
	fmt.Printf("Server is starting on port %s...\n", port)
	http.ListenAndServe(":"+port, corsMux)
}
