package sockets

import (
	"github.com/etesam913/bytebook/internal/util"
	"github.com/wailsapp/wails/v3/pkg/application"
)

func init() {
	// These events are named in util but their payload types live in this
	// package, which util cannot import without a cycle.
	application.RegisterEvent[KernelStatusEvent](util.EventKernelInstanceStatus)
	application.RegisterEvent[HeartbeatEvent](util.EventKernelInstanceHeartbeat)
	application.RegisterEvent[StreamEvent](util.EventCodeBlockStream)
	application.RegisterEvent[ExecuteResultEvent](util.EventCodeBlockExecuteResult)
	application.RegisterEvent[ExecuteResultEvent](util.EventCodeBlockDisplayData)
	application.RegisterEvent[ExecuteInputEvent](util.EventCodeBlockExecuteInput)
	application.RegisterEvent[CodeBlockStatusEvent](util.EventCodeBlockStatus)
	application.RegisterEvent[IopubErrorEvent](util.EventCodeBlockIopubError)
	application.RegisterEvent[InputRequestEvent](util.EventCodeBlockInputRequest)
	application.RegisterEvent[ExecuteReplyEvent](util.EventCodeBlockExecuteReply)
	application.RegisterEvent[InspectReplyEvent](util.EventCodeBlockInspectReply)
	application.RegisterEvent[CompleteReplyEvent](util.EventCodeBlockCompleteReply)
}
