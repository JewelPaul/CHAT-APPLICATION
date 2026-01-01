/**
 * Welcome Screen for First-Time Users
 * Displays the generated device key and allows users to continue to chat
 */

import { useState } from 'react';
import { Copy, Check, Key } from 'lucide-react';
import { Logo } from './Logo';
import { copyDeviceKeyToClipboard } from '../utils/deviceKey';

interface KeyWelcomeScreenProps {
  deviceKey: string;
  onContinue: () => void;
}

export function KeyWelcomeScreen({ deviceKey, onContinue }: KeyWelcomeScreenProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyDeviceKeyToClipboard(deviceKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy key:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bg-dark via-bg-surface to-black p-4">
      <div className="max-w-2xl w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gold-primary/30 blur-3xl rounded-full animate-pulse" />
              <Logo size="large" className="relative" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">Welcome to ChatWave</h1>
          <p className="text-gold-primary text-xl font-medium">
            ✨ Your unique key has been generated
          </p>
        </div>

        {/* Main Card - Royal Gold */}
        <div className="bg-gradient-dark backdrop-blur-lg rounded-3xl p-8 shadow-2xl border-2 border-gold-primary/30 mb-6">
          {/* Key Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold">
              <Key className="w-10 h-10 text-black" />
            </div>
          </div>

          {/* Device Key Display */}
          <div className="mb-8">
            <label className="block text-center text-gold-primary text-sm font-semibold mb-4 uppercase tracking-wide">
              Your unique ChatWave key:
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-bg-card border-2 border-gold-primary/30 rounded-2xl px-6 py-5 backdrop-blur-sm hover:border-gold-primary/50 transition-all">
                <p className="text-white font-mono text-2xl md:text-3xl font-bold text-center tracking-wider">
                  {deviceKey}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-gold hover:bg-gold-light border-2 border-gold-dark text-black transition-all duration-200 hover:scale-105 active:scale-95 shadow-gold"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-7 h-7" />
                ) : (
                  <Copy className="w-7 h-7" />
                )}
              </button>
            </div>
          </div>

          {/* Instructions - Royal Gold */}
          <div className="space-y-4 mb-8">
            <div className="bg-bg-card/50 rounded-xl p-4 border-2 border-gold-primary/20 hover:border-gold-primary/40 transition-all">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span className="text-2xl">📱</span>
                Share Your Key
              </h3>
              <p className="text-text-secondary text-sm">
                Share this key with friends so they can message you. They'll enter your key to start a conversation.
              </p>
            </div>

            <div className="bg-bg-card/50 rounded-xl p-4 border-2 border-gold-primary/20 hover:border-gold-primary/40 transition-all">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Keep It Safe
              </h3>
              <p className="text-text-secondary text-sm">
                This key is permanent for this device. Save it somewhere safe! You can always find it in the app.
              </p>
            </div>

            <div className="bg-bg-card/50 rounded-xl p-4 border-2 border-gold-primary/20 hover:border-gold-primary/40 transition-all">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span className="text-2xl">🔐</span>
                No Password Required
              </h3>
              <p className="text-text-secondary text-sm">
                No signup, no login, no password. Just your unique key that stays with this device forever.
              </p>
            </div>
          </div>

          {/* Continue Button - Royal Gold */}
          <button
            onClick={onContinue}
            className="btn btn-primary w-full py-5 text-lg font-bold shadow-gold hover:shadow-2xl"
          >
            Continue to Chat ✨
          </button>
        </div>

        {/* Privacy Note */}
        <div className="text-center">
          <p className="text-gold-primary/80 text-sm font-medium">
            🔒 Your messages are encrypted and ephemeral - stored only in memory
          </p>
        </div>
      </div>
    </div>
  );
}
