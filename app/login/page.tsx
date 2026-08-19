"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

function LoginForm() {
  const { login, user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") {
      window.location.href = redirectTo || "/";
    }
  }, [user, authLoading, redirectTo]);

  const handleGoogleResponse = async (response: { credential: string }) => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Google sign-in failed.");

      login(data.token, data.user);
      window.location.href = redirectTo || "/";
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initGoogle = () => {
      if (!(window as any).google || !googleButtonRef.current) return;

      (window as any).google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });

      const buttonWidth = googleButtonRef.current.offsetWidth;

      (window as any).google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: buttonWidth,
        shape: "pill",
      });
    };

    const interval = setInterval(() => {
      if ((window as any).google) {
        clearInterval(interval);
        initGoogle();
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, totpCode: needsTotp ? totpCode : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");

      if (data.requiresTotp) {
        setNeedsTotp(true);
        setIsLoading(false);
        return;
      }

      if (data.user.role === "admin") {
        setErrorMessage(
          "Administrators must sign in through the admin portal.",
        );
        setIsLoading(false);
        return;
      }

      login(data.token, data.user);
      window.location.href = redirectTo || "/";
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
      <div className="flex items-center justify-center px-8 py-16 bg-cream">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <Link
            href="/"
            className="font-display text-2xl text-charcoal block text-center mb-10 md:hidden"
          >
            Tea Atelier
          </Link>

          <h1 className="font-display text-3xl text-charcoal text-center mb-2">
            {needsTotp ? "Two-Factor Authentication" : "Welcome Back"}
          </h1>
          <p className="font-body text-sm text-charcoal/60 text-center mb-8">
            {needsTotp
              ? "Enter the 6-digit code from your authenticator app"
              : "Sign in to continue to your account"}
          </p>

          {errorMessage && (
            <p className="font-body text-sm text-red-600 text-center mb-6">
              {errorMessage}
            </p>
          )}

          {needsTotp ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                autoFocus
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full rounded-xl text-center tracking-[0.3em] border border-charcoal/20 bg-white px-4 py-3 font-body text-lg text-charcoal focus:outline-none focus:border-sage transition-colors"
              />
              <button
                type="submit"
                disabled={isLoading || totpCode.length !== 6}
                className="w-full rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors disabled:opacity-50"
              >
                {isLoading ? "Verifying..." : "Verify"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNeedsTotp(false);
                  setTotpCode("");
                  setErrorMessage("");
                }}
                className="w-full font-body text-xs text-charcoal/50 hover:text-charcoal transition-colors"
              >
                Back
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-charcoal/20 bg-white px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                  />
                </div>

                <div>
                  <label className="font-body text-xs tracking-wide uppercase text-charcoal/60 block mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-charcoal/20 bg-white px-4 py-3 font-body text-sm text-charcoal focus:outline-none focus:border-sage transition-colors"
                  />
                </div>

                <div className="text-right">
                  <a
                    href="/forgot-password"
                    className="font-body text-xs text-charcoal/50 hover:text-sage transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-full bg-sage text-cream font-body text-sm tracking-wide uppercase py-4 hover:bg-charcoal transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Logging in..." : "Log In"}
                </button>
              </form>

              <div className="relative my-6 text-center">
                <span className="relative bg-cream px-3 font-body text-xs text-charcoal/40 uppercase tracking-wide z-10">
                  Or continue with
                </span>
                <div className="absolute top-1/2 left-0 right-0 border-t border-charcoal/10" />
              </div>

              <div className="space-y-3">
                <div
                  ref={googleButtonRef}
                  className="w-full flex justify-center"
                ></div>

                <button
                  type="button"
                  disabled
                  title="Apple sign-in coming soon"
                  className="w-full flex items-center justify-center gap-2 rounded-full border border-charcoal/20 py-3 font-body text-sm text-charcoal/40 cursor-not-allowed"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.635.95 3.463.95.813 0 2.187-1.01 3.813-1.01.65 0 2.985.06 4.51 2.27-.118.074-2.692 1.57-2.692 4.8 0 3.75 3.312 5.07 3.353 5.08z" />
                  </svg>
                  Apple (coming soon)
                </button>
              </div>

              <p className="font-body text-sm text-charcoal/60 text-center mt-8">
                Don't have an account?{" "}
                <Link
                  href="/signup"
                  className="text-sage hover:text-charcoal transition-colors"
                >
                  Sign up
                </Link>
              </p>

              <p className="font-body text-xs text-charcoal/40 text-center mt-4">
                Administrator?{" "}
                <Link
                  href="/admin/login"
                  className="text-sage hover:text-charcoal transition-colors"
                >
                  Click here
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <LoginForm />
    </Suspense>
  );
}