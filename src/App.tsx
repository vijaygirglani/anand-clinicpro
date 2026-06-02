import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// ── Original Pages (unchanged) ──────────────────────────────
import Home from "@/pages/Home";
import DailyRegister from "@/pages/DailyRegister";
import AyurvedicRegister from "@/pages/AyurvedicRegister";
import ComplaintCodes from "@/pages/ComplaintCodes";
import PathyaApathya from "@/pages/PathyaApathya";

// ── New Pages ────────────────────────────────────────────────
import Medicines from "@/pages/Medicines";
import PurchaseBills from "@/pages/PurchaseBills";
import MedicineBilling from "@/pages/MedicineBilling";
import StockStatus from "@/pages/StockStatus";
import DailyReport from "@/pages/DailyReport";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

function Router() {
  return (
    <Switch>
      {/* Original routes */}
      <Route path="/" component={Home} />
      <Route path="/daily-register" component={DailyRegister} />
      <Route path="/ayurvedic-register" component={AyurvedicRegister} />
      <Route path="/complaint-codes" component={ComplaintCodes} />
      <Route path="/pathya-apathya" component={PathyaApathya} />
      {/* New routes */}
      <Route path="/medicines" component={Medicines} />
      <Route path="/purchase-bills" component={PurchaseBills} />
      <Route path="/medicine-billing" component={MedicineBilling} />
      <Route path="/stock-status" component={StockStatus} />
      <Route path="/daily-report" component={DailyReport} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base="">
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
