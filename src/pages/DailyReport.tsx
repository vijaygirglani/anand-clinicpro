import { useState } from "react";
import { Layout } from "@/components/Layout";
import { getDailyProfitReport as getInventoryReport, getPatientBillsByDate, getExpensesByDateRange } from "@/lib/inventory";
import { getDailyProfitReport, generateWhatsAppReport, exportBackup } from "@/lib/store";
import { getSettings, isAdmin } from "@/lib/settings";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Copy, Download, Users, IndianRupee, Pill, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function DailyReport() {
  const { toast } = useToast();
  const settings = getSettings();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const admin = isAdmin();

  // Use inventory-based profit report (reads from cp_patient_bills)
  const patientBills = getPatientBillsByDate(date);
  console.log("PATIENT BILLS:", JSON.stringify(
    patientBills.map(b => ({
      id: b.id,
      doctorId: b.doctorId,
      items: b.items?.length,
      totalProfit: b.totalProfit,
      otherCharges: b.otherCharges
    }))
  ));
  
  // Fall back to store report for consultation data, but add med profit from inventory
  const storeReport = getDailyProfitReport(date, {
    doctor1Name: settings.doctor1Name,
    doctor2Name: settings.doctor2Name,
  });

  // Migration helpers: always recompute from items (ignores stored totalSale/totalProfit
  // which, in old bills, had otherCharges baked in). otherCharges lives only in bill.otherCharges.
  const itemSale   = (b: ReturnType<typeof getPatientBillsByDate>[number]) =>
    b.items.reduce((s, i) => s + i.salePrice, 0);
  const itemCost   = (b: ReturnType<typeof getPatientBillsByDate>[number]) =>
    b.items.reduce((s, i) => s + i.cost, 0);

  const d1Bills = patientBills.filter(b => b.doctorId === 1);
  const d2Bills = patientBills.filter(b => b.doctorId === 2);

  const d1MedSale    = d1Bills.reduce((s, b) => s + itemSale(b), 0);
  const d1MedCost    = d1Bills.reduce((s, b) => s + itemCost(b), 0);
  const d1OtherTotal = d1Bills.reduce((s, b) => s + (b.otherCharges ?? 0), 0);

  const d2MedSale    = d2Bills.reduce((s, b) => s + itemSale(b), 0);
  const d2MedCost    = d2Bills.reduce((s, b) => s + itemCost(b), 0);
  const d2OtherTotal = d2Bills.reduce((s, b) => s + (b.otherCharges ?? 0), 0);

  // NOTE: storeReport.doctorN.consultationFees = sum(patient.fees).
  // For records saved before this fix, patient.fees had medSale+otherCharges baked in —
  // those old records will still over-report here. New records are correct.
  const d1ConsultFees = storeReport.doctor1.consultationFees + d1MedSale + d1OtherTotal;
  const d2ConsultFees = storeReport.doctor2.consultationFees + d2MedSale + d2OtherTotal;

  const d1MedProfit = d1MedSale + d1OtherTotal - d1MedCost;
  const d2MedProfit = d2MedSale + d2OtherTotal - d2MedCost;

  const allMedSale    = patientBills.reduce((s, b) => s + itemSale(b), 0);
  const allMedCost    = patientBills.reduce((s, b) => s + itemCost(b), 0);
  const allOtherTotal = patientBills.reduce((s, b) => s + (b.otherCharges ?? 0), 0);

  const report = {
    ...storeReport,
    doctor1: {
      ...storeReport.doctor1,
      consultationFees: d1ConsultFees,
      medicineSales: d1MedSale,
      medicineCost: d1MedCost,
      medicineProfit: d1MedProfit,
      total: d1ConsultFees + d1MedProfit,
    },
    doctor2: {
      ...storeReport.doctor2,
      consultationFees: d2ConsultFees,
      medicineSales: d2MedSale,
      medicineCost: d2MedCost,
      medicineProfit: d2MedProfit,
      total: d2ConsultFees + d2MedProfit,
    },
    // Total Collection = all money received (consult + med sale + other charges)
    totalConsultation: storeReport.totalConsultation + allMedSale + allOtherTotal,
    totalMedicineSales: allMedSale,
    totalMedicineProfit: allMedSale + allOtherTotal - allMedCost,
    grandTotal: storeReport.totalConsultation + allMedSale + allOtherTotal,
  };

  const whatsAppText = generateWhatsAppReport(date, settings.clinicName, {
    doctor1Name: settings.doctor1Name,
    doctor2Name: settings.doctor2Name,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsAppText).finally(() => {
      // Restore focus to the window after clipboard API releases it (Electron focus fix)
      window.focus();
    });
    toast({ title: "Copied! Paste in WhatsApp" });
  };

  const handleBackup = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clinicpro-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
    // Append to DOM before clicking — prevents Electron focus loss on detached element
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Backup downloaded" });
  };

  const fmt = (n: number) => `₹${(Math.round(n * 100) / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const StatCard = ({ label, value, sub, color = "slate" }: { label: string; value: string; sub?: string; color?: string }) => (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm`}>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 text-${color === "green" ? "green-600" : "slate-900"}`}>{value}</p>
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
              <h1 className="text-xl font-bold text-slate-900">Daily Report</h1>
              <p className="text-sm text-slate-500">{settings.clinicName}</p>
            </div>
          </div>
          <button onClick={handleBackup}
            className="flex items-center gap-1.5 border border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" /> Backup
          </button>
        </div>

        {/* Date */}
        <div>
          <label className="text-sm font-semibold text-slate-700">Select Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="mt-1.5 block border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors" />
        </div>

        {/* Clinic Total Cards — admin only */}
        {admin && <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Clinic Total</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Patients" value={String(report.totalPatients)} />
            <StatCard label="Total Collection" value={fmt(report.totalConsultation)} />
            <StatCard label="Med Profit" value={fmt(report.totalMedicineProfit)} color="green" />
            <StatCard label="Grand Total" value={fmt(report.grandTotal)} color="green"
              sub={`Cost: ${fmt(report.totalMedicineCost)}`} />
          </div>
        </div>}

        {/* Per Doctor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Doctor 1 — Blue — admin only */}
          {admin && <div className="bg-white border-2 border-blue-100 rounded-2xl overflow-hidden shadow-sm">
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
          </div>}

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