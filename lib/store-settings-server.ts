import { pool } from "@/lib/db";
import type { PoolClient } from "pg";
import { setAuditActor } from "@/lib/admin-audit";
import {
  SettingsError,
  validateSettings,
  type SettingsDocument,
} from "@/lib/store-settings";
export async function readSettings(
  client?: PoolClient,
  lock = false,
): Promise<SettingsDocument> {
  const result = await (client || pool).query(
    `SELECT config,version,updated_at FROM store_settings WHERE settings_id=1${lock ? " FOR SHARE" : ""}`,
  );
  if (!result.rows[0])
    throw new SettingsError("Store configuration is unavailable.", 503);
  const row = result.rows[0];
  return {
    config: validateSettings(row.config),
    version: row.version,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}
export async function saveSettings(actorId: number, body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new SettingsError("Invalid request.");
  const { config: value, version } = body as Record<string, unknown>;
  if (!Number.isSafeInteger(version) || Number(version) < 1)
    throw new SettingsError("Reload settings before saving.");
  const config = validateSettings(value);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout='5s'");
    await setAuditActor(client, actorId);
    const actor = (
      await client.query("SELECT role FROM users WHERE user_id=$1", [actorId])
    ).rows[0];
    if (actor?.role !== "super_admin")
      throw new SettingsError("Super admins only.", 403);
    const current = (
      await client.query(
        "SELECT config,version FROM store_settings WHERE settings_id=1 FOR UPDATE",
      )
    ).rows[0];
    if (!current)
      throw new SettingsError("Run the store settings migration first.", 503);
    if (current.version !== version)
      throw new SettingsError(
        "Settings changed in another session. Reload before saving.",
        409,
      );
    await client.query(
      "UPDATE store_settings SET config=$1,version=version+1,updated_at=now() WHERE settings_id=1 AND config IS DISTINCT FROM $1::jsonb",
      [JSON.stringify(config)],
    );
    const result = await readSettings(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
