#!/usr/bin/env node
// Builds static PSGC data for the checkout address dropdowns.
//
// Run from the project root (needs PSGC_API_TOKEN in .env.local):
//   node scripts/build-psgc.mjs
//
// Pulls the chosen PSGC version from the PSA API, keeps only the island groups
// you want (Luzon by default) and writes slim JSON files to data/psgc/.
// Commit those files. The live site then needs no token and makes no PSA calls.
//
// Optional env vars: PSGC_API_BASE, PSGC_VERSION (default Q2_2026),
// PSGC_ISLANDS (default "L"; L = Luzon, V = Visayas, M = Mindanao),
// PSGC_DELAY_MS (pause between requests, default 400), PSGC_PAGE_SIZE (default 1000).
// PSGC_MAX_TRIES (retries per request, default 6).
//
// Data: Philippine Standard Geographic Code (PSGC), Philippine Statistics
// Authority, CC BY 4.0. Filtered by island group and reduced to code and name
// fields. Keep the attribution line on the site.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";

// ---- env -----------------------------------------------------------------
function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}
loadEnvLocal();

const TOKEN = process.env.PSGC_API_TOKEN;
const BASE = process.env.PSGC_API_BASE ?? "https://classification.psa.gov.ph/psgc";
const VERSION = process.env.PSGC_VERSION ?? "Q2_2026";
const ISLANDS = (process.env.PSGC_ISLANDS ?? "L").split(",").map((s) => s.trim());
const DELAY_MS = Number(process.env.PSGC_DELAY_MS ?? 400);
const PAGE_SIZE = Number(process.env.PSGC_PAGE_SIZE ?? 1000);
const RETRY_BASE_MS = Number(process.env.PSGC_RETRY_BASE_MS ?? 2000);
const OUT_DIR = "data/psgc";
// Finished provinces are cached here (node_modules is already gitignored), so a
// run that stops partway can be repeated without refetching everything.
const CACHE_DIR = `node_modules/.cache/psgc/${VERSION}`;

if (!TOKEN) {
  console.error("PSGC_API_TOKEN is missing. Add it to .env.local and run again.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- fetching ------------------------------------------------------------
// NOTE: the token is part of every URL, so never print a URL or a raw error
// that contains one. Errors below only mention the level being fetched.
const MAX_TRIES = Number(process.env.PSGC_MAX_TRIES ?? 6); // raise it to ride out a longer PSA outage

async function getJson(url, label) {
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    let res;
    try {
      // time out instead of hanging silently if the PSA server stalls
      res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
    } catch {
      if (attempt === MAX_TRIES) throw new Error(`${label}: network error or timeout`);
      console.warn(`  ${label}: no response (try ${attempt}/${MAX_TRIES}), retrying...`);
      await sleep(RETRY_BASE_MS * attempt);
      continue;
    }

    if (res.status === 429 || res.status >= 500) {
      if (attempt === MAX_TRIES) {
        throw new Error(`${label}: HTTP ${res.status} after ${attempt} tries`);
      }
      // honor Retry-After if the server sends it, otherwise back off exponentially
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs =
        retryAfter > 0 ? retryAfter * 1000 : Math.min(60_000, RETRY_BASE_MS * 2 ** (attempt - 1));
      console.warn(
        `  ${label}: HTTP ${res.status}, waiting ${Math.round(waitMs / 1000)}s (try ${attempt}/${MAX_TRIES})`
      );
      await sleep(waitMs);
      continue;
    }

    if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);

    try {
      return await res.json();
    } catch {
      if (attempt === MAX_TRIES) throw new Error(`${label}: unreadable response`);
      await sleep(RETRY_BASE_MS * attempt);
    }
  }
}

// Fetches every page of one level. Responses look like
// { count, next, previous, results: [...] }.
async function fetchAll(level, params = {}) {
  const qs = new URLSearchParams({ token: TOKEN, page_size: String(PAGE_SIZE), ...params });
  const origin = new URL(BASE).origin;
  const out = [];
  let url = `${BASE}/${VERSION}/${level}?${qs}`;
  while (url) {
    console.log(`  fetching ${level}${params.prv ? ` (prv ${params.prv})` : ""}...`);
    const json = await getJson(url, level);
    if (Array.isArray(json)) {
      out.push(...json);
      break;
    }
    out.push(...(json.results ?? []));
    // only follow "next" if it stays on the same host, so the token can't leak
    url = json.next && new URL(json.next).origin === origin ? json.next : null;
  }
  return out;
}

const slim = (r) => ({
  code: r.code,
  name: r.area_name,
  level: r.geographic_level,
  reg: r.reg,
  prv: r.prv,
  mun: r.mun,
});
const byName = (a, b) => a.name.localeCompare(b.name, "en", { numeric: true });
const byCode = (a, b) => String(a.code ?? a[0]).localeCompare(String(b.code ?? b[0]));

// ---- build ---------------------------------------------------------------
console.log(`PSGC ${VERSION}, island groups: ${ISLANDS.join(", ")}\n`);

// Top level = provinces plus highly urbanized cities (which sit at province level)
console.log("Starting. The first requests can take a minute...");
const provRows = await fetchAll("provinces");
let hucRows = [];
try {
  hucRows = await fetchAll("hucs");
} catch (e) {
  console.warn(`! hucs endpoint failed (${e.message}); using provinces only`);
}

const top = new Map();
for (const r of [...provRows, ...hucRows]) {
  if (ISLANDS.includes(r.island_region)) top.set(r.code, slim(r));
}
const provinces = [...top.values()].sort(byName);
if (provinces.length === 0) {
  console.error("No provinces matched the island filter. Check PSGC_ISLANDS and the version.");
  process.exit(1);
}
console.log(`${provinces.length} provinces / highly urbanized cities\n`);

