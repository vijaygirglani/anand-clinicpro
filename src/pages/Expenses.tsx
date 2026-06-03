import { useState } from "react";
import { Layout } from "@/components/Layout";
import { getExpenses, saveExpense, deleteExpense, getExpenseCategories, saveExpenseCategory, deleteExpenseCategory, newId, type Expense, type ExpenseCategory } from "@/lib/inventory";
import { getActiveDoctor } from "@/lib/settings";
import { IndianRupee, Plus, Trash2, Tag, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from "date-fns";

type DateRange = "today"|"week"|"month"|"year";

function getRange(range: DateRange): [string, string] {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (range === "today") return [fmt(now), fmt(now)];
  if (range === "week")  return [fmt(startOfWeek(now, {weekStartsOn:1})), fmt(endOfWeek(now, {weekStartsOn:1}))];
  if (range === "month") return [fmt(startOfMonth(now)), fmt(endOfMonth(now))];
  return [fmt(startOfYear(now)), fmt(endOfYear(now))];
}

export default function Expenses() {
  const { toast } = useToast();
  const doctor = getActiveDoctor();
  const isAdmin = doctor?.id === 1;

  const [expenses, setExpenses] = useState<Expense[]>(() => getExpenses().sort((a,b)=>b.date.localeCompare(a.date)));
  const [categories, setCategories] = useState<ExpenseCategory[]>(() => getExpenseCategories());
  const [range, setRange] = useState<DateRange>("month");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  // Expense form
  const [expDate, setExpDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [expCatId, setExpCatId] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expNote, setExpNote] = useState("");

  const refresh = () => {
    setExpenses(getExpenses().sort((a,b)=>b.date.localeCompare(a.date)));
    setCategories(getExpenseCategories());
  };

  const [from, to] = getRange(range);
  const filtered = expenses.filter(e => e.date >= from && e.date <= to);
  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);

  // Category summary
  const catSummary = categories.map(cat => ({
    ...cat,
    total: filtered.filter(e => e.categoryId === cat.id).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const handleAddExpense = () => {
    if (!expCatId) return toast({ title: "Select a category", variant: "destructive" });
    if (!expAmount || Number(expAmount) <= 0) return toast({ title: "Enter amount", variant: "destructive" });
    const cat = categories.find(c => c.id === expCatId);
    const expense: Expense = {
      id: newId(), date: expDate, categoryId: expCatId,
      categoryName: cat?.name || "", amount: Number(expAmount),
      note: expNote, createdAt: new Date().toISOString(),
    };
    saveExpense(expense);
    refresh();
    setShowAddExpense(false);
    setExpAmount(""); setExpNote(""); setExpCatId("");
    toast({ title: "Expense saved" });
  };

  const handleAddCat = () => {
    if (!newCatName.trim()) return;
    saveExpenseCategory({ id: newId(), name: newCatName.trim(), createdAt: new Date().toISOString() });
    refresh();
    setNewCatName(""); setShowAddCat(false);
    toast({ title: "Category added" });
  };

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgb(var(--primary-light))] flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-[rgb(var(--primary))]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Expenses</h1>
              <p className="text-sm text-slate-500">Track clinic expenses</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <button onClick={() => setShowAddCat(s => !s)}
                className="flex items-center gap-1.5 border border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                <Tag className="w-4 h-4"/>Categories
              </button>
            )}
            <button onClick={() => setShowAddExpense(s => !s)}
              className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: `rgb(var(--primary))` }}>
              <Plus className="w-4 h-4"/>Add Expense
            </button>
          </div>
        </div>

        {/* Category Manager */}
        {showAddCat && isAdmin && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-4">Manage Categories</h2>
            <div className="flex gap-2 mb-4">
              <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="New category name"
                className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[rgb(var(--primary))]" />
              <button onClick={handleAddCat} className="text-white px-5 py-2 rounded-xl text-sm font-semibold" style={{background:`rgb(var(--primary))`}}>Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <span key={cat.id} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-sm font-medium">
                  {cat.name}
                  <button onClick={() => { if(confirm(`Delete "${cat.name}"?`)) { deleteExpenseCategory(cat.id); refresh(); } }} className="text-red-400 hover:text-red-600">
                    <X className="w-3.5 h-3.5"/>
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Add Expense Form */}
        {showAddExpense && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-4">Add Expense</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Date</label>
                <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)}
                  className="mt-1 w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[rgb(var(--primary))]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Category *</label>
                <select value={expCatId} onChange={e => setExpCatId(e.target.value)}
                  className="mt-1 w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[rgb(var(--primary))] bg-white">
                  <option value="">Select...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Amount (₹) *</label>
                <input type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="0"
                  className="mt-1 w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[rgb(var(--primary))]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Note</label>
                <input value={expNote} onChange={e => setExpNote(e.target.value)} placeholder="Optional"
                  className="mt-1 w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[rgb(var(--primary))]" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleAddExpense} className="text-white px-6 py-2.5 rounded-xl font-semibold text-sm" style={{background:`rgb(var(--primary))`}}>Save Expense</button>
              <button onClick={() => setShowAddExpense(false)} className="border-2 border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        )}

        {/* Date Range Filter */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {(["today","week","month","year"] as DateRange[]).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold capitalize transition-all ${range===r?"bg-white text-slate-900 shadow-sm":"text-slate-500"}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-900">₹{totalFiltered.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Category Summary */}
          {catSummary.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-3">By Category</h3>
              <div className="space-y-2">
                {catSummary.map(c => (
                  <div key={c.id} className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">{c.name}</span>
                    <span className="font-semibold text-slate-900">₹{c.total.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expense List */}
          <div className={`${catSummary.length > 0 ? "md:col-span-2" : "md:col-span-3"} bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm`}>
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-white">
                <tr>
                  {["Date","Category","Amount","Note",""].map(h=><th key={h} className="px-4 py-3 text-left font-semibold text-xs">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={e.id} className={`border-b border-slate-100 ${i%2===0?"bg-white":"bg-slate-50/40"}`}>
                    <td className="px-4 py-2.5 text-slate-600">{format(new Date(e.date),"dd MMM yyyy")}</td>
                    <td className="px-4 py-2.5"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-medium">{e.categoryName}</span></td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">₹{e.amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{e.note||"—"}</td>
                    <td className="px-4 py-2.5">
                      {isAdmin && <button onClick={() => { if(confirm("Delete?")) { deleteExpense(e.id); refresh(); } }} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5"/></button>}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-400">No expenses in this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
