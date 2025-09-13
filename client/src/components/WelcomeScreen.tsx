import { useState } from 'react'
import { Copy, Send, Shield, Trash2, Lock, Users, CheckCircle, AlertTriangle } from 'lucide-react'
import { Logo } from './Logo'
import { copyToClipboard } from '../utils'
import { useNotifications } from './NotificationProvider'
import type { User, ConnectionStatus } from '../types'

interface WelcomeScreenProps {
  user: User | null
  connectionStatus: ConnectionStatus
  onSendConnectionRequest: (code: string) => void
}

export function WelcomeScreen({ user, connectionStatus, onSendConnectionRequest }: WelcomeScreenProps) {
  const [connectCode, setConnectCode] = useState('')
  const { addNotification } = useNotifications()

  const handleCopyCode = async () => {
    if (user?.code) {
      const success = await copyToClipboard(user.code)
      if (success) {
        addNotification('success', 'Invite code copied to clipboard!')
      } else {
        addNotification('error', 'Failed to copy code')
      }
    }
  }

  const handleSendRequest = () => {
    if (connectCode.trim().length >= 4) {
      onSendConnectionRequest(connectCode.trim().toUpperCase())
      setConnectCode('')
    } else {
      addNotification('warning', 'Please enter a valid invite code')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendRequest()
    }
  }

  const getStatusIndicator = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Connected</span>
          </div>
        )
      case 'connecting':
        return (
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
            <span className="text-sm font-medium">Connecting...</span>
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium">Connection Error</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-sm font-medium">Disconnected</span>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4">
          <Logo size="large" />
          
          {/* Status Indicator */}
          <div className="flex justify-center">
            {getStatusIndicator()}
          </div>

          {/* Security Badges */}
          <div className="flex justify-center gap-4 text-xs">
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Trash2 className="w-4 h-4" />
              <span>No Storage</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Lock className="w-4 h-4" />
              <span>Encrypted</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>Invite Only</span>
            </div>
          </div>
        </div>

        {/* User Info Card */}
        {user && connectionStatus === 'connected' && (
          <div className="card p-6 space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Your Invite Code
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Share this code for others to connect with you
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="text-2xl font-mono font-bold text-primary-600 dark:text-primary-400">
                    {user.code}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Device: {user.deviceName}
                  </div>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="btn btn-secondary"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Connect Form */}
        {connectionStatus === 'connected' && (
          <div className="card p-6 space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Join a Chat
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter someone's invite code to request a connection
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={connectCode}
                  onChange={(e) => setConnectCode(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter invite code"
                  className="input flex-1"
                  maxLength={10}
                />
                <button
                  onClick={handleSendRequest}
                  disabled={connectCode.trim().length < 4}
                  className="btn btn-primary"
                  title="Send connection request"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-green-900 dark:text-green-100">
                  Completely Ephemeral
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Messages disappear when you close the tab - no permanent storage
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  End-to-End Encrypted
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Your conversations are protected with modern encryption
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-purple-900 dark:text-purple-100">
                  Consent-Based Connection
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Both parties must approve before any chat can begin
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-yellow-900 dark:text-yellow-100">
                  Privacy Notice
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ChatWave is designed to lose data. Closing this tab will permanently delete all conversations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}