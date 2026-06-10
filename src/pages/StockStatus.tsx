import { useState } from "react";
import { Layout } from "@/components/Layout";
import {
  getAllBatchStocks, discontinueBatch, reactivateBatch,
  getStockValuation, setBatchReorderLevel, dismissStockAlert,
  formatExpiry, addStockAdjustment, BatchStock,
} from "@/lib/inventory";
import { getActiveDoctor } from "@/lib/settings";
import { Package, Ban, BellOff, Edit2, Sliders, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ADJ_REASONS = ["Physical Count Correction", "Damaged", "Expired Removed", "Other"];

type FilterKey = "all" | "out" | "low" | "expiry" | "discontinued";

export default function StockStatus() {
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const [, forceUpdate] = useState(0);
  const [editingReorder, setEditingReorder] = useState<string | null>(null);
  const [reorderValue, setReorderValue] = useState<number>(10);

  // Stock adjustment modal
  const [adjBatch, setAdjBatch] = useState<BatchStock | null>(null);
  const [adjQty, setAdjQty] = useState<number>(0);
  const [adjReason, setAdjReason] = useState(ADJ_REASONS[0]);

  // Delete product confirm
  const [deleteBatch, setDeleteBatch] = useState<BatchStock | null>(null);

  const doctor = getActiveDoctor();
  const isAdmin = doctor?.id === 1;

  const allBatches = getAllBatchStocks();
  const activeBatches = allBatches.filter(b => !b.discontinued);
  const discontinuedBatches = allBatches.filter(b => b.discontinued);

  const outCount = activeBatches.filter(b => b.stockStatus === "out").length;
  const lowCount = activeBatches.filter(b => b.stockStatus === "low").length;
  const expiryCount = activeBatches.filter(b => b.daysToExpiry >= 0 && b.daysToExpiry <= 180).length;
  const discontinuedCount = discontinuedBatches.length;
  const valuation = getStockValuation();

  const getDisplayBatches = (): BatchStock[] => {
    if (!activeFilter || activeFilter === "all") return activeBatches;
    if (activeFilter === "out") return activeBatches.filter(b => b.stockStatus === "out");
    if (activeFilter === "low") return activeBatches.filter(b => b.stockStatus === "low");
    if (activeFilter === "expiry") return activeBatches.filter(b => b.daysToExpiry >= 0 && b.daysToExpiry <= 180);
    if (activeFilter === "discontinued") return discontinuedBatches;
    return activeBatches;
  };

  const displayBatches = getDisplayBatches();

  const toggleFilter = (f: FilterKey) => {
    setActiveFilter(prev => prev === f ? null : f);
  };

  const handleDiscontinue = (billId: string, batchNo: string, medicineName: string) => {
    if (!confirm(`Mark ${medicineName} (Batch: ${batchNo}) as discontinued? It will be hidden from patient prescriptions.`)) return;
    discontinueBatch(billId, batchNo, medicineName);
    forceUpdate(n => n + 1);
    toast({ title: "Batch discontinued" });
  };

  const handleAdjust = () => {
    if (!adjBatch || adjQty === 0) return;
    addStockAdjustment({
      billId: adjBatch.billId,
      batchNo: adjBatch.batchNo,
      medicineName: adjBatch.medicineName,
      adjustQtyTablets: adjQty,
      reason: adjReason,
      date: new Date().toISOString().slice(0, 10),
    });
    const newStock = adjBatch.tabletsAvailable + adjQty;
    if (newStock <= 0) {
      discontinueBatch(adjBatch.billId, adjBatch.batchNo, adjBatch.medicineName);
      toast({ title: "Stock adjusted — batch discontinued (stock reached 0)" });
    } else {
      toast({ title: `Stock adjusted by ${adjQty > 0 ? "+" : ""}${adjQty} tabs` });
    }
    setAdjBatch(null);
    setAdjQty(0);
    setAdjReason(ADJ_REASONS[0]);
    forceUpdate(n => n + 1);
  };

  const handleDeleteProduct = () => {
    if (!deleteBatch) return;
    if (deleteBatch.tabletsAvailable > 0) {
      addStockAdjustment({
        billId: deleteBatch.billId,
        batchNo: deleteBatch.batchNo,
        medicineName: deleteBatch.medicineName,
        adjustQtyTablets: -deleteBatch.tabletsAvailable,
        reason: "Adjusted Out",
        date: new Date().toISOString().slice(0, 10),
      });
    }
    discontinueBatch(deleteBatch.billId, deleteBatch.batchNo, deleteBatch.medicineName);
    const name = deleteBatch.medicineName;
    setDeleteBatch(null);
    forceUpdate(n => n + 1);
    toast({ title: `${name} removed from stock` });
  };

  const statusBadge = (status: string) => {
    if (status === "out") return <span className="text-xs font-bold text-red-600 bg-red-100 border border-red-300 px-2.5 py-1 rounded-full">OUT OF STOCK</span>;
    if (status === "low") return <span className="text-xs font-bold text-orange-600 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-full">LOW STOCK</span>;
    return <span className="text-xs font-bold text-green-600 bg-green-100 border border-green-300 px-2.5 py-1 rounded-full">IN STOCK</span>;
  };

  interface FilterCard {
    key: FilterKey;
    label: string;
    count: number;
    baseClass: string;
    activeClass: string;
    countClass: string;
    activeCountClass: string;
  }

  const filterCards: FilterCard[] = [
    {
      key: "all",
      label: "TOTAL BATCHES",
      count: activeBatches.length,
      baseClass: "border-slate-200 bg-white hover:border-blue-300",
      activeClass: "border-blue-500 bg-blue-50",
      countClass: "text-slate-800",
      activeCountClass: "text-blue-700",
    },
    {
      key: "out",
      label: "OUT OF STOCK",
      count: outCount,
      baseClass: outCount > 0 ? "border-red-200 bg-red-50 hover:border-red-400" : "border-slate-200 bg-white hover:border-red-200",
      activeClass: "border-red-500 bg-red-100",
      countClass: outCount > 0 ? "text-red-600" : "text-slate-400",
      activeCountClass: "text-red-700",
    },
    {
      key: "low",
      label: "LOW STOCK",
      count: lowCount,
      baseClass: lowCount > 0 ? "border-orange-200 bg-orange-50 hover:border-orange-400" : "border-slate-200 bg-white hover:border-orange-200",
      activeClass: "border-orange-500 bg-orange-100",
      countClass: lowCount > 0 ? "text-orange-600" : "text-slate-400",
      activeCountClass: "text-orange-700",
    },
    {
      key: "expiry",
      label: "EXPIRY <6 MO",
      count: expiryCount,
      baseClass: expiryCount > 0 ? "border-yellow-200 bg-yellow-50 hover:border-yellow-400" : "border-slate-200 bg-white hover:border-yellow-200",
      activeClass: "border-yellow-500 bg-yellow-100",
      countClass: expiryCount > 0 ? "text-yellow-700" : "text-slate-400",
      activeCountClass: "text-yellow-800",
    },
    {
      key: "discontinued",
      label: "DISCONTINUED",
      count: discontinuedCount,
      baseClass: "border-slate-200 bg-white hover:border-slate-400",
      activeClass: "border-slate-500 bg-slate-100",
      countClass: "text-slate-500",
      activeCountClass: "text-slate-700",
    },
  ];

  const newStock = adjBatch ? adjBatch.tabletsAvailable + adjQty : 0;

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary-light))] flex items-center justify-center">
              <Package className="w-5 h-5 text-[rgb(var(--primary))]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Stock & Expiry</h1>
              <p className="text-sm text-slate-500">
                {activeBatches.length} batches · {outCount} out · {lowCount} low
                · Stock ₹{valuation.atCost.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {filterCards.map(card => {
            const isActive = activeFilter === card.key;
            return (
              <button
                key={card.key}
                onClick={() => toggleFilter(card.key)}
                className={`text-left rounded-xl p-4 border-2 transition-all shadow-sm cursor-pointer select-none
                  ${isActive ? card.activeClass + " shadow-md" : card.baseClass}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
                <p className={`text-3xl font-bold mt-1 ${isActive ? card.activeCountClass : card.countClass}`}>
                  {card.count}
                </p>
                {isActive && (
                  <p className="text-xs text-slate-400 mt-0.5">click to clear</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-700 text-white">
              <tr>
                {[
                  "Medicine", "Batch", "Expiry", "Pack", "MRP/Tab", "MRP/Pack",
                  "Land/Tab", "Stock (Tabs)", "Status",
                  isAdmin ? "Actions" : "",
                ].filter(Boolean).map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayBatches.map((b, i) => (
                <tr
                  key={`${b.billId}-${b.batchNo}`}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors
                    ${b.discontinued
                      ? "opacity-50 bg-slate-50"
                      : b.stockStatus === "out"
                        ? "bg-red-50/40"
                        : b.stockStatus === "low"
                          ? "bg-orange-50/40"
                          : i % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                    }`}
                >
                  <td className="px-4 py-2.5 font-semibold text-slate-900">
                    {b.medicineName}
                    {b.discontinued && (
                      <span className="ml-2 text-xs text-slate-400">
                        {b.adjustedOut ? "(Adjusted Out)" : "(discontinued)"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{b.batchNo || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{formatExpiry(b.expiryDate)}</td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs">{b.packSize}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">₹{b.mrpPerTablet.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">₹{b.mrpPerPack.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-blue-600 font-semibold">₹{b.landingCostPerTablet.toFixed(4)}</td>
                  <td className={`px-4 py-2.5 font-bold text-lg ${b.stockStatus === "out" ? "text-red-600" : b.stockStatus === "low" ? "text-orange-600" : "text-slate-900"}`}>
                    {b.tabletsAvailable}
                  </td>
                  <td className="px-4 py-2.5">{statusBadge(b.stockStatus)}</td>
                  {isAdmin && (
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        {b.discontinued ? (
                          <button
                            onClick={() => { reactivateBatch(b.billId, b.batchNo, b.medicineName); forceUpdate(n => n + 1); toast({ title: "Batch re-activated" }); }}
                            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-1 rounded-lg transition-colors border border-green-300 font-medium"
                          >
                            ↺ Re-activate
                          </button>
                        ) : (
                          <>
                            {/* Dismiss low stock alert */}
                            {b.stockStatus === "low" && (
                              <button
                                onClick={() => { dismissStockAlert(b.billId, b.batchNo, b.medicineName); forceUpdate(n => n + 1); toast({ title: "Alert dismissed" }); }}
                                className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50 px-2 py-1 rounded-lg transition-colors"
                                title="Dismiss low stock alert"
                              >
                                <BellOff className="w-3 h-3" />
                              </button>
                            )}
                            {/* Reorder level */}
                            {editingReorder === `${b.billId}-${b.batchNo}` ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number" value={reorderValue} min={0}
                                  onChange={e => setReorderValue(Number(e.target.value))}
                                  className="w-14 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-right focus:outline-none"
                                />
                                <button
                                  onClick={() => { setBatchReorderLevel(b.billId, b.batchNo, b.medicineName, reorderValue); setEditingReorder(null); forceUpdate(n => n + 1); toast({ title: `Reorder: ${reorderValue} tabs` }); }}
                                  className="text-xs text-green-600 font-bold px-1.5 py-0.5 bg-green-50 rounded border border-green-300"
                                >✓</button>
                                <button onClick={() => setEditingReorder(null)} className="text-xs text-slate-400 px-1">✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingReorder(`${b.billId}-${b.batchNo}`); setReorderValue(b.reorderLevel); }}
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors border border-slate-200"
                                title="Set reorder level"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>{b.reorderLevel}</span>
                              </button>
                            )}
                            {/* Stock Adjustment */}
                            <button
                              onClick={() => { setAdjBatch(b); setAdjQty(0); setAdjReason(ADJ_REASONS[0]); }}
                              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                              title="Adjust stock"
                            >
                              <Sliders className="w-3 h-3" />
                            </button>
                            {/* Discontinue (ban) */}
                            <button
                              onClick={() => handleDiscontinue(b.billId, b.batchNo, b.medicineName)}
                              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                              title="Discontinue batch"
                            >
                              <Ban className="w-3 h-3" />
                            </button>
                            {/* Delete / Remove from stock */}
                            <button
                              onClick={() => setDeleteBatch(b)}
                              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors"
                              title="Remove from stock"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {displayBatches.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No medicines found{activeFilter ? " for this filter" : ". Add a Purchase Bill first."}.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Stock Adjustment Modal ── */}
      {adjBatch && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setAdjBatch(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Stock Adjustment</h2>
            <div className="bg-slate-50 rounded-lg p-3 space-y-0.5">
              <p className="font-semibold text-slate-800">{adjBatch.medicineName}</p>
              <p className="text-sm text-slate-500">
                Batch: {adjBatch.batchNo || "—"} &nbsp;·&nbsp; Current Stock:{" "}
                <span className="font-bold text-slate-800">{adjBatch.tabletsAvailable} tabs</span>
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Adjust Quantity</label>
              <p className="text-xs text-slate-400 mb-1.5">Positive = add &nbsp;·&nbsp; Negative = reduce</p>
              <input
                type="number"
                value={adjQty}
                onChange={e => setAdjQty(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
              {adjQty !== 0 && (
                <p className="text-xs mt-1.5 font-medium">
                  New stock:{" "}
                  <span className={newStock <= 0 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                    {Math.max(0, newStock)} tabs
                  </span>
                  {newStock <= 0 && <span className="text-red-500 ml-1.5">→ will be discontinued</span>}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Reason</label>
              <select
                value={adjReason}
                onChange={e => setAdjReason(e.target.value)}
                className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {ADJ_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setAdjBatch(null)}
                className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50"
              >Cancel</button>
              <button
                onClick={handleAdjust}
                disabled={adjQty === 0}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40"
              >Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete / Remove Product Confirm ── */}
      {deleteBatch && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setDeleteBatch(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Remove from Stock?</h2>
            <p className="text-sm text-slate-600">
              Remove <span className="font-bold text-slate-900">{deleteBatch.medicineName}</span> from stock?
              This will not affect purchase bills or profit reports.
            </p>
            <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3 leading-relaxed">
              Current stock of {deleteBatch.tabletsAvailable} tabs will be zeroed out via a stock adjustment.
              The product will appear in the <strong>Discontinued</strong> filter with the tag "Adjusted Out".
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setDeleteBatch(null)}
                className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50"
              >Cancel</button>
              <button
                onClick={handleDeleteProduct}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-700"
              >Remove</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
