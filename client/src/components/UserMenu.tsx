import { Key, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { getDeviceKey, copyDeviceKeyToClipboard } from '../utils/deviceKey'

export function UserMenu() {
  const deviceKey = getDeviceKey()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await copyDeviceKeyToClipboard(deviceKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy key:', error)
    }
  }

  return (
    <div className="fixed top-4 right-20 z-40">
      <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full shadow-lg px-4 py-2">
        <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span className="text-sm font-mono font-medium text-gray-700 dark:text-gray-300">
          {deviceKey}
        </span>
        <button
          onClick={handleCopy}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Copy device key"
          aria-label="Copy device key"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          )}
        </button>
      </div>
    </div>
  )
}
