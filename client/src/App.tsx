import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import PolicyDashboard from "./pages/PolicyDashboard";
import DataSources from "./pages/DataSources";
import Indicators from "./pages/Indicators";
import Reviews from "./pages/Reviews";
import KitesurfIntegration from "./pages/KitesurfIntegration";
import PolicyEssences from "./pages/PolicyEssences";
import DataExchange from "./pages/DataExchange";
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";
import { Route, Switch } from "wouter";

function WorkspaceRoute({ component: Component }: { component: React.ComponentType }) {
  return <DashboardLayout><Component /></DashboardLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard" component={() => <WorkspaceRoute component={PolicyDashboard} />} />
      <Route path="/sources" component={() => <WorkspaceRoute component={DataSources} />} />
      <Route path="/indicators" component={() => <WorkspaceRoute component={Indicators} />} />
      <Route path="/reviews" component={() => <WorkspaceRoute component={Reviews} />} />
      <Route path="/collection" component={() => <WorkspaceRoute component={KitesurfIntegration} />} />
      <Route path="/policy-essences" component={() => <WorkspaceRoute component={PolicyEssences} />} />
      <Route path="/data-exchange" component={() => <WorkspaceRoute component={DataExchange} />} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider><Toaster theme="dark" /><Router /></TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
