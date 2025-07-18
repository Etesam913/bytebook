package jupyter_protocol

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
	delimiter  = "<IDS|MSG>"
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

// RequestParams holds common parameters for sending messages.
type RequestParams struct {
	MessageID string
	SessionID string
	MsgType   string
	Username  string
	Content   map[string]any
}

// newHeader creates a header as defined in the Jupyter messaging protocol.
func newHeader(msgID, msgType, session, username string) Header {
	return Header{
		MsgID:    msgID,
		Username: username,
		Session:  session,
		MsgType:  msgType,
		Date:     time.Now().UTC().Format(time.RFC3339),
		Version:  "5.5",
	}
}

// signMessage computes an HMAC-SHA256 signature.
func signMessage(parts []string) string {
	h := hmac.New(sha256.New, []byte(KERNEL_KEY))
	for _, part := range parts {
		h.Write([]byte(part))
	}
	return hex.EncodeToString(h.Sum(nil))
}

// createMultipartMessage assembles the complete multipart message envelope.
func createMultipartMessage(identities []string, msg Message) ([][]byte, error) {
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

	partsForSign := []string{
		string(headerBytes),
		string(parentHeaderBytes),
		string(metadataBytes),
		string(contentBytes),
	}

	signature := signMessage(partsForSign)

	var envelope [][]byte
	for _, id := range identities {
		envelope = append(envelope, []byte(id))
	}
	envelope = append(envelope, []byte(delimiter))
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
	for i := 0; i < delimiterIndex; i++ {
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

// sendMessage is a helper that sends a message using the given parameters.
func sendMessage(socket *zmq4.Socket, params RequestParams) error {
	identities := []string{"client_identity", "kernel_identity"}
	header := newHeader(params.MessageID, params.MsgType, params.SessionID, params.Username)

	msg := Message{
		Header:       header,
		ParentHeader: map[string]any{},
		Metadata:     map[string]any{},
		Content:      params.Content,
	}

	envelope, err := createMultipartMessage(identities, msg)
	if err != nil {
		return fmt.Errorf("failed to create multipart message: %w", err)
	}

	_, err = socket.SendMessage(envelope)
	if err != nil {
		return fmt.Errorf("failed to send multipart message: %w", err)
	}

	return nil
}

// MessageParams contains common parameters used in all message types.
type MessageParams struct {
	MessageID string
	SessionID string
}

// ExecuteMessageParams contains parameters for execute request messages.
type ExecuteMessageParams struct {
	MessageParams
	Code string
}

// InputReplyMessageParams contains parameters for input reply messages.
type InputReplyMessageParams struct {
	MessageParams
	Value string
}

// CompleteRequestParams contains parameters for completion request messages.
type CompleteRequestParams struct {
	MessageParams
	Code      string
	CursorPos int
}

// InspectRequestParams contains parameters for inspection request messages.
type InspectRequestParams struct {
	MessageParams
	Code        string
	CursorPos   int
	DetailLevel int
}

// SendExecuteRequest sends an execute_request message to the kernel.
func SendExecuteRequest(shellDealerSocket *zmq4.Socket, params ExecuteMessageParams) error {
	requestParams := RequestParams{
		MessageID: fmt.Sprintf("%s|%s", params.MessageID, time.Now().Format(time.RFC3339)),
		SessionID: params.SessionID,
		MsgType:   "execute_request",
		Username:  "username",
		Content: map[string]any{
			"code":             params.Code,
			"silent":           false,
			"store_history":    true,
			"user_expressions": map[string]any{},
			"allow_stdin":      true,
			"stop_on_error":    true,
		},
	}

	if err := sendMessage(shellDealerSocket, requestParams); err != nil {
		return err
	}

	log.Println("execute_request 💬 sent successfully")
	return nil
}

// ShutdownMessageParams holds parameters specific to a shutdown_request.
type ShutdownMessageParams struct {
	MessageParams
	Restart bool
}

// SendShutdownMessage sends a shutdown_request message to the kernel.
func SendShutdownMessage(controlDealerSocket *zmq4.Socket, params ShutdownMessageParams) error {
	requestParams := RequestParams{
		MessageID: params.MessageID,
		SessionID: params.SessionID,
		MsgType:   "shutdown_request",
		Username:  "username",
		Content: map[string]any{
			"restart": params.Restart,
		},
	}

	if err := sendMessage(controlDealerSocket, requestParams); err != nil {
		return err
	}

	log.Println("shutdown_request 💬 sent successfully, restart:", params.Restart)
	return nil
}

// SendInterruptMessage sends an interrupt_request message to the kernel.
func SendInterruptMessage(controlDealerSocket *zmq4.Socket, params MessageParams) error {
	requestParams := RequestParams{
		MessageID: params.MessageID,
		SessionID: params.SessionID,
		MsgType:   "interrupt_request",
		Username:  "username",
		Content:   map[string]any{},
	}

	if err := sendMessage(controlDealerSocket, requestParams); err != nil {
		return fmt.Errorf("failed to send interrupt message: %w", err)
	}

	log.Println("interrupt_request 💬 sent successfully")
	return nil
}

// SendInputReplyMessage sends an input_reply message to the kernel in response to an input_request.
func SendInputReplyMessage(stdinDealerSocket *zmq4.Socket, params InputReplyMessageParams) error {
	requestParams := RequestParams{
		MessageID: params.MessageID,
		SessionID: params.SessionID,
		MsgType:   "input_reply",
		Username:  "username",
		Content: map[string]any{
			"value": params.Value,
		},
	}

	if err := sendMessage(stdinDealerSocket, requestParams); err != nil {
		return fmt.Errorf("failed to send input reply message: %w", err)
	}

	log.Println("input_reply 💬 sent successfully")
	return nil
}

// SendCompleteRequest sends a complete_request message to the kernel.
func SendCompleteRequest(shellDealerSocket *zmq4.Socket, params CompleteRequestParams) error {
	requestParams := RequestParams{
		MessageID: params.MessageID,
		SessionID: params.SessionID,
		MsgType:   "complete_request",
		Username:  "username",
		Content: map[string]any{
			"code":       params.Code,
			"cursor_pos": params.CursorPos,
		},
	}

	if err := sendMessage(shellDealerSocket, requestParams); err != nil {
		return fmt.Errorf("failed to send complete request message: %w", err)
	}

	log.Println("complete_request 💬 sent successfully")
	return nil
}

// SendInspectRequest sends an inspect_request message to the kernel.
func SendInspectRequest(shellDealerSocket *zmq4.Socket, params InspectRequestParams) error {
	requestParams := RequestParams{
		MessageID: params.MessageID,
		SessionID: params.SessionID,
		MsgType:   "inspect_request",
		Username:  "username",
		Content: map[string]any{
			"code":         params.Code,
			"cursor_pos":   params.CursorPos,
			"detail_level": params.DetailLevel,
		},
	}

	if err := sendMessage(shellDealerSocket, requestParams); err != nil {
		return fmt.Errorf("failed to send inspect request message: %w", err)
	}

	log.Println("inspect_request 💬 sent successfully")
	return nil
}
