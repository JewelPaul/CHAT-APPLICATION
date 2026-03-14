import { useState } from 'react'
import { Copy, Check, Send, Shield, Trash2, Lock, Users, AlertTriangle, Share2 } from 'lucide-react'
import { Logo } from './Logo'
import { copyToClipboard } from '../utils'
import { useNotifications } from './NotificationProvider'
import type { ConnectionStatus } from '../types'

interface WelcomeScreenProps {
  inviteCode: string
  displayName: string
  username?: string
  connectionStatus: ConnectionStatus
  onSendConnectionRequest: (code: string) => void
  onInviteCodeChange?: (newCode: string) => void
  onDisplayNameChange?: (name: string) => void
  onUsernameChange?: (username: string) => void
}

export function WelcomeScreen({
  inviteCode,
  displayName,
  connectionStatus,
  onSendConnectionRequest,
  onDisplayNameChange,
}: WelcomeScreenProps) {
  const [connectCode, setConnectCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [editName, setEditName] = useState(displayName)
  const [nameSaved, setNameSaved] = useState(false)

  const { addNotification } = useNotifications()

  const handleCopyCode = async () => {
    const success = await copyToClipboard(inviteCode)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      addNotification('success', 'Invite code copied!')
    } else {
      addNotification('error', 'Failed to copy code')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Zion Chat Invite',
          text: `Connect with me on Zion Chat! My invite code: ${inviteCode}`,
        })
      } catch {
        // User cancelled share — fall back to copy
        handleCopyCode()
      }
    } else {
      handleCopyCode()
    }
  }

  const handleSendRequest = () => {
    const code = connectCode.trim().toUpperCase()
    if (!code) {
      addNotification('warning', 'Enter an invite code first')
      return
    }
    if (code === inviteCode) {
      addNotification('warning', 'You cannot connect to yourself')
      return
    }
    onSendConnectionRequest(code)
    setConnectCode('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendRequest()
  }

  const handleSaveName = () => {
    const name = editName.trim()
    onDisplayNameChange?.(name)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
    addNotification('success', name ? 'Display name saved' : 'Display name cleared')
  }

  const isConnected = connectionStatus === 'connected'

  return (
    <div className="h-screen overflow-hidden bg-[var(--bg-primary)] flex flex-col">
      {/* Inner scroll container */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center p-6 py-8">
          <div className="w-full max-w-sm space-y-4">

            {/* Header */}
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <Logo size="large" />
              </div>

              {/* Connection status badge */}
              <div className="flex justify-center">
                {connectionStatus === 'connected' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Connected
                  </span>
                )}
                {connectionStatus === 'connecting' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border)] px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" />
                    Connecting…
                  </span>
                )}
                {connectionStatus === 'error' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    Connection Error
                  </span>
                )}
              </div>

              {/* Feature badges */}
              <div className="flex justify-center gap-3 text-xs text-[var(--text-secondary)]">
                <span className="flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> No Storage
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Encrypted
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Invite Only
                </span>
              </div>
            </div>

            {/* Invite Code Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Your Invite Code</span>
              </div>

              {/* Code display */}
              <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-4 text-center">
                <span className="font-mono text-2xl font-bold text-[var(--accent)] tracking-widest select-all">
                  {inviteCode || '…'}
                </span>
              </div>

              {/* Copy + Share buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleCopyCode}
                  className="btn btn-secondary flex-1 gap-2 rounded-xl py-2.5"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleShare}
                  className="btn btn-secondary flex-1 gap-2 rounded-xl py-2.5"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>

              <p className="text-xs text-[var(--text-muted)] text-center">Share this code so others can connect with you</p>
            </div>

            {/* Display Name Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Display Name</span>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  placeholder="Optional — e.g. Alice"
                  className="input-field flex-1"
                  maxLength={50}
                />
                <button
                  onClick={handleSaveName}
                  className={`btn px-4 rounded-xl ${nameSaved ? 'btn-secondary text-green-500' : 'btn-primary'}`}
                >
                  {nameSaved ? <Check className="w-4 h-4" /> : 'Save'}
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)]">Optional. Not unique. Stored locally on your device only.</p>
            </div>

            {/* Join Chat Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Join a Chat</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={connectCode}
                  onChange={e => setConnectCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter invite code…"
                  className="input-field flex-1 font-mono uppercase tracking-widest"
                  maxLength={14}
                  disabled={!isConnected}
                />
                <button
                  onClick={handleSendRequest}
                  disabled={!isConnected || !connectCode.trim()}
                  title="Send connection request"
                  className="btn btn-primary px-4 rounded-xl"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {!isConnected && (
                <p className="text-xs text-[var(--text-muted)] text-center">Waiting for server connection…</p>
              )}
            </div>

            {/* Feature explanation cards */}
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <span className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Completely Ephemeral</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Messages vanish when you close the tab — no trace left behind</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-3.5 h-3.5 text-[var(--accent)]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">End-to-End Encrypted</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">ECDH P-256 key exchange with AES-GCM-256 encryption</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <span className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 flex items-center justify-center flex-shrink-0">
                  <Users className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Consent-Based Connection</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Both parties must approve before any chat can begin</p>
                </div>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
              <AlertTriangle className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">Privacy Notice — </span>
                Zion Chat stores nothing permanently. Closing this tab deletes all conversations forever.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
