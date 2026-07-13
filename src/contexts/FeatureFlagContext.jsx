import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const FeatureFlagContext = createContext({ flags: {}, loading: true, isEnabled: (_key, fallback = false) => fallback });

function sessionClientId() {
  if (typeof sessionStorage === 'undefined') return 'caplet-server-render';
  const existing = sessionStorage.getItem('capletFeatureClientId');
  if (existing) return existing;
  const id = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem('capletFeatureClientId', id);
  return id;
}

export function FeatureFlagProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [flags, setFlags] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      const clientId = user?.id || sessionClientId();
      const data = await api.request('/feature-flags', { headers: { 'X-Caplet-Client-Id': clientId } });
      setFlags(Object.fromEntries((data?.flags || []).map((flag) => [flag.key, flag])));
    } catch {
      // Rollout controls must never prevent core learning from loading.
      setFlags({});
    } finally {
      setLoading(false);
    }
  }, [authLoading, user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({
    flags,
    loading,
    refresh,
    isEnabled: (key, fallback = false) => flags[key]?.enabled ?? fallback,
    valueFor: (key, fallback = null) => flags[key]?.value ?? fallback,
  }), [flags, loading, refresh]);

  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}
