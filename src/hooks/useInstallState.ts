import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallPlatform = 'ios' | 'android' | 'other'

function detectPlatform(): InstallPlatform {
  const ua = window.navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'other'
}

function detectStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

/**
 * Detects PWA install state (standalone display-mode / iOS Safari heuristic)
 * and captures the Android/Chrome `beforeinstallprompt` event so the app can
 * trigger the native install prompt on demand.
 */
export function useInstallState(): {
  isInstalled: boolean
  canPromptInstall: boolean
  promptInstall: () => Promise<void>
  platform: InstallPlatform
} {
  const [isInstalled, setIsInstalled] = useState(detectStandalone)
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [platform] = useState<InstallPlatform>(detectPlatform)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event): void => {
      event.preventDefault()
      setDeferredEvent(event as BeforeInstallPromptEvent)
    }
    const handleAppInstalled = (): void => {
      setIsInstalled(true)
      setDeferredEvent(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async (): Promise<void> => {
    if (!deferredEvent) return
    await deferredEvent.prompt()
    await deferredEvent.userChoice
    setDeferredEvent(null)
  }

  return {
    isInstalled,
    canPromptInstall: deferredEvent !== null,
    promptInstall,
    platform,
  }
}
