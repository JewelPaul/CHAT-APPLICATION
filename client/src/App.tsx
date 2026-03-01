import { ThemeProvider } from './components/ThemeProvider'
import { NotificationProvider } from './components/NotificationProvider'
import { ThemeToggle } from './components/ThemeToggle'
import { IncomingCallModal } from './components/IncomingCallModal'
import { CallInterface } from './components/CallInterface'
import { MainChatLayout } from './components/MainChatLayout'
import { WelcomeScreen } from './components/WelcomeScreen'
import { getOrCreateInviteCode, saveInviteCode } from './utils/deviceKey'
import { useWebRTC } from './hooks/useWebRTC'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import socketService from './socket'
import { useNotifications } from './components/NotificationProvider'
import type { User, CallType, ConnectionStatus } from './types'

function ChatApp() {
  // Persistent invite code — survives page reload, stored in localStorage
  const [inviteCode, setInviteCode] = useState(() => getOrCreateInviteCode())
  // Capture initial code for socket connection — changes via update-invite-code don't need reconnect
  const initialInviteCodeRef = useRef(inviteCode)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  // activeSession: false = show landing screen, true = show chat layout
  const [activeSession, setActiveSession] = useState(false)

  const [incomingCall, setIncomingCall] = useState<{
    from: User
    type: CallType
  } | null>(null)

  const { addNotification } = useNotifications()

  // Initialize socket connection once with the initial invite code
  useEffect(() => {
    const code = initialInviteCodeRef.current
    const initialize = async () => {
      try {
        await socketService.connect(code, code)
        setConnectionStatus('connected')
      } catch {
        setConnectionStatus('error')
        addNotification('error', 'Failed to connect to server')
      } finally {
        setIsLoading(false)
      }
    }

    initialize()

    return () => {
      socketService.disconnect()
    }
  }, [addNotification])

  // Switch to chat layout when a connection is established
  useEffect(() => {
    const handleConnectionEstablished = () => {
      setActiveSession(true)
    }
    socketService.on('connection-established', handleConnectionEstablished)
    return () => {
      socketService.off('connection-established', handleConnectionEstablished)
    }
  }, [])

  const handleInviteCodeChange = useCallback((newCode: string) => {
    saveInviteCode(newCode)
    setInviteCode(newCode)
  }, [])

  const handleSendConnectionRequest = useCallback((code: string) => {
    socketService.sendRequest(code)
    addNotification('info', `Connection request sent to ${code}`)
  }, [addNotification])

  const dummyUser = useMemo(() => ({
    code: inviteCode,
    deviceName: inviteCode,
    avatar: undefined
  }), [inviteCode])

  const {
    callState,
    localStream,
    remoteStream,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo
  } = useWebRTC(dummyUser, null)

  // Handle incoming calls
  useEffect(() => {
    const handleIncomingCall = (data: {
      from: string
      type: CallType
      deviceName: string
    }) => {
      const fromUser: User = {
        code: data.from,
        deviceName: data.deviceName
      }
      setIncomingCall({ from: fromUser, type: data.type })
      addNotification('info', `Incoming ${data.type} call from ${data.deviceName}`)
    }

    const handleCallAccepted = () => {
      addNotification('success', 'Call accepted')
    }

    const handleCallRejected = () => {
      addNotification('warning', 'Call declined')
      endCall()
    }

    const handleCallEnded = () => {
      addNotification('info', 'Call ended')
      endCall()
    }

    const handleCallError = (data: { error: string }) => {
      addNotification('error', data.error || 'Call failed')
      endCall()
    }

    socketService.on('call-incoming', handleIncomingCall)
    socketService.on('call-accepted', handleCallAccepted)
    socketService.on('call-rejected', handleCallRejected)
    socketService.on('call-ended', handleCallEnded)
    socketService.on('call-error', handleCallError)

    return () => {
      socketService.off('call-incoming', handleIncomingCall)
      socketService.off('call-accepted', handleCallAccepted)
      socketService.off('call-rejected', handleCallRejected)
      socketService.off('call-ended', handleCallEnded)
      socketService.off('call-error', handleCallError)
    }
  }, [addNotification, endCall])

  const handleAcceptCall = async () => {
    if (!incomingCall) return
    try {
      await acceptCall(incomingCall.type, incomingCall.from)
      setIncomingCall(null)
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          addNotification('error', 'Permission denied. Please allow camera/microphone access.')
        } else {
          addNotification('error', 'Failed to accept call. Check device permissions.')
        }
      }
      setIncomingCall(null)
    }
  }

  const handleRejectCall = () => {
    if (!incomingCall) return
    rejectCall(incomingCall.from)
    setIncomingCall(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-[var(--text-secondary)]">Connecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-200">
      {/* Theme toggle — only top-right control */}
      <ThemeToggle />

      {/* Landing Screen — shown when no active session */}
      {!activeSession && (
        <WelcomeScreen
          inviteCode={inviteCode}
          connectionStatus={connectionStatus}
          onSendConnectionRequest={handleSendConnectionRequest}
          onInviteCodeChange={handleInviteCodeChange}
        />
      )}

      {/* Active Call Interface */}
      {(callState.status === 'calling' || callState.status === 'active') &&
       callState.remoteUser && (
        <CallInterface
          callState={callState}
          localStream={localStream}
          remoteStream={remoteStream}
          remoteUser={callState.remoteUser}
          onEndCall={endCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
        />
      )}

      {/* Main Chat Interface — always mounted to capture socket events, hidden until session active */}
      <div className={activeSession && callState.status === 'idle' ? 'block' : 'hidden'}>
        <MainChatLayout
          deviceKey={inviteCode}
          onInitiateCall={(type: CallType) => {
            addNotification('info', `${type === 'audio' ? 'Voice' : 'Video'} call feature coming soon`)
          }}
        />
      </div>

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          caller={incomingCall.from}
          callType={incomingCall.type}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <ChatApp />
      </NotificationProvider>
    </ThemeProvider>
  )
}

export default App
