package messaging

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/pebbe/zmq4"
)

const (
	KERNEL_KEY = "abc123"
)

// Header defines the structure for the message header.
type Header struct {
	MsgID    string `json:"msg_id"`
	Username string `json:"username"`
	Session  string `json:"session"`
	MsgType  string `json:"msg_type"`
	Version  string `json:"version"`
	Date     string `json:"date"`
}

// Message represents a Jupyter message envelope.
type Message struct {
	Header       Header         `json:"header"`
	ParentHeader map[string]any `json:"parent_header"`
	Metadata     map[string]any `json:"metadata"`
	Content      map[string]any `json:"content"`
}

const (
	delimiter = "<IDS|MSG>"
)

// Creates a header as defined here: https://jupyter-client.readthedocs.io/en/latest/messaging.html#message-header
func newHeader(msgID, msgType, session, username string) Header {
	return Header{
		MsgID:    msgID,
		Username: username,
		Session:  session,
		MsgType:  msgType,
		Date:     time.Now().UTC().Format(time.RFC3339),
		Version:  "5.0",
	}
}

// signMessage computes an HMAC-SHA256 signature as defined here: https://jupyter-client.readthedocs.io/en/latest/messaging.html#the-wire-protocol
func signMessage(parts []string) string {
	h := hmac.New(sha256.New, []byte(KERNEL_KEY))
	for _, part := range parts {
		h.Write([]byte(part))
	}
	return hex.EncodeToString(h.Sum(nil))
}

// createMultipartMessage assembles the complete multipart message envelope.
// The envelope consists of identity frames, a delimiter, the HMAC signature, and then
// the JSON-serialized message parts in the order: header, parent_header, metadata, content.
// Defined here: https://jupyter-client.readthedocs.io/en/latest/messaging.html#the-wire-protocol
func createMultipartMessage(identities []string, msg Message) ([][]byte, error) {
	// Marshal each part into JSON.
	headerBytes, err := json.Marshal(msg.Header)
	if err != nil {
		return nil, fmt.Errorf("error marshalling header: %w", err)
	}
	parentHeaderBytes, err := json.Marshal(msg.ParentHeader)
	if err != nil {
		return nil, fmt.Errorf("error marshalling parent header: %w", err)
	}
	metadataBytes, err := json.Marshal(msg.Metadata)
	if err != nil {
		return nil, fmt.Errorf("error marshalling metadata: %w", err)
	}
	contentBytes, err := json.Marshal(msg.Content)
	if err != nil {
		return nil, fmt.Errorf("error marshalling content: %w", err)
	}

	// Prepare the parts for signing.
	partsForSign := []string{
		string(headerBytes),
		string(parentHeaderBytes),
		string(metadataBytes),
		string(contentBytes),
	}

	// Generating the hmac signature
	signature := signMessage(partsForSign)

	// Build the envelope.
	var envelope [][]byte

	// Append identity frames.
	for _, id := range identities {
		envelope = append(envelope, []byte(id))
	}

	// Append the delimiter.
	envelope = append(envelope, []byte(delimiter))
	// Append signature and the serialized message parts.
	envelope = append(envelope, []byte(signature))
	envelope = append(envelope, headerBytes)
	envelope = append(envelope, parentHeaderBytes)
	envelope = append(envelope, metadataBytes)
	envelope = append(envelope, contentBytes)

	return envelope, nil
}

// ParseMultipartMessage parses an incoming multipart envelope into its components.
// It returns the identities, the deserialized Message, and the signature.
func ParseMultipartMessage(envelope [][]byte) (identities []string, msg Message, signature string, err error) {
	// Locate the delimiter frame.
	delimiterIndex := -1
	for i, frame := range envelope {
		if string(frame) == delimiter {
			delimiterIndex = i
			break
		}
	}
	if delimiterIndex == -1 {
		err = fmt.Errorf("delimiter not found in message")
		return
	}

	// All frames before the delimiter are identities.
	for i := range delimiterIndex {
		identities = append(identities, string(envelope[i]))
	}

	// Check for at least 5 frames after the delimiter:
	// 1: signature, 2: header, 3: parent header, 4: metadata, 5: content.
	if len(envelope) < delimiterIndex+6 {
		err = fmt.Errorf("not enough frames after delimiter")
		return
	}

	signature = string(envelope[delimiterIndex+1])
	headerBytes := envelope[delimiterIndex+2]
	parentHeaderBytes := envelope[delimiterIndex+3]
	metadataBytes := envelope[delimiterIndex+4]
	contentBytes := envelope[delimiterIndex+5]

	// Unmarshal the JSON parts.
	if err = json.Unmarshal(headerBytes, &msg.Header); err != nil {
		err = fmt.Errorf("error unmarshalling header: %w", err)
		return
	}
	if err = json.Unmarshal(parentHeaderBytes, &msg.ParentHeader); err != nil {
		err = fmt.Errorf("error unmarshalling parent header: %w", err)
		return
	}
	if err = json.Unmarshal(metadataBytes, &msg.Metadata); err != nil {
		err = fmt.Errorf("error unmarshalling metadata: %w", err)
		return
	}
	if err = json.Unmarshal(contentBytes, &msg.Content); err != nil {
		err = fmt.Errorf("error unmarshalling content: %w", err)
		return
	}
	return
}

type ExecuteMessageParams struct {
	MessageID string
	SessionID string
	Code      string
}

func SendExecuteRequest(socket *zmq4.Socket, params ExecuteMessageParams) error {
	// Define identities for routing (e.g., client and kernel IDs).
	identities := []string{"client_identity", "kernel_identity"}

	// Create a header for an execute_request message.
	header := newHeader(params.MessageID, "execute_request", params.SessionID, "username")

	// Create the content for the execute_request message.
	// This includes the code to execute and other execution options.
	content := map[string]any{
		"code":             params.Code,
		"silent":           false,
		"store_history":    true,
		"user_expressions": map[string]any{},
		"allow_stdin":      false,
		"stop_on_error":    true,
	}

	// Build the complete message.
	msg := Message{
		Header:       header,
		ParentHeader: map[string]any{}, // If this message is a reply, include parent's header info.
		Metadata:     map[string]any{}, // Additional metadata can go here.
		Content:      content,
	}

	// Assemble the multipart message envelope.
	envelope, err := createMultipartMessage(identities, msg)
	if err != nil {
		return fmt.Errorf("failed to create multipart message: %w", err)
	}

	// Send the envelope over the ZeroMQ socket.
	// Each element of the envelope is a frame.
	_, err = socket.SendMessage(envelope)
	if err != nil {
		return fmt.Errorf("failed to send multipart message: %w", err)
	}

	log.Println("execute_request 💬 sent successfully")
	return nil
}
