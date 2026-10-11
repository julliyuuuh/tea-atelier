"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

import {
  getPasswordError,
  PASSWORD_HINT,
  PASSWORD_MIN_LENGTH,
} from "@/lib/password-policy";

type SignupField =
  | "firstName"
  | "lastName"
  | "email"
  | "password"
  | "confirmPassword";
type FieldErrors = Partial<Record<SignupField, string>>;

export default function SignupPage() {
  const { login } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function validateField(
    field: SignupField,
    value: string,
    emailInvalid = false,
    currentPassword = password,
  ) {
    if (!value.trim()) {
      const prompts: Record<SignupField, string> = {
        firstName: "Enter your first name.",
        lastName: "Enter your last name.",
        email: "Enter your email.",
        password: "Enter a password.",
        confirmPassword: "Confirm your password.",
      };
      return prompts[field];
    }
    if (field === "email" && emailInvalid)
      return "Enter a valid email address.";
    if (field === "password") {
      const error = getPasswordError(value);
      if (error === PASSWORD_HINT)
        return "Use 8+ characters, A-Z, a-z and a number.";
      return error || "";
    }
    if (field === "confirmPassword" && value !== currentPassword)
      return "Passwords don't match.";
    return "";
  }

  function blurField(
    field: SignupField,
    event: React.FocusEvent<HTMLInputElement>,
  ) {
    const error = validateField(
      field,
      event.currentTarget.value,
      event.currentTarget.validity.typeMismatch,
    );
    setFieldErrors((previous) => ({ ...previous, [field]: error }));
  }

  function changeField(
    field: SignupField,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const input = event.currentTarget;
    const value = input.value;
    const setters = {
      firstName: setFirstName,
      lastName: setLastName,
      email: setEmail,
      password: setPassword,
      confirmPassword: setConfirmPassword,
    };
    setters[field](value);
    setFieldErrors((previous) => {
      const next = { ...previous };
      if (field in previous)
        next[field] = validateField(field, value, input.validity.typeMismatch);
      if (field === "password" && "confirmPassword" in previous)
        next.confirmPassword = validateField(
          "confirmPassword",
          confirmPassword,
          false,
          value,
        );
      return next;
    });
  }

  function fieldError(field: SignupField) {
    return (
      <p
        id={`signup-${field}-error`}
        aria-live="polite"
        className="mt-1 min-h-4 font-body text-xs leading-4 text-red-700 dark:text-red-300"
      >
        {fieldErrors[field] || ""}
      </p>
    );
  }

  function inputClass(field: SignupField, padding = "px-4") {
    return `w-full rounded-xl border-[2px] bg-transparent ${padding} py-3 font-body text-sm text-charcoal focus:outline-none transition-colors ${fieldErrors[field] ? "border-red-700/60 focus:border-red-700 dark:border-red-300/60" : "border-charcoal/20 focus:border-sage"}`;
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/[^0-9]/g, "").slice(0, 11);
    setPhoneNumber(digitsOnly);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const form = e.currentTarget as HTMLFormElement;
    const values = { firstName, lastName, email, password, confirmPassword };
    const nextErrors: FieldErrors = {};
    for (const field of Object.keys(values) as SignupField[]) {
      const input = form.elements.namedItem(field) as HTMLInputElement | null;
      nextErrors[field] = validateField(
        field,
        values[field],
        input?.validity.typeMismatch,
      );
    }
    setFieldErrors(nextErrors);
    const firstInvalid = (Object.keys(values) as SignupField[]).find(
      (field) => nextErrors[field],
    );
    if (firstInvalid) {
      (
        form.elements.namedItem(firstInvalid) as HTMLInputElement | null
      )?.focus();
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phoneNumber,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed.");

      login(data.token, data.user);
      window.location.href = "/";
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2 relative">
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 font-body text-sm text-charcoal/70 hover:text-charcoal bg-cream/90 backdrop-blur rounded-full px-4 py-2 transition-colors md:text-cream/90 md:hover:text-cream md:bg-charcoal/20"
      >
        <ArrowLeft size={16} /> Back to Home
      </Link>

      {/* Left: photo panel */}
      <div className="relative hidden md:block">
        <img
          src="/images/login-photo.jpg"
          alt="Tea Atelier"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-transparent" />
        <div className="relative z-10 h-full flex flex-col justify-end p-12 text-cream">
          <span className="font-display text-3xl mb-2">Tea Atelier</span>
          <span className="font-body text-sm text-cream/80">
            Where every leaf tells a story
          </span>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-6 pb-8 pt-20 md:px-8 md:py-8 bg-cream">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Link
            href="/"
            className="font-display text-2xl text-charcoal block text-center mb-6 md:hidden"
          >
            Tea Atelier
          </Link>

          <h1 className="font-display text-3xl text-charcoal text-center mb-2">
            Create Your Account
          </h1>
          <p className="font-body text-sm text-charcoal/60 text-center mb-5">
            Join us for early access to seasonal blends
          </p>

          {errorMessage && (
            <p
              className="font-body text-sm text-red-600 text-center mb-4"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <form noValidate onSubmit={handleSubmit} className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="min-w-0">
                <label
                  htmlFor="signup-firstName"
                  className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-1.5"
                >
                  First Name
                </label>
                <input
                  id="signup-firstName"
                  aria-describedby="signup-firstName-error"
                  type="text"
                  required
                  name="firstName"
                  aria-invalid={!!fieldErrors.firstName}
                  onBlur={(e) => blurField("firstName", e)}
                  value={firstName}
                  onChange={(e) => changeField("firstName", e)}
                  className={inputClass("firstName")}
                />
                {fieldError("firstName")}
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="signup-lastName"
                  className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-1.5"
                >
                  Last Name
                </label>
                <input
                  id="signup-lastName"
                  aria-describedby="signup-lastName-error"
                  type="text"
                  required
                  name="lastName"
                  aria-invalid={!!fieldErrors.lastName}
                  onBlur={(e) => blurField("lastName", e)}
                  value={lastName}
                  onChange={(e) => changeField("lastName", e)}
                  className={inputClass("lastName")}
                />
                {fieldError("lastName")}
              </div>
            </div>

            <div>
              <label
                htmlFor="signup-email"
                className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-1.5"
              >
                Email
              </label>
              <input
                id="signup-email"
                aria-describedby="signup-email-error"
                type="email"
                required
                name="email"
                aria-invalid={!!fieldErrors.email}
                onBlur={(e) => blurField("email", e)}
                value={email}
                onChange={(e) => changeField("email", e)}
                className={inputClass("email")}
              />
              {fieldError("email")}
            </div>

            <div>
              <label className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-1.5">
                Phone Number{" "}
                <span className="normal-case text-charcoal/40">(optional)</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                maxLength={11}
                className="w-full rounded-xl border-[2px] border-charcoal/20 bg-transparent px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
              />
            </div>

            <div>
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-4">
                <div className="min-w-0">
                  <label
                    htmlFor="signup-password"
                    className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={PASSWORD_MIN_LENGTH}
                      id="signup-password"
                      aria-describedby="signup-password-hint signup-password-error"
                      required
                      name="password"
                      aria-invalid={!!fieldErrors.password}
                      onBlur={(e) => blurField("password", e)}
                      value={password}
                      onChange={(e) => changeField("password", e)}
                      className={inputClass("password", "pl-4 pr-12")}
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Hide passwords" : "Show passwords"
                      }
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-charcoal/60 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                    >
                      {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                  {fieldError("password")}
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="signup-confirmPassword"
                    className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="signup-confirmPassword"
                    aria-describedby="signup-confirmPassword-error"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
                    required
                    name="confirmPassword"
                    aria-invalid={!!fieldErrors.confirmPassword}
                    onBlur={(e) => blurField("confirmPassword", e)}
                    value={confirmPassword}
                    onChange={(e) => changeField("confirmPassword", e)}
                    className={inputClass("confirmPassword")}
                  />
                  {fieldError("confirmPassword")}
                </div>
              </div>
              <p
                id="signup-password-hint"
                className="mt-3 font-body text-xs leading-relaxed text-charcoal/60"
              >
                {PASSWORD_HINT}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-3 hover:bg-charcoal transition-colors disabled:opacity-50"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="font-body text-sm text-charcoal/60 text-center mt-5">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-sage hover:text-charcoal transition-colors"
            >
              Log in
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
