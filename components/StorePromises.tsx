"use client";

import { motion } from "framer-motion";
import { Truck, Clock, Wallet, ShieldCheck } from "lucide-react";
import DisplayPrice from "@/components/DisplayPrice";
import { useStoreSettings } from "@/lib/store-settings-context";
import { PAYMENT_OPTIONS, type PaymentOption } from "@/lib/store-settings";

// Every line here comes from the admin's store settings, so the strip never
// promises something checkout won't honour.
export default function StorePromises() {
  const { settings, ready } = useStoreSettings();
  if (!ready) return null;

  const threshold = settings.freeShippingThresholdCents;
  const delivery = settings.shipping.standard.enabled
    ? settings.shipping.standard
    : settings.shipping.express.enabled
      ? settings.shipping.express
      : null;
  const payments = (Object.keys(PAYMENT_OPTIONS) as PaymentOption[])
    .filter((key) => settings.payments[key])
    .map((key) => (key === "card" ? "Card" : PAYMENT_OPTIONS[key]));

  const items = [
    threshold !== null && {
      icon: Truck,
      title: "Free shipping",
      copy: (
        <>
          On orders over <DisplayPrice pesos={threshold / 100} />
        </>
      ),
    },
    delivery && {
      icon: Clock,
      title: "Delivered in",
      copy: delivery.estimate,
    },
    payments.length > 0 && {
      icon: Wallet,
      title: "Pay your way",
      copy: payments.join(" · "),
    },
    {
      icon: ShieldCheck,
      title: "Secure checkout",
      copy: "Online payments secured by PayMongo",
    },
  ].filter((item) => !!item);

  return (
    <section aria-label="Store promises" className="max-w-7xl mx-auto px-8">
      <motion.ul
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-charcoal/20"
      >
        {items.map(({ icon: Icon, title, copy }, i) => (
          <li
            key={title}
            className={`flex items-start gap-4 py-6 lg:px-6 ${
              i !== 0 ? "border-t sm:border-t-0 lg:border-l border-charcoal/10" : ""
            } ${i === 0 ? "lg:pl-0" : ""}`}
          >
            <Icon
              aria-hidden="true"
              strokeWidth={1.5}
              className="mt-0.5 h-5 w-5 shrink-0 text-sage"
            />
            <div>
              <p className="font-body text-[11px] tracking-[0.2em] uppercase text-charcoal">
                {title}
              </p>
              <p className="font-body text-sm text-charcoal/60 mt-1">{copy}</p>
            </div>
          </li>
        ))}
      </motion.ul>
    </section>
  );
}
