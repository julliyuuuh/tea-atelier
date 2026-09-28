"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, Plus, X } from "lucide-react";
import { SkeletonBlock } from "@/components/Skeleton";
import { ErrorBanner, PlainHeader, rowVariants } from "@/components/admin/AdminUI";
import ConfirmDialog from "@/components/account/ConfirmDialog";
import { useAuth } from "@/lib/auth-context";

type Account = {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "super_admin";
  created_at: string;
};

type ModalState = { mode: "add" } | { mode: "edit"; account: Account } | null;

const GRID_COLS =
  "minmax(220px,2.4fr) minmax(120px,0.9fr) minmax(120px,0.9fr) minmax(140px,1fr)";

const inputClass =
  "w-full border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors rounded-full";

function AccountModal({
  state,
  onClose,
  onSaved,
}: {
  state: ModalState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = state?.mode === "edit" ? state.account : null;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset the form whenever the modal opens for a different target.
  useEffect(() => {
    setFirstName(editing?.first_name ?? "");
    setLastName(editing?.last_name ?? "");
    setEmail(editing?.email ?? "");
    setPassword("");
    setError("");
  }, [state, editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!editing && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (editing && password && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        editing ? `/api/admin/accounts/${editing.user_id}` : "/api/admin/accounts",
        {
          method: editing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ firstName, lastName, email, password }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save account.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {state && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-body text-lg font-medium text-charcoal">
                {editing ? "Edit admin" : "Add admin"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1 text-charcoal/50 hover:text-charcoal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  className={inputClass}
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <input
                type="email"
                className={inputClass}
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                autoComplete="new-password"
                className={inputClass}
                placeholder={editing ? "New password (leave blank to keep)" : "Password (min 8 characters)"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="font-body text-sm text-red-600 mt-3">{error}</p>}

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="font-body text-sm px-4 py-2 rounded-full border border-charcoal/20 text-charcoal hover:bg-sand/30 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="font-body text-sm px-5 py-2 rounded-full bg-sage text-cream hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? "Saving..." : editing ? "Save changes" : "Add admin"}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AdminAccountsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // UI-level guard. The API enforces this too, this just avoids showing an empty error page.
  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) router.replace("/admin");
  }, [authLoading, isSuperAdmin, router]);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/admin/accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load accounts.");
      setAccounts(data.accounts);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) loadAccounts();
  }, [isSuperAdmin, loadAccounts]);

  const handleConfirmedDelete = async () => {
    if (!deleteTarget) return;
    const { user_id } = deleteTarget;
    setDeleteTarget(null);
    setIsDeleting(true);
    setActionError("");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/admin/accounts/${user_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to delete account.");
      setAccounts((prev) => prev.filter((a) => a.user_id !== user_id));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || !isSuperAdmin) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-body text-2xl font-medium text-charcoal mb-1">Admin Accounts</h1>
          <p className="font-body text-sm text-charcoal/60">
            {isLoading ? "Loading..." : `${accounts.length} account${accounts.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "add" })}
          className="flex items-center gap-1.5 font-body text-sm px-4 py-2.5 rounded-full bg-sage text-cream hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Add admin
        </button>
      </div>

      <ErrorBanner message={errorMessage} onRetry={loadAccounts} />
      <ErrorBanner message={actionError} />

      <div className="bg-white border border-charcoal/10 rounded-xl overflow-hidden" role="table" aria-label="Admin accounts">
        <div role="rowgroup">
          <div role="row" className="grid items-center border-b border-charcoal/10" style={{ gridTemplateColumns: GRID_COLS }}>
            <PlainHeader label="Admin" />
            <PlainHeader label="Role" />
            <PlainHeader label="Created" />
            <PlainHeader label="Actions" align="right" />
          </div>
        </div>

        <div role="rowgroup">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} role="row" className="grid items-center py-3 border-b border-charcoal/5 last:border-0" style={{ gridTemplateColumns: GRID_COLS }}>
                <div className="px-5 space-y-1.5">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-3 w-40" />
                </div>
                <div className="px-5"><SkeletonBlock className="h-6 w-24 rounded-full" /></div>
                <div className="px-5"><SkeletonBlock className="h-4 w-20" /></div>
                <div className="px-5 flex justify-end gap-3">
                  <SkeletonBlock className="h-4 w-8" />
                  <SkeletonBlock className="h-4 w-12" />
                </div>
              </div>
            ))}

          {!isLoading && (
            <AnimatePresence initial={false}>
              {accounts.map((account, index) => {
                const isSuper = account.role === "super_admin";
                return (
                  <motion.div
                    key={account.user_id}
                    role="row"
                    custom={index}
                    variants={rowVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="grid items-center py-3 border-b border-charcoal/5 last:border-0 hover:bg-sand/20 transition-colors overflow-hidden"
                    style={{ gridTemplateColumns: GRID_COLS }}
                  >
                    <div role="cell" className="px-5 min-w-0">
                      <p className="font-body text-sm text-charcoal truncate">
                        {account.first_name} {account.last_name}
                      </p>
                      <p className="font-body text-xs text-charcoal/50 truncate">{account.email}</p>
                    </div>
                    <div role="cell" className="px-5">
                      <span
                        className={`inline-flex items-center gap-1.5 font-body text-xs px-3 py-1 rounded-full ${
                          isSuper ? "bg-sage/15 text-sage" : "bg-charcoal/10 text-charcoal/60"
                        }`}
                      >
                        {isSuper && <ShieldCheck size={12} />}
                        {isSuper ? "Super admin" : "Admin"}
                      </span>
                    </div>
                    <div role="cell" className="px-5">
                      <span className="font-body text-xs text-charcoal/50">
                        {new Date(account.created_at).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div role="cell" className="px-5 flex items-center justify-end gap-4">
                      {isSuper ? (
                        <span className="font-body text-xs text-charcoal/30">Protected</span>
                      ) : (
                        <>
                          <button
                            onClick={() => setModal({ mode: "edit", account })}
                            className="font-body text-xs text-charcoal/60 hover:text-sage hover:scale-105 transition-all"
                          >
                            Edit
                          </button>
                          <button
                            disabled={isDeleting}
                            onClick={() => setDeleteTarget(account)}
                            className="font-body text-xs text-charcoal/60 hover:text-red-600 hover:scale-105 transition-all disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {!isLoading && accounts.length === 0 && !errorMessage && (
            <div role="row" className="px-5 py-10">
              <div role="cell" className="flex flex-col items-center gap-2 text-center">
                <ShieldCheck className="w-8 h-8 text-charcoal/20" />
                <span className="font-body text-sm text-charcoal/40">No admin accounts yet.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <AccountModal
        state={modal}
        onClose={() => setModal(null)}
        onSaved={() => {
          setModal(null);
          loadAccounts();
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete ${deleteTarget?.first_name ?? "this"} ${deleteTarget?.last_name ?? "admin"}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}