// Some places (Pateros in NCR, for one) are filed as municipalities, but their
// prv isn't a province or a HUC, so the two lists above miss them. Sweep the full
// municipalities list once and add anything that no existing entry covers.
console.log("Checking for municipalities not covered by any province...");
const coveredPrv = new Set(provinces.map((p) => `${p.reg}:${p.prv}`));
const knownCodes = new Set(provinces.map((p) => p.code));
const extras = new Map();
for (const r of await fetchAll("municipalities")) {
  if (!ISLANDS.includes(r.island_region)) continue;
  if (knownCodes.has(r.code) || coveredPrv.has(`${r.reg}:${r.prv}`)) continue;
  extras.set(r.code, slim(r));
}
if (extras.size > 0) {
  provinces.push(...extras.values());
  provinces.sort(byName);
  console.log(`Added ${extras.size} not covered by a province: ${[...extras.values()].map((e) => e.name).join(", ")}\n`);
} else {
  console.log("None found.\n");
}

const cities = [];
const barangays = []; // compact tuples: [code, name, reg, prv, mun]
const noBarangays = [];
const failed = [];

mkdirSync(CACHE_DIR, { recursive: true });

for (const [i, p] of provinces.entries()) {
  const tag = `[${i + 1}/${provinces.length}] ${p.name}`;
  const cacheFile = `${CACHE_DIR}/${p.reg}-${p.prv}${p.mun ? `-${p.mun}` : ""}.json`;
  let entry = null;

  if (existsSync(cacheFile)) {
    try {
      entry = JSON.parse(readFileSync(cacheFile, "utf8"));
    } catch {
      entry = null;
    }
  }

  if (entry) {
    console.log(
      `${tag}: ${entry.cities.length} cities/municipalities, ${entry.barangays.length} barangays (cached)`
    );
  } else {
    try {
      // A real province has cities and municipalities under it. A HUC is its own city.
      let cityRows = [];
      if (p.level === "Prov") {
        cityRows = (await fetchAll("municipalities", { prv: String(p.prv) }))
          .filter((r) => r.reg === p.reg && r.prv === p.prv)
          .map(slim);
        await sleep(DELAY_MS);
      }

      // Everything filed under this prv. For HUCs like Manila this includes the
      // barangays that sit under its districts.
      const bRows = (await fetchAll("barangays", { prv: String(p.prv) }))
        .filter((r) => r.reg === p.reg && r.prv === p.prv && (p.mun === 0 || r.mun === p.mun))
        .map((r) => [r.code, r.area_name, r.reg, r.prv, r.mun]);

      entry = { cities: cityRows, barangays: bRows };
      writeFileSync(cacheFile, JSON.stringify(entry));
      console.log(
        `${tag}: ${cityRows.length} cities/municipalities, ${bRows.length} barangays`
      );
      await sleep(DELAY_MS);
    } catch (e) {
      console.warn(`${tag}: FAILED (${e.message}), skipping for now`);
      failed.push(p.name);
      continue;
    }
  }

  cities.push(...entry.cities);
  barangays.push(...entry.barangays);
  if (entry.barangays.length === 0) noBarangays.push(p.name);
}

if (failed.length > 0) {
  console.error(`\nDid not finish. ${failed.length} failed: ${failed.join(", ")}`);
  console.error(
    "Nothing was written. Run the script again: finished provinces are cached, so it only retries these."
  );
  process.exit(1);
}

cities.sort(byCode);
barangays.sort(byCode);

// ---- write ---------------------------------------------------------------
// One entry per line so a quarterly refresh shows up as a readable diff.
const asLines = (rows) => "[\n" + rows.map((r) => JSON.stringify(r)).join(",\n") + "\n]\n";

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/provinces.json`, asLines(provinces));
writeFileSync(`${OUT_DIR}/cities.json`, asLines(cities));
writeFileSync(`${OUT_DIR}/barangays.json`, asLines(barangays));
writeFileSync(
  `${OUT_DIR}/meta.json`,
  JSON.stringify(
    {
      source: "Philippine Standard Geographic Code (PSGC), Philippine Statistics Authority",
      license: "CC BY 4.0",
      version: VERSION,
      islandGroups: ISLANDS,
      generatedAt: new Date().toISOString(),
      counts: {
        provincesAndHucs: provinces.length,
        citiesAndMunicipalities: cities.length,
        barangays: barangays.length,
      },
      note: "Filtered by island group and reduced to code and name fields.",
    },
    null,
    2
  ) + "\n"
);

// ---- summary -------------------------------------------------------------
const kb = (f) => (statSync(`${OUT_DIR}/${f}`).size / 1024).toFixed(0);
console.log(
  `\nWrote ${OUT_DIR}/: provinces.json (${kb("provinces.json")} KB), cities.json (${kb(
    "cities.json"
  )} KB), barangays.json (${kb("barangays.json")} KB), meta.json`
);
console.log(
  `Totals: ${provinces.length} provinces/HUCs, ${cities.length} cities/municipalities, ${barangays.length} barangays`
);

if (noBarangays.length > 0) {
  console.warn(`\n! No barangays found for: ${noBarangays.join(", ")}`);
  console.warn("  Check these in the checkout before you ship.");
}
if (barangays.length < 10000 && ISLANDS.join() === "L") {
  console.warn("\n! Fewer barangays than expected for Luzon. Worth a look before you commit.");
}
