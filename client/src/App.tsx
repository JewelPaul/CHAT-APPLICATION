import { ThemeProvider } from './components/ThemeProvider'
import { NotificationProvider } from './components/NotificationProvider'
import { ThemeToggle } from './components/ThemeToggle'
import { UserMenu } from './components/UserMenu'
import { IncomingCallModal } from './components/IncomingCallModal'
import { CallInterface } from './components/CallInterface'
import { KeyWelcomeScreen } from './components/KeyWelcomeScreen'
import { MainChatLayout } from './components/MainChatLayout'
import { getDeviceKey, isFirstTimeUser } from './utils/deviceKey'
import { useWebRTC } from './hooks/useWebRTC'
import { useState, useEffect } from 'react'
import socketService from './socket'
import { useNotifications } from './components/NotificationProvider'
import type { User, CallType } from './types'

function ChatApp() {
  const [deviceKey, setDeviceKey] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [socketConnected, setSocketConnected] = useState(false)

  const [incomingCall, setIncomingCall] = useState<{
    from: User
    type: CallType
  } | null>(null)

  const { addNotification } = useNotifications()

  // Initialize device key and connect socket
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if first time user
        const isFirstTime = isFirstTimeUser()
        const key = getDeviceKey() // Gets or generates
        
        setDeviceKey(key)
        setShowWelcome(isFirstTime)
        
        // Connect socket with device key
        console.log('Connecting socket with key:', key)
        await socketService.connect(key, key)
        setSocketConnected(true)
        console.log('Socket connected successfully')
      } catch (error) {
        console.error('Failed to initialize:', error)
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

  // Create a dummy user for WebRTC based on device key
  const dummyUser = deviceKey ? {
    code: deviceKey,
    deviceName: deviceKey,
    avatar: undefined
  } : null

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
      console.error('Failed to accept call:', error)
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          addNotification('error', 'Permission denied. Please allow access to camera/microphone.')
        } else {
          addNotification('error', 'Failed to accept call. Please check your device permissions.')
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

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl font-semibold">Loading ChatWave...</p>
        </div>
      </div>
    )
  }

  // Show welcome screen for first-time users
  if (showWelcome && deviceKey) {
    return (
      <KeyWelcomeScreen 
        deviceKey={deviceKey} 
        onContinue={() => setShowWelcome(false)} 
      />
    )
  }

  // Main app interface
  return (
    <div className="min-h-screen">
      <ThemeToggle />
      <UserMenu />
      
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

      {/* Main Chat Interface (hidden during call) */}
      {callState.status === 'idle' && deviceKey && (
        <MainChatLayout deviceKey={deviceKey} />
      )}

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
