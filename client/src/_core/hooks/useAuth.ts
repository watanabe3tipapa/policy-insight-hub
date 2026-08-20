import { trpc } from "@/lib/trpc";
import { useCallback, useMemo } from "react";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

const DEMO_USER = {
  id: 0,
  openId: "demo-user",
  username: "demo",
  name: "Demo User",
  email: "demo@example.com",
  role: "admin" as const,
  loginMethod: "demo",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

export function useAuth() {
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !DEMO_MODE,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
      utils.auth.me.invalidate();
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const user = useMemo(() => {
    if (DEMO_MODE) return DEMO_USER;
    return meQuery.data ?? null;
  }, [DEMO_MODE, meQuery.data]);

  const loading = useMemo(() => {
    if (DEMO_MODE) return false;
    return meQuery.isLoading || logoutMutation.isPending;
  }, [DEMO_MODE, meQuery.isLoading, logoutMutation.isPending]);

  return {
    user,
    loading,
    isAuthenticated: Boolean(user),
    logout: DEMO_MODE ? () => {} : logout,
    refresh: DEMO_MODE ? () => {} : () => meQuery.refetch(),
  };
}