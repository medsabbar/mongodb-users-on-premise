import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '../utils/api';
import type { ApiConfig, ApiUser, DashboardStats, UsersResponse } from '../types/api';

export function useDashboardData() {
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  async function reload(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const [cfg, usersRes] = await Promise.all([
        fetchJson<ApiConfig>('/api/config').catch(() => null),
        fetchJson<UsersResponse>('/api/users')
      ]);
      if (cfg) setConfig(cfg);
      setUsers(usersRes.users || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const stats: DashboardStats = useMemo(() => {
    const total = users.length;
    const temporary = users.filter((u) => u.isTemporary).length;
    const permanent = total - temporary;
    return { total, permanent, temporary };
  }, [users]);

  return {
    config,
    users,
    setUsers,
    stats,
    loading,
    error,
    reload
  };
}

