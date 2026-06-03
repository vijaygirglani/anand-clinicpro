import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";

import Setup from "@/pages/Setup";
import Login from "@/pages/Login";
import SettingsPage from "@/pages/Settings";
import Home from "@/pages/Home";
import DailyRegister from "@/pages/DailyRegister";
import ComplaintCodes from "@/pages/ComplaintCodes";
import PurchaseBills from "@/pages/PurchaseBills";
import StockStatus from "@/pages/StockStatus";
import Expenses from "@/pages/Expenses";
import DailyReport from "@/pages/DailyReport";
import NotFound from "@/pages/not-found";

import { isSetupDone, getActiveSession, logout } from "@/lib/settings";
import { initElectronStorage } from "@/lib/storage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000, retry: 1 } },
});

type AppState = "setup" | "login" | "app";

function getInitialState(): AppState {
  if (!isSetupDone()) return "setup";
  if (!getActiveSession()) return "login";
  return "app";
}

function AppRoutes({ onSwitch }: { onSwitch: () => void }) {
  // Expose switch function to Layout (called from navbar doctor badge)
  (window as any).__clinicproSwitch = onSwitch;
  return (
    <ThemeProvider>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/daily-register" component={DailyRegister} />
        <Route path="/complaint-codes" component={ComplaintCodes} />
        <Route path="/purchase-bills" component={PurchaseBills} />
        <Route path="/stock-expiry" component={StockStatus} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/daily-report" component={DailyReport} />
        <Route path="/settings">{() => <SettingsPage onLogout={onSwitch} />}</Route>
        <Route component={NotFound} />
      </Switch>
    </ThemeProvider>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState>("login");

  // Init storage first (critical for Electron)
  useState(() => {
    initElectronStorage().then(() => {
      setState(getInitialState());
      setReady(true);
    });
  });

  if (!ready) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-2xl">CP</span>
        </div>
        <p className="text-slate-500 text-sm">Loading ClinicPro...</p>
      </div>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {state === "setup" && <Setup onDone={() => setState("login")} />}
        {state === "login" && <Login onLogin={() => setState("app")} />}
        {state === "app" && (
          <WouterRouter base="">
            <AppRoutes onSwitch={() => setState("login")} />
          </WouterRouter>
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
