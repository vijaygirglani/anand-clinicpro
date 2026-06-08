import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import {
  getPurchaseBills, savePurchaseBill, deletePurchaseBill, clearPurchaseBills, addPaymentToBill,
  getSupplierSummary, calcLandingCost, newId, formatExpiry,
  type PurchaseBill, type PurchaseBillItem,
} from "@/lib/inventory";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Plus, Trash2, ChevronDown, ChevronUp, Save, X, Pencil, IndianRupee, BarChart3, Building2, CheckCircle, Clock, AlertCircle, Download, Upload, Search } from "lucide-react";
import { format } from "date-fns";

interface RowDraft {
  medicineName: string; batchNo: string; expiryDate: string;
  packSize: number; mrpPerPack: number;
  qtyPacksPaid: number; qtyPacksFree: number;
  ratePerPack: number; discountPct: number; gstPct: number;
  reorderLevel: number;
}
const emptyRow = (): RowDraft => ({
  medicineName: "", batchNo: "", expiryDate: "", packSize: 1, mrpPerPack: 0,
  qtyPacksPaid: 1, qtyPacksFree: 0, ratePerPack: 0, discountPct: 0, gstPct: 5,
  reorderLevel: 10,
});

// Get saved reorder level for a medicine from previous purchase bills
function getSavedReorderLevel(medicineName: string): number {
  if (!medicineName.trim()) return 10;
  const bills = getPurchaseBills();
  for (let i = bills.length - 1; i >= 0; i--) {
    const item = bills[i].items.find(it => 
      it.medicineName.toLowerCase() === medicineName.toLowerCase() && it.reorderLevel
    );
    if (item?.reorderLevel) return item.reorderLevel;
  }
  return 10;
}

const inputCls = "w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))/50] bg-white";

