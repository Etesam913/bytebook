package auth_server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/wailsapp/wails/v3/pkg/application"
)
var GithubClientId = "Ov23liBxzSobDbxBY9UJ"

// CORSHandler is a middleware function that adds CORS headers to the response
func CORSHandler(next http.Handler) http.Handler {
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

// Helper function for making HTTP requests
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

type AccessTokenBody struct {
	AccessToken string `json:"access_token"`
}

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

	defer resp.Body.Close()

	_, err = io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response body", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)

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
	http.Redirect(w, r, fullURL, http.StatusSeeOther)
}

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

	if err != nil{
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

	fmt.Println("deez", values)
	accessToken := values.Get("access_token")
	if accessToken == "" {
		http.Error(w, "No access token", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "https://google.com", http.StatusSeeOther)
	app := application.Get()
	app.EmitEvent("auth:access-token", accessToken)
}

func LaunchAuthServer() {
	mux := http.NewServeMux()
	mux.HandleFunc("/auth/github/login", loginToGithub)
	mux.HandleFunc("/auth/github/callback", githubAuthCallback)
	mux.HandleFunc("/auth/github/logout", revokeAuthToken)

	corsMux := CORSHandler(mux)

	port := "8000"
	fmt.Printf("Server is starting on port %s...\n", port)
	http.ListenAndServe(":"+port, corsMux)
}
