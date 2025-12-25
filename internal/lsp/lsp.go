package lsp

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

// Configure the upgrader
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// CheckOrigin allows us to accept requests from different domains (CORS)
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var PORT = ":9993"

func handleConnections(w http.ResponseWriter, r *http.Request) {
	// 1. Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	fmt.Println("Client connected!")

	// 2. Continuous loop for reading/writing messages
	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			log.Println("Read error:", err)
			break
		}

		log.Printf("Received: %s", string(p))

		// 3. Echo the message back to the client
		if err := conn.WriteMessage(messageType, p); err != nil {
			log.Println("Write error:", err)
			break
		}
	}
}

func CreateLanguageServerProtocol() {
	http.HandleFunc("/ws", handleConnections)
	fmt.Printf("Server started on %s", PORT)
	log.Fatal(http.ListenAndServe(PORT, nil))
}
