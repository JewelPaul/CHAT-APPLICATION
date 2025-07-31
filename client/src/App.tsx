import { ThemeProvider } from './components/ThemeProvider'
import { NotificationProvider } from './components/NotificationProvider'
import { ThemeToggle } from './components/ThemeToggle'
import { WelcomeScreen } from './components/WelcomeScreen'
import { ChatInterface } from './components/ChatInterface'
import { ConnectionRequestModal } from './components/ConnectionRequestModal'
import { WaitingModal } from './components/WaitingModal'
import { useChat } from './hooks/useChat'

function ChatApp() {
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
  } = useChat()

  return (
    <div className="min-h-screen">
      <ThemeToggle />
      
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
