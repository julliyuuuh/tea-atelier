"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { createFormValidator, type Field } from "@/lib/form-validation";

export default function ValidatedForm({
  children,
  onSubmit,
  onChange,
  onBlurCapture,
  onReset,
  ref,
  validateField,
  ...props
}: ComponentProps<"form"> & {
  validateField?: (field: Field) => string | null;
}) {
  const customValidator = useRef(validateField);
  useEffect(() => {
    customValidator.current = validateField;
  }, [validateField]);
  const formRef = useRef<HTMLFormElement | null>(null);
  const validator = useRef<ReturnType<typeof createFormValidator> | null>(null);

  useEffect(() => {
    if (!formRef.current) return;
    const instance =
      validator.current ||
      createFormValidator(
        formRef.current,
        (field) => customValidator.current?.(field) || "",
      );
    validator.current = instance;
    return () => {
      instance.dispose();
      validator.current = null;
    };
  }, []);

  return (
    <form
      {...props}
      ref={(node) => {
        formRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      noValidate
      onSubmit={(event) => {
        if (!validator.current && formRef.current)
          validator.current = createFormValidator(
            formRef.current,
            (field) => customValidator.current?.(field) || "",
          );
        if (validator.current && !validator.current.validate()) {
          event.preventDefault();
          return;
        }
        onSubmit?.(event);
      }}
      onBlurCapture={(event) => {
        validator.current?.blur(event.target, event.relatedTarget);
        onBlurCapture?.(event);
      }}
      onChange={(event) => {
        validator.current?.change();
        onChange?.(event);
      }}
      onReset={(event) => {
        validator.current?.reset();
        onReset?.(event);
      }}
    >
      {children}
    </form>
  );
}
