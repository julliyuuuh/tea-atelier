"use client";
import ValidatedForm from "@/components/ValidatedForm";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
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
      setMessage("Profile saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-3xl">My admin profile</h1>
      <p>
        {user.email} · {user.role.replace("_", " ")}
      </p>
      <ValidatedForm onSubmit={save} className="space-y-4">
        <fieldset disabled={saving} className="space-y-4">
          {[
            ["First name", firstName, setFirst],
            ["Last name", lastName, setLast],
            ["Phone number", phoneNumber, setPhone],
          ].map(([label, value, setter]) => (
            <label key={String(label)} className="block text-sm">
              {String(label)}
              <input
                required={label !== "Phone number"}
                maxLength={label === "Phone number" ? 11 : 50}
                pattern={label === "Phone number" ? "09[0-9]{9}" : undefined}
                value={String(value)}
                onChange={(e) =>
                  (setter as (v: string) => void)(e.target.value)
                }
                className="mt-1 block w-full rounded-xl border border-sage/40 bg-transparent p-3"
              />
            </label>
          ))}
          <CmsImageField
            value={avatarUrl}
            onChange={setAvatar}
            onUploadingChange={setUploading}
            disabled={saving}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => setAvatar("")}
            className="text-sm text-sage underline"
          >
            Remove photo
          </button>
        </fieldset>
        <button
          disabled={uploading || saving}
          className="rounded-xl bg-sage px-5 py-3 text-cream disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        <p role="status">{message}</p>
      </ValidatedForm>
    </section>
  );
}
