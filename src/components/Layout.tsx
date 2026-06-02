import { Link, useLocation } from "wouter";
import {
  UserPlus, BookOpen, Leaf, Code2, BookMarked, Menu, X,
  Package, ShoppingCart, Receipt, BarChart3, Pill,
} from "lucide-react";
import { useState } from "react";
import { getStockAlertCounts } from "@/lib/store";

const NAV = [
  // ── Original Pages ──────────────────────────────────────────
  { to: "/",                    label: "Patient Registration", icon: UserPlus,    group: "clinic" },
  { to: "/daily-register",      label: "Daily Register",       icon: BookOpen,    group: "clinic" },
  { to: "/ayurvedic-register",  label: "Ayurvedic Register",   icon: Leaf,        group: "clinic" },
  { to: "/complaint-codes",     label: "Complaint Codes",      icon: Code2,       group: "clinic" },
  { to: "/pathya-apathya",      label: "Pathya-Apathya",       icon: BookMarked,  group: "clinic" },
  // ── New Pages ───────────────────────────────────────────────
  { to: "/medicines",           label: "Medicine Master",      icon: Pill,        group: "inventory" },
  { to: "/purchase-bills",      label: "Purchase Bills",       icon: ShoppingCart,group: "inventory" },
  { to: "/medicine-billing",    label: "Medicine Billing",     icon: Receipt,     group: "inventory" },
  { to: "/stock-status",        label: "Stock & Expiry",       icon: Package,     group: "inventory" },
  { to: "/daily-report",        label: "Daily Report",         icon: BarChart3,   group: "reports"  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const alerts = getStockAlertCounts();
  const totalAlerts = alerts.out + alerts.low;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── STICKY NAVBAR ── */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow">
                <span className="text-white font-bold text-sm">CP</span>
              </div>
              <div className="hidden sm:block">
                <p className="font-bold text-slate-900 leading-tight text-sm">ClinicPro</p>
                <p className="text-xs text-slate-500 leading-tight">Manglam Clinic</p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1 ml-4 flex-wrap">
              {/* Divider label */}
              <span className="text-xs text-slate-400 px-2 font-semibold uppercase tracking-wider">Clinic</span>
              {NAV.filter(n => n.group === "clinic").map(({ to, label, icon: Icon }) => {
                const active = location === to;
                return (
                  <Link key={to} href={to}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                      ${active ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </Link>
                );
              })}
              <span className="text-xs text-slate-400 px-2 font-semibold uppercase tracking-wider ml-2">Inventory</span>
              {NAV.filter(n => n.group === "inventory").map(({ to, label, icon: Icon }) => {
                const active = location === to;
                const isStock = to === "/stock-status";
                return (
                  <Link key={to} href={to}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap relative
                      ${active ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                    {isStock && totalAlerts > 0 && (
                      <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                        {totalAlerts}
                      </span>
                    )}
                  </Link>
                );
              })}
              <span className="text-xs text-slate-400 px-2 font-semibold uppercase tracking-wider ml-2">Reports</span>
              {NAV.filter(n => n.group === "reports").map(({ to, label, icon: Icon }) => {
                const active = location === to;
                return (
                  <Link key={to} href={to}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                      ${active ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Stock alert badge (mobile) */}
            {totalAlerts > 0 && (
              <Link href="/stock-status" className="ml-auto lg:hidden flex items-center gap-1 text-sm text-red-600 font-medium">
                <Package className="w-4 h-4" />
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{totalAlerts}</span>
              </Link>
            )}

            {/* Mobile hamburger */}
            <button className="ml-auto lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav dropdown */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-2 space-y-1">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider px-3 pt-2">Clinic</p>
            {NAV.filter(n => n.group === "clinic").map(({ to, label, icon: Icon }) => {
              const active = location === to;
              return (
                <Link key={to} href={to} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${active ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
                  <Icon className="w-4 h-4" />{label}
                </Link>
              );
            })}
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider px-3 pt-2">Inventory</p>
            {NAV.filter(n => n.group === "inventory").map(({ to, label, icon: Icon }) => {
              const active = location === to;
              return (
                <Link key={to} href={to} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${active ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
                  <Icon className="w-4 h-4" />{label}
                  {to === "/stock-status" && totalAlerts > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{totalAlerts}</span>
                  )}
                </Link>
              );
            })}
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider px-3 pt-2">Reports</p>
            {NAV.filter(n => n.group === "reports").map(({ to, label, icon: Icon }) => {
              const active = location === to;
              return (
                <Link key={to} href={to} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${active ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
                  <Icon className="w-4 h-4" />{label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* ── PAGE CONTENT ── */}
      <main className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
