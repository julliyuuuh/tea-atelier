"use client";
import { useEffect, useRef } from "react";
import ConfirmDialog from "@/components/account/ConfirmDialog";
export default function OrderStatusConfirmation({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: { orderId: number; status: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pending) return;
    const previous = document.activeElement as HTMLElement | null;
    root.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onCancel();
      }
      if (event.key === "Tab") {
        const buttons =
          root.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!buttons?.length) return;
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("keydown", key, true);
      if (previous?.isConnected) previous.focus();
    };
  }, [pending, onCancel]);
  const delivered = pending?.status === "DELIVERED";
  return (
    <div ref={root} className="contents">
      <ConfirmDialog
        open={pending !== null}
        title={
          delivered ? "Mark this order as delivered?" : "Cancel this order?"
        }
        description={
          pending
            ? `Order #TA-${pending.orderId} will be marked ${delivered ? "Delivered" : "Cancelled"}. This status is final and cannot be changed afterward.${delivered ? " Confirm the customer has received the order." : " Cancelling a paid order does not issue a refund; manage any refund separately."}`
            : undefined
        }
        confirmLabel={delivered ? "Mark delivered" : "Cancel order"}
        cancelLabel="Keep current status"
        destructive={!delivered}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </div>
  );
}
