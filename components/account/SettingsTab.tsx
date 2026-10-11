"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Globe,
  KeyRound,
  Loader2,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useStoreSettings } from "@/lib/store-settings-context";
import ConfirmDialog from "@/components/account/ConfirmDialog";
import MarketingPreference from "@/components/account/MarketingPreference";

const actionClass =
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-charcoal/20 px-4 py-2 font-body text-xs text-charcoal transition-colors hover:bg-sand/30 focus-visible:outline-2 focus-visible:outline-sage disabled:cursor-not-allowed disabled:opacity-50";
const primaryClass =
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-sage px-5 py-2 font-body text-xs text-white transition-colors hover:bg-charcoal focus-visible:outline-2 focus-visible:outline-sage focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function SettingsCard({
  title,
  icon: Icon,
  children,
  badge,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-charcoal/5 bg-sand/25 p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage/10 text-sage">
          <Icon size={18} aria-hidden="true" />
        </span>
        <h3 className="font-display text-lg text-charcoal">{title}</h3>
        {badge && <span className="ml-auto">{badge}</span>}
      </div>
      {children}
    </section>
  );
}

export default function SettingsTab({
  onEditProfile,
}: {
  onEditProfile: () => void;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const {
    settings,
    ready,
    error: currencyError,
    currency,
    setCurrency,
  } = useStoreSettings();
  const [activeSection, setActiveSection] = useState<
    "account" | "security" | "appearance" | "emails" | "privacy"
  >("account");
  const [emailVisited, setEmailVisited] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [statusRefresh, setStatusRefresh] = useState(0);
  const [setupStep, setSetupStep] = useState<"idle" | "scanning">("idle");
  const [qrCode, setQrCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  const handleUnauthorized = useCallback(() => {
    logout();
    router.push("/login");
  }, [logout, router]);
  // Only the security status needs loading; appearance and account details remain usable.
  useEffect(() => {
    const controller = new AbortController();
    async function loadStatus() {
      try {
        const response = await fetch("/api/2fa/status", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          signal: controller.signal,
        });
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        const data = await response.json();
        if (!response.ok || typeof data.enabled !== "boolean")
          throw new Error("Unable to load your security settings.");
        if (!controller.signal.aborted) {
          setTotpEnabled(data.enabled);
          setStatusError("");
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setStatusError(
            error instanceof Error
              ? error.message
              : "Unable to load your security settings.",
          );
      } finally {
        if (!controller.signal.aborted) setIsLoadingStatus(false);
      }
    }
    void loadStatus();
    return () => controller.abort();
    // Auth context recreates logout when user details change; security status is loaded on mount or explicit retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusRefresh]);

  async function securityAction(path: string, body?: { code: string }) {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error("Please sign in again.");
    }
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Unable to update your security settings.");
    return data;
  }
  async function resendVerification() {
    setShowResendConfirm(false);
    setResendLoading(true);
    setResendMessage("");
    setResendError("");
    try {
      await securityAction("/api/resend-verification");
      setResendMessage("A new verification link has been sent to your email.");
    } catch (error) {
      setResendError(
        error instanceof Error
          ? error.message
          : "Unable to send verification email.",
      );
    } finally {
      setResendLoading(false);
    }
  }
  async function startSetup() {
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const data = await securityAction("/api/2fa/setup");
      setQrCode(data.qrCode);
      setSetupStep("scanning");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to start setup.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }
  async function confirmSetup(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      await securityAction("/api/2fa/confirm", { code: confirmCode });
      setTotpEnabled(true);
      setSetupStep("idle");
      setConfirmCode("");
      setQrCode("");
      setSuccessMessage("Two-factor authentication is now enabled.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to verify code.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }
  async function disable2FA() {
    setShowDisableConfirm(false);
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await securityAction("/api/2fa/disable");
      setTotpEnabled(false);
      setSuccessMessage("Two-factor authentication has been disabled.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to disable two-factor authentication.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-w-0">
      <div className="mb-6">
        <p className="mb-1 font-body text-[10px] uppercase tracking-widest text-sage">
          Your preferences
        </p>
        <h2 className="font-display text-2xl text-charcoal">
          Account settings
        </h2>
        <p className="mt-2 font-body text-sm leading-relaxed text-charcoal/60">
          Manage your account, security and the way you shop.
        </p>
      </div>
      <div className="grid items-start gap-5 md:grid-cols-[170px_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="flex flex-wrap gap-1 md:flex-col md:border-r md:border-charcoal/10 md:pr-4"
        >
          {(
            [
              { key: "account", label: "Account", icon: UserRound },
              { key: "security", label: "Security", icon: ShieldCheck },
              { key: "appearance", label: "Appearance", icon: Sun },
              ...(user?.role === "customer"
                ? [{ key: "emails" as const, label: "Emails", icon: Mail }]
                : []),
              { key: "privacy", label: "Privacy & support", icon: Globe },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              id={`settings-section-${key}`}
              key={key}
              type="button"
              aria-pressed={activeSection === key}
              aria-controls={`settings-content-${key}`}
              onClick={() => {
                setActiveSection(key);
                if (key === "emails") setEmailVisited(true);
              }}
              className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left font-body text-xs transition-colors focus-visible:outline-2 focus-visible:outline-sage ${activeSection === key ? "bg-sage/10 font-medium text-charcoal" : "text-charcoal/60 hover:bg-sand/25 hover:text-charcoal"}`}
            >
              <Icon size={16} aria-hidden="true" className="shrink-0" />
              {label}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          <div
            id="settings-content-account"
            role="region"
            aria-labelledby="settings-section-account"
            hidden={activeSection !== "account"}
          >
            <SettingsCard
              title="Account"
              icon={UserRound}
              badge={
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-body text-[10px] ${user?.isVerified ? "bg-sage/10 text-sage" : "bg-amber-50 text-amber-800"}`}
                >
                  {user?.isVerified && <Check size={12} />}
                  {user?.isVerified ? "Verified" : "Not verified"}
                </span>
              }
            >
              <dl className="space-y-3 font-body text-sm">
                <div>
                  <dt className="text-xs text-charcoal/50">Name</dt>
                  <dd className="mt-1 break-words text-charcoal">
                    {user?.name || "Your account"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-charcoal/50">Email address</dt>
                  <dd className="mt-1 break-all text-charcoal">
                    {user?.email}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 border-t border-charcoal/10 pt-4">
                <button
                  type="button"
                  className={actionClass}
                  onClick={onEditProfile}
                >
                  Edit profile <ChevronRight size={14} />
                </button>
              </div>
              {!user?.isVerified && (
                <div className="mt-4 rounded-xl bg-sand/20 p-3">
                  <p className="mb-3 font-body text-xs leading-relaxed text-charcoal/60">
                    Verify your email to receive account updates and subscribe
                    to offers.
                  </p>
                  <button
                    type="button"
                    disabled={resendLoading}
                    onClick={() => setShowResendConfirm(true)}
                    className={actionClass}
                  >
                    {resendLoading && (
                      <Loader2
                        size={14}
                        className="animate-spin motion-reduce:animate-none"
                      />
                    )}
                    {resendLoading ? "Sending..." : "Resend verification"}
                  </button>
                </div>
              )}
              {resendMessage && (
                <p role="status" className="mt-3 font-body text-xs text-sage">
                  {resendMessage}
                </p>
              )}
              {resendError && (
                <p role="alert" className="mt-3 font-body text-xs text-red-600">
                  {resendError}
                </p>
              )}
            </SettingsCard>
          </div>
          <div
            id="settings-content-security"
            role="region"
            aria-labelledby="settings-section-security"
            hidden={activeSection !== "security"}
          >
            <SettingsCard title="Security" icon={ShieldCheck}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-body text-sm font-medium text-charcoal">
                    Two-factor authentication
                  </h4>
                  <p className="mt-1 font-body text-xs leading-relaxed text-charcoal/60">
                    Use a code from an authenticator app when you sign in.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-sand/30 px-2.5 py-1 font-body text-[10px] text-charcoal/60">
                  {isLoadingStatus
                    ? "Loading..."
                    : statusError
                      ? "Unavailable"
                      : totpEnabled
                        ? "Enabled"
                        : "Off"}
                </span>
              </div>
              {statusError ? (
                <div className="mt-3">
                  <p role="alert" className="font-body text-xs text-red-600">
                    {statusError}
                  </p>
                  <button
                    type="button"
                    className={`${actionClass} mt-3`}
                    disabled={isLoadingStatus}
                    onClick={() => {
                      setIsLoadingStatus(true);
                      setStatusRefresh((value) => value + 1);
                    }}
                  >
                    Try again
                  </button>
                </div>
              ) : (
                !isLoadingStatus &&
                (totpEnabled ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowDisableConfirm(true)}
                    className={`${actionClass} mt-4`}
                  >
                    {isSubmitting ? "Updating..." : "Turn off 2FA"}
                  </button>
                ) : setupStep === "idle" ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void startSetup()}
                    className={`${primaryClass} mt-4`}
                  >
                    {isSubmitting && (
                      <Loader2
                        size={14}
                        className="animate-spin motion-reduce:animate-none"
                      />
                    )}
                    {isSubmitting ? "Starting setup..." : "Set up 2FA"}
                  </button>
                ) : (
                  <div className="mt-4 rounded-xl border border-charcoal/10 bg-cream/50 p-4">
                    <p className="mb-4 font-body text-xs leading-relaxed text-charcoal/60">
                      Scan this QR code with your authenticator app, then enter
                      its six-digit code.
                    </p>
                    <Image
                      src={qrCode}
                      unoptimized
                      width={176}
                      height={176}
                      alt="QR code for authenticator setup"
                      className="mx-auto rounded-lg"
                    />
                    <form onSubmit={confirmSetup} className="mt-4 space-y-3">
                      <label
                        className="block font-body text-xs text-charcoal/60"
                        htmlFor="settings-authenticator-code"
                      >
                        Authenticator code
                      </label>
                      <input
                        id="settings-authenticator-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        minLength={6}
                        maxLength={6}
                        required
                        disabled={isSubmitting}
                        value={confirmCode}
                        onChange={(event) =>
                          setConfirmCode(event.target.value.replace(/\D/g, ""))
                        }
                        placeholder="000000"
                        className="w-full rounded-xl border border-charcoal/20 bg-cream px-4 py-3 text-center font-body text-lg tracking-[0.3em] text-charcoal outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={isSubmitting || confirmCode.length !== 6}
                          className={primaryClass}
                        >
                          {isSubmitting ? "Verifying..." : "Verify and enable"}
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          className={actionClass}
                          onClick={() => {
                            setSetupStep("idle");
                            setConfirmCode("");
                            setQrCode("");
                            setErrorMessage("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                ))
              )}
              {successMessage && (
                <p role="status" className="mt-3 font-body text-xs text-sage">
                  {successMessage}
                </p>
              )}
              {errorMessage && (
                <p role="alert" className="mt-3 font-body text-xs text-red-600">
                  {errorMessage}
                </p>
              )}
              <div className="mt-5 border-t border-charcoal/10 pt-4">
                <h4 className="font-body text-sm font-medium text-charcoal">
                  Password
                </h4>
                <p className="mb-3 mt-1 font-body text-xs leading-relaxed text-charcoal/60">
                  Request a reset link to choose a new password.
                </p>
                <Link href="/forgot-password" className={actionClass}>
                  <KeyRound size={14} />
                  Reset password
                  <ArrowUpRight size={13} />
                </Link>
              </div>
            </SettingsCard>
          </div>
          <div
            id="settings-content-appearance"
            role="region"
            aria-labelledby="settings-section-appearance"
            hidden={activeSection !== "appearance"}
          >
            <SettingsCard
              title="Appearance"
              icon={theme === "light" ? Sun : Moon}
            >
              <p className="mb-4 font-body text-xs leading-relaxed text-charcoal/60">
                Choose the theme for this device. Changes apply immediately.
              </p>
              <div
                className="grid grid-cols-2 gap-2"
                role="group"
                aria-label="Color theme"
              >
                {(["light", "dark"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={theme === value}
                    onClick={() => {
                      if (theme !== value) toggleTheme();
                    }}
                    className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 font-body text-sm transition-colors focus-visible:outline-2 focus-visible:outline-sage ${theme === value ? "border-sage bg-sage/10 text-charcoal" : "border-charcoal/10 text-charcoal/50 hover:border-sage/50"}`}
                  >
                    {value === "light" ? <Sun size={16} /> : <Moon size={16} />}
                    {value === "light" ? "Light" : "Dark"}
                    {theme === value && (
                      <Check size={13} className="text-sage" />
                    )}
                  </button>
                ))}
              </div>
              {ready && settings.usd.enabled && (
                <div className="mt-5 border-t border-charcoal/10 pt-4">
                  <h4 className="mb-3 flex items-center gap-2 font-body text-sm font-medium text-charcoal">
                    <Globe size={15} className="text-sage" />
                    Price display
                  </h4>
                  <div
                    className="flex gap-2"
                    role="group"
                    aria-label="Display currency"
                  >
                    {(["PHP", "USD"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={currency === value}
                        onClick={() => setCurrency(value)}
                        className={`${actionClass} ${currency === value ? "border-sage bg-sage/10" : ""}`}
                      >
                        {value}
                        {currency === value && (
                          <Check size={12} className="text-sage" />
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 font-body text-xs leading-relaxed text-charcoal/50">
                    USD prices are estimates. Payments and refunds are processed
                    in PHP.
                  </p>
                </div>
              )}
              {currencyError && (
                <p
                  role="status"
                  className="mt-3 font-body text-xs text-charcoal/50"
                >
                  Currency preferences are temporarily unavailable.
                </p>
              )}
              <p className="mt-4 font-body text-[11px] text-charcoal/40">
                Appearance preferences are saved on this device.
              </p>
            </SettingsCard>
          </div>
          <div
            id="settings-content-privacy"
            role="region"
            aria-labelledby="settings-section-privacy"
            hidden={activeSection !== "privacy"}
          >
            <SettingsCard title="Privacy & support" icon={Mail}>
              <p className="mb-4 font-body text-xs leading-relaxed text-charcoal/60">
                Learn how your information is handled or get help with your
                account.
              </p>
              <div className="space-y-1">
                <Link
                  href="/privacy"
                  className="flex min-h-10 items-center justify-between rounded-lg px-2 font-body text-sm text-charcoal/70 hover:bg-sand/20 focus-visible:outline-2 focus-visible:outline-sage"
                >
                  Privacy policy
                  <ArrowUpRight size={14} />
                </Link>
                <Link
                  href="/contact"
                  className="flex min-h-10 items-center justify-between rounded-lg px-2 font-body text-sm text-charcoal/70 hover:bg-sand/20 focus-visible:outline-2 focus-visible:outline-sage"
                >
                  Contact support
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </SettingsCard>
          </div>
          {user?.role === "customer" && emailVisited && (
            <div
              id="settings-content-emails"
              role="region"
              aria-labelledby="settings-section-emails"
              hidden={activeSection !== "emails"}
            >
              <MarketingPreference verified={user.isVerified} />
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={showResendConfirm}
        title="Send a new verification email?"
        description={`We'll send a link to ${user?.email || "your account email"}.`}
        onConfirm={() => void resendVerification()}
        onCancel={() => setShowResendConfirm(false)}
      />
      <ConfirmDialog
        open={showDisableConfirm}
        title="Turn off two-factor authentication?"
        description="You will no longer need an authenticator code when signing in."
        confirmLabel="Turn off 2FA"
        destructive
        onConfirm={() => void disable2FA()}
        onCancel={() => setShowDisableConfirm(false)}
      />
    </div>
  );
}
