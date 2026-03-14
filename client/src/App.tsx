import { ThemeProvider } from './components/ThemeProvider'
import { NotificationProvider } from './components/NotificationProvider'
import { ThemeToggle } from './components/ThemeToggle'
import { IncomingCallModal } from './components/IncomingCallModal'
import { IncomingRequestModal } from './components/IncomingRequestModal'
import { CallInterface } from './components/CallInterface'
import { MainChatLayout } from './components/MainChatLayout'
import { WelcomeScreen } from './components/WelcomeScreen'
import { OnboardingSlideshow } from './components/OnboardingSlideshow'
import {
  getOrCreateInviteCode,
  getOrCreateDeviceFingerprint,
  saveInviteCode,
  getStoredUsername,
  saveUsername,
  getDisplayName,
  saveDisplayName,
} from './utils/deviceKey'
import { useWebRTC } from './hooks/useWebRTC'
import { useState, useEffect, useCallback, useRef } from 'react'
import socketService from './socket'
import { useNotifications } from './components/NotificationProvider'
import type { User, CallType, ConnectionStatus } from './types'
import type { Contact } from './db'

const ONBOARDING_KEY = 'zion_onboarding_completed'

function ChatApp() {
  // Persistent invite code — survives page reload, stored in localStorage
  const [inviteCode, setInviteCode] = useState(() => getOrCreateInviteCode())
  // Display name — locally stored, not unique
  const [displayName, setDisplayName] = useState(() => getDisplayName())
  // Username — server-assigned, kept for internal use
  const [username, setUsername] = useState(() => getStoredUsername())
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  // activeSession: false = show landing screen, true = show chat layout
  const [activeSession, setActiveSession] = useState(false)
  // Track currently selected contact for call targeting
  const [activeContact, setActiveContact] = useState<User | null>(null)

  const [pendingRequest, setPendingRequest] = useState<{ fromKey: string; fromName: string } | null>(null)

  const { addNotification } = useNotifications()

  // Initialize socket connection using the stable device fingerprint
  useEffect(() => {
    const initialize = async () => {
      try {
        // Compute a stable device fingerprint from hardware/browser characteristics.
        // The same device will produce the same fingerprint across all browsers.
        const fingerprint = await getOrCreateDeviceFingerprint()
        // Send fingerprint as deviceKey; display name as the human-readable name
        const currentDisplayName = getDisplayName()
        const result = await socketService.connect(fingerprint, currentDisplayName || fingerprint)
        setConnectionStatus('connected')
        // Save the server-assigned username if we don't already have one
        if (result.username) {
          saveUsername(result.username)
          setUsername(result.username)
        }
        // Adopt the server-assigned permanent invite code (XXXX-XXXX-XXXX format)
        if (result.inviteCode) {
          saveInviteCode(result.inviteCode)
          setInviteCode(result.inviteCode)
        }
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

  // Incoming connection request — show modal, ignore while one is pending
  useEffect(() => {
    const handleIncomingRequest = (data: { fromKey: string; fromName: string }) => {
      setPendingRequest(prev => prev ?? data)
    }
    const handleUserOffline = (data: { deviceKey: string }) => {
      setPendingRequest(prev => prev?.fromKey === data.deviceKey ? null : prev)
    }
    socketService.on('incoming-request', handleIncomingRequest)
    socketService.on('user-offline', handleUserOffline)
    return () => {
      socketService.off('incoming-request', handleIncomingRequest)
      socketService.off('user-offline', handleUserOffline)
    }
  }, [])

  const handleInviteCodeChange = useCallback((newCode: string) => {
    saveInviteCode(newCode)
    setInviteCode(newCode)
  }, [])

  const handleDisplayNameChange = useCallback((newName: string) => {
    saveDisplayName(newName)
    setDisplayName(newName)
  }, [])

  const handleUsernameChange = useCallback((newUsername: string) => {
    saveUsername(newUsername)
    setUsername(newUsername)
  }, [])

  const handleSendConnectionRequest = useCallback((code: string) => {
    socketService.sendRequest(code)
    addNotification('info', `Connection request sent to ${code}`)
  }, [addNotification])

  const handleAcceptRequest = useCallback(() => {
    if (!pendingRequest) return
    socketService.acceptRequest(pendingRequest.fromKey)
    setPendingRequest(null)
  }, [pendingRequest])

  const handleDeclineRequest = useCallback(() => {
    if (!pendingRequest) return
    socketService.rejectRequest(pendingRequest.fromKey)
    setPendingRequest(null)
  }, [pendingRequest])

  // Track contact changes from MainChatLayout for call targeting
  const handleContactChange = useCallback((contact: Contact | null) => {
    if (contact) {
      setActiveContact({ code: contact.id, deviceName: contact.displayName })
    } else {
      setActiveContact(null)
    }
  }, [])

  // Return to landing page when session ends (partner disconnected)
  const handleSessionEnd = useCallback(() => {
    setActiveSession(false)
    setActiveContact(null)
  }, [])

  const {
    callState,
    localStream,
    remoteStream,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo
  } = useWebRTC(activeContact)

  // Persistent remote audio element — always in the DOM so srcObject is never lost
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    if (!remoteAudioRef.current) return
    if (callState.type === 'audio' && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream
    } else {
      remoteAudioRef.current.srcObject = null
    }
  }, [remoteStream, callState.type])

  // Notifications derived from call state transitions
  const prevCallStatusRef = useRef(callState.status)
  useEffect(() => {
    const prev = prevCallStatusRef.current
    const curr = callState.status
    prevCallStatusRef.current = curr
    if (prev === curr) return

    if (curr === 'ringing') {
      addNotification('info', `Incoming ${callState.type} call from ${callState.remoteUser?.deviceName ?? 'someone'}`)
    } else if (curr === 'active') {
      addNotification('success', 'Call connected')
    } else if (curr === 'idle') {
      if (prev === 'calling') addNotification('info', 'Call could not be connected')
      else if (prev === 'connecting' || prev === 'active') addNotification('info', 'Call ended')
    }
  }, [callState.status, callState.type, callState.remoteUser, addNotification])

  // Initiate a call to the currently selected contact
  const handleInitiateCall = useCallback(async (type: CallType) => {
    if (!activeContact) {
      addNotification('warning', 'No active contact to call')
      return
    }
    try {
      await initiateCall(type)
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          addNotification('error', 'Permission denied. Please allow camera/microphone access.')
        } else {
          addNotification('error', 'Failed to start call. Check device permissions.')
        }
      }
    }
  }, [activeContact, initiateCall, addNotification])

  const handleAcceptCall = async () => {
    try {
      await acceptCall()
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          addNotification('error', 'Permission denied. Please allow camera/microphone access.')
        } else {
          addNotification('error', 'Failed to accept call. Check device permissions.')
        }
      }
    }
  }

  const handleRejectCall = () => {
    rejectCall()
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
      {/* Persistent remote audio element — always in DOM, never remounts */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      {/* Theme toggle — only top-right control */}
      <ThemeToggle />

      {/* Landing Screen — shown when no active session */}
      {!activeSession && (
        <WelcomeScreen
          inviteCode={inviteCode}
          displayName={displayName}
          username={username}
          connectionStatus={connectionStatus}
          onSendConnectionRequest={handleSendConnectionRequest}
          onInviteCodeChange={handleInviteCodeChange}
          onDisplayNameChange={handleDisplayNameChange}
          onUsernameChange={handleUsernameChange}
        />
      )}

      {/* Call Interface — outgoing call, connecting, or active call */}
      {(callState.status === 'calling' ||
        callState.status === 'connecting' ||
        callState.status === 'active') &&
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
          onInitiateCall={handleInitiateCall}
          onSessionEnd={handleSessionEnd}
          onContactChange={handleContactChange}
        />
      </div>

      {/* Incoming Call Modal — shown when callee is ringing */}
      {callState.status === 'ringing' && callState.remoteUser && (
        <IncomingCallModal
          caller={callState.remoteUser}
          callType={callState.type}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {/* Incoming Connection Request Modal */}
      {pendingRequest && (
        <IncomingRequestModal
          fromKey={pendingRequest.fromKey}
          fromName={pendingRequest.fromName}
          onAccept={handleAcceptRequest}
          onReject={handleDeclineRequest}
        />
      )}
    </div>
  )
}

function App() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return localStorage.getItem(ONBOARDING_KEY) !== 'true'
    } catch {
      return false
    }
  })

  const handleOnboardingComplete = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true')
    } catch {
      // ignore
    }
    setShowOnboarding(false)
  }, [])

  return (
    <ThemeProvider>
      <NotificationProvider>
        {showOnboarding ? (
          <OnboardingSlideshow onComplete={handleOnboardingComplete} />
        ) : (
          <ChatApp />
        )}
      </NotificationProvider>
    </ThemeProvider>
  )
}

export default App
