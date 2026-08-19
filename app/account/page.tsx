"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/lib/auth-context";
import {
  Plus,
  Trash2,
  MapPin,
  Package,
  Settings as SettingsIcon,
  User,
} from "lucide-react";

type TabKey = "profile" | "orders" | "settings";

const TABS: { key: TabKey; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "orders", label: "My Orders" },
  { key: "settings", label: "Settings" },
];

// ================================================================
// Page shell
// ================================================================

export default function AccountPage() {
  return <AccountPageInner />;
}

function AccountPageInner() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  // Tracks which tabs have been opened at least once, so Orders/Settings
  // only mount (and fetch) the first time they're selected, then stay
  // mounted so switching back doesn't refetch.
  const [visited, setVisited] = useState<Set<TabKey>>(new Set(["profile"]));

  useEffect(() => {
    setVisited((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  // Once auth has resolved, bounce unauthenticated visits (including
  // right after logout) straight to the login page instead of showing
  // an in-page message.
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Refs to each tab button so arrow-key navigation can move focus
  // directly, matching the native <select>/menu keyboard pattern.
  const tabRefs = useRef<Partial<Record<TabKey, HTMLButtonElement | null>>>({});

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentKey: TabKey) => {
      const currentIndex = TABS.findIndex((t) => t.key === currentKey);
      let nextIndex: number | null = null;

      if (e.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % TABS.length;
      } else if (e.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
      } else if (e.key === "Home") {
        nextIndex = 0;
      } else if (e.key === "End") {
        nextIndex = TABS.length - 1;
      }

      if (nextIndex === null) return;

      e.preventDefault();
      const nextKey = TABS[nextIndex].key;
      setActiveTab(nextKey);
      tabRefs.current[nextKey]?.focus();
    },
    []
  );

  if (authLoading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-body text-charcoal/60">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="font-display text-4xl text-charcoal mb-2">Account Settings</h1>
        <p className="font-body text-sm text-charcoal/60 mb-10">
          Manage your profile, orders, and preferences
        </p>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Account sections"
          className="flex items-center gap-8 border-b border-charcoal/10 mb-8"
        >
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                ref={(el) => {
                  tabRefs.current[tab.key] = el;
                }}
                id={`account-tab-${tab.key}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`account-panel-${tab.key}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.key)}
                onKeyDown={(e) => handleTabKeyDown(e, tab.key)}
                className="relative pb-4 font-display text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-cream rounded-sm"
              >
                <span className={isActive ? "text-charcoal" : "text-charcoal/40 hover:text-charcoal/70"}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="account-tab-underline"
                    className="absolute left-0 right-0 -bottom-px h-0.5 bg-sage rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <div className="relative bg-white border border-charcoal/10 rounded-2xl p-8 min-h-[420px] overflow-hidden">
          {/* Each tab stays mounted once visited — a CSS opacity crossfade
              swaps which one is visible, instead of conditionally rendering
              or remounting, so switching tabs never loses in-progress edits
              or forces a refetch. */}
          <div
            id="account-panel-profile"
            role="tabpanel"
            aria-labelledby="account-tab-profile"
            tabIndex={0}
            className={`transition-opacity duration-200 ${
              activeTab === "profile"
                ? "relative opacity-100"
                : "absolute inset-8 opacity-0 pointer-events-none"
            }`}
            aria-hidden={activeTab !== "profile"}
            inert={activeTab !== "profile" ? true : undefined}
          >
            <ProfileTab />
          </div>
          {visited.has("orders") && (
            <div
              id="account-panel-orders"
              role="tabpanel"
              aria-labelledby="account-tab-orders"
              tabIndex={0}
              className={`transition-opacity duration-200 ${
                activeTab === "orders"
                  ? "relative opacity-100"
                  : "absolute inset-8 opacity-0 pointer-events-none"
              }`}
              aria-hidden={activeTab !== "orders"}
              inert={activeTab !== "orders" ? true : undefined}
            >
              <OrdersTab />
            </div>
          )}
          {visited.has("settings") && (
            <div
              id="account-panel-settings"
              role="tabpanel"
              aria-labelledby="account-tab-settings"
              tabIndex={0}
              className={`transition-opacity duration-200 ${
                activeTab === "settings"
                  ? "relative opacity-100"
                  : "absolute inset-8 opacity-0 pointer-events-none"
              }`}
              aria-hidden={activeTab !== "settings"}
              inert={activeTab !== "settings" ? true : undefined}
            >
              <SettingsTab />
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}

// ================================================================
// Profile tab
// ================================================================

type Address = {
  address_id: string;
  address_line1: string;
  address_line2: string | null;
  address_line3: string | null;
  default_address: boolean;
  default_billing: boolean;
};

function ProfileTab() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addingAddress, setAddingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
  });
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const [first, ...rest] = (user.name || "").split(" ");
      setFirstName((user as any).firstName || first || "");
      setLastName((user as any).lastName || rest.join(" ") || "");
      setEmail(user.email || "");
      setPhone((user as any).phone || "");
    }
  }, [user]);

  useEffect(() => {
    async function loadAddresses() {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("/api/addresses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setAddresses(data.addresses);
      } catch {
        // fail silently, empty list stays
      } finally {
        setLoadingAddresses(false);
      }
    }
    if (user) loadAddresses();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ firstName, lastName, phoneNumber: phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Something went wrong — try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.addressLine1.trim()) return;

    setSavingAddress(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newAddress),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save address.");

      setAddresses((prev) => [...prev, data.address]);
      setNewAddress({ addressLine1: "", addressLine2: "", addressLine3: "" });
      setAddingAddress(false);
    } catch (error) {
      console.error(error);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleRemoveAddress = async (addressId: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/addresses/${addressId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAddresses((prev) => prev.filter((a) => a.address_id !== addressId));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setConfirmingDeleteId(null);
    }
  };

  const formatAddressLine = (addr: Address) =>
    [addr.address_line1, addr.address_line2, addr.address_line3].filter(Boolean).join(", ");

  return (
    <div className="space-y-10">
      {/* Account Information */}
      <div>
        <h2 className="font-display text-xl text-charcoal mb-6">Account Information</h2>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="firstName" className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-charcoal/20 px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="lastName" className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-charcoal/20 px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
              />
            </div>
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
      <div className="border-t border-charcoal/10 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl text-charcoal">Saved Addresses</h2>
          <button
            onClick={() => setAddingAddress((v) => !v)}
            aria-expanded={addingAddress}
            className="flex items-center gap-1.5 rounded-full bg-charcoal text-cream font-body text-xs tracking-wide uppercase px-4 py-2 hover:bg-sage transition-colors"
          >
            <Plus size={14} /> Add Address
          </button>
        </div>

        {loadingAddresses ? (
          <p className="font-body text-sm text-charcoal/50">Loading…</p>
        ) : (
          <>
            {addresses.length === 0 && !addingAddress && (
              <p className="font-body text-sm text-charcoal/50">No saved addresses yet.</p>
            )}

            <div className="space-y-3 mb-4">
              <AnimatePresence>
                {addresses.map((addr) => (
                  <motion.div
                    key={addr.address_id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start justify-between bg-sand/30 rounded-xl px-5 py-4 overflow-hidden"
                  >
                    <div className="flex gap-3">
                      <MapPin size={16} className="text-sage mt-0.5 shrink-0" strokeWidth={1.75} />
                      <div>
                        <p className="font-body text-sm text-charcoal font-medium">
                          {addr.default_address ? "Default Address" : "Address"}
                        </p>
                        <p className="font-body text-xs text-charcoal/60 mt-0.5">
                          {formatAddressLine(addr)}
                        </p>
                      </div>
                    </div>

                    {confirmingDeleteId === addr.address_id ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleRemoveAddress(addr.address_id)}
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
                        onClick={() => setConfirmingDeleteId(addr.address_id)}
                        aria-label="Delete address"
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
                  <div className="grid grid-cols-1 gap-4">
                    <input
                      type="text"
                      placeholder="Address Line 1 (Street, Building, Unit)"
                      value={newAddress.addressLine1}
                      onChange={(e) =>
                        setNewAddress((prev) => ({ ...prev, addressLine1: e.target.value }))
                      }
                      required
                      className="rounded-xl border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Address Line 2 (Barangay, City)"
                      value={newAddress.addressLine2}
                      onChange={(e) =>
                        setNewAddress((prev) => ({ ...prev, addressLine2: e.target.value }))
                      }
                      className="rounded-xl border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Address Line 3 (Province, Postal Code)"
                      value={newAddress.addressLine3}
                      onChange={(e) =>
                        setNewAddress((prev) => ({ ...prev, addressLine3: e.target.value }))
                      }
                      className="rounded-xl border border-charcoal/20 px-4 py-2.5 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={savingAddress}
                      className="rounded-full bg-sage text-cream font-body text-xs tracking-wide uppercase px-6 py-2.5 hover:bg-charcoal transition-colors disabled:opacity-50"
                    >
                      {savingAddress ? "Saving…" : "Save Address"}
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
          </>
        )}
      </div>
    </div>
  );
}

// ================================================================
// Orders tab — ported from OrderHistoryPage
// ================================================================

type OrderItem = {
  name: string;
  image: string;
  quantity: number;
  price: number;
};

type Order = {
  id: number;
  status: string;
  paymentMethod: string;
  recipientName: string | null;
  shippingCost: number;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
};

function formatPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    cod: "Cash on Delivery",
    gcash: "GCash",
    credit: "Credit Card",
    paypal: "PayPal",
  };
  return labels[method] || method;
}

function OrdersTab() {
  const { logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrders() {
      const token = localStorage.getItem("token");
      if (!token) {
        setErrorMessage("Please sign in to view your orders.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`/api/orders?page=${page}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (res.status === 401) {
          // Session expired or token invalid — clear client auth state
          // and send the user to log back in, instead of showing a
          // confusing generic error on a page that still looks "logged in".
          logout();
          router.push("/login");
          return;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load orders.");
        setOrders(data.orders);
        setTotalPages(data.totalPages);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setErrorMessage(error.message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadOrders();
    return () => controller.abort();
    // logout/router intentionally omitted — including them can change
    // identity across renders and would refetch orders on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 bg-sand/30 rounded-xl" />
        ))}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="text-center py-16">
        <p className="font-body text-sm text-red-600">{errorMessage}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <Package size={28} className="mx-auto text-charcoal/20 mb-3" strokeWidth={1.5} />
        <p className="font-body text-sm text-charcoal/50">You haven't placed any orders yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-sand/30 rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-charcoal/10">
              <div>
                <p className="font-body text-sm text-charcoal">Order #TA-{order.id}</p>
                <p className="font-body text-xs text-charcoal/50 mt-1">
                  {new Date(order.createdAt).toLocaleDateString("en-PH", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                {order.recipientName && (
                  <p className="font-body text-xs text-charcoal/50 mt-1">
                    For: {order.recipientName}
                  </p>
                )}
              </div>
              <span className="font-body text-xs uppercase tracking-wide px-3 py-1 rounded-full bg-sage/15 text-sage">
                {order.status}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-sand rounded-lg overflow-hidden shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-body text-sm text-charcoal">{item.name}</p>
                    <p className="font-body text-xs text-charcoal/50">Qty {item.quantity}</p>
                  </div>
                  <p className="font-body text-sm text-charcoal">
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-body text-sm text-charcoal/70 pt-4 border-t border-charcoal/10">
              <span>Total ({formatPaymentMethod(order.paymentMethod)})</span>
              <span className="font-display text-base text-charcoal">
                ₱{order.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="font-body text-lg uppercase tracking-wide text-charcoal/70 hover:text-charcoal disabled:opacity-30 disabled:cursor-not-allowed"
          >
            &lt;
          </button>
          <span className="font-body text-base text-charcoal/50">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="font-body text-lg uppercase tracking-wide text-charcoal/70 hover:text-charcoal disabled:opacity-30 disabled:cursor-not-allowed"
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}

// ================================================================
// Settings tab — ported from SettingsPage
// ================================================================

function SettingsTab() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [totpEnabled, setTotpEnabled] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [setupStep, setSetupStep] = useState<"idle" | "scanning" | "confirming">("idle");
  const [qrCode, setQrCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  const handleUnauthorized = () => {
    // Session expired or token invalid — clear client auth state and
    // send the user to log back in, instead of showing a confusing
    // generic error on a page that still looks "logged in".
    logout();
    router.push("/login");
  };

  useEffect(() => {
    async function loadStatus() {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("/api/2fa/status", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          handleUnauthorized();
          return;
        }

        const data = await res.json();
        if (res.ok) setTotpEnabled(data.enabled);
      } catch {
        // fail silently, defaults to false
      } finally {
        setIsLoadingStatus(false);
      }
    }

    loadStatus();
    // handleUnauthorized intentionally omitted — logout/router can change
    // identity across renders and would refetch status on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResendVerification = async () => {
    setShowResendConfirm(false);
    setResendLoading(true);
    setResendMessage("");
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/resend-verification", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to resend email.");
      setResendMessage("A new verification email has been sent.");
    } catch (error) {
      setResendMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setResendLoading(false);
    }
  };

  const startSetup = async () => {
    setErrorMessage("");
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/2fa/setup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to start setup.");

      setQrCode(data.qrCode);
      setSetupStep("scanning");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  const confirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/2fa/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: confirmCode }),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code.");

      setTotpEnabled(true);
      setSetupStep("idle");
      setConfirmCode("");
      setSuccessMessage("Two-factor authentication is now enabled.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const disable2FA = async () => {
    const token = localStorage.getItem("token");
    setErrorMessage("");

    try {
      const res = await fetch("/api/2fa/disable", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to disable 2FA.");

      setTotpEnabled(false);
      setSuccessMessage("Two-factor authentication has been disabled.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  const confirmDisable2FA = () => {
    setShowDisableConfirm(false);
    disable2FA();
  };

  return (
    <div>
      <h2 className="font-display text-xl text-charcoal mb-6">Security</h2>

      {successMessage && (
        <p className="font-body text-sm text-sage mb-6">{successMessage}</p>
      )}
      {errorMessage && (
        <p className="font-body text-sm text-red-600 mb-6">{errorMessage}</p>
      )}

      <div className="space-y-4">
        {/* Email Verification */}
        <div
          className={`rounded-xl p-6 ${
            user?.isVerified ? "bg-sage/10" : "bg-amber-50"
          }`}
        >
          <h3 className="font-display text-lg text-charcoal mb-2">Email Verification</h3>

          {user?.isVerified ? (
            <p className="font-body text-sm text-sage">✓ Your email is verified</p>
          ) : (
            <>
              <p className="font-body text-sm text-charcoal/60 mb-4">
                Your email address hasn't been verified yet. Check your inbox, or request a new link below.
              </p>
              <button
                onClick={() => setShowResendConfirm(true)}
                disabled={resendLoading}
                className="rounded-full bg-charcoal text-cream font-body text-sm tracking-wide uppercase px-6 py-3 hover:bg-sage transition-colors disabled:opacity-50"
              >
                {resendLoading ? "Sending..." : "Resend Verification Email"}
              </button>
              {resendMessage && (
                <p className="font-body text-sm text-charcoal/70 mt-3">{resendMessage}</p>
              )}
            </>
          )}
        </div>

        {/* Two-Factor Authentication */}
        <div className="rounded-xl p-6 bg-amber-50">
          <h3 className="font-display text-lg text-charcoal mb-2">Two-Factor Authentication</h3>
          <p className="font-body text-sm text-charcoal/60 mb-6">
            Add an extra layer of security using an authenticator app like Google Authenticator.
          </p>

          {isLoadingStatus ? (
            <p className="font-body text-sm text-charcoal/50">Loading...</p>
          ) : totpEnabled ? (
            <div className="flex items-center justify-between">
              <span className="font-body text-sm text-sage">Enabled</span>
              <button
                onClick={() => setShowDisableConfirm(true)}
                className="font-body text-xs uppercase tracking-wide text-red-600 hover:text-red-800 transition-colors"
              >
                Disable
              </button>
            </div>
          ) : setupStep === "idle" ? (
            <button
              onClick={startSetup}
              className="rounded-full bg-charcoal text-cream font-body text-sm tracking-wide uppercase px-6 py-3 hover:bg-sage transition-colors"
            >
              Enable 2FA
            </button>
          ) : setupStep === "scanning" ? (
            <div className="space-y-4">
              <p className="font-body text-sm text-charcoal/70">
                Scan this QR code with Google Authenticator (or any compatible app), then enter the 6-digit code it generates.
              </p>
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 mx-auto rounded-xl border border-charcoal/10" />

              <form onSubmit={confirmSetup} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.3em] rounded-xl border border-charcoal/20 px-4 py-3 font-body text-lg text-charcoal outline-none focus:border-sage"
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || confirmCode.length !== 6}
                    className="flex-1 rounded-full bg-charcoal text-cream font-body text-sm tracking-wide uppercase py-3 hover:bg-sage transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Verifying..." : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSetupStep("idle");
                      setConfirmCode("");
                    }}
                    className="flex-1 rounded-full border border-charcoal/20 text-charcoal font-body text-sm py-3 hover:bg-sand/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </div>

      {showResendConfirm && (
        <div className="fixed inset-0 bg-charcoal/40 flex items-center justify-center z-[100] p-6">
          <div className="bg-cream border border-charcoal/10 rounded-2xl p-8 max-w-sm w-full text-center">
            <p className="font-body text-sm text-charcoal mb-6">Send a new verification email?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResendConfirm(false)}
                className="flex-1 rounded-full border border-charcoal/20 text-charcoal font-body text-sm py-3 hover:bg-sand/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResendVerification}
                className="flex-1 rounded-full bg-sage text-cream font-body text-sm py-3 hover:bg-charcoal transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {showDisableConfirm && (
        <div className="fixed inset-0 bg-charcoal/40 flex items-center justify-center z-[100] p-6">
          <div className="bg-cream border border-charcoal/10 rounded-2xl p-8 max-w-sm w-full text-center">
            <p className="font-body text-sm text-charcoal mb-6">
              Disable two-factor authentication for your account?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDisableConfirm(false)}
                className="flex-1 rounded-full border border-charcoal/20 text-charcoal font-body text-sm py-3 hover:bg-sand/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDisable2FA}
                className="flex-1 rounded-full bg-red-600 text-cream font-body text-sm py-3 hover:bg-red-700 transition-colors"
              >
                Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}