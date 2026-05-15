"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchResearchDashboard, type ResearchDashboard } from "@/lib/api";

export const RESEARCH_LIVE_POLL_MS = 45_000;

export type ResearchLiveContextValue = {
  dashboard: ResearchDashboard | null;
  lastFetchedAt: number | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
};

const ResearchLiveContext = createContext<ResearchLiveContextValue | null>(null);

export function ResearchLiveProvider({ children }: { children: ReactNode }) {
  const [dashboard, setDashboard] = useState<ResearchDashboard | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await fetchResearchDashboard();
      setDashboard(next);
      setLastFetchedAt(Date.now());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => void refresh(), RESEARCH_LIVE_POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const value = useMemo(
    () => ({
      dashboard,
      lastFetchedAt,
      refreshing,
      refresh,
    }),
    [dashboard, lastFetchedAt, refreshing, refresh]
  );

  return <ResearchLiveContext.Provider value={value}>{children}</ResearchLiveContext.Provider>;
}

export function useResearchLive(): ResearchLiveContextValue {
  const ctx = useContext(ResearchLiveContext);
  if (!ctx) {
    throw new Error("useResearchLive must be used within ResearchLiveProvider");
  }
  return ctx;
}
