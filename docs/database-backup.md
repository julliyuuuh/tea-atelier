# Railway → Neon: first verified backup

Railway stays primary on PostgreSQL 18.6. This manual GitHub Action copies the application into a separate **Neon PostgreSQL 18** project. It does not downgrade Railway, change the live `DATABASE_URL`, deploy the app, continuously synchronize data, schedule refreshes, or automatically fail over.

## Four files to replace and push together

- `.github/workflows/database-backup.yml`
- `scripts/backup-database.py`
- `tests/test_database_backup.py`
- `docs/database-backup.md`

These replace the Supabase-specific backup setup. No application code, npm dependency, application SQL migration or checkout/payment flow changes. The Ubuntu GitHub runner already has Python and Docker; no PostgreSQL installation is needed on your Windows PC.

## 1. Create the Neon backup project

1. Sign in at https://neon.com and create a project named **Tea Atelier Backup**.
2. Select **PostgreSQL 18** explicitly. Keep Railway on its existing version. A matching major version is required; a different 18.x maintenance release is acceptable. Choose a nearby region, such as **AWS Singapore**.
3. Use an empty PostgreSQL database. Do not load example tables or enable Neon Auth/Data API for this database; the app will continue using its existing custom authentication and server-side `pg` access.
4. The Free plan may fit a small standby, subject to the allowance displayed in your console. Check Railway's database size first:

   ```sql
   SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size;
   ```

   Leave headroom for indexes, growth and provider accounting differences. Neon's documentation currently lists 1 GB/project and 100 CU-hours/project/month for Free; the console's applicable plan limits take precedence. Free compute sleeps after inactivity and wakes on a new connection; it is not an always-running dedicated standby.

5. In the Neon SQL Editor confirm:

   ```sql
   SELECT current_setting('server_version') AS version;
   ```

   It must return **18.x**, rather than 17. This version check is performed again by the workflow before dumping anything.

6. Open **Connect**, select the backup database and its owner role (normally `neondb_owner`), and switch **Connection pooling off**. Copy the complete **direct PostgreSQL URI**, including the actual password. Paste only the URI, without a leading `psql`, wrapping quotes or a variable-name assignment. Do not send it through chat/screenshots.

A direct endpoint's hostname does not have the `-pooler` suffix. The usual port is 5432. Direct connections are required for snapshot/session state and pg_dump/pg_restore. The script accepts Neon's standard `sslmode=require&channel_binding=require` options and passes them to libpq; TLS is required.

## 2. Configure repository secrets

Under GitHub repository Settings → Secrets and variables → Actions → **Secrets**, retain/add:

| Secret                      | Value                                             |
| --------------------------- | ------------------------------------------------- |
| `RAILWAY_BACKUP_SOURCE_URL` | Railway's current public PostgreSQL TCP proxy URL |
| `NEON_BACKUP_TARGET_URL`    | The complete direct Neon backup database URI      |

`NEON_BACKUP_TARGET_URL` is a **new secret**. The old `SUPABASE_BACKUP_TARGET_URL` is no longer read by the workflow or script; it may remain unused or be removed. Supabase itself remains unused.

Railway's public proxy must be reachable from the GitHub runner. Removing/recreating it can change the public address; update this source secret if necessary. Keep the live app's `DATABASE_URL` unchanged.

Passwords containing URI-special characters must be URL-encoded. If the URI copied from Neon already contains its password correctly, keep that complete URI. The script's validation messages name the affected secret without exposing its value.

## 3. Run the first backup

1. Push the four updated files together to **main**.
2. Open GitHub → Actions → **Initial Railway to Neon backup**.
3. Click **Run workflow**, select **main**, and tick the confirmation for restoring into the fresh backup database.
4. Start a **new run**. Re-running an old failed run uses its old commit, which may still contain the Supabase workflow.
5. Wait for all steps to succeed. The log must end with:

   > Backup verified and committed. Railway remains primary. No dump artifact was uploaded.

   Unit-test success or a skipped job alone does not mean a database was copied. Leaving the checkbox off or selecting a different branch skips the job.

6. Inspect Neon's public tables, including users, products, orders, order_items, business_applications, notifications, returns/refunds, CMS, store settings and audit tables that exist in the live source. The dump copies the live schema, not the repository's original base-schema file.
7. Record the successful run link and snapshot/run time. Transactions after the snapshot are not included.

## What the job does

