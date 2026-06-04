import { useState } from "react";
import { Layout } from "@/components/Layout";
import { getAllBatchStocks, discontinueBatch, reactivateBatch, getStockValuation, setBatchReorderLevel, dismissStockAlert, formatExpiry } from "@/lib/inventory";
import { getSettings, getActiveDoctor } from "@/lib/settings";
import { Package, AlertTriangle, XCircle, Clock, Ban, BellOff, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function StockStatus() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"stock"|"expiry">("stock");
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [, forceUpdate] = useState(0);
  const [editingReorder, setEditingReorder] = useState<string | null>(null);
  const [reorderValue, setReorderValue] = useState<number>(10);
  const settings = getSettings();
  const doctor = getActiveDoctor();
  const isAdmin = doctor?.id === 1;

  const allBatches = getAllBatchStocks();
  const activeBatches = allBatches.filter(b => !b.discontinued);
  const valuation = getStockValuation();

  const outCount = activeBatches.filter(b => b.stockStatus === "out").length;
  const lowCount = activeBatches.filter(b => b.stockStatus === "low").length;

  const expiryBatches = allBatches
    .filter(b => !b.discontinued)
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);

  const alertBatches = expiryBatches.filter(b => b.expiryStatus !== "good");

  const handleDiscontinue = (billId: string, batchNo: string, medicineName: string) => {
    if (!confirm(`Mark ${medicineName} (Batch: ${batchNo}) as discontinued? It will be hidden from patient prescriptions.`)) return;
    discontinueBatch(billId, batchNo, medicineName);
    forceUpdate(n => n + 1);
    toast({ title: "Batch discontinued" });
  };

  const statusBadge = (status: string) => {
    if (status === "out") return <span className="text-xs font-bold text-red-600 bg-red-100 border border-red-300 px-2.5 py-1 rounded-full">OUT OF STOCK</span>;
    if (status === "low") return <span className="text-xs font-bold text-orange-600 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-full">LOW STOCK</span>;
    return <span className="text-xs font-bold text-green-600 bg-green-100 border border-green-300 px-2.5 py-1 rounded-full">IN STOCK</span>;
  };

  const expiryBadge = (status: string, days: number) => {
    const styles: Record<string, string> = {
      expired:  "text-red-600 bg-red-50 border border-red-200",
      critical: "text-red-500 bg-red-50 border border-red-200",
      soon:     "text-orange-500 bg-orange-50 border border-orange-200",
      watch:    "text-yellow-600 bg-yellow-50 border border-yellow-200",
      good:     "text-green-600 bg-green-50 border border-green-200",
    };
    const labels: Record<string, string> = {
      expired: "🔴 EXPIRED", critical: `🔴 ${days}d`, soon: `🟠 ${days}d`, watch: `🟡 ${days}d`, good: `🟢 ${days}d`,
    };
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status]||styles.good}`}>{labels[status]||`${days}d`}</span>;
  };

  const displayBatches = showDiscontinued ? allBatches : activeBatches;

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary-light))] flex items-center justify-center">
              <Package className="w-5 h-5 text-[rgb(var(--primary))]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Stock & Expiry</h1>
              <p className="text-sm text-slate-500">{activeBatches.length} batches · {outCount} out · {lowCount} low</p>
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setShowDiscontinued(s => !s)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium border transition-colors ${showDiscontinued ? "border-slate-400 bg-slate-100 text-slate-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
              {showDiscontinued ? "Hide Discontinued" : "Show Discontinued"}
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Batches</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{activeBatches.length}</p>
          </div>
          <div className={`rounded-xl p-4 border ${outCount > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${outCount > 0 ? "text-red-500" : "text-slate-400"}`}><XCircle className="w-3 h-3 inline mr-1"/>Out of Stock</p>
            <p className={`text-3xl font-bold mt-1 ${outCount > 0 ? "text-red-600" : "text-slate-400"}`}>{outCount}</p>
          </div>
          <div className={`rounded-xl p-4 border ${lowCount > 0 ? "bg-orange-50 border-orange-200" : "bg-slate-50 border-slate-200"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${lowCount > 0 ? "text-orange-500" : "text-slate-400"}`}><AlertTriangle className="w-3 h-3 inline mr-1"/>Low Stock</p>
            <p className={`text-3xl font-bold mt-1 ${lowCount > 0 ? "text-orange-600" : "text-slate-400"}`}>{lowCount}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Stock Value</p>
            <p className="text-xl font-bold text-slate-900 mt-1">₹{valuation.atCost.toLocaleString("en-IN")}</p>
            <p className="text-xs text-green-600 mt-0.5">MRP: ₹{valuation.atMrp.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          <button onClick={() => setTab("stock")} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${tab === "stock" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Stock Status</button>
          <button onClick={() => setTab("expiry")} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 ${tab === "expiry" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
            Expiry List {alertBatches.length > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{alertBatches.length}</span>}
          </button>
        </div>

        {/* Stock Table */}
        {tab === "stock" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-700 text-white">
                <tr>
                  {["Medicine","Batch","Expiry","Pack","MRP/Tab","MRP/Pack","Land/Tab","Stock (Tabs)","Status", isAdmin?"Reorder · Alert · Stop":""].filter(Boolean).map(h=>(
                    <th key={h} className="px-4 py-3 text-left font-semibold text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayBatches.map((b, i) => (
                  <tr key={`${b.billId}-${b.batchNo}`}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors
                      ${b.discontinued ? "opacity-50 bg-slate-50" : b.stockStatus === "out" ? "bg-red-50/40" : b.stockStatus === "low" ? "bg-orange-50/40" : i%2===0?"bg-white":"bg-slate-50/20"}`}>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{b.medicineName}{b.discontinued && <span className="ml-2 text-xs text-slate-400">(discontinued)</span>}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{b.batchNo||"—"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatExpiry(b.expiryDate)}</td>
                    <td className="px-4 py-2.5 text-slate-600 text-xs">{b.packSize}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">₹{b.mrpPerTablet.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">₹{b.mrpPerPack.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-blue-600 font-semibold">₹{b.landingCostPerTablet.toFixed(4)}</td>
                    <td className={`px-4 py-2.5 font-bold text-lg ${b.stockStatus==="out"?"text-red-600":b.stockStatus==="low"?"text-orange-600":"text-slate-900"}`}>{b.tabletsAvailable}</td>
                    <td className="px-4 py-2.5">{statusBadge(b.stockStatus)}</td>
                    {isAdmin && (
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          {b.discontinued ? (
                            /* Re-activate button for discontinued batches */
                            <button onClick={() => { reactivateBatch(b.billId, b.batchNo, b.medicineName); forceUpdate(n=>n+1); toast({title:"Batch re-activated"}); }}
                              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-1 rounded-lg transition-colors border border-green-300 font-medium">
                              ↺ Re-activate
                            </button>
                          ) : (
                            <>
                              {/* Dismiss alert - only when LOW STOCK */}
                              {b.stockStatus === "low" && (
                                <button onClick={() => { dismissStockAlert(b.billId, b.batchNo, b.medicineName); forceUpdate(n=>n+1); toast({title:"Alert dismissed"}); }}
                                  className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50 px-2 py-1 rounded-lg transition-colors" title="Dismiss low stock alert">
                                  <BellOff className="w-3 h-3"/>
                                </button>
                              )}
                              {/* Edit reorder level */}
                              {editingReorder === `${b.billId}-${b.batchNo}` ? (
                                <div className="flex items-center gap-1">
                                  <input type="number" value={reorderValue} min={0}
                                    onChange={e => setReorderValue(Number(e.target.value))}
                                    className="w-14 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-right focus:outline-none" />
                                  <button onClick={() => { setBatchReorderLevel(b.billId, b.batchNo, b.medicineName, reorderValue); setEditingReorder(null); forceUpdate(n=>n+1); toast({title:`Reorder: ${reorderValue} tabs`}); }}
                                    className="text-xs text-green-600 font-bold px-1.5 py-0.5 bg-green-50 rounded border border-green-300">✓</button>
                                  <button onClick={() => setEditingReorder(null)} className="text-xs text-slate-400 px-1">✕</button>
                                </div>
                              ) : (
                                <button onClick={() => { setEditingReorder(`${b.billId}-${b.batchNo}`); setReorderValue(b.reorderLevel); }}
                                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors border border-slate-200" title="Set reorder level">
                                  <Edit2 className="w-3 h-3"/>
                                  <span>{b.reorderLevel}</span>
                                </button>
                              )}
                              {/* Discontinue */}
                              <button onClick={() => handleDiscontinue(b.billId, b.batchNo, b.medicineName)}
                                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors" title="Discontinue batch">
                                <Ban className="w-3 h-3"/>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {displayBatches.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-16 text-slate-400"><Package className="w-10 h-10 mx-auto mb-3 opacity-30"/><p>No medicines. Add a Purchase Bill first.</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Expiry Table */}
        {tab === "expiry" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-700 text-white">
                <tr>
                  {["Medicine","Batch","Expiry","Pack Size","Stock (Tabs)","Days Left","Status"].map(h=>(
                    <th key={h} className="px-4 py-3 text-left font-semibold text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expiryBatches.map((b, i) => (
                  <tr key={`${b.billId}-${b.batchNo}`}
                    className={`border-b border-slate-100 ${b.expiryStatus==="expired"?"bg-red-50/40":b.expiryStatus==="critical"?"bg-red-50/20":b.expiryStatus==="soon"?"bg-orange-50/20":i%2===0?"bg-white":"bg-slate-50/20"}`}>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{b.medicineName}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{b.batchNo||"—"}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-700">{formatExpiry(b.expiryDate)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{b.packSize}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-800">{b.tabletsAvailable} tabs</td>
                    <td className="px-4 py-2.5">{b.daysToExpiry < 0 ? <span className="text-red-600 font-bold">EXPIRED</span> : <span className={b.daysToExpiry <= 60 ? "text-orange-600 font-bold" : "text-slate-600"}>{b.daysToExpiry} days</span>}</td>
                    <td className="px-4 py-2.5">{expiryBadge(b.expiryStatus, b.daysToExpiry)}</td>
                  </tr>
                ))}
                {expiryBatches.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-16 text-slate-400"><Clock className="w-10 h-10 mx-auto mb-3 opacity-30"/><p>No expiry data. Add expiry dates in Purchase Bills.</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
