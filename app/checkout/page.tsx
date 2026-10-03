"use client";

import Link from "next/link";
import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PhAddressFields, { PhAddress, isAddressComplete } from "@/components/checkout/PhAddressFields";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { DELIVERY_FEE } from "@/lib/shipping";

const CHECKOUT_ATTEMPT_STORAGE = "tea-atelier.checkout-attempt.v1";
const CHECKOUT_ORDER_STORAGE = "tea-atelier.checkout-order.v1";
type PaymentStatus = "pending" | "processing" | "paid" | "failed" | "cancelled";
type SummaryItem = { name: string; quantity: number; price: number };
type SavedOrder = {
  accountEmail: string;
  orderId: number;
  paymentMethod: "gcash" | "grabpay" | null;
  subtotal: number | null;
  deliveryFee: number | null;
  total: number | null;
  items: SummaryItem[];
  cartFingerprint?: string;
};

function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === "string" && ["pending", "processing", "paid", "failed", "cancelled"].includes(value);
}

function CheckoutContent() {
  const { items, subtotal, clearCart, loading: cartLoading } = useCart();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnOrderId = searchParams.get("orderId");
  const accountEmail = user?.email;
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const paymentRedirectedRef = useRef(false);
  const activeOrderRef = useRef<SavedOrder | null>(null);
  const [activeOrder, setActiveOrder] = useState<SavedOrder | null>(null);
  const [previousOrderId, setPreviousOrderId] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "unknown">("unknown");
  const [checking, setChecking] = useState(false);
  const [restored, setRestored] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const statusSequenceRef = useRef(0);
  const [saveAddress, setSaveAddress] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", email: "", phone: "" });
  const [address, setAddress] = useState<PhAddress>({
    province: null, city: null, barangay: null, street: "",
  });

  const rememberOrder = useCallback((order: SavedOrder) => {
    activeOrderRef.current = order;
    setActiveOrder(order);
    if (order.paymentMethod) setPaymentMethod(order.paymentMethod);
    // Keep the in-memory order even if browser storage is unavailable.
    try { sessionStorage.setItem(CHECKOUT_ORDER_STORAGE, JSON.stringify(order)); }
    catch { setPaymentError("Keep this page open to resume this order."); }
  }, []);

  const checkOrder = useCallback(async (order: SavedOrder) => {
    const sequence = ++statusSequenceRef.current;
    setChecking(true);
    setPaymentStatus("unknown");
    setPaymentError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Sign in to check this order.");
      const res = await fetch("/api/payments/paymongo/check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.orderId }),
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      const result = await res.json();
      if (!res.ok || !isPaymentStatus(result.paymentStatus)) {
        throw new Error(result.error || "Unable to verify payment. Please check again.");
      }
      if (sequence === statusSequenceRef.current) setPaymentStatus(result.paymentStatus);
      return result.paymentStatus as PaymentStatus;
    } catch (error) {
      if (sequence === statusSequenceRef.current) {
        setPaymentError(error instanceof Error ? error.message : "Unable to verify payment.");
      }
      return null;
    } finally {
      if (sequence === statusSequenceRef.current) setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (user) setFormData((prev) => ({ ...prev, email: user.email }));
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      if (!accountEmail) {
        setPreviousOrderId(null);
        activeOrderRef.current = null;
        setActiveOrder(null);
        setPaymentStatus("unknown");
        setRestored(true);
        return;
      }
      setRestored(false);
      let saved: SavedOrder | null = null;
      try {
        const candidate = JSON.parse(sessionStorage.getItem(CHECKOUT_ORDER_STORAGE) || "null");
        if (candidate?.accountEmail === accountEmail && Number.isSafeInteger(candidate.orderId) && candidate.orderId > 0 &&
            ["gcash", "grabpay", null].includes(candidate.paymentMethod) && Array.isArray(candidate.items)) {
          saved = candidate;
        }
      } catch { /* A return URL can still recover an order. */ }

      const urlId = Number(returnOrderId);
      const hasUrlOrder = !!returnOrderId && Number.isSafeInteger(urlId) && urlId > 0;
      if (hasUrlOrder && saved?.orderId !== urlId) {
        saved = { accountEmail, orderId: urlId, paymentMethod: null,
          subtotal: null, deliveryFee: null, total: null, items: [] };
      }
      if (!saved) {
        activeOrderRef.current = null;
        setActiveOrder(null);
        setPaymentStatus("unknown");
        setRestored(true);
        return;
      }
      rememberOrder(saved);

      // Recover method and summary from the existing orders API when a
      // provider return URL is opened without this tab's saved snapshot.
      if (!saved.paymentMethod || saved.total === null) {
        try {
          const token = localStorage.getItem("token");
          if (!token) throw new Error("Sign in to resume this order.");
          for (let page = 1; !cancelled; page++) {
            const res = await fetch(`/api/orders?page=${page}`, {
              headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
              signal: AbortSignal.timeout(15000),
            });
            const data = await res.json();
            if (!res.ok || !Array.isArray(data.orders)) throw new Error("Unable to load order details.");
            const found = data.orders.find((entry: { id: number | string }) => Number(entry.id) === saved!.orderId);
            if (found) {
              saved = { ...saved, paymentMethod: ["gcash", "grabpay"].includes(found.paymentMethod) ? found.paymentMethod : null,
                subtotal: Number(found.totalAmount) - Number(found.shippingCost),
                deliveryFee: Number(found.shippingCost), total: Number(found.totalAmount), items: found.items };
              if (!cancelled) rememberOrder(saved);
              break;
            }
            if (page >= Number(data.totalPages)) break;
          }
        } catch { /* Status can still be checked; creation stays blocked. */ }
      }
      if (cancelled) return;
      const status = await checkOrder(saved);
      if (cancelled) return;

      // A paid order no longer owns checkout. Leave the current cart intact.
      if (status === "paid" || status === "cancelled") {
        try {
          sessionStorage.removeItem(CHECKOUT_ORDER_STORAGE);
          sessionStorage.removeItem(CHECKOUT_ATTEMPT_STORAGE);
        } catch { /* Reset this page even if browser storage is unavailable. */ }
        activeOrderRef.current = null;
        setActiveOrder(null);
        setPaymentStatus("unknown");
        setPaymentMethod("cod");
        setShowConfirm(false);
        if (hasUrlOrder) {
          window.history.replaceState(window.history.state, "", "/checkout");
        }
      }
      setRestored(true);
    };

    const handlePageShow = () => {
      // Never unlock an active API request; unlock only a provider redirect.
      if (submittingRef.current && !paymentRedirectedRef.current) return;
      paymentRedirectedRef.current = false;
      submittingRef.current = false;
      setIsSubmitting(false);
      setShowConfirm(false);
      void restore();
    };
    void restore();
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      cancelled = true;
      ++statusSequenceRef.current;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [accountEmail, returnOrderId, rememberOrder, checkOrder]);

  const startPayment = async (order: SavedOrder, token: string) => {
    if (!order.paymentMethod) throw new Error("Order details are unavailable. Check again or open your Orders page.");
    const res = await fetch("/api/payments/paymongo/source", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderId: order.orderId, type: order.paymentMethod }),
      signal: AbortSignal.timeout(40000),
    });
    const result = await res.json();
    if (result.paymentStatus === "paid" || result.paymentStatus === "processing" || result.paymentStatus === "cancelled") {
      setPaymentStatus(result.paymentStatus);
      return false;
    }
    if (!res.ok || typeof result.checkoutUrl !== "string" || !result.checkoutUrl) {
      throw new Error(result.error || "Unable to start or resume payment.");
    }
    setPaymentStatus("pending");
    paymentRedirectedRef.current = true;
    window.location.href = result.checkoutUrl;
    return true;
  };

  const viewOrder = () => {
    if (!activeOrder) return;
    if (paymentStatus === "paid") {
      try {
        sessionStorage.removeItem(CHECKOUT_ORDER_STORAGE);
        sessionStorage.removeItem(CHECKOUT_ATTEMPT_STORAGE);
      } catch { /* Viewing the order remains available. */ }
    }
    router.push(`/order-confirmation?orderId=${activeOrder.orderId}`);
  };

  const handleExistingPayment = async (resume: boolean) => {
    const order = activeOrderRef.current;
    if (!order || submittingRef.current || checking) return;
    const token = localStorage.getItem("token");
    if (!user || !token) { router.push("/login"); return; }
    submittingRef.current = true;
    setIsSubmitting(true);
    let navigating = false;
    try {
      const status = await checkOrder(order);
      if (resume && (status === "pending" || status === "failed")) {
        navigating = await startPayment(order, token);
      }
    } catch (error) {
      setPaymentStatus("unknown");
      setPaymentError(error instanceof Error ? error.message : "Unable to resume payment.");
    } finally {
      if (!navigating) { submittingRef.current = false; setIsSubmitting(false); }
    }
  };

  const cartFingerprint = JSON.stringify(items.map((item) => ({
    productId: String(item.product.id), quantity: item.quantity, price: Number(item.product.price),
  })).sort((a, b) => a.productId.localeCompare(b.productId)));
  const currentSummary = items.map((item) => ({
    name: item.product.name, quantity: item.quantity, price: item.product.price,
  }));
  // Older saved entries have no product-ID fingerprint; compare their
  // item snapshots until a new order saves the stronger fingerprint.
  const summaryFingerprint = (rows: SummaryItem[]) => JSON.stringify(rows.map((item) => ({
    name: item.name, quantity: item.quantity, price: Number(item.price),
  })).sort((a, b) => a.name.localeCompare(b.name) || a.price - b.price || a.quantity - b.quantity));
  const cartChanged = !!activeOrder && !cartLoading && !authLoading && (
    activeOrder.cartFingerprint !== undefined
      ? activeOrder.cartFingerprint !== cartFingerprint
      : summaryFingerprint(activeOrder.items) !== summaryFingerprint(currentSummary)
  );
  const showSavedOrder = !!activeOrder && !cartChanged;
  const total = showSavedOrder ? activeOrder.total ?? subtotal + DELIVERY_FEE : subtotal + DELIVERY_FEE;
  const displaySubtotal = showSavedOrder ? activeOrder.subtotal ?? subtotal : subtotal;
  const displayDeliveryFee = showSavedOrder ? activeOrder.deliveryFee ?? DELIVERY_FEE : DELIVERY_FEE;
  const summaryItems = showSavedOrder ? activeOrder.items : currentSummary;
  const isCartEmpty = items.length === 0;

  const startNewCheckout = async () => {
    const order = activeOrderRef.current;
    if (!order || !restored || cartLoading || authLoading || checking || submittingRef.current || isCartEmpty) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const status = await checkOrder(order);
      if (!status || status === "processing") return;
      // This leaves the old order in Orders; it does not cancel its payment.
      // Remove both keys so the next Place Order is a separate checkout.
      sessionStorage.removeItem(CHECKOUT_ORDER_STORAGE);
      sessionStorage.removeItem(CHECKOUT_ATTEMPT_STORAGE);
      setPreviousOrderId(status === "paid" ? null : order.orderId);
      activeOrderRef.current = null;
      setActiveOrder(null);
      setPaymentStatus("unknown");
      setPaymentMethod("cod");
      setPaymentError("");
      setShowConfirm(false);
      if (returnOrderId) window.history.replaceState(window.history.state, "", "/checkout");
    } catch {
      setPaymentError("Unable to leave this checkout. Please check again.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };
  const cancelOrder = async () => {
    const order = activeOrderRef.current;
    if (!order || !restored || checking || submittingRef.current) return;
    if (!window.confirm(`Cancel order #TA-${order.orderId}? Your current cart will be kept. Cancellation requires verification that the payment source is inactive.`)) return;
    const token = localStorage.getItem("token");
    if (!user || !token) { router.push("/login"); return; }
    submittingRef.current = true;
    setIsSubmitting(true);
    setPaymentError("");
    try {
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.orderId }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await res.json();
      if (!res.ok || result.paymentStatus !== "cancelled") {
        await checkOrder(order);
        throw new Error(result.error || "Cancellation could not be confirmed. Please check again.");
      }
      setPaymentStatus("cancelled");
      setShowConfirm(false);
      // Clear the old attempt so a future new checkout uses a fresh key.
      try { sessionStorage.removeItem(CHECKOUT_ATTEMPT_STORAGE); }
      catch { /* The cancelled order remains selected and blocks submission. */ }
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Cancellation could not be confirmed. Check its status before trying again.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === "phone" ? value.replace(/[^0-9]/g, "").slice(0, 11) : value }));
  };
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restored || cartLoading || authLoading || activeOrderRef.current || submittingRef.current || isCartEmpty || !isAddressComplete(address)) return;
    setShowConfirm(true);
  };

  const confirmOrder = async () => {
    if (!restored || cartLoading || authLoading || activeOrderRef.current || submittingRef.current) return;
    const token = localStorage.getItem("token");
    if (!user || !token) { router.push("/login"); return; }
    if (isCartEmpty || !isAddressComplete(address)) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setShowConfirm(false);
    let navigating = false;
    try {
      const orderPayload = {
        street: address.street.trim(), barangay: address.barangay?.name, saveAddress,
        city: address.city?.name,
        province: address.province?.level !== "Prov" && address.province?.reg === 13 ? "Metro Manila" : address.province?.name,
        paymentMethod, phone: formData.phone, fullName: formData.fullName,
      };
      const fingerprint = JSON.stringify({ accountEmail: user.email, orderPayload,
        items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity, price: item.product.price }))
          .sort((a, b) => String(a.productId).localeCompare(String(b.productId))),
      });
      let previous: { key?: string; fingerprint?: string } | null = null;
      try { previous = JSON.parse(sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE) || "null"); } catch { /* Replace malformed entry. */ }
      const requestKey = previous?.fingerprint === fingerprint && typeof previous.key === "string" ? previous.key : crypto.randomUUID();
      // Persist before POST, so an uncertain request can use the same key.
      sessionStorage.setItem(CHECKOUT_ATTEMPT_STORAGE, JSON.stringify({ key: requestKey, fingerprint }));
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Idempotency-Key": requestKey },
        body: JSON.stringify(orderPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to place order.");
      const orderId = Number(data.orderId);
      if (!Number.isSafeInteger(orderId) || orderId <= 0) throw new Error("Invalid order response.");
      if (paymentMethod === "cod") {
        clearCart();
        sessionStorage.removeItem(CHECKOUT_ATTEMPT_STORAGE);
        router.push(`/order-confirmation?orderId=${orderId}`);
        return;
      }
      const order: SavedOrder = {
        accountEmail: user.email, orderId, paymentMethod: paymentMethod === "grabpay" ? "grabpay" : "gcash",
        subtotal: Number(data.subtotal), deliveryFee: Number(data.deliveryFee), total: Number(data.total),
        items: items.map((item) => ({ name: item.product.name, quantity: item.quantity, price: item.product.price })),
        cartFingerprint,
      };
      // Remember the order BEFORE source creation, including when that fails.
      rememberOrder(order);
      setPaymentStatus(isPaymentStatus(data.paymentStatus) ? data.paymentStatus : "unknown");
      if (data.paymentStatus !== "paid" && data.paymentStatus !== "processing") {
        navigating = await startPayment(order, token);
      }
    } catch (error) {
      if (activeOrderRef.current) setPaymentStatus("unknown");
      setPaymentError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      if (!navigating) { submittingRef.current = false; setIsSubmitting(false); }
    }
  };

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <section className="max-w-6xl mx-auto px-6 md:px-8 py-16">
        <div className="mb-10">
          <p className="font-body text-xs uppercase tracking-[0.25em] text-sage mb-3">
            Checkout
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-charcoal mb-3">
            Complete your order
          </h1>
          <p className="font-body text-sm text-charcoal/70 max-w-2xl">
            {activeOrder && !cartChanged ? "Resume payment for your saved order." : "Enter your details and review your tea selection before placing the order."}
          </p>
        </div>
        {paymentError && (
          <div role="alert" className="mb-8 rounded-xl border border-red-300 bg-red-50 px-6 py-4 font-body text-sm text-charcoal">
            {paymentError}
          </div>
        )}
        {activeOrder && (
          <div aria-live="polite" className="mb-8 rounded-xl border border-sage/30 bg-sage/10 px-6 py-4 font-body text-sm text-charcoal">
            <p className="font-semibold">Order #TA-{activeOrder.orderId}</p>
            <p className="mt-2">{checking ? "Checking your payment..." :
              paymentStatus === "cancelled" ? "This order has been cancelled. Your current cart has been kept." :
              paymentStatus === "paid" ? "Payment confirmed. You can view your order." :
              paymentStatus === "processing" ? "Payment is being confirmed. Check its status before taking another action." :
              paymentStatus === "failed" ? "Payment failed or expired. Retry payment for this same order." :
              paymentStatus === "pending" ? "Your order is saved. Continue payment or check its status." :
              "Payment status is unavailable. Check again before resuming."}</p>
            {cartChanged ? (
              <p className="mt-2">Your cart has changed. The summary below shows your current cart. Start New Checkout uses these items; Continue Payment or Retry Payment pays for the saved order. View Order Details shows its original items.</p>
            ) : (
              <p className="mt-2">Choose Start New Checkout below to use your current cart. Payment actions apply to this saved order.</p>
            )}
            {paymentStatus !== "cancelled" && <p className="mt-2">Starting a new checkout leaves this order in your Orders list. It does not cancel the previous payment link.</p>}
            {!activeOrder.paymentMethod && <p className="mt-2">Open your Orders page if the payment method cannot be recovered.</p>}
          </div>
        )}
        {activeOrder && (
          <div className="-mt-4 mb-8 flex flex-wrap gap-x-6 gap-y-3 font-body text-sm">
            {(paymentStatus === "pending" || paymentStatus === "failed") && (
              <button type="button" onClick={() => void cancelOrder()}
                disabled={!restored || checking || isSubmitting}
                className="text-red-700 underline underline-offset-4 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-40">
                Cancel Order
              </button>
            )}
            {(paymentStatus === "pending" || paymentStatus === "failed" || paymentStatus === "cancelled") && (
              <button type="button" onClick={() => void startNewCheckout()}
                disabled={!restored || cartLoading || authLoading || checking || isSubmitting || isCartEmpty}
                className="text-sage underline underline-offset-4 hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-40">
                Start New Checkout
              </button>
            )}
          </div>
        )}
        {previousOrderId && !activeOrder && (
          <div className="mb-8 rounded-xl border border-sage/30 bg-sage/10 px-6 py-4 font-body text-sm text-charcoal">
            You are starting a separate order with your current cart. Previous order #TA-{previousOrderId} remains in your Orders list.
            <Link href={`/account/orders/${previousOrderId}`} className="ml-2 text-sage underline">View previous order</Link>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-10">
          <form
            id="checkout-form"
            onSubmit={handleFormSubmit}
            className="space-y-8"
          >
            <fieldset disabled={!!activeOrder || isSubmitting || !restored || cartLoading || authLoading} className={activeOrder ? "hidden" : "space-y-8 disabled:opacity-70"}>
            <div className="bg-cream border border-charcoal/10 rounded-2xl p-6 md:p-8">
              <h2 className="font-display text-2xl text-charcoal mb-6">
                Customer Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block font-body text-sm text-charcoal/70 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-charcoal/20 bg-cream px-4 py-3 font-body text-sm text-charcoal outline-none focus:border-sage"
                  />
                </div>
                <div>
                  <label className="block font-body text-sm text-charcoal/70 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    readOnly
                    aria-describedby="checkout-email-note"
                    required
                    className="w-full rounded-xl border border-charcoal/20 bg-sand/30 px-4 py-3 font-body text-sm text-charcoal outline-none focus:border-sage"
                  />
                  <p id="checkout-email-note" className="mt-2 font-body text-xs text-charcoal/60">
                    Your confirmation will be sent to your account email.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block font-body text-sm text-charcoal/70 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    maxLength={11}
                    className="w-full rounded-xl border border-charcoal/20 bg-cream px-4 py-3 font-body text-sm text-charcoal outline-none focus:border-sage"
                  />
                </div>
              </div>
            </div>
            <div className="bg-cream border border-charcoal/10 rounded-2xl p-6 md:p-8">
              <h2 className="font-display text-2xl text-charcoal mb-6">
                Delivery Address
              </h2>
              <PhAddressFields onChange={setAddress} />
              <label className="mt-5 flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                  className="accent-sage"
                />
                <span className="font-body text-sm text-charcoal/70">
                  Save this address to my profile
                </span>
              </label>
            </div>
            <div className="bg-cream border border-charcoal/10 rounded-2xl p-6 md:p-8">
              <h2 className="font-display text-2xl text-charcoal mb-6">
                Payment Method
              </h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 rounded-xl border border-charcoal/10 p-4 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    className="accent-sage"
                  />
                  <span className="font-body text-sm text-charcoal">
                    Cash on Delivery
                  </span>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-charcoal/10 p-4 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value="gcash"
                    checked={paymentMethod === "gcash"}
                    onChange={() => setPaymentMethod("gcash")}
                    className="accent-sage"
                  />
                  <span className="font-body text-sm text-charcoal">
                    GCash
                  </span>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-charcoal/10 p-4 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value="grabpay"
                    checked={paymentMethod === "grabpay"}
                    onChange={() => setPaymentMethod("grabpay")}
                    className="accent-sage"
                  />
                  <span className="font-body text-sm text-charcoal">
                    GrabPay
                  </span>
                </label>
              </div>
            </div>
            </fieldset>
          </form>
          <aside className="space-y-8">
            <div className="bg-sand/40 border border-charcoal/10 rounded-2xl p-6 md:p-8">
              <h2 className="font-display text-2xl text-charcoal mb-6">
                Order Summary
              </h2>
              {!showSavedOrder && isCartEmpty ? (
                <div className="text-center py-6">
                  <p className="font-body text-sm text-charcoal/70 mb-6">
                    Your cart is empty. Add a few teas before checking out.
                  </p>
                  <Link
                    href="/shop"
                    className="inline-block rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase px-8 py-4 hover:bg-charcoal transition-colors"
                  >
                    Browse Tea
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {summaryItems.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex items-start justify-between gap-3 border-b border-charcoal/10 pb-4"
                    >
                      <div>
                        <p className="font-body text-sm text-charcoal">
                          {item.name}
                        </p>
                        <p className="font-body text-xs uppercase tracking-wide text-charcoal/60 mt-1">
                          Qty {item.quantity}
                        </p>
                      </div>
                      <p className="font-body text-sm text-charcoal">
                        ₱{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 space-y-3 border-t border-charcoal/10 pt-6">
                <div className="flex justify-between font-body text-sm text-charcoal/70">
                  <span>Subtotal</span>
                  <span>{showSavedOrder && activeOrder.subtotal === null ? "Unavailable" : `₱${displaySubtotal.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between font-body text-sm text-charcoal/70">
                  <span>Delivery Fee</span>
                  <span>{showSavedOrder && activeOrder.deliveryFee === null ? "Unavailable" : `₱${displayDeliveryFee.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between font-display text-lg text-charcoal pt-3 border-t border-charcoal/10">
                  <span>Total Amount</span>
                  <span>{showSavedOrder && activeOrder.total === null ? "Unavailable" : `₱${total.toFixed(2)}`}</span>
                </div>
              </div>
              {activeOrder ? (
                <div className="mt-8 space-y-3">
                  <button
                    type="button"
                    disabled={!restored || cartLoading || authLoading || isSubmitting || checking}
                    onClick={() => {
                      if (paymentStatus === "cancelled") router.push(`/account/orders/${activeOrder.orderId}`);
                      else if (paymentStatus === "paid") viewOrder();
                      else if (!activeOrder.paymentMethod && paymentStatus !== "processing") window.location.reload();
                      else void handleExistingPayment(
                        !cartChanged && !!activeOrder.paymentMethod && (paymentStatus === "pending" || paymentStatus === "failed")
                      );
                    }}
                    className="w-full rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors disabled:cursor-not-allowed disabled:bg-charcoal/30"
                  >
                    {!restored || cartLoading || authLoading || checking ? "Checking..." : isSubmitting ? "Processing..." :
                      paymentStatus === "cancelled" ? "View Order" :
                      cartChanged && (paymentStatus === "pending" || paymentStatus === "failed") ? "Check Status" :
                      paymentStatus === "paid" ? "View Order" :
                      paymentStatus === "processing" ? "Check Status" :
                      !activeOrder.paymentMethod ? "Reload Order Details" :
                      paymentStatus === "unknown" ? "Check Again" :
                      paymentStatus === "failed" ? "Retry Payment" : "Continue Payment"}
                  </button>
                  {(paymentStatus === "pending" || paymentStatus === "failed") && (
                    <button type="button" disabled={!restored || checking || isSubmitting}
                      onClick={() => void handleExistingPayment(false)}
                      className="w-full rounded-full border border-charcoal/20 text-charcoal font-body text-sm py-3 disabled:opacity-50">
                      Check Status
                    </button>
                  )}
                  <Link href={`/account/orders/${activeOrder.orderId}`} className="block text-center font-body text-sm text-sage underline">
                    View Order Details
                  </Link>
                </div>
              ) : (
                <button type="submit" form="checkout-form"
                  disabled={!restored || cartLoading || authLoading || isCartEmpty || isSubmitting}
                  className="w-full mt-8 rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors disabled:cursor-not-allowed disabled:bg-charcoal/30">
                  {!restored || cartLoading || authLoading ? "Checking..." : isSubmitting ? "Processing..." : "Place Order"}
                </button>
              )}
            </div>
          </aside>
        </div>
      </section>
      {showConfirm && (
        <div className="fixed inset-0 bg-charcoal/40 flex items-center justify-center z-[100] p-6">
          <div className="bg-cream border border-charcoal/10 rounded-2xl p-8 max-w-sm w-full text-center">
            <p className="font-body text-sm text-charcoal mb-6">
              Are you sure you want to check out?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-full border border-charcoal/20 text-charcoal font-body text-sm py-3 hover:bg-sand/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmOrder}
                disabled={isSubmitting}
                className="flex-1 rounded-full bg-sage text-cream font-body text-sm py-3 hover:bg-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </main>
  );
}
export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <CheckoutContent />
    </Suspense>
  );
}
