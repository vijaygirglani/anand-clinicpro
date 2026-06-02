import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Setup from "@/pages/Setup";
import Login from "@/pages/Login";
import SettingsPage from "@/pages/Settings";
import Home from "@/pages/Home";
import DailyRegister from "@/pages/DailyRegister";
import AyurvedicRegister from "@/pages/AyurvedicRegister";
import ComplaintCodes from "@/pages/ComplaintCodes";
import PathyaApathya from "@/pages/PathyaApathya";
import Medicines from "@/pages/Medicines";
import PurchaseBills from "@/pages/PurchaseBills";
import MedicineBilling from "@/pages/MedicineBilling";
import StockStatus from "@/pages/StockStatus";
import DailyReport from "@/pages/DailyReport";
import NotFound from "@/pages/not-found";

import { isSetupDone, getActiveSession, logout } from "@/lib/settings";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000, retry: 1 } },
});

type AppState = "setup" | "login" | "app";

function getInitialState(): AppState {
  if (!isSetupDone()) return "setup";
  if (!getActiveSession()) return "login";
  return "app";
}

export default function App() {
  const [state, setState] = useState<AppState>(getInitialState);

  // This is passed down via Layout context
  const handleSwitch = () => {
    logout();
    setState("login");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {state === "setup" && (
          <Setup onDone={() => setState("login")} />
        )}
        {state === "login" && (
          <Login onLogin={() => setState("app")} />
        )}
        {state === "app" && (
          <WouterRouter base="">
            {/* Store handleSwitch in window so Layout can call it */}
            <SwitchBridge onSwitch={handleSwitch} />
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/daily-register" component={DailyRegister} />
              <Route path="/ayurvedic-register" component={AyurvedicRegister} />
              <Route path="/complaint-codes" component={ComplaintCodes} />
              <Route path="/pathya-apathya" component={PathyaApathya} />
              <Route path="/medicines" component={Medicines} />
              <Route path="/purchase-bills" component={PurchaseBills} />
              <Route path="/medicine-billing" component={MedicineBilling} />
              <Route path="/stock-status" component={StockStatus} />
              <Route path="/daily-report" component={DailyReport} />
              <Route path="/settings">{() => <SettingsPage onLogout={handleSwitch} />}</Route>
              <Route component={NotFound} />
            </Switch>
          </WouterRouter>
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// Bridge to expose handleSwitch to Layout without prop drilling
function SwitchBridge({ onSwitch }: { onSwitch: () => void }) {
  (window as any).__clinicproSwitch = onSwitch;
  return null;
}
