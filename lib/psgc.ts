const BASE = process.env.PSGC_API_BASE ?? "https://classification.psa.gov.ph/psgc";
const VERSION = process.env.PSGC_VERSION ?? "Q2_2026";

type Raw = {
  code: string;
  area_name: string;
  geographic_level: string; // "Prov" | "City" | "Mun" | "Bgy" ...
  reg: number;
  prv: number;
  mun: number;
  bgy: number;
};

export type PsgcItem = {
  code: string;
  name: string;
  level: string;
  reg: number;
  prv: number;
  mun: number;
};

const slim = (r: Raw): PsgcItem => ({
  code: r.code,
  name: r.area_name,
  level: r.geographic_level,
  reg: r.reg,
  prv: r.prv,
  mun: r.mun,
});

const byName = (a: PsgcItem, b: PsgcItem) => a.name.localeCompare(b.name, "en");

// Fetches every page of a level. Responses look like
// { count, next, previous, results: [...] }.
async function fetchAll(level: string, params: Record<string, string> = {}): Promise<Raw[]> {
  const qs = new URLSearchParams({
    token: process.env.PSGC_API_TOKEN!,
    page_size: "2000",
    ...params,
  });
  const origin = new URL(BASE).origin;
  const out: Raw[] = [];
  let url: string | null = `${BASE}/${VERSION}/${level}?${qs}`;

  while (url) {
    const res: Response = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) throw new Error(`PSGC ${level} responded ${res.status}`);
    const json = await res.json();
    if (Array.isArray(json)) {
      out.push(...json);
      break;
    }
    out.push(...(json.results ?? []));
    // only follow "next" if it stays on the PSA host, so the token can't leak elsewhere
    url = json.next && new URL(json.next).origin === origin ? json.next : null;
  }
  return out;
}

// Provinces plus highly urbanized cities (HUCs, which includes the NCR cities).
// HUCs sit at province level in this dataset (mun = 0, level "City").
export async function getProvinces(): Promise<PsgcItem[]> {
  const [provs, hucs] = await Promise.allSettled([fetchAll("provinces"), fetchAll("hucs")]);
  if (provs.status === "rejected") throw provs.reason;

  const merged = new Map<string, PsgcItem>();
  for (const r of provs.value) merged.set(r.code, slim(r));
  if (hucs.status === "fulfilled") for (const r of hucs.value) merged.set(r.code, slim(r));
  return [...merged.values()].sort(byName);
}

// Cities and municipalities inside one province.
export async function getCities(reg: number, prv: number): Promise<PsgcItem[]> {
  const rows = await fetchAll("municipalities", { prv: String(prv) });
  return rows
    .filter((r) => r.reg === reg && r.prv === prv)
    .map(slim)
    .sort(byName);
}

// Barangays of one city/municipality. For a HUC, pass mun = 0.
export async function getBarangays(reg: number, prv: number, mun: number): Promise<PsgcItem[]> {
  const rows = await fetchAll("barangays", { prv: String(prv) });
  return rows
    .filter((r) => r.reg === reg && r.prv === prv && r.mun === mun)
    .map(slim)
    .sort(byName);
}