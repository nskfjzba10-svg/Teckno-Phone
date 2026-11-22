import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let sharedDeferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    sharedDeferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener('appinstalled', () => {
    sharedDeferredPrompt = null;
    listeners.forEach((fn) => fn());
  });
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isTouchMac =
    ua.includes('macintosh') &&
    typeof document !== 'undefined' &&
    'ontouchend' in document;
  return /iphone|ipad|ipod/.test(ua) || isTouchMac;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(sharedDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(detectStandalone);
  const [isIOS] = useState<boolean>(detectIOS);

  useEffect(() => {
    const sync = () => {
      setDeferredPrompt(sharedDeferredPrompt);
      if (detectStandalone()) {
        setIsInstalled(true);
      }
    };
    listeners.add(sync);

    const handleAppInstalled = () => {
      sharedDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const mql = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = () => {
      if (detectStandalone()) {
        setIsInstalled(true);
      }
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    mql.addEventListener('change', handleDisplayChange);

    return () => {
      listeners.delete(sync);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mql.removeEventListener('change', handleDisplayChange);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    const targetPrompt = deferredPrompt || sharedDeferredPrompt;
    if (!targetPrompt) return false;
    await targetPrompt.prompt();
    const { outcome } = await targetPrompt.userChoice;
    if (outcome === 'accepted') {
      sharedDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}