export default function PurchaseBills() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"bills"|"summary">("bills");
  const [bills, setBills] = useState<PurchaseBill[]>(() =>
    getPurchaseBills().sort((a, b) => b.billDate.localeCompare(a.billDate))
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");

  // Form state
  const [supplier, setSupplier] = useState("");
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [rows, setRows] = useState<RowDraft[]>([emptyRow()]);

  const refresh = () => setBills(getPurchaseBills().sort((a, b) => b.billDate.localeCompare(a.billDate)));

  const handleExport = () => {
    const data = JSON.stringify({ cp_purchase_bills: getPurchaseBills() }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clinicpro-inventory-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string);
          const incoming: PurchaseBill[] = json.cp_purchase_bills;
          if (!Array.isArray(incoming)) throw new Error("Invalid format");

          const replace = confirm("Replace all existing bills with imported data?\n\nYes — clear all existing bills, then import\nNo — merge (skip bills with duplicate bill numbers)");

          if (replace) {
            clearPurchaseBills();
            for (const bill of incoming) savePurchaseBill(bill);
            refresh();
            toast({ title: `Replaced with ${incoming.length} imported bills` });
          } else {
            const existingBillNos = new Set(getPurchaseBills().map(b => b.billNo));
            let count = 0;
            for (const bill of incoming) {
              if (!existingBillNos.has(bill.billNo)) {
                savePurchaseBill(bill);
                count++;
              }
            }
            refresh();
            toast({ title: `Imported ${count} new bills successfully` });
          }
        } catch {
          toast({ title: "Import failed", description: "Invalid or unrecognized JSON file", variant: "destructive" });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearAll = () => {
    if (!confirm(`Delete all ${bills.length} purchase bills? This cannot be undone.`)) return;
    clearPurchaseBills();
    refresh();
    toast({ title: "All purchase bills cleared" });
  };

  const calc = (r: RowDraft) => r.ratePerPack > 0 ? calcLandingCost({
    qtyPacksPaid: r.qtyPacksPaid, qtyPacksFree: r.qtyPacksFree,
    ratePerPack: r.ratePerPack, discountPct: r.discountPct,
    gstPct: r.gstPct, mrpPerPack: r.mrpPerPack, packSize: r.packSize || 1,
  }) : null;

  const grandTotal = rows.reduce((s, r) => s + (calc(r)?.totalPaid || 0), 0);

  const handleEdit = (bill: PurchaseBill) => {
    setEditId(bill.id);
    setSupplier(bill.supplierName);
    setBillNo(bill.billNo);
    setBillDate(bill.billDate);
    setRows(bill.items.map(item => ({
      medicineName: item.medicineName, batchNo: item.batchNo,
      expiryDate: item.expiryDate, packSize: item.packSize,
      mrpPerPack: item.mrpPerPack, qtyPacksPaid: item.qtyPacksPaid,
      qtyPacksFree: item.qtyPacksFree, ratePerPack: item.ratePerPack,
      discountPct: item.discountPct, gstPct: item.gstPct,
      reorderLevel: item.reorderLevel || 10,
    })));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = () => {
    if (!supplier.trim()) return toast({ title: "Supplier name required", variant: "destructive" });
    if (!billNo.trim()) return toast({ title: "Bill number required", variant: "destructive" });
    const valid = rows.filter(r => r.medicineName.trim() && r.ratePerPack > 0);
    if (!valid.length) return toast({ title: "Add at least one medicine", variant: "destructive" });

    const items: PurchaseBillItem[] = valid.map(r => {
      const c = calcLandingCost({ qtyPacksPaid: r.qtyPacksPaid, qtyPacksFree: r.qtyPacksFree, ratePerPack: r.ratePerPack, discountPct: r.discountPct, gstPct: r.gstPct, mrpPerPack: r.mrpPerPack, packSize: r.packSize || 1 });
      return { medicineName: r.medicineName.trim(), batchNo: r.batchNo.trim(), expiryDate: r.expiryDate.trim(), discontinued: false, reorderLevel: r.reorderLevel || 10, ...c };
    });

    const total = items.reduce((s, i) => s + i.totalPaid, 0);
    if (editId) {
      const existing = bills.find(b => b.id === editId)!;
      savePurchaseBill({ ...existing, supplierName: supplier, billNo, billDate, items, grandTotal: total });
      toast({ title: "Bill updated" });
    } else {
      const bill: PurchaseBill = {
        id: newId(), supplierName: supplier, billNo, billDate, items, grandTotal: total,
        paymentStatus: "unpaid", amountPaid: 0, amountPending: total,
        createdAt: new Date().toISOString(),
      };
      savePurchaseBill(bill);
      toast({ title: "Bill saved", description: `₹${total.toFixed(2)} — ${items.length} items` });
    }
    setShowForm(false); setEditId(null);
    setSupplier(""); setBillNo(""); setBillDate(format(new Date(), "yyyy-MM-dd")); setRows([emptyRow()]);
    refresh();
  };

  const handlePayment = (billId: string) => {
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) return toast({ title: "Enter valid amount", variant: "destructive" });
    addPaymentToBill(billId, amt, paymentDate);
    setShowPayment(null); setPaymentAmount("");
    refresh();
    toast({ title: "Payment recorded" });
  };

  const statusBadge = (bill: PurchaseBill) => {
    if (bill.paymentStatus === "paid") return <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />Paid</span>;
    if (bill.paymentStatus === "partial") return <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" />Partial</span>;
    return <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><AlertCircle className="w-3 h-3" />Unpaid</span>;
  };

  const supplierSummary = useMemo(() => getSupplierSummary(), [bills]);
  const filteredBills = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? bills.filter(b => b.supplierName.toLowerCase().includes(q)) : bills;
  }, [bills, search]);

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary-light))] flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-[rgb(var(--primary))]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Purchase Bills</h1>
              <p className="text-sm text-slate-500">{bills.length} bills · ₹{bills.reduce((s,b)=>s+(b.amountPending||0),0).toLocaleString("en-IN")} pending</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport}
              className="flex items-center gap-2 border border-slate-300 bg-white text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" />Export Inventory
            </button>
            <button onClick={handleImport}
              className="flex items-center gap-2 border border-slate-300 bg-white text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              <Upload className="w-4 h-4" />Import Inventory
            </button>
            <button onClick={handleClearAll}
              className="flex items-center gap-2 border border-red-200 bg-white text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />Clear All Bills
            </button>
            <button onClick={() => { setShowForm(s => !s); if (showForm) { setEditId(null); setRows([emptyRow()]); } }}
              className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: `rgb(var(--primary))` }}>
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "Cancel" : "New Bill"}
            </button>
          </div>
        </div>

        {/* New/Edit Bill Form */}
        {showForm && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Supplier *</label>
                <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Jeenam Pharma"
                  className="mt-1 w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[rgb(var(--primary))]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Bill No *</label>
                <input value={billNo} onChange={e => setBillNo(e.target.value)} placeholder="J215"
                  className="mt-1 w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[rgb(var(--primary))]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Date</label>
                <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)}
                  className="mt-1 w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[rgb(var(--primary))]" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-700 text-white">
                  <tr>
                    {["#","Medicine Name","Batch","Expiry","Pack","MRP/Pack","Qty Paid","Free","Rate/Pack","Disc%","GST%","Reorder","Land/Tab ₹","Total ₹",""].map(h => (
                      <th key={h} className="px-2 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const c = calc(r);
                    return (
                      <tr key={i} className={`border-b border-slate-100 ${i%2===0?"bg-white":"bg-slate-50/30"}`}>
                        <td className="px-2 py-1 text-slate-400 text-xs">{i+1}</td>
                        <td className="px-2 py-1 min-w-[160px]"><input value={r.medicineName} 
  onChange={e => setRows(p=>p.map((x,idx)=>idx===i?{...x,medicineName:e.target.value}:x))}
  onBlur={e => {
    const saved = getSavedReorderLevel(e.target.value);
    setRows(p=>p.map((x,idx)=>idx===i?{...x,reorderLevel:saved}:x));
  }}
  placeholder="Medicine name" className={inputCls} autoComplete="off" /></td>
                        <td className="px-2 py-1 w-20"><input value={r.batchNo} onChange={e=>setRows(p=>p.map((x,idx)=>idx===i?{...x,batchNo:e.target.value}:x))} placeholder="Batch" className={inputCls}/></td>
                        <td className="px-2 py-1 w-20"><input value={r.expiryDate}
  onChange={e => {
    // Strip to digits only, cap at 4 — recalculate slash every keystroke
    // so "1127" never gets stuck as "1/127"
    const d = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
    let v = d;
    if (d.length === 3) v = d[0] + "/" + d.slice(1);        // M/YY
    else if (d.length === 4) v = d.slice(0, 2) + "/" + d.slice(2); // MM/YY
    setRows(p=>p.map((x,idx)=>idx===i?{...x,expiryDate:v}:x));
  }}
  placeholder="MMYY" maxLength={5} className={inputCls}/></td>
                        <td className="px-2 py-1 w-14"><input type="number" value={r.packSize} min={1} onChange={e=>setRows(p=>p.map((x,idx)=>idx===i?{...x,packSize:Number(e.target.value)}:x))} className={inputCls+" text-right"}/></td>
                        <td className="px-2 py-1 w-20"><input type="number" value={r.mrpPerPack||""} onChange={e=>setRows(p=>p.map((x,idx)=>idx===i?{...x,mrpPerPack:Number(e.target.value)}:x))} className={inputCls+" text-right"}/></td>
                        <td className="px-2 py-1 w-16"><input type="number" value={r.qtyPacksPaid} onChange={e=>setRows(p=>p.map((x,idx)=>idx===i?{...x,qtyPacksPaid:Number(e.target.value)}:x))} className={inputCls+" text-right"}/></td>
                        <td className="px-2 py-1 w-14"><input type="number" value={r.qtyPacksFree} onChange={e=>setRows(p=>p.map((x,idx)=>idx===i?{...x,qtyPacksFree:Number(e.target.value)}:x))} className={inputCls+" text-right"}/></td>
                        <td className="px-2 py-1 w-20"><input type="number" value={r.ratePerPack||""} onChange={e=>setRows(p=>p.map((x,idx)=>idx===i?{...x,ratePerPack:Number(e.target.value)}:x))} className={inputCls+" text-right"}/></td>
                        <td className="px-2 py-1 w-14"><input type="number" value={r.discountPct} onChange={e=>setRows(p=>p.map((x,idx)=>idx===i?{...x,discountPct:Number(e.target.value)}:x))} className={inputCls+" text-right"}/></td>
                        <td className="px-2 py-1 w-14"><input type="number" value={r.gstPct} onChange={e=>setRows(p=>p.map((x,idx)=>idx===i?{...x,gstPct:Number(e.target.value)}:x))} className={inputCls+" text-right"}/></td>
                        <td className="px-2 py-1 w-16"><input type="number" value={r.reorderLevel} min={0} title="Alert when stock drops below this"
                          onChange={e=>setRows(p=>p.map((x,idx)=>idx===i?{...x,reorderLevel:Number(e.target.value)}:x))}
                          className={inputCls+" text-right bg-yellow-50"} placeholder="10"/></td>
                        <td className="px-2 py-1 text-right">
                          {c ? <div><span className="font-bold text-blue-600">₹{c.landingCostPerTablet.toFixed(4)}</span><div className="text-slate-400">MRP/tab: ₹{c.mrpPerTablet.toFixed(2)}</div></div> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-2 py-1 text-right font-bold text-slate-800">{c?`₹${c.totalPaid.toFixed(2)}`:"—"}</td>
                        <td className="px-2 py-1 text-center">
                          {rows.length > 1 && <button onClick={()=>setRows(p=>p.filter((_,idx)=>idx!==i))} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5"/></button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button onClick={()=>setRows(p=>[...p,emptyRow()])} className="flex items-center gap-1.5 text-sm font-medium" style={{color:`rgb(var(--primary))`}}>
                <Plus className="w-3.5 h-3.5"/>Add Row
              </button>
              <div className="flex items-center gap-6">
                <span className="text-sm">Grand Total: <strong className="text-base">₹{grandTotal.toFixed(2)}</strong></span>
                <button onClick={handleSave} className="flex items-center gap-2 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors" style={{background:`rgb(var(--primary))`}}>
                  <Save className="w-4 h-4"/>{editId ? "Update Bill" : "Save Bill"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          {[["bills","Bills",ShoppingCart],["summary","Supplier Summary",Building2]].map(([id,label,Icon]:any)=>(
            <button key={id} onClick={()=>setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${tab===id?"bg-white text-slate-900 shadow-sm":"text-slate-500"}`}>
              <Icon className="w-3.5 h-3.5"/>{label}
            </button>
          ))}
        </div>

        {/* Bills List */}
        {tab === "bills" && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by supplier name…"
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))/50] bg-white"
              />
            </div>
            {filteredBills.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl text-center py-16 text-slate-400">
                <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30"/>
                <p className="font-medium">{search.trim() ? "No bills match your search" : "No purchase bills yet"}</p>
              </div>
            ) : filteredBills.map(bill => (
              <div key={bill.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50"
                  onClick={()=>setExpanded(expanded===bill.id?null:bill.id)}>
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-slate-900">{bill.supplierName} <span className="text-slate-400 font-normal text-sm">#{bill.billNo}</span></p>
                      {statusBadge(bill)}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{bill.billDate ? format(new Date(bill.billDate),"dd MMM yyyy") : "—"} · {bill.items.length} items · Pending: <span className="font-semibold text-red-600">₹{(bill.amountPending||0).toFixed(0)}</span></p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-slate-900">₹{bill.grandTotal.toFixed(2)}</p>
                    <button onClick={e=>{e.stopPropagation();setShowPayment(showPayment===bill.id?null:bill.id);}} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg" title="Record Payment"><IndianRupee className="w-4 h-4"/></button>
                    <button onClick={e=>{e.stopPropagation();handleEdit(bill);}} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4"/></button>
                    <button onClick={e=>{e.stopPropagation();if(confirm("Delete bill?")) { deletePurchaseBill(bill.id); refresh(); }}} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                    {expanded===bill.id?<ChevronUp className="w-4 h-4 text-slate-400"/>:<ChevronDown className="w-4 h-4 text-slate-400"/>}
                  </div>
                </div>

                {/* Payment form */}
                {showPayment===bill.id && (
                  <div className="px-5 py-3 bg-green-50 border-t border-green-100 flex items-center gap-3">
                    <span className="text-sm font-semibold text-green-700">Record Payment:</span>
                    <input type="number" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} placeholder="Amount" className="border border-green-300 rounded-lg px-3 py-1.5 text-sm w-32 focus:outline-none" />
                    <input type="date" value={paymentDate} onChange={e=>setPaymentDate(e.target.value)} className="border border-green-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
                    <button onClick={()=>handlePayment(bill.id)} className="bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-600">Save</button>
                    <button onClick={()=>setShowPayment(null)} className="text-slate-500 hover:text-slate-700"><X className="w-4 h-4"/></button>
                  </div>
                )}

                {/* Bill items */}
                {expanded===bill.id && (
                  <div className="border-t border-slate-100 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-700 text-white">
                        <tr>
                          {["#","Medicine","Batch","Expiry","Pack","MRP/Pack","MRP/Tab","Qty (Tabs)","Land/Tab","Total"].map(h=>(
                            <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bill.items.map((item,i)=>(
                          <tr key={i} className={`border-b border-slate-50 ${i%2===0?"bg-white":"bg-slate-50/40"}`}>
                            <td className="px-3 py-2 text-slate-400">{i+1}</td>
                            <td className="px-3 py-2 font-semibold text-slate-800">{item.medicineName}</td>
                            <td className="px-3 py-2 font-mono">{item.batchNo||"—"}</td>
                            <td className="px-3 py-2">{formatExpiry(item.expiryDate)}</td>
                            <td className="px-3 py-2 text-right">{item.packSize}</td>
                            <td className="px-3 py-2 text-right">₹{item.mrpPerPack.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-semibold">₹{item.mrpPerTablet.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right">{item.totalTabletsReceived} <span className="text-slate-400">({item.totalPacksReceived} packs)</span></td>
                            <td className="px-3 py-2 text-right text-blue-600 font-bold">₹{item.landingCostPerTablet.toFixed(4)}</td>
                            <td className="px-3 py-2 text-right font-bold">₹{item.totalPaid.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Supplier Summary */}
        {tab === "summary" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-white">
                <tr>
                  {["Supplier","Bills","Total Amount","Paid","Pending","Last Bill","Status"].map(h=>(
                    <th key={h} className="px-4 py-3 text-left font-semibold text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {supplierSummary.map((s,i)=>(
                  <tr key={i} className={`border-b border-slate-100 ${i%2===0?"bg-white":"bg-slate-50/40"}`}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{s.supplierName}</td>
                    <td className="px-4 py-3 text-slate-600">{s.totalBills}</td>
                    <td className="px-4 py-3 font-semibold">₹{s.totalAmount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-green-600 font-semibold">₹{s.amountPaid.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">₹{s.amountPending.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-slate-500">{s.lastBillDate ? s.lastBillDate ? format(new Date(s.lastBillDate),"dd MMM yyyy") : "—" : "—"}</td>
                    <td className="px-4 py-3">
                      {s.amountPending === 0
                        ? <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">✓ All Paid</span>
                        : <div>
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">₹{s.amountPending.toLocaleString("en-IN")} due</span>
                            {s.overdueDays > 0 && (
                              <div className="text-xs text-orange-600 mt-1 font-medium">
                                ⏰ {s.overdueDays} days overdue
                              </div>
                            )}
                          </div>}
                    </td>
                  </tr>
                ))}
                {supplierSummary.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-16 text-slate-400">No bills recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
