import { ThemeProvider } from './components/ThemeProvider'
import { NotificationProvider } from './components/NotificationProvider'
import { ThemeToggle } from './components/ThemeToggle'
import { UserMenu } from './components/UserMenu'
import { WelcomeScreen } from './components/WelcomeScreen'
import { ChatInterface } from './components/ChatInterface'
import { ConnectionRequestModal } from './components/ConnectionRequestModal'
import { WaitingModal } from './components/WaitingModal'
import { IncomingCallModal } from './components/IncomingCallModal'
import { CallInterface } from './components/CallInterface'
import { AuthScreen } from './components/AuthScreen'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useChat } from './hooks/useChat'
import { useWebRTC } from './hooks/useWebRTC'
import { useState, useEffect } from 'react'
import socketService from './socket'
import { useNotifications } from './components/NotificationProvider'
import type { User, CallType } from './types'

function ChatApp() {
  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth()
  
  // Don't initialize legacy chat until authenticated
  const shouldInitializeChat = isAuthenticated && !!authUser
  
  const {
    user,
    connectionStatus,
    currentChat,
    connectionRequest,
    waitingForResponse,
    isTyping,
    typingUser,
    sendConnectionRequest,
    acceptConnection,
    rejectConnection,
    sendMessage,
    sendTypingStart,
    sendTypingStop,
    disconnectChat,
    cancelWaitingRequest
  } = useChat({ 
    enabled: shouldInitializeChat,
    authUser: authUser ? {
      username: authUser.username,
      displayName: authUser.displayName,
      avatarUrl: authUser.avatarUrl
    } : null
  })

  const [incomingCall, setIncomingCall] = useState<{
    from: User
    type: CallType
  } | null>(null)

  const { addNotification } = useNotifications()

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
  } = useWebRTC(user, currentChat?.user || null)

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

  const handleInitiateCall = async (type: CallType) => {
    try {
      await initiateCall(type)
    } catch (error) {
      console.error('Failed to initiate call:', error)
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          addNotification('error', 'Permission denied. Please allow access to camera/microphone.')
        } else {
          addNotification('error', 'Failed to start call. Please check your device permissions.')
        }
      }
    }
  }

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

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl font-semibold">Loading ChatWave...</p>
        </div>
      </div>
    )
  }

  // ALWAYS show auth screen if not authenticated - don't check legacy user
  if (!isAuthenticated) {
    return <AuthScreen />
  }

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

      {/* Chat Interface (hidden during call) */}
      {callState.status === 'idle' && (
        <>
          {currentChat ? (
            <ChatInterface
              user={user}
              chat={currentChat}
              isTyping={isTyping}
              typingUser={typingUser}
              onSendMessage={sendMessage}
              onSendTypingStart={sendTypingStart}
              onSendTypingStop={sendTypingStop}
              onDisconnect={disconnectChat}
              onBackToWelcome={disconnectChat}
              onInitiateCall={handleInitiateCall}
            />
          ) : (
            <WelcomeScreen
              user={user}
              connectionStatus={connectionStatus}
              onSendConnectionRequest={sendConnectionRequest}
            />
          )}

          <ConnectionRequestModal
            request={connectionRequest}
            onAccept={acceptConnection}
            onReject={rejectConnection}
          />

          <WaitingModal
            waitingFor={waitingForResponse}
            onCancel={cancelWaitingRequest}
          />
        </>
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
        <AuthProvider>
          <ChatApp />
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  )
}

export default App
