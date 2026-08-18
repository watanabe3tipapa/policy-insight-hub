import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { BookOpenCheck, ChartNoAxesCombined, Database, LogOut, PanelLeft, ShieldCheck, ClipboardCheck, ScanSearch, Globe2, HardDriveDownload } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: ChartNoAxesCombined, label: "ダッシュボード", path: "/" },
  { icon: Database, label: "データ台帳", path: "/sources" },
  { icon: BookOpenCheck, label: "指標辞書", path: "/indicators" },
  { icon: ClipboardCheck, label: "レビュー記録", path: "/reviews" },
  { icon: ScanSearch, label: "情報収集", path: "/collection" },
  { icon: Globe2, label: "政策エッセンス", path: "/policy-essences" },
  { icon: HardDriveDownload, label: "データ交換", path: "/data-exchange" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return (
      <div className="blueprint-login min-h-screen p-6">
        <div className="blueprint-panel mx-auto flex min-h-[460px] max-w-xl flex-col justify-center p-8 text-center md:p-14">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center border border-cyan-200/50 bg-cyan-300/10 text-cyan-100"><ShieldCheck className="h-7 w-7" /></div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-100/80">Policy Insight Hub / Secure Access</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">政策データの根拠を、共有可能な構造へ。</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-blue-100/75">データ台帳、指標辞書、レビュー記録にアクセスするには、組織アカウントでログインしてください。</p>
          <Button onClick={() => startLogin()} className="blueprint-primary mt-8 h-11 w-full">Manus OAuthでログイン</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const active = menuItems.find(item => item.path === location);
  const roleLabel = user?.role === "admin" ? "管理者" : "一般ユーザー";
  const displayName = user?.role === "admin" ? "Toolsmith" : user?.name || "ユーザー";

  return (
    <>
      <Sidebar collapsible="icon" className="blueprint-sidebar border-r-0">
        <SidebarHeader className="h-[86px] border-b border-white/15 px-3 py-3">
          <div className="flex h-full items-center gap-3 px-2">
            <div className="grid h-10 w-10 shrink-0 place-items-center border border-cyan-100/60 bg-cyan-200/10 font-mono text-sm font-bold text-cyan-50">PI</div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-bold tracking-tight text-white">Policy Insight</p>
              <p className="mt-0.5 font-mono text-[9px] tracking-[0.16em] text-cyan-100/65">EBPM OPERATIONS HUB</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 py-5">
          <p className="mb-2 px-3 font-mono text-[9px] uppercase tracking-[0.18em] text-blue-200/55 group-data-[collapsible=icon]:hidden">Workspace</p>
          <SidebarMenu className="gap-1">
            {menuItems.map(item => {
              const isActive = location === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton isActive={isActive} onClick={() => setLocation(item.path)} tooltip={item.label} className="blueprint-nav-item h-11">
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
          <div className="mx-2 mt-8 border border-dashed border-cyan-100/20 px-3 py-3 group-data-[collapsible=icon]:hidden">
            <p className="font-mono text-[9px] tracking-[0.16em] text-cyan-100/60">DATA GOVERNANCE</p>
            <p className="mt-1.5 text-xs leading-5 text-blue-100/70">定義・鮮度・意思決定の履歴を一元管理。</p>
          </div>
        </SidebarContent>
        <SidebarFooter className="border-t border-white/15 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-none px-2 py-2 text-left transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-8 w-8 border border-cyan-100/35 bg-blue-950 shrink-0"><AvatarFallback className="bg-transparent text-xs text-cyan-50">{displayName.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-xs font-semibold text-white">{displayName}</p>
                  <Badge variant="outline" className="mt-1 h-4 border-cyan-100/35 px-1 text-[9px] font-normal text-cyan-100">{roleLabel}</Badge>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />ログアウト</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="blueprint-main min-w-0">
        {isMobile ? (
          <div className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-white/15 bg-[#092763]/95 px-3 backdrop-blur">
            <SidebarTrigger className="text-white hover:bg-white/10 hover:text-white" />
            <span className="text-sm font-semibold text-white">{active?.label ?? "Policy Insight Hub"}</span>
          </div>
        ) : null}
        {!isMobile ? <SidebarTrigger className="sidebar-collapse-control" aria-label="サイドバーを開閉"><PanelLeft className="h-4 w-4" /></SidebarTrigger> : null}
        <main className="min-h-screen p-4 md:p-7 lg:p-9">{children}</main>
      </SidebarInset>
    </>
  );
}
