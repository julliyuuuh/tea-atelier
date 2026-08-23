"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";

type FormFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
};


export default function FormField({
  label,
  value,
  onChange,
  type = "text",
  required,
  disabled,
  hint,
  inputMode,
  maxLength,
}: FormFieldProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);

  return (
    <div>
      <motion.label
        htmlFor={id}
        animate={{ color: focused ? "var(--color-sage, #8A9A7E)" : undefined }}
        className={`font-body text-xs tracking-wide uppercase block mb-2 ${
          focused ? "text-sage" : "text-charcoal/60"
        }`}
      >
        {label}
      </motion.label>
      <motion.input
        id={id}
        type={type}
        required={required}
        disabled={disabled}
        inputMode={inputMode}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        animate={{
          borderColor: focused ? "rgba(138,154,126,0.9)" : "rgba(41,37,36,0.2)",
          boxShadow: focused ? "0 0 0 3px rgba(138,154,126,0.15)" : "0 0 0 0px rgba(138,154,126,0)",
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`w-full rounded-xl border px-4 py-3 font-body text-sm text-charcoal outline-none ${
          disabled ? "text-charcoal/50 bg-sand/20 cursor-not-allowed" : ""
        }`}
      />
      {hint && <p className="font-body text-xs text-charcoal/40 mt-1.5">{hint}</p>}
    </div>
  );
}