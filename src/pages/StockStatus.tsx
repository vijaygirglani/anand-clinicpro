import { useState } from "react";
import { Layout } from "@/components/Layout";
import { getMedicines, getExpiryList, getStockValuation, getStockStatus, getMrpPerTablet, getLandingCostPerTablet, type MedicineItem } from "@/lib/store";
import { Package, AlertTriangle, XCircle, CheckCircle2, Clock } from "lucide-react";

export default function StockStatus() {
  const [tab, setTab] = useState<"stock" | "expiry">("stock");
  const medicines = getMedicines();
  const expiryList = getExpiryList();
  const valuation = getStockValuation();

  const out = medicines.filter(m => m.currentStock <= 0);
  const low = medicines.filter(m => m.currentStock > 0 && m.currentStock <= m.reorderLevel);
  const ok  = medicines.filter(m => m.currentStock > m.reorderLevel);

  // Get nearest expiry for a medicine name
  const getNearestExpiry = (name: string) => {
    const items = expiryList.filter(e => e.medicineName.toLowerCase() === name.toLowerCase());
    if (!items.length) return null;
    return items.sort((a, b) => a.daysToExpiry - b.daysToExpiry)[0];
  };

  const expiryColor = (days: number) => {
    if (days < 0)   return "text-red-600 bg-red-50 border border-red-200";
    if (days <= 30)  return "text-red-500 bg-red-50 border border-red-200";
    if (days <= 60)  return "text-orange-500 bg-orange-50 border border-orange-200";
    if (days <= 180) return "text-yellow-600 bg-yellow-50 border border-yellow-200";
    return "text-green-600 bg-green-50 border border-green-200";
  };

  const expiryLabel = (days: number, date: string) => {
    if (days < 0)   return `EXPIRED (${date})`;
    if (days <= 30)  return `⚠ ${days}d — ${date}`;
    if (days <= 60)  return `${days}d — ${date}`;
    return date;
  };

  const statusStyle = (m: MedicineItem) => {
    if (m.currentStock <= 0) return { row: "bg-red-50", text: "text-red-600 font-bold", badge: "text-red-600 bg-red-100 border border-red-300", label: "OUT OF STOCK" };
    if (m.currentStock <= m.reorderLevel) return { row: "bg-yellow-50", text: "text-orange-600 font-bold", badge: "text-orange-600 bg-orange-100 border border-orange-300", label: "LOW STOCK" };
    return { row: "", text: "text-slate-900 font-bold", badge: "text-green-600 bg-green-100 border border-green-300", label: "IN STOCK" };
  };

  const alertCount = expiryList.filter(e => e.status !== "good").length;

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Stock & Expiry</h1>
            <p className="text-sm text-slate-500">{medicines.length} medicines · {out.length} out · {low.length} low</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Items</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{medicines.length}</p>
          </div>
          <div className={`rounded-xl p-4 border ${out.length > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${out.length > 0 ? "text-red-500" : "text-slate-400"}`}>
              <XCircle className="w-3 h-3" />Out of Stock
            </p>
            <p className={`text-3xl font-bold mt-1 ${out.length > 0 ? "text-red-600" : "text-slate-400"}`}>{out.length}</p>
          </div>
          <div className={`rounded-xl p-4 border ${low.length > 0 ? "bg-orange-50 border-orange-200" : "bg-slate-50 border-slate-200"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${low.length > 0 ? "text-orange-500" : "text-slate-400"}`}>
              <AlertTriangle className="w-3 h-3" />Low Stock
            </p>
            <p className={`text-3xl font-bold mt-1 ${low.length > 0 ? "text-orange-600" : "text-slate-400"}`}>{low.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Stock Value</p>
            <p className="text-xl font-bold text-slate-900 mt-1">₹{valuation.atCost.toLocaleString("en-IN")}</p>
            <p className="text-xs text-green-600 mt-0.5">MRP: ₹{valuation.atMrp.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          <button onClick={() => setTab("stock")}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${tab === "stock" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            Stock Status
          </button>
          <button onClick={() => setTab("expiry")}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 ${tab === "expiry" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            Expiry List
            {alertCount > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{alertCount}</span>}
          </button>
        </div>

        {/* ── STOCK TABLE ── */}
        {tab === "stock" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-700 text-white">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-xs">Medicine</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs">Stock (Tabs)</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs">Reorder</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs">MRP/Tab</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs">MRP/Pack</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs">Land/Tab</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs">Stock Value</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs">Expiry</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...out, ...low, ...ok].map((m, idx) => {
                  const st = statusStyle(m);
                  const exp = getNearestExpiry(m.name);
                  const mrpPerTab = getMrpPerTablet(m);
                  return (
                    <tr key={m.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${st.row} ${idx % 2 === 0 && !st.row ? "bg-white" : !st.row ? "bg-slate-50/40" : ""}`}>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{m.name}</td>
                      <td className={`px-4 py-2.5 text-right text-base ${st.text}`}>{m.currentStock}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500 text-xs">{m.reorderLevel}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">₹{mrpPerTab.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500 text-xs">₹{m.mrp.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">₹{m.landingCost.toFixed(4)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-800">₹{(m.currentStock * m.landingCost).toFixed(0)}</td>
                      <td className="px-4 py-2.5 text-center">
                        {exp ? (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${expiryColor(exp.daysToExpiry)}`}>
                            {expiryLabel(exp.daysToExpiry, exp.expiryDate)}
                          </span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${st.badge}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {medicines.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No medicines yet. Add a Purchase Bill first.</p>
              </div>
            )}
          </div>
        )}

        {/* ── EXPIRY TABLE ── */}
        {tab === "expiry" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-700 text-white">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-xs">Medicine</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs">Batch</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs">Expiry</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs">Qty (Tabs)</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs">Days Left</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {expiryList.map((item, i) => {
                  const days = item.daysToExpiry;
                  const rowBg = days < 0 ? "bg-red-50" : days <= 30 ? "bg-red-50/50" : days <= 60 ? "bg-orange-50/50" : i % 2 === 0 ? "bg-white" : "bg-slate-50/40";
                  const packSize = getMedicines().find(m => m.name.toLowerCase() === item.medicineName.toLowerCase())?.packSize || 1;
                  const tabQty = item.qty * packSize;
                  return (
                    <tr key={i} className={`border-b border-slate-100 ${rowBg}`}>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{item.medicineName}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600 font-mono text-xs">{item.batchNo || "—"}</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-slate-700">{item.expiryDate}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{tabQty} tabs</td>
                      <td className="px-4 py-2.5 text-right">
                        {days < 0
                          ? <span className="text-red-600 font-bold">EXPIRED</span>
                          : <span className={days <= 60 ? "text-orange-600 font-bold" : "text-slate-600"}>{days} days</span>
                        }
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${expiryColor(days)}`}>
                          {days < 0 ? "🔴 EXPIRED" : days <= 30 ? "🔴 Critical" : days <= 60 ? "🟠 Soon" : days <= 180 ? "🟡 Watch" : "🟢 Good"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {expiryList.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No expiry data. Add expiry dates in Purchase Bills.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
