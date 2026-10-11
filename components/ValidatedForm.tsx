"use client";

import { useId, useState, type ComponentProps, type SubmitEvent } from "react";
import { AlertCircle } from "lucide-react";

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type Issue = { field: Field; label: string; message: string };

function fieldLabel(field: Field) {
  const label =
    field.labels?.[0] || field.parentElement?.querySelector("label");
  return (
    field.getAttribute("aria-label") ||
    label?.textContent?.trim().replace(/\s+/g, " ") ||
    field.name ||
    "Field"
  );
}

function collectIssues(form: HTMLFormElement): Issue[] {
  return Array.from(form.elements).flatMap((element) => {
    if (
      !(
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      ) ||
      !element.willValidate
    )
      return [];
    const field = element;
    const validity = field.validity;
    let message = "";
    if (validity.valueMissing) message = "Please fill in this field.";
    else if (validity.typeMismatch)
      message =
        field instanceof HTMLInputElement && field.type === "email"
          ? "Enter a valid email address."
          : "Enter a valid value.";
    else if (validity.badInput) message = "Enter a valid number.";
    else if (validity.patternMismatch)
      message = field.title || "Use the requested format.";
    else if (validity.rangeUnderflow)
      message = `Enter a value of at least ${(field as HTMLInputElement).min}.`;
    else if (validity.rangeOverflow)
      message = `Enter a value no greater than ${(field as HTMLInputElement).max}.`;
    else if (validity.stepMismatch)
      message = "Enter a value in the allowed increments.";
    else if (validity.customError) message = field.validationMessage;
    else if (
      (field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement) &&
      field.value &&
      field.minLength > 0 &&
      field.value.length < field.minLength
    )
      message = `Use at least ${field.minLength} characters.`;
    else if (
      (field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement) &&
      field.maxLength >= 0 &&
      field.value.length > field.maxLength
    )
      message = `Use no more than ${field.maxLength} characters.`;
    else if (!validity.valid) message = "Check this field and try again.";
    return message ? [{ field, label: fieldLabel(field), message }] : [];
  });
}

export default function ValidatedForm({
  children,
  onSubmit,
  onChange,
  onReset,
  ...props
}: ComponentProps<"form">) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const headingId = useId();

  function submit(event: SubmitEvent<HTMLFormElement>) {
    const nextIssues = collectIssues(event.currentTarget);
    setIssues(nextIssues);
    if (nextIssues.length) {
      event.preventDefault();
      nextIssues[0].field.focus();
      return;
    }
    onSubmit?.(event);
  }

  return (
    <form
      {...props}
      noValidate
      onSubmit={submit}
      onChange={(event) => {
        if (issues.length) setIssues(collectIssues(event.currentTarget));
        onChange?.(event);
      }}
      onReset={(event) => {
        setIssues([]);
        onReset?.(event);
      }}
    >
      {issues.length > 0 && (
        <div
          role="alert"
          aria-labelledby={headingId}
          className="rounded-xl border border-red-700/20 bg-red-700/5 p-3 font-body text-sm text-charcoal"
        >
          <p id={headingId} className="flex items-center gap-2 font-medium">
            <AlertCircle
              size={16}
              className="shrink-0 text-red-700"
              aria-hidden="true"
            />
            Please check these details
          </p>
          <ul className="mt-2 space-y-1">
            {issues.map(({ field, label, message }, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => field.focus()}
                  className="cursor-pointer rounded text-left text-charcoal/80 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                >
                  <span className="font-medium">{label}:</span> {message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {children}
    </form>
  );
}
