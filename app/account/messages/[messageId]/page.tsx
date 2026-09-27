"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Badge from "@/components/account/Badge";

type MessageDetails = {
  id: number;
  subject: string | null;
  message: string;
  status: "new" | "read" | "replied";
  adminReply: string | null;
  createdAt: string;
  repliedAt: string | null;
};

const statusTone: Record<MessageDetails["status"], "sage" | "amber" | "neutral"> = {
  new: "amber",
  read: "neutral",
  replied: "sage",
};

export default function MessageDetailsPage({
  params,
}: {
  params: Promise<{ messageId: string }>;
}) {
  const { messageId } = use(params);
  const { logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<MessageDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const res = await fetch(`/api/contact/${messageId}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (res.status === 401) {
          logout();
          router.push("/login");
          return;
        }

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load message.");
        setData(json);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setErrorMessage(error.message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/account"
        className="mb-6 flex items-center gap-2 font-body text-sm text-charcoal/60 hover:text-charcoal"
      >
        <ArrowLeft size={16} /> Back to messages
      </Link>

      {isLoading && (
        <p className="font-body text-sm text-charcoal/50">Loading...</p>
      )}

      {errorMessage && (
        <p className="py-16 text-center font-body text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      {data && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* header */}
          <div className="bg-sand/30 rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg text-charcoal">
                  {data.subject || "(No subject)"}
                </p>
                <p className="font-body text-xs text-charcoal/50 mt-1">
                  Sent on{" "}
                  {new Date(data.createdAt).toLocaleDateString("en-PH", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Badge tone={statusTone[data.status]}>{data.status}</Badge>
            </div>
          </div>

          {/* message */}
            <div className="bg-cream border border-charcoal/10 rounded-xl p-6">
            <h3 className="font-display text-base text-charcoal mb-4">
                Your Message
            </h3>
            <p className="font-body text-sm text-charcoal/80 whitespace-pre-wrap">
                {data.message}
            </p>
            </div>

            <div className="bg-sage/10 rounded-xl p-6">
            <h3 className="font-display text-base text-charcoal mb-4">Reply</h3>
            {data.adminReply ? (
                <>
                <p className="font-body text-sm text-charcoal/80 whitespace-pre-wrap">
                    {data.adminReply}
                </p>
                {data.repliedAt && (
                    <p className="font-body text-xs text-charcoal/50 mt-3 pt-3 border-t border-sage/20">
                    Replied on{" "}
                    {new Date(data.repliedAt).toLocaleDateString("en-PH", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                    })}
                    </p>
                )}
                </>
            ) : (
                <p className="font-body text-sm text-charcoal/50">
                We haven&apos;t replied yet — we&apos;ll get back to you soon.
                </p>
            )}
            </div>
        </motion.div>
      )}
    </main>
  );
}