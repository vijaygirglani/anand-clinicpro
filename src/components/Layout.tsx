import { Link, useLocation } from "wouter";
import {
  UserPlus, BookOpen, Leaf, Code2, BookMarked, Menu, X,
  Package, ShoppingCart, Receipt, BarChart3, Pill, Settings, LogOut,
} from "lucide-react";
import { useState } from "react";
import { getStockAlertCounts } from "@/lib/store";
import { getSettings, getActiveDoctor, logout } from "@/lib/settings";

const NAV = [
  { to: "/",                   label: "Patient Reg.",    icon: UserPlus,    group: "clinic" },
  { to: "/daily-register",     label: "Daily Register",  icon: BookOpen,    group: "clinic" },
  { to: "/ayurvedic-register", label: "Ayurvedic",       icon: Leaf,        group: "clinic" },
  { to: "/complaint-codes",    label: "Complaint Codes", icon: Code2,       group: "clinic" },
  { to: "/pathya-apathya",     label: "Pathya-Apathya",  icon: BookMarked,  group: "clinic" },
  { to: "/medicines",          label: "Med. Master",     icon: Pill,        group: "inventory" },
  { to: "/purchase-bills",     label: "Purchase Bills",  icon: ShoppingCart,group: "inventory" },
  { to: "/medicine-billing",   label: "Med. Billing",    icon: Receipt,     group: "inventory" },
  { to: "/stock-status",       label: "Stock & Expiry",  icon: Package,     group: "inventory" },
  { to: "/daily-report",       label: "Daily Report",    icon: BarChart3,   group: "reports"  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const alerts = getStockAlertCounts();
  const totalAlerts = alerts.out + alerts.low;
  const settings = getSettings();
  const doctor = getActiveDoctor();
  const doctorColor = doctor?.id === 1 ? "bg-blue-500" : "bg-emerald-500";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center h-14 gap-3">

            {/* Logo + Clinic Name */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow">
                <span className="text-white font-bold text-xs">CP</span>
              </div>
              <div className="hidden sm:block">
                <p className="font-bold text-slate-900 leading-tight text-xs">{settings.clinicName}</p>
                <p className="text-xs text-slate-400 leading-tight">ClinicPro</p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden xl:flex items-center gap-0.5 ml-2">
              <span className="text-xs text-slate-300 px-1.5 font-semibold uppercase tracking-wider">Clinic</span>
              {NAV.filter(n => n.group === "clinic").map(({ to, label, icon: Icon }) => (
                <Link key={to} href={to}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                    ${location === to ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
                  <Icon className="w-3 h-3" />{label}
                </Link>
              ))}
              <span className="text-xs text-slate-300 px-1.5 font-semibold uppercase tracking-wider ml-1">Inventory</span>
              {NAV.filter(n => n.group === "inventory").map(({ to, label, icon: Icon }) => (
                <Link key={to} href={to}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap relative
                    ${location === to ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
                  <Icon className="w-3 h-3" />{label}
                  {to === "/stock-status" && totalAlerts > 0 && (
                    <span className="ml-0.5 bg-red-500 text-white text-xs rounded-full px-1 leading-none">{totalAlerts}</span>
                  )}
                </Link>
              ))}
              <span className="text-xs text-slate-300 px-1.5 font-semibold uppercase tracking-wider ml-1">Reports</span>
              {NAV.filter(n => n.group === "reports").map(({ to, label, icon: Icon }) => (
                <Link key={to} href={to}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                    ${location === to ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
                  <Icon className="w-3 h-3" />{label}
                </Link>
              ))}
            </nav>

            {/* Right — Doctor badge + Settings */}
            <div className="ml-auto flex items-center gap-2">
              {doctor && (
                <div className={`hidden sm:flex items-center gap-1.5 ${doctorColor} text-white px-3 py-1 rounded-full text-xs font-semibold`}>
                  <span>{doctor.name}</span>
                </div>
              )}
              <Link href="/settings"
                className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                <Settings className="w-4 h-4" />
              </Link>
              <button className="xl:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                onClick={() => setMobileOpen(o => !o)}>
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="xl:hidden border-t border-slate-100 bg-white px-4 py-2 space-y-0.5 max-h-[80vh] overflow-y-auto">
            {doctor && (
              <div className={`${doctorColor} text-white px-3 py-2 rounded-lg text-sm font-semibold mb-2`}>
                {doctor.name} — {settings.clinicName}
              </div>
            )}
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider px-2 pt-1">Clinic</p>
            {NAV.filter(n => n.group === "clinic").map(({ to, label, icon: Icon }) => (
              <Link key={to} href={to} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${location === to ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider px-2 pt-2">Inventory</p>
            {NAV.filter(n => n.group === "inventory").map(({ to, label, icon: Icon }) => (
              <Link key={to} href={to} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${location === to ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
                <Icon className="w-4 h-4" />{label}
                {to === "/stock-status" && totalAlerts > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5">{totalAlerts}</span>
                )}
              </Link>
            ))}
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider px-2 pt-2">Reports</p>
            {NAV.filter(n => n.group === "reports").map(({ to, label, icon: Icon }) => (
              <Link key={to} href={to} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${location === to ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
            <Link href="/settings" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 mt-1 border-t border-slate-100 pt-3">
              <Settings className="w-4 h-4" /> Settings
            </Link>
          </div>
        )}
      </header>

      <main className="pt-14 max-w-7xl mx-auto px-3 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