- Reads Railway through a read-only connection and exports a single repeatable-read snapshot.
- Uses that same snapshot for source row counts and pg_dump. Concurrent orders do not cause the dump and counts to describe different moments.
- Uses PostgreSQL client tools matching the source major version. It reports both server major versions before checking compatibility.
- Refuses a populated target public schema, an older target version, a wrong-provider target or a pooled Neon URI. Public-schema extensions/foreign tables require a separate compatibility review.
- Restores into one target transaction, preserving the existing public schema and avoiding ownership/ACL imports from Railway's superuser environment. Managed/global roles are not copied.
- Compares table row counts and object identities (tables, sequences, indexes, views, functions, triggers, enum/domain types and policies) before commit. Failed SQL or verification rolls the restore back.
- Restricts PUBLIC access to the imported schema, objects and future defaults. If optional anonymous/authenticated API roles exist, their access/default grants are removed too; those roles are not required for the job. The database-owner role retains its normal owner privileges.
- Removes temporary files afterward. It does not upload dump artifacts, commit customer data or print connection strings, passwords or provider COPY error contexts.

The application data includes custom-auth user records and existing image URLs. It does not copy Cloudinary image binaries, local uploaded files, provider settings, application environment secrets, PostgreSQL global roles, non-public source schemas or PayMongo's external transaction state. Keep the other application services/configuration in place.

## Source access and refreshes

This is an **initial snapshot copy**, not ongoing synchronization. The initial-copy workflow refuses to overwrite the now-populated Neon target. Refreshing an existing standby needs a separately reviewed procedure; there is no scheduled job here. Recheck its freshness before a live testing date.

Railway public access can be disabled only after verifying that every live backend uses its private connection. A Cloudflare-hosted backend connecting directly to Railway may need its public endpoint; closing that endpoint would disconnect that backend. We will check the live connection arrangement before turning it off. Future GitHub-hosted backup jobs need a reachable source address again.

## Recovery if Railway goes down later

1. Pause checkout/payment creation before switching databases, and establish the backup's age. Orders, captures, refunds and edits after its snapshot may be missing.
2. First test a separate deployment on Neon with emails/payment/webhook writes isolated from the live environment. A successful restore alone is not a full failover rehearsal. Verify the project is running and within its plan quotas.
3. During an actual recovery, use the separately tested Neon TLS URI for the app/backend `DATABASE_URL`, preserve other app secrets, and redeploy every backend using the affected Railway database. Native clients still need their backend API available.
4. Reconcile the PayMongo/order gap before reopening payments. Do not blindly repeat a charge/refund or trust a browser success URL. Use verified provider events or the existing captured-payment recovery action where appropriate.
5. Keep Railway's original data intact. If writes happen on Neon during recovery, reconcile them before any later switch back; changing the connection back alone would lose those writes.

There is no automatic zero-downtime failover or zero-data-loss replication in this setup.

## Troubleshooting

- **Missing Neon secret:** add `NEON_BACKUP_TARGET_URL` under Actions repository Secrets, not Variables. The old Supabase secret is not a substitute.
- **Pooled target refused:** switch Connection pooling off in Neon's Connect dialog and recopy the direct URI.
- **Version mismatch:** choose PostgreSQL 18 for Neon. Railway stays unchanged.
- **Authentication/connection error:** check the actual password, database/owner role, URL encoding, current Railway public proxy, and Neon project/compute status. Secrets and COPY details are deliberately omitted from logs.
- **Target not empty:** this protects a prior successful backup or existing database. Do not remove the guard or delete tables just to make the job pass.
- **Compatibility/extension/permission error:** leave Railway untouched and review the prerequisite.
- **Interrupted restore:** SQL errors roll back the restore transaction. A lost connection near commit may leave the outcome uncertain; inspect Neon before retrying. A committed copy is protected by the nonempty-target guard.

## Verification and provider references

The safeguards have credential-free unit tests. The Neon adaptation was also tested against isolated PostgreSQL 18 instances with an ordinary, non-superuser target database owner, including no API roles, optional API-role restrictions, actual dump/restore, sequences and triggers, overwrite refusal, rollback on a deliberately mismatched row count, and writes concurrent with the exported source snapshot. No real Railway/Neon transfer is performed from this development workspace.

- https://neon.com/docs/postgresql/postgres-version-support
- https://neon.com/docs/connect/connection-pooling
- https://neon.com/docs/introduction/plans
- https://neon.com/docs/introduction/scale-to-zero
