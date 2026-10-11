export type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type Entry = {
  message: HTMLParagraphElement;
  target: HTMLElement;
  invalid: string | null;
};
let formNumber = 0;

function isField(element: Element): element is Field {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

function messageFor(field: Field) {
  if (!field.willValidate) return "";
  const validity = field.validity;
  if (validity.valueMissing) return "Please fill in this field.";
  if (validity.typeMismatch)
    return field instanceof HTMLInputElement && field.type === "email"
      ? "Enter a valid email address."
      : "Enter a valid value.";
  if (validity.badInput) return "Enter a valid number.";
  if (validity.patternMismatch)
    return field.title || "Use the requested format.";
  if (validity.rangeUnderflow)
    return `Enter a value of at least ${(field as HTMLInputElement).min}.`;
  if (validity.rangeOverflow)
    return `Enter a value no greater than ${(field as HTMLInputElement).max}.`;
  if (validity.stepMismatch) return "Enter a value in the allowed increments.";
  if (validity.customError) return field.validationMessage;
  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement
  ) {
    if (
      field.value &&
      field.minLength > 0 &&
      field.value.length < field.minLength
    )
      return `Use at least ${field.minLength} characters.`;
    if (field.maxLength >= 0 && field.value.length > field.maxLength)
      return `Use no more than ${field.maxLength} characters.`;
  }
  return validity.valid ? "" : "Check this field and try again.";
}

export function createFormValidator(
  form: HTMLFormElement,
  validateField?: (field: Field) => string | null,
) {
  const prefix = `form-validation-${++formNumber}`;
  let number = 0;
  const entries = new Map<Field, Entry>();
  const touched = new Set<Field>();
  const fields = () =>
    Array.from(form.elements).filter((element): element is Field =>
      isField(element),
    );

  function remove(field: Field, entry: Entry) {
    entry.message.remove();
    const descriptions = (entry.target.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter((id) => id && id !== entry.message.id);
    if (descriptions.length)
      entry.target.setAttribute("aria-describedby", descriptions.join(" "));
    else entry.target.removeAttribute("aria-describedby");
    if (entry.invalid === null) entry.target.removeAttribute("aria-invalid");
    else entry.target.setAttribute("aria-invalid", entry.invalid);
    entry.target.removeAttribute("data-validation-invalid");
    entries.delete(field);
    touched.delete(field);
  }

  function ensure(field: Field): Entry {
    const existing = entries.get(field);
    if (existing) return existing;
    const parent = field.parentElement;
    const proxy =
      field.getAttribute("aria-hidden") === "true"
        ? parent?.querySelector<HTMLElement>('[role="combobox"]')
        : null;
    const target = proxy || field;
    const toggleWrapper = parent?.classList.contains("relative");
    const choiceLabel =
      field instanceof HTMLInputElement &&
      ["checkbox", "radio"].includes(field.type)
        ? field.closest("label")
        : null;
    const anchor = choiceLabel || (toggleWrapper ? parent : field);
    const message = document.createElement("p");
    message.id = `${prefix}-${++number}`;
    message.className =
      "mt-1 min-h-4 font-body text-xs leading-4 text-red-700 dark:text-red-300";
    message.setAttribute("aria-live", "polite");
    anchor?.insertAdjacentElement("afterend", message);
    const entry = {
      message,
      target,
      invalid: target.getAttribute("aria-invalid"),
    };
    target.setAttribute(
      "aria-describedby",
      [target.getAttribute("aria-describedby"), message.id]
        .filter(Boolean)
        .join(" "),
    );
    entries.set(field, entry);
    return entry;
  }

  function update(field: Field) {
    const message = field.willValidate
      ? messageFor(field) || validateField?.(field) || ""
      : "";
    const entry = entries.get(field) || (message ? ensure(field) : null);
    if (!entry) return message;
    if (entry.message.textContent !== message)
      entry.message.textContent = message;
    if (message) {
      entry.target.setAttribute("aria-invalid", "true");
      entry.target.setAttribute("data-validation-invalid", "true");
    } else {
      if (entry.invalid === null) entry.target.removeAttribute("aria-invalid");
      else entry.target.setAttribute("aria-invalid", entry.invalid);
      entry.target.removeAttribute("data-validation-invalid");
    }
    return message;
  }

  function sync() {
    for (const [field, entry] of entries)
      if (!form.contains(field)) remove(field, entry);
    for (const field of fields()) {
      if (field.required && field.willValidate) ensure(field);
      if (touched.has(field)) update(field);
    }
  }

  sync();
  const observer = new MutationObserver(sync);
  observer.observe(form, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "disabled",
      "required",
      "value",
      "min",
      "max",
      "minlength",
      "maxlength",
      "pattern",
    ],
  });

  return {
    validate() {
      sync();
      let firstInvalid: Field | undefined;
      for (const field of fields()) {
        touched.add(field);
        if (update(field) && !firstInvalid) firstInvalid = field;
      }
      if (firstInvalid) entries.get(firstInvalid)?.target.focus();
      return !firstInvalid;
    },
    blur(target: EventTarget | null, relatedTarget: EventTarget | null) {
      if (!(target instanceof Element)) return;
      const field = isField(target)
        ? target
        : Array.from(entries).find(([, entry]) => entry.target === target)?.[0];
      if (
        !field ||
        (relatedTarget instanceof Node &&
          field.parentElement?.contains(relatedTarget))
      )
        return;
      touched.add(field);
      update(field);
    },
    change() {
      sync();
    },
    reset() {
      touched.clear();
      for (const entry of entries.values()) {
        entry.message.textContent = "";
        entry.target.removeAttribute("data-validation-invalid");
        if (entry.invalid === null)
          entry.target.removeAttribute("aria-invalid");
        else entry.target.setAttribute("aria-invalid", entry.invalid);
      }
    },
    dispose() {
      observer.disconnect();
      for (const [field, entry] of entries) remove(field, entry);
    },
  };
}
