/**
 * usePWA — hook for install prompt, update banner, and offline state
 */
import { useState, useEffect } from 'react';
import {
  registerServiceWorker,
  listenForInstallPrompt,
  triggerInstallPrompt,
  isInstalled,
} from '@/lib/pwa';

export function usePWA() {
  const [canInstall, setCanInstall] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    // Register service worker
    registerServiceWorker();

    // Listen for install prompt
    listenForInstallPrompt();

    // Check install state
    setIsAppInstalled(isInstalled());

    // Install prompt available
    const onInstallAvailable = () => setCanInstall(true);
    const onInstalled = () => { setCanInstall(false); setIsAppInstalled(true); };
    const onUpdateAvailable = () => setUpdateAvailable(true);

    window.addEventListener('pwa:install-available', onInstallAvailable);
    window.addEventListener('pwa:installed', onInstalled);
    window.addEventListener('pwa:update-available', onUpdateAvailable);

    // Online/offline
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('pwa:install-available', onInstallAvailable);
      window.removeEventListener('pwa:installed', onInstalled);
      window.removeEventListener('pwa:update-available', onUpdateAvailable);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const install = async () => {
    const result = await triggerInstallPrompt();
    if (result === 'accepted') setIsAppInstalled(true);
    return result;
  };

  const reloadForUpdate = () => window.location.reload();

  return { canInstall, isAppInstalled, updateAvailable, isOnline, install, reloadForUpdate };
}
