import { Link, useLocation } from "wouter";
import {
  UserPlus, BookOpen, Leaf, Code2, BookMarked,
  Package, ShoppingCart, Receipt, BarChart3, Pill,
  Settings, Menu, X, ChevronDown, LogOut,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { getStockAlertCounts } from "@/lib/store";
import { getSettings, getActiveDoctor, logout } from "@/lib/settings";

const CLINIC_NAV = [
  { to: "/",                   label: "Patient Registration", icon: UserPlus   },
  { to: "/daily-register",     label: "Daily Register",       icon: BookOpen   },
  { to: "/ayurvedic-register", label: "Ayurvedic Register",   icon: Leaf       },
  { to: "/complaint-codes",    label: "Complaint Codes",      icon: Code2      },
  { to: "/pathya-apathya",     label: "Pathya-Apathya",       icon: BookMarked },
];

const INVENTORY_NAV = [
  { to: "/medicines",        label: "Medicine Master",  icon: Pill         },
  { to: "/purchase-bills",   label: "Purchase Bills",   icon: ShoppingCart },
  { to: "/medicine-billing", label: "Medicine Billing", icon: Receipt      },
  { to: "/stock-status",     label: "Stock & Expiry",   icon: Package      },
];

// ── Dropdown component ──────────────────────────────────────
function NavDropdown({ label, items, currentPath, badge }: {
  label: string;
  items: { to: string; label: string; icon: React.ElementType }[];
  currentPath: string;
  badge?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = items.some(i => i.to === currentPath);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
          ${isActive ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
        {label}
        {badge ? (
          <span className="bg-red-500 text-white text-xs rounded-full px-1.5 leading-none py-0.5">{badge}</span>
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 min-w-[210px] z-50">
          {items.map(({ to, label, icon: Icon }) => (
            <Link key={to} href={to} onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors
                ${currentPath === to ? "bg-primary/10 text-primary" : "text-slate-700 hover:bg-slate-50"}`}>
              <Icon className="w-4 h-4" />{label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Layout ──────────────────────────────────────────────────
export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const alerts = getStockAlertCounts();
  const totalAlerts = alerts.out + alerts.low;
  const settings = getSettings();
  const doctor = getActiveDoctor();

  // Doctor-specific colors
  const isDoc1 = doctor?.id === 1;
  const badgeBg    = isDoc1 ? "bg-blue-500 hover:bg-blue-600"    : "bg-emerald-500 hover:bg-emerald-600";
  const mobileBg   = isDoc1 ? "bg-blue-500"                      : "bg-emerald-500";

  // Switch doctor — logout and reload page so App re-evaluates state
  const handleSwitch = () => {
    logout();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="px-4">
          <div className="flex items-center h-14 gap-3">

            {/* Logo + Clinic Name */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow">
                <span className="text-white font-bold text-xs">CP</span>
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="font-bold text-slate-900 text-xs">{settings.clinicName}</p>
                <p className="text-slate-400 text-[10px]">ClinicPro</p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1 ml-2">
              <NavDropdown label="Clinic" items={CLINIC_NAV} currentPath={location} />
              <NavDropdown label="Inventory" items={INVENTORY_NAV} currentPath={location}
                badge={totalAlerts || undefined} />
              <Link href="/daily-report"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                  ${location === "/daily-report" ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
                <BarChart3 className="w-3.5 h-3.5" /> Reports
              </Link>
            </nav>

            {/* Right side */}
            <div className="ml-auto flex items-center gap-2">

              {/* Doctor badge — click to switch */}
              {doctor && (
                <button
                  onClick={handleSwitch}
                  title="Click to switch doctor"
                  className={`hidden sm:flex items-center gap-2 ${badgeBg} text-white pl-3 pr-2.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer`}>
                  {doctor.name}
                  <LogOut className="w-3.5 h-3.5 opacity-80" />
                </button>
              )}

              {/* Settings gear */}
              <Link href="/settings"
                className={`p-2 rounded-lg transition-colors ${location === "/settings" ? "bg-primary/10 text-primary" : "text-slate-500 hover:text-primary hover:bg-primary/10"}`}>
                <Settings className="w-4 h-4" />
              </Link>

              {/* Mobile hamburger */}
              <button className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                onClick={() => setMobileOpen(o => !o)}>
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1 max-h-[80vh] overflow-y-auto">
            {/* Doctor switch button */}
            {doctor && (
              <button onClick={handleSwitch}
                className={`w-full flex items-center justify-between ${mobileBg} text-white px-4 py-3 rounded-xl text-sm font-bold mb-3`}>
                <span>{doctor.name} — {settings.clinicName}</span>
                <span className="flex items-center gap-1 text-xs opacity-90">
                  <LogOut className="w-3.5 h-3.5" /> Switch
                </span>
              </button>
            )}

            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider px-2 pb-1">Clinic</p>
            {CLINIC_NAV.map(({ to, label, icon: Icon }) => (
              <Link key={to} href={to} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${location === to ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}

            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider px-2 pt-3 pb-1">Inventory</p>
            {INVENTORY_NAV.map(({ to, label, icon: Icon }) => (
              <Link key={to} href={to} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${location === to ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
                <Icon className="w-4 h-4" />{label}
                {to === "/stock-status" && totalAlerts > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5">{totalAlerts}</span>
                )}
              </Link>
            ))}

            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider px-2 pt-3 pb-1">Reports</p>
            <Link href="/daily-report" onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${location === "/daily-report" ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
              <BarChart3 className="w-4 h-4" /> Daily Report
            </Link>

            <div className="border-t border-slate-100 pt-2 mt-2">
              <Link href="/settings" onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${location === "/settings" ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
                <Settings className="w-4 h-4" /> Settings
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="pt-14 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
