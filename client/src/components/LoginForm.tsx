import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function LoginForm() {
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await loginMutation.mutateAsync({ username, password });
    } catch (error: unknown) {
      const message =
        error instanceof TRPCClientError && error.message
          ? error.message
          : "ログインに失敗しました。";
      setError(message);
    }
  };

  return (
    <div className="blueprint-login min-h-screen p-6">
      <div className="blueprint-panel mx-auto flex min-h-[460px] max-w-xl flex-col justify-center p-8 text-center md:p-14">
        <div className="mx-auto mb-6 grid h-14 w-14 place-items-center border border-cyan-200/50 bg-cyan-300/10 text-cyan-100"><ShieldCheck className="h-7 w-7" /></div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-100/80">Policy Insight Hub / Secure Access</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">政策データの根拠を、共有可能な構造へ。</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-blue-100/75">データ台帳、指標辞書、レビュー記録にアクセスするには、組織アカウントでログインしてください。</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
          <div className="space-y-1.5">
            <label htmlFor="login-username" className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100/80">ユーザー名</label>
            <Input
              id="login-username"
              value={username}
              onChange={event => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="例: admin"
              className="h-11 border-cyan-200/30 bg-blue-950/50 text-white placeholder:text-blue-200/40"
              required
              minLength={2}
              maxLength={64}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="login-password" className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100/80">パスワード</label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="8文字以上"
              className="h-11 border-cyan-200/30 bg-blue-950/50 text-white placeholder:text-blue-200/40"
              required
              minLength={8}
              maxLength={128}
            />
          </div>
          {error ? (
            <p className="text-sm text-red-300" role="alert">{error}</p>
          ) : null}
          <Button type="submit" disabled={loginMutation.isPending} className="blueprint-primary h-11 w-full">
            {loginMutation.isPending ? "ログイン中..." : "ログイン"}
          </Button>
        </form>

        <p className="mx-auto mt-6 max-w-md text-xs leading-5 text-blue-100/50">
          アカウントが無い場合は、この画面でそのままユーザー名とパスワードを入力すると初回ログイン時に作成されます。
        </p>
      </div>
    </div>
  );
}