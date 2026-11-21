import { useState, useEffect, useCallback, useRef } from 'react';
import type { ActivePort } from '../../types';
import type { SidebarView } from '../ActivityBar';

export function usePortManager(activeView: SidebarView) {
  const [ports, setPorts] = useState<ActivePort[]>([]);
  const [isRefreshingPorts, setIsRefreshingPorts] = useState(false);
  const [portSearchQuery, setPortSearchQuery] = useState('');
  const [expandedPorts, setExpandedPorts] = useState({
    user: true,
    system: false,
  });
  const [hideSystemPorts, setHideSystemPorts] = useState(true);

  const isComponentMounted = useRef(true);
  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
    };
  }, []);

  const refreshPorts = useCallback(async () => {
    if (!window.electron) return;
    setIsRefreshingPorts(true);
    try {
      const list = await window.electron.getActivePorts();
      if (isComponentMounted.current) {
        setPorts(list);
      }
    } catch (e) {
      console.error('Failed to get active ports:', e);
    } finally {
      if (isComponentMounted.current) {
        setIsRefreshingPorts(false);
      }
    }
  }, []);

  useEffect(() => {
    if (activeView === 'ports') {
      refreshPorts();
      const interval = setInterval(() => {
        refreshPorts();
      }, 5000);
      return () => {
        clearInterval(interval);
      };
    }
  }, [activeView, refreshPorts]);

  return {
    ports,
    isRefreshingPorts,
    portSearchQuery,
    setPortSearchQuery,
    expandedPorts,
    setExpandedPorts,
    hideSystemPorts,
    setHideSystemPorts,
    refreshPorts,
  };
}
