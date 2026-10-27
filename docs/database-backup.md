# Railway → Supabase: first verified backup

Railway remains the live database. This manual Action creates a **point-in-time standby copy** in an empty Supabase project. It does not change `DATABASE_URL`, deploy the website, automatically fail over, schedule refreshes, or continuously synchronize databases.

## Files to push to main

- `.github/workflows/database-backup.yml`
- `scripts/backup-database.py`
- `tests/test_database_backup.py`
- `docs/database-backup.md`

No application code, npm dependencies or application migrations change. Python and Docker are already available on the GitHub-hosted Ubuntu runner; nothing needs installing on your Windows PC.

## Before the first run

1. Supabase project is Healthy, with **Data API off** and automatic RLS left off. Use the dedicated backup project's **Session pooler URI**, usually port 5432. Keep its `auth`, `storage` and other managed schemas intact.
2. Railway PostgreSQL's temporary **public TCP proxy** is enabled. Use the current public URL; recreating a proxy can change its hostname/port.
3. Under repository Settings → Secrets and variables → Actions, set:
   - `RAILWAY_BACKUP_SOURCE_URL`: current Railway public PostgreSQL URL.
   - `SUPABASE_BACKUP_TARGET_URL`: Supabase Session pooler PostgreSQL URI, with the real URL-encoded database password substituted.
4. The script requires TLS. Plain URIs default to `sslmode=require`; explicitly insecure URI modes are rejected. If the endpoint does not support TLS, review the endpoint configuration rather than disabling TLS.
5. The Supabase target's `public` schema must be empty of application objects. This initial-copy Action deliberately refuses to overwrite populated databases. Source PostgreSQL must be version 14–18 and the target must be the same or newer major version. Public-schema extensions or external/foreign-table dependencies require a separate compatibility review.

Keep the live deployment's `DATABASE_URL` unchanged.

## Run it

1. Push the four files to **main**.
2. Open GitHub → repository → **Actions**.
3. Select **Initial Railway to Supabase backup**.
4. Click **Run workflow**, select **main**, and check the confirmation for restoring into the empty backup project.
5. Run it and wait for a green result. If the checkbox is left off or another branch is selected, the job is skipped and nothing transfers.
6. The final log line must say: **Backup verified and committed. Railway remains primary. No dump artifact was uploaded.** A script-unit-test success alone does not mean a database transfer happened.
7. Open Supabase Table Editor and check the `public` tables, including users, products, orders, order_items, returns/refund tables, notifications, business_applications, CMS, store_settings and audit tables that exist in your actual Railway database. The dump reads the live database schema; it does not reconstruct it from the repository's old base schema or migration files.
8. Record the successful run link/time so you know the backup's age. Customer actions after its snapshot are not included.

**The source stays live and read-only for this job.** A consistent exported PostgreSQL snapshot is used for both the dump and source row counts, so concurrent orders do not make verification compare different moments. Read-only dump transactions can briefly hold schema locks; the script uses lock/query timeouts rather than blocking schema changes indefinitely.

## What is copied and verified

The application's `public` schema: tables/data, keys, indexes, serial/identity sequences and positions, views, functions, triggers, enum/domain types and policies. Existing application custom-auth records are copied as database data; there is no migration to Supabase Auth.

The target restore is one transaction, with an empty-target check repeated inside it. Object identities and exact row counts for every regular/partitioned source table must match before commit. A failed verification rolls the restore back. Ownership and ACLs are not copied from Railway's superuser roles into Supabase's managed role system. The existing Supabase `public` schema itself is retained. Anonymous/authenticated Data API roles lose access to the imported application schema; future default grants there are restricted too. Keep Data API disabled.

All temporary dump/SQL files stay on the ephemeral runner and are removed on completion. No database dumps are committed, uploaded as GitHub artifacts, or printed in logs. Provider errors/COPY contexts are intentionally withheld because they can contain credentials or customer data. Only fixed diagnostic messages and non-sensitive verification progress are printed.

Not covered: PostgreSQL global roles, provider settings, other non-public source schemas, Cloudinary image binaries, local uploaded files, application environment variables or third-party payment state. Existing Cloudinary URLs remain in the copied data; Cloudinary continues hosting those images.

## After verification

Do not run this initial-copy Action against the now-populated Supabase project expecting a refresh: it will refuse. Updating an existing standby needs a separate reviewed refresh procedure. There is no schedule in this workflow.

We can disable Railway's temporary public proxy **only after confirming the live app/backend uses Railway's private connection**. A Cloudflare-hosted server that connects directly to Railway may itself require that public endpoint; disabling it in that case would disconnect the live app. Removing a proxy invalidates its old public URL, so a future backup run needs a current reachable source address.

A successful restore is not a full website failover rehearsal. Before a live testing date, verify the backup project is running (free projects may pause), and test a separate deployment pointed at Supabase with emails and payment/webhook writes isolated from production.

## If Railway later goes down

1. Put checkout/payment creation into maintenance before changing database connections. A backup can be older than PayMongo's payment records.
2. Establish the snapshot time and identify orders, captures, refunds and edits made afterward. Do not blindly retry charges or refunds that may already exist at PayMongo.
3. Use a separately tested Supabase connection URI with TLS for the app's `DATABASE_URL`, preserving the other app secrets, and redeploy all backends that use this database. Native clients using that backend need its API to remain reachable as well.
4. Reconcile the payment/order gap before reopening payments; replay only verified provider events or use the existing verified payment-recovery path where appropriate. Browser success URLs are not payment evidence.
5. Keep the old Railway database intact. Once recovered, reconcile all writes made on the standby before deciding where to run long-term; switching back without merging them would lose those changes.

This is a manual recovery plan, not automatic zero-downtime failover or zero-data-loss replication.

## Troubleshooting

- **Skipped job:** select main and tick the confirmation checkbox.
- **Authentication failed:** check the secret values, pooler username/project suffix and URL-encoded password. Do not put credentials into screenshots or logs.
- **Connection/hostname failure:** check current public proxy access, source URL, Supabase Healthy status and Session pooler selection. A stale Railway public URL does not repair itself.
- **Target not empty:** safe refusal. Do not delete backup tables or use `--clean` just to bypass it. Review whether a prior run already committed.
- **Version/extension/permission issue:** leave Railway untouched and review the reported compatibility prerequisite.
- **Verification or restore error:** the target transaction rolls back on an SQL error. If a job was interrupted around commit, inspect the target before rerunning; a completed copy is protected by the nonempty-target refusal.

## Local verification performed

The script's URI parsing, TLS and target guards, quoting, credential-free command arguments and log redaction have unit tests. A separate isolated PostgreSQL 17 round trip was tested with actual pg_dump/pg_restore, including keys, sequences, trigger behavior and restricted API-role access. A deliberate verification mismatch rolled the entire restore back, and a populated target was refused without changing its data. A concurrent-write test also confirmed that an order created during the dump stayed outside the exported snapshot and its matching verification counts. Those checks use fixtures; the real Railway/Supabase transfer is performed only when you run the Action with your repository secrets.
