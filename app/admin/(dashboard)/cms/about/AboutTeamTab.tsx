"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";

interface Member {
  id: number;
  name: string;
  role: string;
  image: string;
  sort_order: number;
  is_active: boolean;
}

const inputClass =
  "w-full border border-charcoal/20 px-3 py-2 text-sm rounded focus:outline-none focus:border-sage";
const labelClass = "block text-xs font-medium text-charcoal/60 mb-1";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function AboutTeamTab({ onError }: { onError: (msg: string) => void }) {
  const [team, setTeam] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cms/admin/about-team", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load.");
      setTeam(data.team);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to load.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateLocal<K extends keyof Member>(id: number, field: K, value: Member[K]) {
    setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  }

  async function handleSave(member: Member) {
    setSavingId(member.id);
    try {
      const res = await fetch(`/api/cms/admin/about-team/${member.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          name: member.name,
          role: member.role,
          image: member.image,
          sort_order: member.sort_order,
          is_active: member.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this team member?")) return;
    try {
      const res = await fetch(`/api/cms/admin/about-team/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Unable to delete.");
      setTeam((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to delete.");
    }
  }

  async function handleAdd() {
    setSavingId("new");
    try {
      const res = await fetch("/api/cms/admin/about-team", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: "New Member",
          role: "Role",
          image: "/images/team/placeholder.jpg",
          sort_order: team.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to add.");
      setTeam((prev) => [...prev, data.member]);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unable to add.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= team.length) return;
    const reordered = [...team];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const withOrders = reordered.map((m, i) => ({ ...m, sort_order: i }));
    setTeam(withOrders);
    await Promise.all(
      [withOrders[index], withOrders[target]].map((m) =>
        fetch(`/api/cms/admin/about-team/${m.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({
            name: m.name,
            role: m.role,
            image: m.image,
            sort_order: m.sort_order,
            is_active: m.is_active,
          }),
        })
      )
    );
  }

  if (isLoading) return <SkeletonBlock className="h-64" />;

  return (
    <div className="space-y-4">
      {team.map((member, i) => (
        <div key={member.id} className="border border-charcoal/10 rounded-xl p-4 flex gap-4">
          <div className="flex flex-col gap-1 pt-1">
            <button onClick={() => handleMove(i, -1)} disabled={i === 0} className="text-charcoal/40 hover:text-sage disabled:opacity-20">
              <ChevronUp size={16} />
            </button>
            <button onClick={() => handleMove(i, 1)} disabled={i === team.length - 1} className="text-charcoal/40 hover:text-sage disabled:opacity-20">
              <ChevronDown size={16} />
            </button>
          </div>
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Name</label>
                <input type="text" value={member.name} onChange={(e) => updateLocal(member.id, "name", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <input type="text" value={member.role} onChange={(e) => updateLocal(member.id, "role", e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Image URL</label>
              <input type="text" value={member.image} onChange={(e) => updateLocal(member.id, "image", e.target.value)} className={inputClass} />
            </div>
            <label className="flex items-center gap-2 text-xs text-charcoal/60">
              <input type="checkbox" checked={member.is_active} onChange={(e) => updateLocal(member.id, "is_active", e.target.checked)} />
              Active (visible on storefront)
            </label>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <button onClick={() => handleSave(member)} disabled={savingId === member.id} className="text-xs bg-sage text-cream px-3 py-1.5 rounded hover:bg-charcoal transition-colors disabled:opacity-50">
              {savingId === member.id ? "..." : "Save"}
            </button>
            <button onClick={() => handleDelete(member.id)} className="text-charcoal/40 hover:text-red-500 self-center">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
      <button onClick={handleAdd} disabled={savingId === "new"} className="flex items-center gap-1.5 text-sm text-sage hover:text-charcoal transition-colors">
        <Plus size={16} /> Add Team Member
      </button>
    </div>
  );
}