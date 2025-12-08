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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-2xl w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="large" className="text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-2">Welcome to ChatWave</h1>
          <p className="text-white/90 text-xl">
            Your unique key has been generated
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl mb-6">
          {/* Key Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <Key className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Device Key Display */}
          <div className="mb-8">
            <label className="block text-center text-white/90 text-sm font-medium mb-4">
              Your unique ChatWave key:
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/20 border-2 border-white/30 rounded-2xl px-6 py-5 backdrop-blur-sm">
                <p className="text-white font-mono text-2xl md:text-3xl font-bold text-center tracking-wider">
                  {deviceKey}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center justify-center w-14 h-14 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white transition-all duration-200 hover:scale-105 active:scale-95"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <Copy className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-4 mb-8">
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span className="text-2xl">📱</span>
                Share Your Key
              </h3>
              <p className="text-white/80 text-sm">
                Share this key with friends so they can message you. They'll enter your key to start a conversation.
              </p>
            </div>

            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Keep It Safe
              </h3>
              <p className="text-white/80 text-sm">
                This key is permanent for this device. Save it somewhere safe! You can always find it in the app.
              </p>
            </div>

            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span className="text-2xl">🔐</span>
                No Password Required
              </h3>
              <p className="text-white/80 text-sm">
                No signup, no login, no password. Just your unique key that stays with this device forever.
              </p>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={onContinue}
            className="w-full py-4 px-6 rounded-xl bg-white text-indigo-600 font-bold text-lg hover:bg-white/90 focus:outline-none focus:ring-4 focus:ring-white/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            Continue to Chat
          </button>
        </div>

        {/* Privacy Note */}
        <div className="text-center">
          <p className="text-white/80 text-sm">
            🔒 Your messages are encrypted and stored locally on your device.
          </p>
        </div>
      </div>
    </div>
  );
}
