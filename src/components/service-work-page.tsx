"use client";

import { useEffect, useState } from "react";

type WorkTask = { taskId: string; name: string; enabled: boolean; order: number };
type Checklist = { serviceCategory: string; serviceLabel: string; descriptionExample: string; enabled: boolean; version: number; tasks: WorkTask[] };
type WorkReport = { bookingId: string; partnerName: string; serviceName: string; quoteAmount: number; status: string; submittedAt: string; workDetails: { description?: string; completedTasks?: WorkTask[]; customWork?: string[]; additionalNotes?: string } };

export function ServiceWorkPage() {
  const [tab, setTab] = useState<"reports" | "checklists">("reports");
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [selected, setSelected] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const [reportResponse, checklistResponse] = await Promise.all([
        fetch("/api/admin/service-work?view=reports&limit=100", { cache: "no-store" }),
        fetch("/api/admin/service-work?view=checklists", { cache: "no-store" }),
      ]);
      if (!reportResponse.ok || !checklistResponse.ok) throw new Error("Service work data unavailable");
      const reportPayload = await reportResponse.json();
      const checklistPayload = await checklistResponse.json();
      setReports(reportPayload.rows || []);
      setChecklists(checklistPayload.checklists || []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function saveChecklist() {
    if (!selected) return;
    setMessage("Saving...");
    const response = await fetch(`/api/admin/service-work?serviceCategory=${encodeURIComponent(selected.serviceCategory)}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(selected),
    });
    if (!response.ok) { setMessage("Checklist update failed"); return; }
    setMessage("Checklist published successfully");
    await load();
    setSelected(null);
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-black text-[#111827]">Service Work Details</h1><p className="text-sm text-[#667085]">Partner submissions, quoted prices and service checklist controls.</p></div>
      <button onClick={() => void load()} className="rounded-xl bg-[#111827] px-4 py-2 text-sm font-bold text-white">Refresh</button>
    </div>
    <div className="flex gap-2 rounded-2xl bg-white p-2 shadow-sm">
      {(["reports", "checklists"] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-xl px-5 py-2 text-sm font-bold ${tab === item ? "bg-[#ef3f6e] text-white" : "text-[#667085]"}`}>{item === "reports" ? "Work Reports" : "Checklist Management"}</button>)}
    </div>
    {message && <p className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#344054]">{message}</p>}
    {loading ? <div className="rounded-2xl bg-white p-8 text-center">Loading live records...</div> : tab === "reports" ?
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="min-w-full text-left text-sm"><thead className="bg-[#fff5f8] text-[#475467]"><tr>{["Booking ID", "Partner", "Service", "Quote", "Work details", "Tasks", "Status", "Submitted"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{reports.map((row) => <tr key={row.bookingId} className="border-t border-[#f0f1f3] align-top"><td className="px-4 py-4 font-bold">{row.bookingId}</td><td className="px-4 py-4">{row.partnerName || "-"}</td><td className="px-4 py-4">{row.serviceName}</td><td className="px-4 py-4 font-bold">Rs {row.quoteAmount.toLocaleString("en-IN")}</td><td className="max-w-72 px-4 py-4">{row.workDetails?.description || "-"}</td><td className="max-w-72 px-4 py-4">{[...(row.workDetails?.completedTasks || []).map((task) => task.name), ...(row.workDetails?.customWork || [])].join(", ") || "-"}</td><td className="px-4 py-4">{row.status}</td><td className="px-4 py-4">{row.submittedAt ? new Date(row.submittedAt).toLocaleString("en-IN") : "-"}</td></tr>)}</tbody></table>{reports.length === 0 && <p className="p-8 text-center text-[#667085]">No submitted work details yet.</p>}</div>
      : <div className="grid gap-4 lg:grid-cols-2">{checklists.map((config) => <button key={config.serviceCategory} onClick={() => setSelected(structuredClone(config))} className="rounded-2xl bg-white p-5 text-left shadow-sm"><div className="flex justify-between"><h2 className="font-black">{config.serviceLabel}</h2><span className="text-xs text-[#667085]">v{config.version}</span></div><p className="mt-2 text-sm text-[#667085]">{config.descriptionExample}</p><p className="mt-3 text-sm font-bold text-[#ef3f6e]">{config.tasks.length} checklist items · Edit</p></button>)}</div>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6"><h2 className="text-xl font-black">Edit {selected.serviceLabel}</h2><label className="mt-4 block text-sm font-bold">Description example</label><textarea value={selected.descriptionExample} onChange={(e) => setSelected({ ...selected, descriptionExample: e.target.value })} className="mt-1 w-full rounded-xl border p-3" rows={2}/><div className="mt-4 space-y-2">{selected.tasks.sort((a,b) => a.order-b.order).map((task, index) => <div key={task.taskId} className="flex gap-2"><input value={task.name} onChange={(e) => setSelected({ ...selected, tasks: selected.tasks.map((item, i) => i === index ? { ...item, name: e.target.value } : item) })} className="min-w-0 flex-1 rounded-xl border px-3 py-2"/><button onClick={() => setSelected({ ...selected, tasks: selected.tasks.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i })) })} className="rounded-xl border px-3 text-[#d92d4b]">Remove</button></div>)}</div><button onClick={() => setSelected({ ...selected, tasks: [...selected.tasks, { taskId: "", name: "", enabled: true, order: selected.tasks.length }] })} className="mt-3 rounded-xl border border-dashed border-[#ef3f6e] px-4 py-2 font-bold text-[#ef3f6e]">+ Add task</button><div className="mt-6 flex justify-end gap-3"><button onClick={() => setSelected(null)} className="rounded-xl border px-5 py-2 font-bold">Cancel</button><button onClick={() => void saveChecklist()} className="rounded-xl bg-[#ef3f6e] px-5 py-2 font-bold text-white">Save & Publish</button></div></div></div>}
  </div>;
}
