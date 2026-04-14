import { useState } from 'react'
import { Copy, Check, Send, Shield, Trash2, Lock, Users, AlertTriangle, Share2 } from 'lucide-react'
import { Logo } from './Logo'
import { HeroScene } from './hero/Scene'
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
    <div className="relative h-screen overflow-hidden bg-black text-slate-100">
      <div className="absolute inset-0">
        <HeroScene />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_0%,rgba(0,0,0,0.58)_50%,rgba(0,0,0,0.9)_100%)]" />

      <div className="relative z-10 h-full overflow-y-auto">
        <div className="min-h-full px-5 py-7 lg:px-10">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[420px_1fr] lg:items-center">
            <div className="space-y-4 rounded-3xl border border-white/15 bg-black/45 p-4 shadow-[0_18px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:p-5">
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <Logo size="large" />
                </div>

                <div className="flex justify-center">
                  {connectionStatus === 'connected' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-200 bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      Connected
                    </span>
                  )}
                  {connectionStatus === 'connecting' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-white/10 border border-white/20 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                      Connecting…
                    </span>
                  )}
                  {connectionStatus === 'error' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-200 bg-rose-500/15 border border-rose-400/35 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
                      Connection Error
                    </span>
                  )}
                </div>

                <div className="flex justify-center gap-3 text-xs text-slate-300">
                  <span className="flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> No Storage</span>
                  <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Encrypted</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Invite Only</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/15 bg-black/35 p-4 space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Your Invite Code</span>
                <div className="rounded-xl border border-white/15 bg-black/45 px-4 py-4 text-center">
                  <span className="font-mono text-2xl font-bold text-sky-300 tracking-widest select-all">{inviteCode || '…'}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCopyCode} className="btn btn-secondary flex-1 gap-2 rounded-xl py-2.5 border-white/20 bg-white/10 text-slate-100 hover:bg-white/15">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={handleShare} className="btn btn-secondary flex-1 gap-2 rounded-xl py-2.5 border-white/20 bg-white/10 text-slate-100 hover:bg-white/15">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
                <p className="text-xs text-slate-400 text-center">Share this code so others can connect with you</p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-black/35 p-4 space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Display Name</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                    placeholder="Optional — e.g. Alice"
                    className="input-field flex-1 bg-black/40 border-white/20 text-slate-100 placeholder:text-slate-500"
                    maxLength={50}
                  />
                  <button
                    onClick={handleSaveName}
                    className={`btn px-4 rounded-xl ${nameSaved ? 'btn-secondary text-green-400 border-white/20 bg-white/10' : 'btn-primary'}`}
                  >
                    {nameSaved ? <Check className="w-4 h-4" /> : 'Save'}
                  </button>
                </div>
                <p className="text-xs text-slate-400">Optional. Not unique. Stored locally on your device only.</p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-black/35 p-4 space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Join a Chat</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={connectCode}
                    onChange={e => setConnectCode(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter invite code…"
                    className="input-field flex-1 font-mono uppercase tracking-widest bg-black/40 border-white/20 text-slate-100 placeholder:text-slate-500"
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
                {!isConnected && <p className="text-xs text-slate-500 text-center">Waiting for server connection…</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/15">
                  <span className="w-7 h-7 rounded-lg bg-emerald-400/10 border border-emerald-400/25 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5 text-emerald-300" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">Completely Ephemeral</p>
                    <p className="text-xs text-slate-400 mt-0.5">Messages vanish when you close the tab — no trace left behind</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/15">
                  <span className="w-7 h-7 rounded-lg bg-sky-400/10 border border-sky-400/25 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-3.5 h-3.5 text-sky-300" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">End-to-End Encrypted</p>
                    <p className="text-xs text-slate-400 mt-0.5">ECDH P-256 key exchange with AES-GCM-256 encryption</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/15">
                  <span className="w-7 h-7 rounded-lg bg-violet-400/10 border border-violet-400/25 flex items-center justify-center flex-shrink-0">
                    <Users className="w-3.5 h-3.5 text-violet-300" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">Consent-Based Connection</p>
                    <p className="text-xs text-slate-400 mt-0.5">Both parties must approve before any chat can begin</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/15">
                <AlertTriangle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-100">Privacy Notice — </span>
                  Zion Chat stores nothing permanently. Closing this tab deletes all conversations forever.
                </p>
              </div>
            </div>

            <div className="hidden lg:flex lg:h-full lg:items-end lg:justify-center">
              <div className="mb-5 rounded-2xl border border-white/15 bg-black/35 px-6 py-4 text-center backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Interactive Hero Environment</p>
                <p className="mt-1 text-sm text-slate-300">Hover around the objects to gently repel them in zero gravity.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
