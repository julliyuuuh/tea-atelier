import { pool } from "@/lib/db";
import { adminQuery, setAuditActor } from "@/lib/admin-audit";
import { randomUUID } from "node:crypto";
import {
  MarketingError,
  type CampaignInput,
  type Campaign,
} from "@/lib/marketing";
import { marketingEmailConfig, sendCampaignEmail } from "@/lib/marketing-email";
const eligible =
  "u.role='customer' AND u.is_verified=true AND u.is_suspended=false AND u.email IS NOT NULL AND trim(u.email)<>'' AND p.subscribed=true";
export const campaignColumns = `c.campaign_id AS id,c.title,c.subject,c.heading,c.message,c.image_url AS "imageUrl",c.image_alt AS "imageAlt",c.cta_label AS "ctaLabel",c.cta_path AS "ctaPath",c.status,c.version,c.created_at AS "createdAt"`;
const campaignFilter = `($3::text='' OR strpos(lower(c.title || ' ' || c.subject),lower($3))>0)
 AND ($4::text='' OR c.status=$4)`;
export async function campaignCount(search = "", status = "") {
  const result = await pool.query(
    `SELECT COUNT(*) FROM marketing_campaigns c
     WHERE ($1::text='' OR strpos(lower(c.title || ' ' || c.subject),lower($1))>0)
       AND ($2::text='' OR c.status=$2)`,
    [search, status],
  );
  return Number(result.rows[0].count);
}
export async function campaignSummary(
  id?: string,
  page = 1,
  search = "",
  status = "",
) {
  const result = await pool.query(
    `SELECT ${campaignColumns},json_build_object(
 'pending',COUNT(d.delivery_id) FILTER(WHERE d.state='PENDING'),
 'sending',COUNT(d.delivery_id) FILTER(WHERE d.state='SENDING'),
 'sent',COUNT(d.delivery_id) FILTER(WHERE d.state='SENT'),
 'failed',COUNT(d.delivery_id) FILTER(WHERE d.state='FAILED'),
 'unknown',COUNT(d.delivery_id) FILTER(WHERE d.state='UNKNOWN'),
 'skipped',COUNT(d.delivery_id) FILTER(WHERE d.state='SKIPPED')) AS counts
 FROM marketing_campaigns c LEFT JOIN marketing_deliveries d USING(campaign_id)
 WHERE ($1::uuid IS NULL OR c.campaign_id=$1) AND ${campaignFilter} GROUP BY c.campaign_id
 ORDER BY c.created_at DESC,c.campaign_id LIMIT 10 OFFSET $2`,
    [id ?? null, id ? 0 : (page - 1) * 10, search, status],
  );
  return result.rows as Campaign[];
}
export async function subscriberCount() {
  return Number(
    (
      await pool.query(
        `SELECT COUNT(*) FROM marketing_preferences p JOIN users u USING(user_id) WHERE ${eligible}`,
      )
    ).rows[0].count,
  );
}
export async function saveCampaign(
  actor: number,
  input: CampaignInput,
  id?: string,
  version?: number,
) {
  const values = [
    input.title,
    input.subject,
    input.heading,
    input.message,
    input.imageUrl,
    input.imageAlt,
    input.ctaLabel,
    input.ctaPath,
  ];
  const result = id
    ? await adminQuery(
        actor,
        `UPDATE marketing_campaigns SET title=$1,subject=$2,heading=$3,message=$4,image_url=$5,image_alt=$6,cta_label=$7,cta_path=$8,version=version+1,updated_at=now() WHERE campaign_id=$9 AND version=$10 AND status='DRAFT' RETURNING campaign_id`,
        [...values, id, version],
      )
    : await adminQuery(
        actor,
        `INSERT INTO marketing_campaigns(title,subject,heading,message,image_url,image_alt,cta_label,cta_path,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING campaign_id`,
        [...values, actor],
      );
  if (!result.rows[0])
    throw new MarketingError(
      "The draft changed or was already queued. Refresh before editing.",
      409,
    );
  return (await campaignSummary(result.rows[0].campaign_id))[0];
}
export async function queueCampaign(
  actor: number,
  id: string,
  version: number,
) {
  const config = marketingEmailConfig();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await setAuditActor(client, actor);
    const campaign = (
      await client.query(
        "SELECT * FROM marketing_campaigns WHERE campaign_id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!campaign) throw new MarketingError("Campaign not found.", 404);
    if (campaign.status === "DRAFT") {
      if (campaign.version !== version)
        throw new MarketingError(
          "The draft changed. Refresh and review it before sending.",
          409,
        );
      // Snapshot consent version and address: unsubscribing/resubscribing or changing
      // email cannot reactivate a delivery from an older audience snapshot.
      await client.query(
        `INSERT INTO marketing_deliveries(campaign_id,user_id,email,preference_version,unsubscribe_token)
    SELECT $1,u.user_id,lower(trim(u.email)),p.version,p.unsubscribe_token
    FROM marketing_preferences p JOIN users u USING(user_id) WHERE ${eligible}
    ON CONFLICT DO NOTHING`,
        [id],
      );
      await client.query(
        `UPDATE marketing_campaigns SET status='QUEUED',queued_at=now(),updated_at=now(),version=version+1,site_url=$2,send_from=$3 WHERE campaign_id=$1`,
        [id, config.siteUrl, config.sendFrom],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return (await campaignSummary(id))[0];
}
export async function deliverCampaignBatch(id: string) {
  marketingEmailConfig();
  const campaign = (
    await pool.query(
      `SELECT ${campaignColumns},c.site_url,c.send_from FROM marketing_campaigns c WHERE c.campaign_id=$1`,
      [id],
    )
  ).rows[0];
  if (!campaign) throw new MarketingError("Campaign not found.", 404);
  if (campaign.status === "DRAFT")
    throw new MarketingError("Queue the campaign first.", 409);
  if (campaign.status === "COMPLETED")
    return { claimed: 0, campaign: (await campaignSummary(id))[0] };
  await pool.query(
    `UPDATE marketing_deliveries SET state='UNKNOWN'
     WHERE campaign_id=$1 AND state='SENDING'
       AND claimed_at<now()-interval '5 minutes'
       AND first_attempt_at<=now()-interval '20 hours'`,
    [id],
  );
  const claim = randomUUID();
  const { rows } = await pool.query(
    `WITH batch AS (
 SELECT delivery_id,state AS original_state FROM marketing_deliveries WHERE campaign_id=$1 AND (
 state IN ('PENDING','FAILED') OR
 (state IN ('SENDING','UNKNOWN') AND claimed_at<now()-interval '5 minutes' AND first_attempt_at>now()-interval '20 hours'))
 ORDER BY delivery_id FOR UPDATE SKIP LOCKED LIMIT 10
 ) UPDATE marketing_deliveries d SET state='SENDING',claim_id=$2,claimed_at=now(),
 first_attempt_at=CASE WHEN batch.original_state IN ('PENDING','FAILED') THEN now() ELSE COALESCE(first_attempt_at,now()) END,attempts=attempts+1
 FROM batch WHERE d.delivery_id=batch.delivery_id RETURNING d.*,batch.original_state`,
    [id, claim],
  );
  let halted = false;
  for (const row of rows) {
    if (halted) {
      await pool.query(
        `UPDATE marketing_deliveries SET state=$3,claim_id=NULL WHERE delivery_id=$1 AND claim_id=$2 AND state='SENDING'`,
        [row.delivery_id, claim, row.original_state],
      );
      continue;
    }
    const allowed = (
      await pool.query(
        `SELECT 1 FROM marketing_preferences p JOIN users u USING(user_id)
   WHERE p.user_id=$1 AND p.version=$2 AND lower(trim(u.email))=$3 AND ${eligible}`,
        [row.user_id, row.preference_version, row.email],
      )
    ).rowCount;
    const result = allowed
      ? await sendCampaignEmail(
          campaign,
          row.email,
          { siteUrl: campaign.site_url, sendFrom: campaign.send_from },
          row.unsubscribe_token,
          `campaign-delivery/${row.delivery_id}`,
        )
      : { state: "SKIPPED", providerId: null };
    // A rejection of this retry does not prove an earlier unresolved send
    // was rejected. Preserve ambiguity so the 20-hour retry window still applies.
    const outcome =
      result.state === "FAILED" &&
      ["UNKNOWN", "SENDING"].includes(row.original_state)
        ? { state: "UNKNOWN", providerId: null }
        : result;
    await pool.query(
      `UPDATE marketing_deliveries SET state=$3,provider_email_id=$4,sent_at=CASE WHEN $3='SENT' THEN now() ELSE sent_at END WHERE delivery_id=$1 AND claim_id=$2 AND state='SENDING'`,
      [row.delivery_id, claim, outcome.state, outcome.providerId],
    );
    halted = outcome.state === "FAILED" || outcome.state === "UNKNOWN";
    // Resend's default rate limit is two requests per second; batch calls are
    // sequential and bounded rather than one browser request per subscriber.
    if (allowed && !halted)
      await new Promise((resolve) => setTimeout(resolve, 650));
  }
  await pool.query(
    `UPDATE marketing_campaigns c SET status='COMPLETED',updated_at=now() WHERE campaign_id=$1 AND status='QUEUED'
 AND NOT EXISTS(SELECT 1 FROM marketing_deliveries d WHERE d.campaign_id=c.campaign_id AND d.state NOT IN ('SENT','SKIPPED'))`,
    [id],
  );
  return {
    claimed: rows.length,
    halted,
    campaign: (await campaignSummary(id))[0],
  };
}
export async function marketingPreference(
  userId: number,
  subscribed?: boolean,
) {
  const user = (
    await pool.query(
      `SELECT role,is_verified,email FROM users WHERE user_id=$1 AND is_suspended=false`,
      [userId],
    )
  ).rows[0];
  if (!user || user.role !== "customer")
    throw new MarketingError("Customer account required.", 403);
  if (subscribed === true && (!user.is_verified || !user.email))
    throw new MarketingError("Verify your email before subscribing.");
  if (subscribed !== undefined)
    await pool.query(
      `INSERT INTO marketing_preferences(user_id,subscribed,consented_at,unsubscribed_at)
 VALUES($1,$2,CASE WHEN $2 THEN now() ELSE NULL END,CASE WHEN NOT $2 THEN now() ELSE NULL END)
 ON CONFLICT(user_id) DO UPDATE SET subscribed=$2,
 version=CASE WHEN marketing_preferences.subscribed IS DISTINCT FROM $2 THEN marketing_preferences.version+1 ELSE marketing_preferences.version END,
 consented_at=CASE WHEN $2 AND NOT marketing_preferences.subscribed THEN now() ELSE marketing_preferences.consented_at END,
 unsubscribed_at=CASE WHEN NOT $2 THEN now() ELSE NULL END,updated_at=now()`,
      [userId, subscribed],
    );
  return {
    subscribed: Boolean(
      (
        await pool.query(
          "SELECT subscribed FROM marketing_preferences WHERE user_id=$1",
          [userId],
        )
      ).rows[0]?.subscribed,
    ),
  };
}
export async function unsubscribeMarketing(token: string) {
  const result = await pool.query(
    `UPDATE marketing_preferences SET subscribed=false,
 version=CASE WHEN subscribed THEN version+1 ELSE version END,unsubscribed_at=now(),updated_at=now()
 WHERE unsubscribe_token=$1 RETURNING user_id`,
    [token],
  );
  if (!result.rowCount)
    throw new MarketingError("This unsubscribe link is invalid.", 404);
}
