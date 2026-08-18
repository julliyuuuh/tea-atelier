"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/lib/auth-context";
import { Plus, Trash2, MapPin } from "lucide-react";

type Address = {
  id: string;
  label: string;
  street: string;
  city: string;
  province: string;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "",
    street: "",
    city: "",
    province: "",
  });
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      // TODO: wire up once PATCH /api/user exists
      // await fetch("/api/user", { method: "PATCH", body: JSON.stringify({ name, phone }) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError("Something went wrong — try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.label.trim() || !newAddress.street.trim()) return;
    setAddresses((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: newAddress.label.trim(),
        street: newAddress.street.trim(),
        city: newAddress.city.trim(),
        province: newAddress.province.trim(),
      },
    ]);
    setNewAddress({ label: "", street: "", city: "", province: "" });
    setAddingAddress(false);
  };

  const handleRemoveAddress = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    setConfirmingDeleteId(null);
  };

  const formatAddressLine = (addr: Address) =>
    [addr.street, addr.city, addr.province].filter(Boolean).join(", ");

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-body text-charcoal/60">
          Please log in to view your profile.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="font-display text-4xl text-charcoal mb-2">My Profile</h1>
        <p className="font-body text-sm text-charcoal/60 mb-12">
          Manage your account details and saved addresses
        </p>

        {/* Profile Info */}
        <div className="bg-white border border-charcoal/10 rounded-2xl p-8 mb-8">
          <h2 className="font-display text-xl text-charcoal mb-6">
            Account Information
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div>
              <label htmlFor="name" className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-charcoal/20 px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
              />
            </div>

            <div>
              <label htmlFor="email" className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                className="w-full rounded-xl border border-charcoal/20 px-4 py-3 font-body text-sm text-charcoal/50 bg-sand/20 cursor-not-allowed"
              />
              <p className="font-body text-xs text-charcoal/40 mt-1.5">
                Contact support to change your email address.
              </p>
            </div>

            <div>
              <label htmlFor="phone" className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                maxLength={11}
                className="w-full rounded-xl border border-charcoal/20 px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
              />
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase px-8 py-3 hover:bg-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <AnimatePresence>
                {saved && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-body text-sm text-sage"
                  >
                    Saved!
                  </motion.span>
                )}
                {saveError && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-body text-sm text-red-500"
                  >
                    {saveError}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>

        {/* Saved Addresses */}
        <div className="bg-white border border-charcoal/10 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl text-charcoal">
              Saved Addresses
            </h2>
            <button
              onClick={() => setAddingAddress((v) => !v)}
              aria-expanded={addingAddress}
              className="flex items-center gap-1.5 rounded-full bg-charcoal text-cream font-body text-xs tracking-wide uppercase px-4 py-2 hover:bg-sage transition-colors"
            >
              <Plus size={14} /> Add Address
            </button>
          </div>

          {addresses.length === 0 && !addingAddress && (
            <p className="font-body text-sm text-charcoal/50">
              No saved addresses yet.
            </p>
          )}

          <div className="space-y-3 mb-4">
            <AnimatePresence>
              {addresses.map((addr) => (
                <motion.div
                  key={addr.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start justify-between bg-sand/30 rounded-xl px-5 py-4 overflow-hidden"
                >
                  <div className="flex gap-3">
                    <MapPin
                      size={16}
                      className="text-sage mt-0.5 shrink-0"
                      strokeWidth={1.75}
                    />
                    <div>
                      <p className="font-body text-sm text-charcoal font-medium">
                        {addr.label}
                      </p>
                      <p className="font-body text-xs text-charcoal/60 mt-0.5">
                        {formatAddressLine(addr)}
                      </p>
                    </div>
                  </div>

                  {confirmingDeleteId === addr.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRemoveAddress(addr.id)}
                        className="font-body text-xs text-red-500 hover:underline"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        className="font-body text-xs text-charcoal/50 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingDeleteId(addr.id)}
                      aria-label={`Delete ${addr.label} address`}
                      className="text-charcoal/40 hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {addingAddress && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddAddress}
                className="space-y-4 border-t border-charcoal/10 pt-6 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Label (e.g. Home, Office)"
                    value={newAddress.label}
                    onChange={(e) =>
                      setNewAddress((prev) => ({ ...prev, label: e.target.value }))
                    }
                    required
                    className="rounded-xl border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={newAddress.street}
                    onChange={(e) =>
                      setNewAddress((prev) => ({ ...prev, street: e.target.value }))
                    }
                    required
                    className="rounded-xl border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={newAddress.city}
                    onChange={(e) =>
                      setNewAddress((prev) => ({ ...prev, city: e.target.value }))
                    }
                    className="rounded-xl border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Province"
                    value={newAddress.province}
                    onChange={(e) =>
                      setNewAddress((prev) => ({ ...prev, province: e.target.value }))
                    }
                    className="rounded-xl border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="rounded-full bg-sage text-cream font-body text-xs tracking-wide uppercase px-6 py-2.5 hover:bg-charcoal transition-colors"
                  >
                    Save Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingAddress(false)}
                    className="rounded-full border border-charcoal/20 text-charcoal font-body text-xs tracking-wide uppercase px-6 py-2.5 hover:bg-sand/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Footer />
    </main>
  );
}