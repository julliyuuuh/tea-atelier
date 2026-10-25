"use client";
import ValidatedForm from "@/components/ValidatedForm";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Link from "next/link";
import { UserRound } from "lucide-react";
import CmsImageField from "@/components/admin/CmsImageField";
export default function AdminProfile() {
  const { user, updateUser } = useAuth();
  return user ? (
    <Profile key={user.email} user={user} updateUser={updateUser} />
  ) : null;
}
function Profile({
  user,
  updateUser,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  updateUser: ReturnType<typeof useAuth>["updateUser"];
}) {
  const [firstName, setFirst] = useState(user.firstName),
    [lastName, setLast] = useState(user.lastName),
    [phoneNumber, setPhone] = useState(user.phone || ""),
    [avatarUrl, setAvatar] = useState(user.avatarUrl || ""),
    [uploading, setUploading] = useState(false),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (uploading || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const r = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phoneNumber,
          avatarUrl: avatarUrl || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      updateUser(d.user);
      setFirst(d.user.firstName);
      setLast(d.user.lastName);
      setPhone(d.user.phone || "");
      setAvatar(d.user.avatarUrl || "");
      setMessage("Profile saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }
  const dirty =
    firstName !== user.firstName ||
    lastName !== user.lastName ||
    phoneNumber !== (user.phone || "") ||
    avatarUrl !== (user.avatarUrl || "");
  const inputClass =
    "mt-1.5 block w-full rounded-xl border border-charcoal/20 bg-transparent px-3 py-2.5 text-sm text-charcoal outline-none focus:border-sage focus:ring-2 focus:ring-sage/10";
  return (
    <AdminPage>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <AdminPageHeader
          title="My profile"
          eyebrow="Your account"
          description="Update your personal details and the photo shown across your admin workspace."
        />
        <Link
          href="/admin"
          className="rounded-full border border-sage/30 px-4 py-2 text-sm text-sage hover:bg-sage/10"
        >
          Back to Dashboard
        </Link>
      </div>
      <ValidatedForm
        onSubmit={save}
        className="max-w-3xl overflow-hidden rounded-2xl border border-charcoal/10 bg-white"
      >
        <fieldset disabled={saving}>
          <div className="border-b border-charcoal/10 p-5 sm:p-6">
            <CmsImageField
              variant="avatar"
              initials={
                [firstName, lastName].map((n) => n.trim().charAt(0)).join("") ||
                "A"
              }
              value={avatarUrl}
              onChange={(value) => {
                setAvatar(value);
                setMessage("");
              }}
              onUploadingChange={(busy) => {
                setUploading(busy);
                if (busy) setMessage("");
              }}
              disabled={saving}
            />
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-body text-sm font-medium">
                <UserRound size={17} className="text-sage" />
                Personal details
              </h2>
              <span className="rounded-full bg-sage/10 px-3 py-1 text-xs text-sage">
                {user.role === "super_admin" ? "Super admin" : "Admin"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <label className="block text-xs text-charcoal/60">
                First name
                <input
                  name="firstName"
                  autoComplete="given-name"
                  required
                  maxLength={50}
                  value={firstName}
                  onChange={(e) => {
                    setFirst(e.target.value);
                    setMessage("");
                  }}
                  className={inputClass}
                />
              </label>
              <label className="block text-xs text-charcoal/60">
                Last name
                <input
                  name="lastName"
                  autoComplete="family-name"
                  required
                  maxLength={50}
                  value={lastName}
                  onChange={(e) => {
                    setLast(e.target.value);
                    setMessage("");
                  }}
                  className={inputClass}
                />
              </label>
              <label className="block text-xs text-charcoal/60 sm:col-span-2">
                Phone number{" "}
                <span className="text-charcoal/40">(optional)</span>
                <input
                  name="phoneNumber"
                  type="tel"
                  autoComplete="tel-national"
                  inputMode="numeric"
                  maxLength={11}
                  pattern="09[0-9]{9}"
                  placeholder="09XXXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setMessage("");
                  }}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="rounded-xl bg-sage/5 px-4 py-3">
              <p className="text-xs text-charcoal/50">Email address</p>
              <p className="mt-1 break-all text-sm text-charcoal">
                {user.email}
              </p>
              <p className="mt-2 text-xs text-charcoal/40">
                Email and role changes are managed through Admin Accounts.
              </p>
            </div>
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/10 px-5 py-4 sm:px-6">
          <p
            role="status"
            className={
              message && message !== "Profile saved."
                ? "text-xs text-red-700"
                : "text-xs text-sage"
            }
          >
            {message ||
              (uploading
                ? "Uploading your photo…"
                : dirty
                  ? "You have unsaved changes."
                  : "Your profile is up to date.")}
          </p>
          <button
            type="submit"
            disabled={uploading || saving || !dirty}
            className="cursor-pointer rounded-full bg-sage px-5 py-2.5 text-sm text-cream hover:bg-charcoal disabled:cursor-default disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </ValidatedForm>
    </AdminPage>
  );
}
