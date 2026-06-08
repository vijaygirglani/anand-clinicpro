import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { getPatientBillsByDateRange, getExpensesByDateRange } from "@/lib/inventory";
import { getPatients, getMedicineBills, getMedicines, exportBackup } from "@/lib/store";
import { getSettings, isAdmin } from "@/lib/settings";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Copy, Download, Users, IndianRupee, Pill, TrendingUp } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, startOfQuarter,
  startOfYear, subDays, subMonths,
} from "date-fns";

const today = () => format(new Date(), "yyyy-MM-dd");

function presets() {
  const now = new Date();
  const t = today();
  return [
    { label: "Today",         from: t,                                      to: t },
    { label: "Last 7 Days",   from: format(subDays(now, 6), "yyyy-MM-dd"),  to: t },
    { label: "This Month",    from: format(startOfMonth(now), "yyyy-MM-dd"),to: t },
    { label: "Last Month",    from: format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd"),
                              to:   format(endOfMonth(subMonths(now, 1)),   "yyyy-MM-dd") },
    { label: "This Quarter",  from: format(startOfQuarter(now), "yyyy-MM-dd"), to: t },
    { label: "This Year",     from: format(startOfYear(now), "yyyy-MM-dd"),    to: t },
  ];
}

export default function DailyReport() {
  const { toast } = useToast();
  const settings = getSettings();
  const admin = isAdmin();

  const [from, setFrom] = useState(today());
  const [to,   setTo]   = useState(today());
  const [activePreset, setActivePreset] = useState<string>("Today");

  const applyPreset = (p: { label: string; from: string; to: string }) => {
    setFrom(p.from);
    setTo(p.to);
    setActivePreset(p.label);
  };

  const handleFromChange = (v: string) => { setFrom(v); setActivePreset(""); };
  const handleToChange   = (v: string) => { setTo(v);   setActivePreset(""); };

  // ── Core data ──────────────────────────────────────────────────
  const patientBills = useMemo(
    () => getPatientBillsByDateRange(from, to),
    [from, to]
  );

  // Legacy store patients & medicine bills (old system, kept for backward compat)
  const storePatientsInRange = useMemo(
    () => getPatients().filter(p => p.visitDate >= from && p.visitDate <= to),
    [from, to]
  );
  const storeMedBillsInRange = useMemo(
    () => getMedicineBills().filter(b => b.billDate >= from && b.billDate <= to),
    [from, to]
  );

  // ── Per-bill helpers ───────────────────────────────────────────
  const itemSale = (b: ReturnType<typeof getPatientBillsByDateRange>[number]) =>
    b.items.reduce((s, i) => s + i.salePrice, 0);
  const itemCost = (b: ReturnType<typeof getPatientBillsByDateRange>[number]) =>
    b.items.reduce((s, i) => s + i.cost, 0);

  // ── Per-doctor aggregates (inventory bills) ────────────────────
  const d1Bills = patientBills.filter(b => b.doctorId === 1);
  const d2Bills = patientBills.filter(b => b.doctorId === 2);

  const d1MedSale    = d1Bills.reduce((s, b) => s + itemSale(b), 0);
  const d1MedCost    = d1Bills.reduce((s, b) => s + itemCost(b), 0);
  const d1OtherTotal = d1Bills.reduce((s, b) => s + (b.otherCharges ?? 0), 0);

  const d2MedSale    = d2Bills.reduce((s, b) => s + itemSale(b), 0);
  const d2MedCost    = d2Bills.reduce((s, b) => s + itemCost(b), 0);
  const d2OtherTotal = d2Bills.reduce((s, b) => s + (b.otherCharges ?? 0), 0);

  // Legacy consultation fees from old store patients
  const storeD1ConsultFees = storePatientsInRange
    .filter(p => (p as any).doctorId === 1 || !Object.prototype.hasOwnProperty.call(p, "doctorId"))
    .reduce((s, p) => s + (p.fees || 0), 0);
  const storeD2ConsultFees = storePatientsInRange
    .filter(p => (p as any).doctorId === 2)
    .reduce((s, p) => s + (p.fees || 0), 0);

  const d1ConsultFees = storeD1ConsultFees + d1MedSale + d1OtherTotal;
  const d2ConsultFees = storeD2ConsultFees + d2MedSale + d2OtherTotal;

  const d1MedProfit = d1MedSale + d1OtherTotal - d1MedCost;
  const d2MedProfit = d2MedSale + d2OtherTotal - d2MedCost;

  // ── Clinic-wide totals ─────────────────────────────────────────
  const allMedSale    = patientBills.reduce((s, b) => s + itemSale(b), 0);
  const allMedCost    = patientBills.reduce((s, b) => s + itemCost(b), 0);
  const allOtherTotal = patientBills.reduce((s, b) => s + (b.otherCharges ?? 0), 0);

  const storeTotalConsult = storeD1ConsultFees + storeD2ConsultFees;

  const report = {
    totalPatients: patientBills.length + storePatientsInRange.length,
    doctor1: {
      doctorName:      settings.doctor1Name,
      patients:        d1Bills.length + storePatientsInRange.filter(p => (p as any).doctorId === 1 || !Object.prototype.hasOwnProperty.call(p, "doctorId")).length,
      consultationFees: d1ConsultFees,
      medicineSales:   d1MedSale,
      medicineCost:    d1MedCost,
      medicineProfit:  d1MedProfit,
      total:           d1ConsultFees + d1MedProfit,
    },
    doctor2: {
      doctorName:      settings.doctor2Name,
      patients:        d2Bills.length + storePatientsInRange.filter(p => (p as any).doctorId === 2).length,
      consultationFees: d2ConsultFees,
      medicineSales:   d2MedSale,
      medicineCost:    d2MedCost,
      medicineProfit:  d2MedProfit,
      total:           d2ConsultFees + d2MedProfit,
    },
    totalConsultation:   storeTotalConsult + allMedSale + allOtherTotal,
    totalMedicineSales:  allMedSale,
    totalMedicineProfit: allMedSale + allOtherTotal - allMedCost,
    totalMedicineCost:   allMedCost,
    grandTotal:          storeTotalConsult + allMedSale + allOtherTotal,
    lowStockAlerts: getMedicines()
      .filter(m => m.currentStock > 0 && m.currentStock <= m.reorderLevel)
      .map(m => ({ name: m.name, currentStock: m.currentStock })),
  };

  // ── WhatsApp text ──────────────────────────────────────────────
  const fmtWA = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const rangeLabel = from === to
    ? format(new Date(from + "T00:00:00"), "dd/MM/yyyy")
    : `${format(new Date(from + "T00:00:00"), "dd/MM/yyyy")} – ${format(new Date(to + "T00:00:00"), "dd/MM/yyyy")}`;

  const whatsAppText = [
    `🏥 *${settings.clinicName} — Report*`,
    `📅 ${rangeLabel}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `👨‍⚕️ *${report.doctor1.doctorName}*`,
    `   Patients: ${report.doctor1.patients}`,
    `   Consultation: ${fmtWA(report.doctor1.consultationFees)}`,
    `   Med Sales: ${fmtWA(report.doctor1.medicineSales)}`,
    `   Med Cost: ${fmtWA(report.doctor1.medicineCost)}`,
    `   Med Profit: ${fmtWA(report.doctor1.medicineProfit)}`,
    `   *Total: ${fmtWA(report.doctor1.total)}*`,
    ``,
    `👨‍⚕️ *${report.doctor2.doctorName}*`,
    `   Patients: ${report.doctor2.patients}`,
    `   Consultation: ${fmtWA(report.doctor2.consultationFees)}`,
    `   Med Sales: ${fmtWA(report.doctor2.medicineSales)}`,
    `   Med Cost: ${fmtWA(report.doctor2.medicineCost)}`,
    `   Med Profit: ${fmtWA(report.doctor2.medicineProfit)}`,
    `   *Total: ${fmtWA(report.doctor2.total)}*`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🏥 *CLINIC TOTAL*`,
    `   Total Patients: ${report.totalPatients}`,
    `   Total Collection: ${fmtWA(report.totalConsultation)}`,
    `   Total Med Profit: ${fmtWA(report.totalMedicineProfit)}`,
    `   *Grand Total: ${fmtWA(report.grandTotal)}*`,
    ...(report.lowStockAlerts.length > 0
      ? [``, `⚠️ *LOW STOCK:*`, ...report.lowStockAlerts.map(a => `• ${a.name} — ${a.currentStock} units`)]
      : []),
  ].join("\n");

  // ── Handlers ───────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(whatsAppText).finally(() => window.focus());
    toast({ title: "Copied! Paste in WhatsApp" });
  };

  const handleBackup = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clinicpro-backup-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Backup downloaded" });
  };

  const fmt = (n: number) =>
    `₹${(Math.round(n * 100) / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const StatCard = ({ label, value, sub, color = "slate" }: { label: string; value: string; sub?: string; color?: string }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color === "green" ? "text-green-600" : "text-slate-900"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Report</h1>
              <p className="text-sm text-slate-500">{settings.clinicName}</p>
            </div>
          </div>
          <button onClick={handleBackup}
            className="flex items-center gap-1.5 border border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" /> Backup
          </button>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2">
            {presets().map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activePreset === p.label
                    ? "text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                style={activePreset === p.label ? { background: "rgb(var(--primary))" } : undefined}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Manual from / to */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">From</label>
              <input
                type="date"
                value={from}
                onChange={e => handleFromChange(e.target.value)}
                className="border-2 border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[rgb(var(--primary))] transition-colors"
              />
            </div>
            <span className="text-slate-400 text-sm">—</span>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">To</label>
              <input
                type="date"
                value={to}
                max={today()}
                onChange={e => handleToChange(e.target.value)}
                className="border-2 border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[rgb(var(--primary))] transition-colors"
              />
            </div>
            <span className="text-xs text-slate-400 ml-1">
              {from === to
                ? format(new Date(from + "T00:00:00"), "dd MMM yyyy")
                : `${format(new Date(from + "T00:00:00"), "dd MMM")} – ${format(new Date(to + "T00:00:00"), "dd MMM yyyy")}`}
            </span>
          </div>
        </div>

        {/* Clinic Total Cards — admin only */}
        {admin && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Clinic Total</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Patients"   value={String(report.totalPatients)} />
              <StatCard label="Total Collection" value={fmt(report.totalConsultation)} />
              <StatCard label="Med Profit"       value={fmt(report.totalMedicineProfit)} color="green" />
              <StatCard label="Grand Total"      value={fmt(report.grandTotal)} color="green"
                sub={`Cost: ${fmt(report.totalMedicineCost)}`} />
            </div>
          </div>
        )}

        {/* Per Doctor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Doctor 1 — Blue — admin only */}
          {admin && (
            <div className="bg-white border-2 border-blue-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-4">
                <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Doctor 1</p>
                <p className="text-white font-bold text-lg">{settings.doctor1Name}</p>
                <p className="text-blue-100 text-xs">{settings.doctor1Designation}</p>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="flex items-center gap-2 text-sm text-slate-600"><Users className="w-4 h-4 text-blue-400" />Patients</span>
                  <span className="font-bold text-slate-900">{report.doctor1.patients}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="flex items-center gap-2 text-sm text-slate-600"><IndianRupee className="w-4 h-4 text-blue-400" />Consultation</span>
                  <span className="font-bold text-slate-900">{fmt(report.doctor1.consultationFees)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="flex items-center gap-2 text-sm text-slate-600"><Pill className="w-4 h-4 text-slate-400" />Med Cost</span>
                  <span className="font-semibold text-slate-500">{fmt(report.doctor1.medicineCost)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="flex items-center gap-2 text-sm text-slate-600"><TrendingUp className="w-4 h-4 text-green-400" />Med Profit</span>
                  <span className="font-bold text-green-600">{fmt(report.doctor1.medicineProfit)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Doctor 2 — Emerald */}
          <div className="bg-white border-2 border-emerald-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-4">
              <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Doctor 2</p>
              <p className="text-white font-bold text-lg">{settings.doctor2Name}</p>
              <p className="text-emerald-100 text-xs">{settings.doctor2Designation}</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-sm text-slate-600"><Users className="w-4 h-4 text-emerald-400" />Patients</span>
                <span className="font-bold text-slate-900">{report.doctor2.patients}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-sm text-slate-600"><IndianRupee className="w-4 h-4 text-emerald-400" />Consultation</span>
                <span className="font-bold text-slate-900">{fmt(report.doctor2.consultationFees)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-sm text-slate-600"><Pill className="w-4 h-4 text-slate-400" />Med Cost</span>
                <span className="font-semibold text-slate-500">{fmt(report.doctor2.medicineCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="flex items-center gap-2 text-sm text-slate-600"><TrendingUp className="w-4 h-4 text-green-400" />Med Profit</span>
                <span className="font-bold text-green-600">{fmt(report.doctor2.medicineProfit)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock */}
        {report.lowStockAlerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="font-semibold text-amber-800 mb-2">⚠️ Low Stock Alert</p>
            <div className="flex flex-wrap gap-2">
              {report.lowStockAlerts.map((a, i) => (
                <span key={i} className="text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                  {a.name} — {a.currentStock} left
                </span>
              ))}
            </div>
          </div>
        )}

        {/* WhatsApp Report */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
            <p className="font-semibold text-slate-800">WhatsApp Report</p>
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors">
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>
          <pre className="px-5 py-4 text-sm text-slate-700 whitespace-pre-wrap font-mono">{whatsAppText}</pre>
        </div>

      </div>
    </Layout>
  );
}
