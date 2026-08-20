import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

export function useAuth() {
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
      utils.auth.me.invalidate();
    },
  });

  const login = useCallback(
    async (password: string) => {
      await loginMutation.mutateAsync({ password });
    },
    [loginMutation],
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  return {
    user: meQuery.data ?? null,
    loading: meQuery.isLoading || logoutMutation.isPending,
    loginPending: loginMutation.isPending,
    error: meQuery.error ?? loginMutation.error ?? logoutMutation.error ?? null,
    isAuthenticated: Boolean(meQuery.data),
    login,
    logout,
    refresh: () => meQuery.refetch(),
  };
}