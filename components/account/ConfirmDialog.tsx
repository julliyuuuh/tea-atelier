"use client";

import { motion, AnimatePresence } from "framer-motion";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 bg-charcoal/40 flex items-center justify-center z-[100] p-6"
          onClick={onCancel}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={{ opacity: 0, scale: 0.94, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-cream border border-charcoal/10 rounded-2xl p-8 max-w-sm w-full text-center shadow-xl shadow-charcoal/10"
          >
            <p id="confirm-dialog-title" className="font-body text-sm text-charcoal mb-1.5">
              {title}
            </p>
            {description && (
              <p className="font-body text-xs text-charcoal/50 mb-6">{description}</p>
            )}
            <div className={`flex gap-3 ${description ? "" : "mt-6"}`}>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onCancel}
                className="flex-1 rounded-full border border-charcoal/20 text-charcoal font-body text-sm py-3 hover:bg-sand/30 transition-colors"
              >
                {cancelLabel}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onConfirm}
                className={`flex-1 rounded-full font-body text-sm py-3 transition-colors text-cream ${
                  destructive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-sage hover:bg-charcoal"
                }`}
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}