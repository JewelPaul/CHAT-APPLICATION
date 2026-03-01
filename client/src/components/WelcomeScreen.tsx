import { useState, useEffect, useRef } from 'react'
import { Copy, Check, Send, Shield, Trash2, Lock, Users, AlertTriangle, Edit2, X } from 'lucide-react'
import { Logo } from './Logo'
import { copyToClipboard } from '../utils'
import { useNotifications } from './NotificationProvider'
import { isValidInviteCode, saveInviteCode } from '../utils/deviceKey'
import socketService from '../socket'
import type { ConnectionStatus } from '../types'

interface WelcomeScreenProps {
  inviteCode: string
  connectionStatus: ConnectionStatus
  onSendConnectionRequest: (code: string) => void
  onInviteCodeChange?: (newCode: string) => void
}

export function WelcomeScreen({ inviteCode, connectionStatus, onSendConnectionRequest, onInviteCodeChange }: WelcomeScreenProps) {
  const [connectCode, setConnectCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [isEditingCode, setIsEditingCode] = useState(false)
  const [editCodeValue, setEditCodeValue] = useState('')
  const [editCodeError, setEditCodeError] = useState('')
  const [isSavingCode, setIsSavingCode] = useState(false)
  const { addNotification } = useNotifications()
  // Refs to track pending invite-code listeners so they can be removed on unmount
  const pendingUpdatedRef = useRef<((...args: unknown[]) => void) | null>(null)
  const pendingErrorRef = useRef<((...args: unknown[]) => void) | null>(null)

  // Clean up any dangling socket listeners on unmount
  useEffect(() => {
    return () => {
      if (pendingUpdatedRef.current) socketService.off('invite-code-updated', pendingUpdatedRef.current)
      if (pendingErrorRef.current) socketService.off('invite-code-error', pendingErrorRef.current)
    }
  }, [])

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

  const handleStartEdit = () => {
    setEditCodeValue(inviteCode)
    setEditCodeError('')
    setIsEditingCode(true)
  }

  const handleCancelEdit = () => {
    setIsEditingCode(false)
    setEditCodeValue('')
    setEditCodeError('')
  }

  const handleEditCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditCodeValue(e.target.value.toUpperCase())
    setEditCodeError('')
  }

  const handleSaveCode = async () => {
    const newCode = editCodeValue.trim().toUpperCase()
    if (!newCode) {
      setEditCodeError('Code cannot be empty')
      return
    }
    if (!isValidInviteCode(newCode)) {
      setEditCodeError('Format: XXXXX-XXXX (e.g. JWELL-0291)')
      return
    }
    if (newCode === inviteCode) {
      setIsEditingCode(false)
      return
    }
    setIsSavingCode(true)
    let done = false
    const onUpdated = (data: { newCode: string }) => {
      if (done) return
      done = true
      pendingUpdatedRef.current = null
      pendingErrorRef.current = null
      saveInviteCode(data.newCode)
      onInviteCodeChange?.(data.newCode)
      setIsEditingCode(false)
      setIsSavingCode(false)
      addNotification('success', 'Invite code updated')
      socketService.off('invite-code-updated', onUpdated)
      socketService.off('invite-code-error', onError)
    }
    const onError = (data: { message: string }) => {
      if (done) return
      done = true
      pendingUpdatedRef.current = null
      pendingErrorRef.current = null
      setEditCodeError(data.message || 'Failed to update code')
      setIsSavingCode(false)
      socketService.off('invite-code-updated', onUpdated)
      socketService.off('invite-code-error', onError)
    }
    pendingUpdatedRef.current = onUpdated as (...args: unknown[]) => void
    pendingErrorRef.current = onError as (...args: unknown[]) => void
    socketService.on('invite-code-updated', onUpdated)
    socketService.on('invite-code-error', onError)
    socketService.emit('update-invite-code', { newCode, displayName: newCode })
  }

  const deviceLabel = (() => {
    const ua = navigator.userAgent
    if (ua.includes('iPhone')) return 'iPhone'
    if (ua.includes('iPad')) return 'iPad'
    if (ua.includes('Android')) return 'Android'
    if (ua.includes('Mac')) return 'Mac'
    if (ua.includes('Windows')) return 'Windows'
    return 'This Device'
  })()

  const isConnected = connectionStatus === 'connected'

  return (
    <div className="h-screen overflow-hidden bg-[var(--bg-primary)] flex flex-col">
      {/* Inner scroll container for mobile */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center p-6 py-8">
          <div className="w-full max-w-sm space-y-4">

            {/* Header: Logo + Status */}
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <Logo size="large" />
              </div>

              {/* Connection status */}
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
                <span className="text-xs text-[var(--text-muted)]">{deviceLabel}</span>
              </div>

              {isEditingCode ? (
                <div className="space-y-2">
                  <input
                    className="input-field font-mono text-center text-lg font-bold tracking-widest uppercase"
                    value={editCodeValue}
                    onChange={handleEditCodeChange}
                    onKeyDown={e => e.key === 'Enter' && handleSaveCode()}
                    maxLength={10}
                    placeholder="XXXXX-XXXX"
                    autoFocus
                    disabled={isSavingCode}
                  />
                  {editCodeError && (
                    <p className="text-xs text-[var(--error)] text-center">{editCodeError}</p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={handleCancelEdit} disabled={isSavingCode} className="btn btn-secondary flex-1 text-sm py-1.5">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                    <button onClick={handleSaveCode} disabled={isSavingCode} className="btn btn-primary flex-1 text-sm py-1.5">
                      {isSavingCode ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-center">
                    <span className="font-mono text-xl font-bold text-[var(--accent)] tracking-widest">{inviteCode}</span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    title="Copy invite code"
                    className="btn btn-secondary p-2.5 rounded-xl"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleStartEdit}
                    title="Edit invite code"
                    className="btn btn-secondary p-2.5 rounded-xl"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-xs text-[var(--text-muted)] text-center">Share this code so others can connect with you</p>
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
                  maxLength={10}
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
                ChatWave stores nothing permanently. Closing this tab deletes all conversations forever.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}