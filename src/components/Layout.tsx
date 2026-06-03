import { Link, useLocation } from "wouter";
import { UserPlus, BookOpen, Code2, Package, ShoppingCart, BarChart3, Menu, X, ChevronDown, LogOut, Settings, IndianRupee } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { getSettings, getActiveDoctor, logout } from "@/lib/settings";
import { getAllBatchStocks } from "@/lib/inventory";

const CLINIC_NAV = [
  { to: "/",               label: "Patient Registration", icon: UserPlus },
  { to: "/daily-register", label: "Daily Register",       icon: BookOpen },
  { to: "/complaint-codes",label: "Complaint Codes",      icon: Code2    },
];

const INVENTORY_NAV = [
  { to: "/purchase-bills", label: "Purchase Bills",  icon: ShoppingCart },
  { to: "/stock-expiry",   label: "Stock & Expiry",  icon: Package      },
  { to: "/expenses",       label: "Expenses",        icon: IndianRupee  },
];

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
          ${isActive ? "bg-[rgb(var(--primary-light))] text-[rgb(var(--primary))]" : "text-slate-600 hover:bg-slate-100"}`}>
        {label}
        {badge ? (
          <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{badge}</span>
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 min-w-[210px] z-50">
          {items.map(({ to, label, icon: Icon }) => (
            <Link key={to} href={to} onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors
                ${currentPath === to ? "bg-[rgb(var(--primary-light))] text-[rgb(var(--primary))]" : "text-slate-700 hover:bg-slate-50"}`}>
              <Icon className="w-4 h-4" />{label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const settings = getSettings();
  const doctor = getActiveDoctor();

  // Live stock alerts
  const batches = getAllBatchStocks();
  const alerts = batches.filter(b => !b.discontinued && (b.stockStatus === "out" || b.stockStatus === "low")).length;

  const doctorBg = doctor?.id === 1
    ? "bg-blue-500 hover:bg-blue-600"
    : "bg-emerald-500 hover:bg-emerald-600";

  const handleSwitch = () => {
    logout();
    const fn = (window as any).__clinicproSwitch;
    if (typeof fn === "function") fn();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="px-4">
          <div className="flex items-center h-14 gap-3">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow"
                style={{ background: `linear-gradient(135deg, rgb(var(--primary)), rgb(var(--primary-dark)))` }}>
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
              <NavDropdown label="Inventory" items={INVENTORY_NAV} currentPath={location} badge={alerts || undefined} />
              <Link href="/daily-report"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                  ${location === "/daily-report" ? "bg-[rgb(var(--primary-light))] text-[rgb(var(--primary))]" : "text-slate-600 hover:bg-slate-100"}`}>
                <BarChart3 className="w-3.5 h-3.5" /> Reports
              </Link>
            </nav>

            {/* Right */}
            <div className="ml-auto flex items-center gap-2">
              {doctor && (
                <button onClick={handleSwitch}
                  className={`hidden sm:flex items-center gap-2 ${doctorBg} text-white pl-3 pr-2.5 py-1.5 rounded-full text-xs font-bold transition-colors`}
                  title="Switch Doctor">
                  {doctor.name}
                  <LogOut className="w-3.5 h-3.5 opacity-80" />
                </button>
              )}
              <Link href="/settings"
                className={`p-2 rounded-lg transition-colors ${location === "/settings" ? "bg-[rgb(var(--primary-light))] text-[rgb(var(--primary))]" : "text-slate-500 hover:bg-slate-100"}`}>
                <Settings className="w-4 h-4" />
              </Link>
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
            {doctor && (
              <button onClick={handleSwitch}
                className={`w-full flex items-center justify-between ${doctorBg} text-white px-4 py-3 rounded-xl text-sm font-bold mb-3`}>
                <span>{doctor.name} — {settings.clinicName}</span>
                <span className="flex items-center gap-1 text-xs opacity-90"><LogOut className="w-3.5 h-3.5" /> Switch</span>
              </button>
            )}
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider px-2 pb-1">Clinic</p>
            {CLINIC_NAV.map(({ to, label, icon: Icon }) => (
              <Link key={to} href={to} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${location === to ? "bg-[rgb(var(--primary-light))] text-[rgb(var(--primary))]" : "text-slate-600 hover:bg-slate-100"}`}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider px-2 pt-3 pb-1">Inventory</p>
            {INVENTORY_NAV.map(({ to, label, icon: Icon }) => (
              <Link key={to} href={to} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${location === to ? "bg-[rgb(var(--primary-light))] text-[rgb(var(--primary))]" : "text-slate-600 hover:bg-slate-100"}`}>
                <Icon className="w-4 h-4" />{label}
                {to === "/stock-expiry" && alerts > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5">{alerts}</span>
                )}
              </Link>
            ))}
            <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
              <Link href="/daily-report" onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${location === "/daily-report" ? "bg-[rgb(var(--primary-light))] text-[rgb(var(--primary))]" : "text-slate-600 hover:bg-slate-100"}`}>
                <BarChart3 className="w-4 h-4" />Reports
              </Link>
              <Link href="/settings" onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${location === "/settings" ? "bg-[rgb(var(--primary-light))] text-[rgb(var(--primary))]" : "text-slate-600 hover:bg-slate-100"}`}>
                <Settings className="w-4 h-4" />Settings
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
