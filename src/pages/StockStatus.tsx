import { useState } from "react";
import { createPortal } from "react-dom";
import { Layout } from "@/components/Layout";
import {
  getAllBatchStocks, discontinueBatch, reactivateBatch,
  setBatchReorderLevel, dismissStockAlert,
  formatExpiry, addStockAdjustment, BatchStock,
} from "@/lib/inventory";
import { getActiveDoctor } from "@/lib/settings";
import { Package, Ban, BellOff, Edit2, Sliders, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ADJ_REASONS = ["Physical Count Correction", "Damaged", "Expired Removed", "Other"];

type FilterKey = "all" | "out" | "expired" | "low" | "expiry";

export default function StockStatus() {
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const [allBatches, setAllBatches] = useState<BatchStock[]>(() => getAllBatchStocks());
  const [editingReorder, setEditingReorder] = useState<string | null>(null);
  const [reorderValue, setReorderValue] = useState<number>(10);

  // Stock adjustment modal
  const [adjBatch, setAdjBatch] = useState<BatchStock | null>(null);
  const [adjQtyStr, setAdjQtyStr] = useState<string>("");   // string so "-" prefix survives typing
  const [adjReason, setAdjReason] = useState(ADJ_REASONS[0]);

  // Delete product confirm
  const [deleteBatch, setDeleteBatch] = useState<BatchStock | null>(null);

  const doctor = getActiveDoctor();
  const isAdmin = doctor?.id === 1;

  // Re-reads storage and updates state — call after any mutation
  const refresh = () => setAllBatches(getAllBatchStocks());

  // Counts for filter cards (always from full dataset)
  const activeBatches  = allBatches.filter(b => !b.discontinued);
  const inStockCount   = allBatches.filter(b => b.tabletsAvailable > 0).length;
  // EXPIRED = physically expired AND still has stock on shelf
  const expiredCount   = allBatches.filter(b => b.daysToExpiry < 0 && b.tabletsAvailable > 0).length;
  // OUT OF STOCK = zero stock, regardless of expiry date
  const outCount       = allBatches.filter(b => b.tabletsAvailable <= 0).length;
  const lowCount       = activeBatches.filter(b => b.tabletsAvailable > 0 && b.tabletsAvailable <= b.reorderLevel && b.daysToExpiry >= 0).length;
  const expiryCount    = activeBatches.filter(b => b.daysToExpiry > 0 && b.daysToExpiry <= 180).length;
  // Compute valuation from allBatches state — same source as the rest of the UI
  const stockValueAtCost = Math.round(
    allBatches.filter(b => b.tabletsAvailable > 0)
      .reduce((s, b) => s + b.tabletsAvailable * b.landingCostPerTablet, 0)
  );

  // Filtered list — this is what the table renders
  const filteredMedicines: BatchStock[] =
    activeFilter === "out"       ? allBatches.filter(b => b.tabletsAvailable <= 0)
    : activeFilter === "expired" ? allBatches.filter(b => b.daysToExpiry < 0 && b.tabletsAvailable > 0)
    : activeFilter === "low"     ? activeBatches.filter(b => b.tabletsAvailable > 0 && b.tabletsAvailable <= b.reorderLevel && b.daysToExpiry >= 0)
    : activeFilter === "expiry"  ? activeBatches.filter(b => b.daysToExpiry > 0 && b.daysToExpiry <= 180)
    : allBatches.filter(b => b.tabletsAvailable > 0);

  const toggleFilter = (f: FilterKey) => {
    setActiveFilter(prev => prev === f ? null : f);
  };

  const handleDiscontinue = (billId: string, batchNo: string, medicineName: string) => {
    if (!confirm(`Mark ${medicineName} (Batch: ${batchNo}) as discontinued? It will be hidden from patient prescriptions.`)) return;
    discontinueBatch(billId, batchNo, medicineName);
    refresh();
    toast({ title: "Batch discontinued" });
  };

  const handleAdjust = () => {
    const adjQty = Number(adjQtyStr);
    if (!adjBatch || !adjQtyStr || isNaN(adjQty) || adjQty === 0) return;
    addStockAdjustment({
      billId: adjBatch.billId,
      batchNo: adjBatch.batchNo,
      medicineName: adjBatch.medicineName,
      adjustQtyTablets: adjQty,          // exact value, positive or negative
      reason: adjReason,
      date: new Date().toISOString().slice(0, 10),
    });
    const newStock = adjBatch.tabletsAvailable + adjQty;
    toast({ title: newStock <= 0 ? "Stock adjusted — now out of stock" : `Stock adjusted by ${adjQty > 0 ? "+" : ""}${adjQty} tabs` });
    setAdjBatch(null);
    setAdjQtyStr("");
    setAdjReason(ADJ_REASONS[0]);
    refresh();
  };

  const handleDeleteProduct = () => {
    if (!deleteBatch) return;
    // Re-read live stock from storage — never trust the state snapshot
    // (avoids stale tabletsAvailable and batchNo mismatch between "" and undefined)
    const normBatchNo = deleteBatch.batchNo ?? "";
    const fresh = getAllBatchStocks().find(
      b => b.billId === deleteBatch.billId &&
           (b.batchNo ?? "") === normBatchNo &&
           b.medicineName.toLowerCase() === deleteBatch.medicineName.toLowerCase()
    );
    const liveStock = fresh?.tabletsAvailable ?? deleteBatch.tabletsAvailable;
    if (liveStock > 0) {
      addStockAdjustment({
        billId: deleteBatch.billId,
        batchNo: normBatchNo,
        medicineName: deleteBatch.medicineName,
        adjustQtyTablets: -liveStock,
        reason: "Adjusted Out",
        date: new Date().toISOString().slice(0, 10),
      });
    }
    const name = deleteBatch.medicineName;
    setDeleteBatch(null);
    refresh();
    toast({ title: `${name} zeroed out — now Out of Stock` });
  };

  const statusBadge = (b: BatchStock) => {
    if (b.daysToExpiry < 0) return <span className="inline-block whitespace-nowrap min-w-[90px] text-center text-xs font-bold text-purple-700 bg-purple-100 border border-purple-300 px-2.5 py-1 rounded-full">Expired</span>;
    if (b.stockStatus === "out") return <span className="inline-block whitespace-nowrap min-w-[90px] text-center text-xs font-bold text-red-600 bg-red-100 border border-red-300 px-2.5 py-1 rounded-full">Out of Stock</span>;
    if (b.stockStatus === "low") return <span className="inline-block whitespace-nowrap min-w-[90px] text-center text-xs font-bold text-orange-600 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-full">Low Stock</span>;
    return <span className="inline-block whitespace-nowrap min-w-[90px] text-center text-xs font-bold text-green-600 bg-green-100 border border-green-300 px-2.5 py-1 rounded-full">In Stock</span>;
  };

  const adjQtyNum = Number(adjQtyStr);
  const newStock = adjBatch ? adjBatch.tabletsAvailable + (isNaN(adjQtyNum) ? 0 : adjQtyNum) : 0;

  return (
    <>
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
                {inStockCount} in stock · {outCount} out · {expiredCount} expired · {lowCount} low
                · Stock ₹{stockValueAtCost.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

          {/* TOTAL BATCHES */}
          <button type="button" onClick={() => toggleFilter("all")}
            className={`text-left rounded-xl p-4 border-2 transition-all shadow-sm cursor-pointer select-none
              ${activeFilter === "all"
                ? "border-blue-500 bg-blue-50 shadow-md"
                : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Batches</p>
            <p className={`text-3xl font-bold mt-1 ${activeFilter === "all" ? "text-blue-700" : "text-slate-800"}`}>
              {inStockCount}
            </p>
            {activeFilter === "all" && <p className="text-xs text-blue-400 mt-0.5">click to clear</p>}
          </button>

          {/* OUT OF STOCK */}
          <button type="button" onClick={() => toggleFilter("out")}
            className={`text-left rounded-xl p-4 border-2 transition-all shadow-sm cursor-pointer select-none
              ${activeFilter === "out"
                ? "border-red-500 bg-red-100 shadow-md"
                : outCount > 0
                  ? "border-red-200 bg-red-50 hover:border-red-400 hover:shadow-md"
                  : "border-slate-200 bg-white hover:border-red-200 hover:shadow-md"}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Out of Stock</p>
            <p className={`text-3xl font-bold mt-1 ${activeFilter === "out" ? "text-red-700" : outCount > 0 ? "text-red-600" : "text-slate-400"}`}>
              {outCount}
            </p>
            {activeFilter === "out" && <p className="text-xs text-red-400 mt-0.5">click to clear</p>}
          </button>

          {/* EXPIRED */}
          <button type="button" onClick={() => toggleFilter("expired")}
            className={`text-left rounded-xl p-4 border-2 transition-all shadow-sm cursor-pointer select-none
              ${activeFilter === "expired"
                ? "border-purple-500 bg-purple-100 shadow-md"
                : expiredCount > 0
                  ? "border-purple-200 bg-purple-50 hover:border-purple-400 hover:shadow-md"
                  : "border-slate-200 bg-white hover:border-purple-200 hover:shadow-md"}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expired</p>
            <p className={`text-3xl font-bold mt-1 ${activeFilter === "expired" ? "text-purple-700" : expiredCount > 0 ? "text-purple-600" : "text-slate-400"}`}>
              {expiredCount}
            </p>
            {activeFilter === "expired" && <p className="text-xs text-purple-400 mt-0.5">click to clear</p>}
          </button>

          {/* LOW STOCK */}
          <button type="button" onClick={() => toggleFilter("low")}
            className={`text-left rounded-xl p-4 border-2 transition-all shadow-sm cursor-pointer select-none
              ${activeFilter === "low"
                ? "border-orange-500 bg-orange-100 shadow-md"
                : lowCount > 0
                  ? "border-orange-200 bg-orange-50 hover:border-orange-400 hover:shadow-md"
                  : "border-slate-200 bg-white hover:border-orange-200 hover:shadow-md"}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Low Stock</p>
            <p className={`text-3xl font-bold mt-1 ${activeFilter === "low" ? "text-orange-700" : lowCount > 0 ? "text-orange-600" : "text-slate-400"}`}>
              {lowCount}
            </p>
            {activeFilter === "low" && <p className="text-xs text-orange-400 mt-0.5">click to clear</p>}
          </button>

          {/* EXPIRY <6 MO */}
          <button type="button" onClick={() => toggleFilter("expiry")}
            className={`text-left rounded-xl p-4 border-2 transition-all shadow-sm cursor-pointer select-none
              ${activeFilter === "expiry"
                ? "border-yellow-500 bg-yellow-100 shadow-md"
                : expiryCount > 0
                  ? "border-yellow-200 bg-yellow-50 hover:border-yellow-400 hover:shadow-md"
                  : "border-slate-200 bg-white hover:border-yellow-200 hover:shadow-md"}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expiry &lt;6 Mo</p>
            <p className={`text-3xl font-bold mt-1 ${activeFilter === "expiry" ? "text-yellow-800" : expiryCount > 0 ? "text-yellow-700" : "text-slate-400"}`}>
              {expiryCount}
            </p>
            {activeFilter === "expiry" && <p className="text-xs text-yellow-600 mt-0.5">click to clear</p>}
          </button>

        </div>

        {/* Active filter label */}
        {activeFilter && activeFilter !== "all" && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-semibold">Showing:</span>
            <span className="bg-slate-100 border border-slate-200 rounded-full px-3 py-0.5 text-xs font-semibold">
              {activeFilter === "out" ? "Out of Stock" : activeFilter === "expired" ? "Expired" : activeFilter === "low" ? "Low Stock" : "Expiry < 6 months"}
            </span>
            <span className="text-slate-400">· {filteredMedicines.length} result{filteredMedicines.length !== 1 ? "s" : ""}</span>
            <button type="button" onClick={() => setActiveFilter(null)} className="ml-1 text-xs text-blue-500 hover:underline">clear</button>
          </div>
        )}

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
            <tbody key={activeFilter ?? "all"}>
              {filteredMedicines.map((b, i) => (
                <tr
                  key={`${b.billId}-${b.batchNo}`}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors
                    ${b.discontinued
                      ? "opacity-50 bg-slate-50"
                      : b.daysToExpiry < 0
                        ? "bg-purple-50/40"
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
                      <span className="ml-2 text-xs text-slate-400">(hidden from prescriptions)</span>
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
                  <td className="px-4 py-2.5">{statusBadge(b)}</td>
                  {isAdmin && (
                    <td className="px-4 py-2.5 overflow-x-auto">
                      <div className="flex items-center gap-1 flex-nowrap">
                        {b.discontinued ? (
                          <button
                            onClick={() => { reactivateBatch(b.billId, b.batchNo, b.medicineName); refresh(); toast({ title: "Batch re-activated" }); }}
                            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-1 rounded-lg transition-colors border border-green-300 font-medium"
                          >
                            ↺ Re-activate
                          </button>
                        ) : (
                          <>
                            {/* Dismiss low stock alert */}
                            {b.stockStatus === "low" && (
                              <button
                                onClick={() => { dismissStockAlert(b.billId, b.batchNo, b.medicineName); refresh(); toast({ title: "Alert dismissed" }); }}
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
                                  onClick={() => { setBatchReorderLevel(b.billId, b.batchNo, b.medicineName, reorderValue); setEditingReorder(null); refresh(); toast({ title: `Reorder: ${reorderValue} tabs` }); }}
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
                              onClick={() => { setAdjBatch(b); setAdjQtyStr(""); setAdjReason(ADJ_REASONS[0]); }}
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
              {filteredMedicines.length === 0 && (
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

    </Layout>

      {/* ── Stock Adjustment Modal (portal → document.body) ── */}
      {adjBatch && createPortal(
        <div
          className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4"
          onMouseDown={e => { if (e.target === e.currentTarget) setAdjBatch(null); }}
        >
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
                value={adjQtyStr}
                onChange={e => setAdjQtyStr(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
              {adjQtyStr !== "" && !isNaN(adjQtyNum) && adjQtyNum !== 0 && (
                <p className="text-xs mt-1.5 font-medium">
                  New stock:{" "}
                  <span className={newStock <= 0 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                    {Math.max(0, newStock)} tabs
                  </span>
                  {newStock <= 0 && <span className="text-red-500 ml-1.5">→ will be out of stock</span>}
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
                type="button"
                onClick={() => setAdjBatch(null)}
                className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50"
              >Cancel</button>
              <button
                type="button"
                onClick={handleAdjust}
                disabled={!adjQtyStr || isNaN(adjQtyNum) || adjQtyNum === 0}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40"
              >Confirm</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Delete / Remove Product Confirm (portal → document.body) ── */}
      {deleteBatch && createPortal(
        <div
          className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4"
          onMouseDown={e => { if (e.target === e.currentTarget) setDeleteBatch(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Remove from Stock?</h2>
            <p className="text-sm text-slate-600">
              Remove <span className="font-bold text-slate-900">{deleteBatch.medicineName}</span> from stock?
              This will not affect purchase bills or profit reports.
            </p>
            <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3 leading-relaxed">
              Current stock of {deleteBatch.tabletsAvailable} tabs will be zeroed out via a stock adjustment.
              The product will move to the <strong>Out of Stock</strong> filter with 0 tablets.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteBatch(null)}
                className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50"
              >Cancel</button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-700"
              >Remove</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
