"use client";

import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PhAddressFields, {
  PhAddress,
  isAddressComplete,
} from "@/components/checkout/PhAddressFields";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";

const deliveryFee = 5;

function CheckoutContent() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [address, setAddress] = useState<PhAddress>({
    province: null,
    city: null,
    barangay: null,
    street: "",
  });

  const paymentFailed = searchParams.get("payment") === "failed";
  const failedOrderId = searchParams.get("orderId");

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: user.email,
      }));
    }
  }, [user]);

  const total = subtotal + deliveryFee;
  const isCartEmpty = items.length === 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const digitsOnly = value.replace(/[^0-9]/g, "").slice(0, 11);
      setFormData((prev) => ({ ...prev, phone: digitsOnly }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddressComplete(address)) return;
    setShowConfirm(true);
  };

  const confirmOrder = async () => {
    setShowConfirm(false);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          street: address.street.trim(),
          barangay: address.barangay?.name,
          city: address.city?.name,
          // NCR cities sit at province level in PSGC, so show "Metro Manila"
          province:
            address.province?.level !== "Prov" && address.province?.reg === 13
              ? "Metro Manila"
              : address.province?.name,
          deliveryFee,
          paymentMethod,
          phone: formData.phone,
          fullName: formData.fullName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Unable to place order.");
        return;
      }

      if (paymentMethod === "cod") {
        clearCart();
        router.push(`/order-confirmation?orderId=${data.orderId}`);
      } else {
        const src = await fetch("/api/payments/paymongo/source", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            orderId: data.orderId,
            amount: data.total,
            type: paymentMethod,
          }),
        });
        const srcData = await src.json();
        if (!src.ok) {
          alert(srcData.error || "Payment initiation failed.");
          return;
        }
        window.location.href = srcData.checkoutUrl;
      }
    } catch {
      alert("Something went wrong. Please try again.");
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
            Enter your details and review your tea selection before placing the
            order.
          </p>
        </div>

        {paymentFailed && (
          <div className="mb-8 rounded-xl border border-red-300 bg-red-50 px-6 py-4">
            <p className="font-body text-sm text-charcoal/80">
              Your payment didn't go through
              {failedOrderId ? ` for order #TA-${failedOrderId}` : ""}. Your
              cart items are still saved below, feel free to try again.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-10">
          <form
            id="checkout-form"
            onSubmit={handleFormSubmit}
            className="space-y-8"
          >
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
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-charcoal/20 bg-cream px-4 py-3 font-body text-sm text-charcoal outline-none focus:border-sage"
                  />
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
          </form>

          <aside className="space-y-8">
            <div className="bg-sand/40 border border-charcoal/10 rounded-2xl p-6 md:p-8">
              <h2 className="font-display text-2xl text-charcoal mb-6">
                Order Summary
              </h2>

              {isCartEmpty ? (
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
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-start justify-between gap-3 border-b border-charcoal/10 pb-4"
                    >
                      <div>
                        <p className="font-body text-sm text-charcoal">
                          {item.product.name}
                        </p>
                        <p className="font-body text-xs uppercase tracking-wide text-charcoal/60 mt-1">
                          Qty {item.quantity}
                        </p>
                      </div>
                      <p className="font-body text-sm text-charcoal">
                        ₱{(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 space-y-3 border-t border-charcoal/10 pt-6">
                <div className="flex justify-between font-body text-sm text-charcoal/70">
                  <span>Subtotal</span>
                  <span>₱{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-body text-sm text-charcoal/70">
                  <span>Delivery Fee</span>
                  <span>₱{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-display text-lg text-charcoal pt-3 border-t border-charcoal/10">
                  <span>Total Amount</span>
                  <span>₱{total.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={isCartEmpty}
                className="w-full mt-8 rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors disabled:cursor-not-allowed disabled:bg-charcoal/30"
              >
                Place Order
              </button>
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
                className="flex-1 rounded-full bg-sage text-cream font-body text-sm py-3 hover:bg-charcoal transition-colors"
              >
                Confirm
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