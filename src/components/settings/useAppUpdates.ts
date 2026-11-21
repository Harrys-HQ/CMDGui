import { useState, useEffect } from 'react';
import type { UpdateInfo } from '../../types';
import { version } from '../../../package.json';

export function useAppUpdates(isOpen: boolean) {
  const [appVersion, setAppVersion] = useState(version);
  // Update State
  const [updateState, setUpdateState] = useState<
    'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  >('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (window.electron && window.electron.getVersion) {
      window.electron.getVersion().then((v) => {
        if (v) setAppVersion(v);
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      window.electron.getVersion().then(setAppVersion);

      // Subscribe to update status
      const cleanup = window.electron.onUpdateStatus((data) => {
        console.log('Update Status:', data);
        if (data.status === 'checking') {
          setUpdateState('checking');
        } else if (data.status === 'available') {
          setUpdateState('available');
          if (data.info) setUpdateInfo(data.info);
        } else if (data.status === 'not-available') {
          setUpdateState('not-available');
        } else if (data.status === 'downloading') {
          setUpdateState('downloading');
          setDownloadProgress(data.progress?.percent || 0);
        } else if (data.status === 'downloaded') {
          setUpdateState('downloaded');
        } else if (data.status === 'error') {
          setUpdateState('error');
          setErrorMessage(data.error || 'Unknown error');
        }
      });
      return cleanup;
    }
  }, [isOpen]);

  const handleCheckUpdate = async () => {
    setUpdateState('checking');
    setErrorMessage('');
    try {
      await window.electron.checkForUpdates();
      // Status updates will come via the listener
    } catch {
      setUpdateState('error');
      setErrorMessage('Failed to initiate check.');
    }
  };

  const handleDownload = async () => {
    setUpdateState('downloading');
    setDownloadProgress(0);
    try {
      await window.electron.downloadUpdate();
    } catch {
      setUpdateState('error');
      setErrorMessage('Failed to start download.');
    }
  };

  const handleQuitAndInstall = () => {
    window.electron.quitAndInstall();
  };

  return {
    appVersion,
    updateState,
    updateInfo,
    downloadProgress,
    errorMessage,
    handleCheckUpdate,
    handleDownload,
    handleQuitAndInstall,
  };
}
