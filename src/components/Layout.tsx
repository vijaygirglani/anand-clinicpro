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
  { to: "/",                   label: "Patient Registration", icon: UserPlus  },
  { to: "/daily-register",     label: "Daily Register",       icon: BookOpen  },
  { to: "/ayurvedic-register", label: "Ayurvedic Register",   icon: Leaf      },
  { to: "/complaint-codes",    label: "Complaint Codes",      icon: Code2     },
  { to: "/pathya-apathya",     label: "Pathya-Apathya",       icon: BookMarked},
];

const INVENTORY_NAV = [
  { to: "/medicines",        label: "Medicine Master",  icon: Pill        },
  { to: "/purchase-bills",   label: "Purchase Bills",   icon: ShoppingCart},
  { to: "/medicine-billing", label: "Medicine Billing", icon: Receipt     },
  { to: "/stock-status",     label: "Stock & Expiry",   icon: Package     },
];

interface DropdownProps {
  label: string;
  items: { to: string; label: string; icon: React.ElementType }[];
  currentPath: string;
  badge?: number;
}

function NavDropdown({ label, items, currentPath, badge }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = items.some(i => i.to === currentPath);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
          ${isActive ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
        {label}
        {badge ? (
          <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{badge}</span>
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-[200px] z-50">
          {items.map(({ to, label, icon: Icon }) => (
            <Link key={to} href={to} onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors
                ${currentPath === to ? "bg-primary/10 text-primary" : "text-slate-700 hover:bg-slate-50"}`}>
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  children: React.ReactNode;
  onSwitchDoctor?: () => void;
}

export function Layout({ children, onSwitchDoctor }: Props) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const alerts = getStockAlertCounts();
  const settings = getSettings();
  const doctor = getActiveDoctor();
  const doctorColor = doctor?.id === 1
    ? "bg-blue-500 hover:bg-blue-600"
    : "bg-emerald-500 hover:bg-emerald-600";

  const handleSwitch = () => {
    logout();
    onSwitchDoctor?.();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="px-4">
          <div className="flex items-center h-14 gap-3">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow">
                <span className="text-white font-bold text-xs">CP</span>
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="font-bold text-slate-900 text-xs">{settings.clinicName}</p>
                <p className="text-slate-400 text-xs">ClinicPro</p>
              </div>
            </Link>

            {/* Desktop Nav — 4 items max */}
            <nav className="hidden md:flex items-center gap-1 ml-2">
              {/* Patient Reg direct link */}
              <Link href="/"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                  ${location === "/" ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
                <UserPlus className="w-3.5 h-3.5" /> Patients
              </Link>

              {/* Clinic dropdown */}
              <NavDropdown label="Clinic" items={CLINIC_NAV.slice(1)} currentPath={location} />

              {/* Inventory dropdown */}
              <NavDropdown label="Inventory" items={INVENTORY_NAV} currentPath={location} badge={alerts.out + alerts.low || undefined} />

              {/* Daily Report direct link */}
              <Link href="/daily-report"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                  ${location === "/daily-report" ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
                <BarChart3 className="w-3.5 h-3.5" /> Reports
              </Link>
            </nav>

            {/* Right side */}
            <div className="ml-auto flex items-center gap-2">
              {/* Doctor badge + switch */}
              {doctor && (
                <button onClick={handleSwitch}
                  className={`hidden sm:flex items-center gap-1.5 ${doctorColor} text-white pl-3 pr-2 py-1.5 rounded-full text-xs font-semibold transition-colors`}
                  title="Switch Doctor">
                  {doctor.name}
                  <LogOut className="w-3 h-3 ml-1 opacity-70" />
                </button>
              )}

              {/* Settings */}
              <Link href="/settings"
                className={`p-2 rounded-lg transition-colors ${location === "/settings" ? "bg-primary/10 text-primary" : "text-slate-500 hover:text-primary hover:bg-primary/10"}`}>
                <Settings className="w-4 h-4" />
              </Link>

              {/* Mobile menu */}
              <button className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                onClick={() => setMobileOpen(o => !o)}>
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1 max-h-[80vh] overflow-y-auto">
            {/* Doctor badge */}
            {doctor && (
              <button onClick={handleSwitch}
                className={`w-full flex items-center justify-between ${doctorColor} text-white px-4 py-3 rounded-xl text-sm font-bold mb-3`}>
                <span>{doctor.name} — {settings.clinicName}</span>
                <span className="text-xs opacity-80 flex items-center gap-1"><LogOut className="w-3 h-3" /> Switch</span>
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
                {to === "/stock-status" && (alerts.out + alerts.low) > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5">{alerts.out + alerts.low}</span>
                )}
              </Link>
            ))}

            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider px-2 pt-3 pb-1">Reports</p>
            <Link href="/daily-report" onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${location === "/daily-report" ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
              <BarChart3 className="w-4 h-4" />Daily Report
            </Link>

            <Link href="/settings" onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border-t border-slate-100 mt-2 pt-3
                ${location === "/settings" ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"}`}>
              <Settings className="w-4 h-4" />Settings
            </Link>
          </div>
        )}
      </header>

      <main className="pt-14 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
