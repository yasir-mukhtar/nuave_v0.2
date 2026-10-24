// One-off DataForSEO test for Sozo Skin Clinic (sozoskinclinic.com).
// Runs inside GitHub Actions, where DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD
// exist as repository secrets. Saves every raw answer plus a short summary.
//
//   node experiments/dataforseo-sozo/run.mjs discover   # what people search/ask
//   node experiments/dataforseo-sozo/run.mjs answers    # ChatGPT + AI Overview
//
// Spending guard: stops before any paid call once this run has spent
// RUN_LIMIT_USD, measured from the account balance.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const API = "https://api.dataforseo.com/v3";
const RUN_LIMIT_USD = 0.3;
const INDONESIA = 2360;
const LANG = "id";
const DOMAIN = "sozoskinclinic.com";

const { DATAFORSEO_LOGIN: login, DATAFORSEO_PASSWORD: password } = process.env;
if (!login || !password) {
  console.error("DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD are not set.");
  process.exit(1);
}
const auth = "Basic " + Buffer.from(`${login}:${password}`).toString("base64");

const stage = process.argv[2];
const outDir = join(HERE, "results", stage ?? "unknown");
let startBalance = null;
let spent = 0;
const log = [];

async function call(path, body) {
  const res = await fetch(API + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: body ? JSON.stringify([body]) : undefined,
  });
  const json = await res.json().catch(() => ({ status_code: res.status }));
  return json;
}

async function balance() {
  const json = await call("/appendix/user_data");
  return json?.tasks?.[0]?.result?.[0]?.money?.balance ?? null;
}

// Paid call: refuses to start once the run limit is reached, records cost.
async function paid(name, path, body, { raw = true } = {}) {
  if (spent >= RUN_LIMIT_USD) {
    log.push(`SKIPPED ${name}: run limit USD ${RUN_LIMIT_USD} reached`);
    return null;
  }
  const json = await call(path, body);
  const cost = Number(json?.cost ?? 0);
  spent += cost;
  const task = json?.tasks?.[0];
  log.push(
    `${name}: ${task?.status_code ?? json?.status_code} ${task?.status_message ?? json?.status_message ?? ""} (USD ${cost.toFixed(4)})`,
  );
  if (raw) await save(`${name}.json`, json);
  return task?.status_code === 20000 ? task.result?.[0] ?? null : null;
}

async function save(file, data) {
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, file), typeof data === "string" ? data : JSON.stringify(data, null, 2));
}

function serpBody(keyword) {
  return {
    keyword,
    location_code: INDONESIA,
    language_code: LANG,
    device: "mobile",
    load_async_ai_overview: true,
    people_also_ask_click_depth: 1,
  };
}

function aiOverviewText(serp) {
  const item = serp?.items?.find((i) => i.type === "ai_overview");
  if (!item) return null;
  const refs = new Map();
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "ai_overview_reference" && node.url) refs.set(node.url, node.title ?? node.domain);
    for (const v of Object.values(node)) walk(v);
  };
  walk(item);
  return { text: item.markdown ?? "", sources: [...refs].map(([url, title]) => ({ url, title })) };
}

function peopleAlsoAsk(serp) {
  return (serp?.items ?? [])
    .filter((i) => i.type === "people_also_ask")
    .flatMap((i) => i.items ?? [])
    .map((e) => e.title)
    .filter(Boolean);
}

async function discover() {
  const md = ["# Discovery: what people search and ask", ""];

  const models = await call("/ai_optimization/chat_gpt/llm_responses/models");
  await save("chatgpt-models.json", models);
  const aiLocations = await call("/ai_optimization/ai_keyword_data/locations_and_languages");
  await save("ai-keyword-locations.json", aiLocations);
  const aiHasIndonesia = (aiLocations?.tasks?.[0]?.result ?? []).some((l) => l.location_code === INDONESIA);

  // What Google searches the site already shows up for.
  const ranked = await paid("google-ranked-keywords", "/dataforseo_labs/google/ranked_keywords/live", {
    target: DOMAIN,
    location_code: INDONESIA,
    language_code: LANG,
    limit: 100,
    order_by: ["keyword_data.keyword_info.search_volume,desc"],
  });
  md.push("## Google searches the site already appears for (top 30 by monthly searches)", "");
  for (const item of (ranked?.items ?? []).slice(0, 30)) {
    const k = item.keyword_data;
    md.push(`- ${k?.keyword} — ${k?.keyword_info?.search_volume ?? "?"} / month, position ${item.ranked_serp_element?.serp_item?.rank_group ?? "?"}`);
  }

  // Wider topic searches, brand-free.
  const ideas = await paid("google-keyword-ideas", "/dataforseo_labs/google/keyword_ideas/live", {
    keywords: ["klinik kecantikan", "facial jerawat", "klinik kulit", "bekas jerawat", "skin booster"],
    location_code: INDONESIA,
    language_code: LANG,
    limit: 100,
    order_by: ["keyword_info.search_volume,desc"],
  });
  md.push("", "## Related Google searches (top 40 by monthly searches)", "");
  for (const item of (ideas?.items ?? []).slice(0, 40)) {
    md.push(`- ${item.keyword} — ${item.keyword_info?.search_volume ?? "?"} / month`);
  }

  // Real questions Google shows under "People also ask".
  md.push("", "## Questions Google shows under \"People also ask\"", "");
  const seeds = ["klinik kecantikan terbaik di jakarta", "facial untuk kulit berjerawat", "sozo skin clinic"];
  for (const [i, keyword] of seeds.entries()) {
    const serp = await paid(`google-serp-seed-${i + 1}`, "/serp/google/organic/live/advanced", serpBody(keyword));
    md.push(`### ${keyword}`, "", `AI Overview shown: ${aiOverviewText(serp) ? "yes" : "no"}`, "");
    for (const q of peopleAlsoAsk(serp)) md.push(`- ${q}`);
    md.push("");
  }

  // How often topics come up in AI assistants (DataForSEO's estimate).
  md.push("## Estimated monthly mentions of these topics in AI assistants", "");
  if (!aiHasIndonesia) {
    md.push("Indonesia is not supported by DataForSEO's AI search volume data; skipped.");
  } else {
    const topics = [
      "klinik kecantikan", "klinik kecantikan terbaik", "klinik kecantikan jakarta", "klinik kulit",
      "facial jerawat", "bekas jerawat", "flek hitam", "skin booster", "botox", "filler",
      "laser wajah", "peeling wajah", "infus whitening", "tanam benang", "hifu",
      "sozo skin clinic", "erha", "natasha skin clinic", "miracle aesthetic clinic", "zap clinic",
    ];
    const vol = await paid("ai-search-volume", "/ai_optimization/ai_keyword_data/keywords_search_volume/live", {
      keywords: topics,
      location_code: INDONESIA,
      language_code: LANG,
    });
    const rows = (vol?.items ?? []).sort((a, b) => (b.ai_search_volume ?? 0) - (a.ai_search_volume ?? 0));
    for (const r of rows) md.push(`- ${r.keyword} — ${r.ai_search_volume ?? 0} / month`);
  }
  return md;
}

async function answers() {
  const plan = JSON.parse(await readFile(join(HERE, "questions.json"), "utf8"));
  const md = ["# Answers: ChatGPT and Google AI Overview", "", `ChatGPT model: ${plan.chatgptModel}`, ""];
  const mentions = (text) => /sozo/i.test(text ?? "");

  md.push("## ChatGPT", "");
  for (const [i, prompt] of plan.chatgpt.entries()) {
    const r = await paid(`chatgpt-${i + 1}`, "/ai_optimization/chat_gpt/llm_responses/live", {
      user_prompt: prompt,
      model_name: plan.chatgptModel,
      web_search: true,
      web_search_country_iso_code: "ID",
    });
    const section = (r?.items ?? []).find((it) => it.type === "message")?.sections?.find((s) => s.type === "text");
    const sources = (section?.annotations ?? []).map((a) => `${a.title ?? ""} ${a.url}`);
    md.push(`### ${i + 1}. ${prompt}`, "", `Mentions Sozo: ${mentions(section?.text) ? "YES" : "no"}`, "",
      section?.text ?? "_(no answer)_", "", "Sources:", ...(sources.length ? [...new Set(sources)].map((s) => `- ${s}`) : ["- none"]), "");
  }

  md.push("## Google AI Overview", "");
  for (const [i, keyword] of plan.google.entries()) {
    const serp = await paid(`google-${i + 1}`, "/serp/google/organic/live/advanced", serpBody(keyword));
    const ai = aiOverviewText(serp);
    const organicRank = serp?.items?.find((it) => it.type === "organic" && it.domain?.includes("sozo"))?.rank_group;
    md.push(`### ${i + 1}. ${keyword}`, "", `AI Overview shown: ${ai ? "yes" : "no"} · Mentions Sozo: ${mentions(ai?.text) ? "YES" : "no"} · Sozo in normal results: ${organicRank ? `#${organicRank}` : "not in top results"}`, "");
    if (ai) md.push(ai.text, "", "Sources:", ...(ai.sources.length ? ai.sources.map((s) => `- ${s.title} ${s.url}`) : ["- none"]));
    md.push("");
  }
  return md;
}


// Probe (Spec 018 AC-00, revision 6 rules): runs R-03, R-04a, R-04, R-05,
// R-05a, R-05b, R-08, R-10a and R-12 as the spec writes them, on three real
// clinics. Saves only extracted summaries and the extracted pool (texts,
// volumes, intents, business names seen): no raw responses, no phone numbers.
const PROFILES = [
  { name: "MS Glow Aesthetic Clinic", category: "klinik kecantikan", city: "Bandung",
    brandWords: ["MS Glow", "MS Glow Clinic"], services: ["Laser", "Meso", "Skin rejuvenation", "V shape"] },
  { name: "CS Dental Aesthetic Clinic", category: "klinik gigi", city: "Surabaya",
    brandWords: ["CS Dental"], services: ["Veneer porselen", "Behel (orthodonti)", "Clear aligner", "Implan gigi"] },
  { name: "NK Health", category: "klinik fisioterapi", city: "Jakarta",
    brandWords: ["NK Health"], services: ["Fisioterapi saraf kejepit", "Fisioterapi stroke", "Cedera olahraga pasca operasi", "Nyeri lutut"] },
];
// Founder-editable lists (R-04a, R-05a, R-10a).
const GENERIC = ["klinik", "clinic", "skin", "beauty", "aesthetic", "aesthetics", "estetika", "dental", "dentist", "gigi", "kecantikan", "care", "center", "centre", "health", "medika", "medical", "fisioterapi", "physio", "physiotherapy"];
const OUT_OF_DOMAIN = ["bra", "belt", "sabuk", "celana", "baju", "kaos", "sepatu", "obat", "salep", "apotek", "apotik", "icd", "sikat", "pasta", "jual", "beli", "shopee", "tokopedia", "lazada", "diy", "sendiri", "alami", "rumahan", "tanpa"];
const CONTEXT = ["klinik", "dokter", "drg", "dr", "treatment", "perawatan", "terapi", "tindakan", "pasang", "pemasangan", "harga", "biaya", "tarif", "murah", "terbaik", "rekomendasi", "terdekat"];
const ORDINARY_PLACE_WORDS = ["batu", "medan", "palu", "padang"];
const FILLER = new Set(["layanan", "paket", "promo", "dan", "untuk", "di", "treatment", "perawatan"]);
const UNITS = new Set(["ml", "cc", "g", "gr", "kg", "unit", "sesi", "x"]);
const PROVIDER_WORDS = ["rekomendasi", "terbaik", "terdekat", "bagus", "dimana", "tempat", "klinik", "harga", "biaya", "tarif", "murah"];
const PROVIDER_PAIRS = [["di", "mana"], ["mana", "yang"], ["yang", "mana"], ["berapa", "harga"], ["berapa", "biaya"], ["berapa", "tarif"]];
const PLACE_DEP = [["terdekat"], ["dekat", "sini"], ["di", "sekitar"], ["near", "me"]];
const ID_WORDS = ["yang", "dan", "di", "untuk", "dengan", "bisa", "ini"];
const JAKARTA_PARTS = { "South Jakarta": "Jakarta Selatan", "East Jakarta": "Jakarta Timur", "Central Jakarta": "Jakarta Pusat", "North Jakarta": "Jakarta Utara", "West Jakarta": "Jakarta Barat" };

// Whole-word helpers: lowercase, split on anything that is not a letter or digit.
const toks = (t) => (t ?? "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const hasSeq = (text, seq) => {
  const t = toks(text), q = Array.isArray(seq) ? seq : toks(seq);
  if (!q.length) return false;
  for (let i = 0; i + q.length <= t.length; i++) if (q.every((w, j) => t[i + j] === w)) return true;
  return false;
};
const norm = (t) => toks(t).join(" ");
const subjectWord = (category) => toks(category).filter((w) => w !== "klinik").at(-1) ?? null;
const genericFor = (p) => new Set([...GENERIC, ...toks(p.category)]);
const brandTokens = (p) => [...new Set(p.brandWords.flatMap(toks))].filter((w) => !genericFor(p).has(w));

// R-04a: service -> search phrase.
function searchPhrase(service, p) {
  const brand = new Set(brandTokens(p));
  const t = service.toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g, " ").replace(/-/g, " ").replace(/[0-9]/g, " ").replace(/[^\p{L}\s]/gu, " ");
  let w = t.split(/\s+/).filter(Boolean).filter((x) => !UNITS.has(x) && !brand.has(x) && !FILLER.has(x)).slice(0, 4);
  if (!w.length) return null;
  const subj = subjectWord(p.category);
  if (w.length === 1 && subj && !w.includes(subj)) w = [...w, subj];
  return w.join(" ");
}
function coreWordsOf(phrase, p) {
  const subj = subjectWord(p.category);
  const core = toks(phrase).filter((x) => x !== "klinik" && x !== subj);
  return core.length ? core : toks(phrase);
}
const containsAll = (text, core) => core.every((c) => toks(text).includes(c));
const hasBrand = (text, p) => brandTokens(p).some((b) => toks(text).includes(b));
const isProvider = (q) => PROVIDER_WORDS.some((w) => toks(q).includes(w)) || PROVIDER_PAIRS.some((pair) => hasSeq(q, pair));
const isPlaceDep = (q) => PLACE_DEP.some((seq) => hasSeq(q, seq));

// R-03: place list from DataForSEO's Google locations for Indonesia.
async function placeList() {
  const json = await call("/serp/google/locations/id");
  const rows = (json?.tasks?.[0]?.result ?? []).filter((l) => l.country_iso_code === "ID");
  const entries = [];
  for (const l of rows) {
    const first = (l.location_name ?? "").split(",")[0];
    if (l.location_type === "City") entries.push({ display: JAKARTA_PARTS[first] ?? first, code: l.location_code, name: l.location_name });
    if (l.location_type === "City Region" && first === "Jakarta") entries.push({ display: "Jakarta", code: l.location_code, name: l.location_name });
  }
  return entries;
}
function matchPlace(entries, input) {
  const k = norm(input.replace(/^\s*(kota|kabupaten|kab\.)\s+/i, "")).replace(/^dki jakarta$/, "jakarta");
  const hits = entries.filter((e) => norm(e.display) === k);
  return hits.length === 1 ? hits[0] : null; // R-03: empty when 0 or more than 1 match
}
// R-10a: names another place. Longest names first, no overlapping matches;
// the customer's own place never counts; Jakarta rule: a Jakarta-part customer
// may say "Jakarta" alone, a "Jakarta" customer may name any of the five parts.
function otherPlace(text, entries, place) {
  const t = toks(text);
  const used = new Array(t.length).fill(false);
  const own = place ? norm(place.display) : null;
  const sorted = entries.map((e) => ({ e, d: toks(e.display) })).filter((x) => x.d.length).sort((a, b) => b.d.length - a.d.length);
  for (const { e, d } of sorted) {
    for (let i = 0; i + d.length <= t.length; i++) {
      if (!d.every((w, j) => t[i + j] === w && !used[i + j])) continue;
      for (let j = 0; j < d.length; j++) used[i + j] = true;
      const name = d.join(" ");
      if (own && name === own) continue;
      if (own?.startsWith("jakarta ") && name === "jakarta") continue;
      if (own === "jakarta" && d[0] === "jakarta") continue;
      if (d.length === 1 && ORDINARY_PLACE_WORDS.includes(d[0])) continue;
      return e.display;
    }
  }
  return null;
}
const namesPlace = (q, place) => place && (hasSeq(q, toks(place.display)) || (place.display.startsWith("Jakarta") && toks(q).includes("jakarta")));

// R-05a relevance and R-05b business names.
function relevant(text, phrases, p, place) {
  const t = toks(text);
  if (OUT_OF_DOMAIN.some((w) => t.includes(w))) return false;
  const ctx = new Set([...CONTEXT, ...toks(p.category), subjectWord(p.category), ...(place ? toks(place.display) : [])].filter(Boolean));
  return phrases.some((ph) => containsAll(text, coreWordsOf(ph, p)) && (norm(text) === norm(ph) || (place && norm(text) === norm(`${ph} ${place.display}`)) || t.some((w) => ctx.has(w))));
}
function distinctiveNames(names, p, entries, phrases) {
  const skip = new Set([...genericFor(p), ...entries.flatMap((e) => toks(e.display)), ...phrases.flatMap(toks)]);
  return [...new Set(names.map((n) => toks(n).filter((w) => !skip.has(w)).join(" ")).filter(Boolean))];
}
// "dr." / "drg." with the dot, followed by a name word; bare "drg" stays a context word.
const namesBusiness = (text, distinct) => distinct.find((d) => hasSeq(text, toks(d))) ?? (/\b(dr|drg)\.\s*\p{L}{2,}/iu.test(text) ? "dr./drg." : null);

async function probe() {
  const md = ["# Probe (Spec 018 AC-00, revision 6 rules): discovery on three clinics + real ChatGPT app", ""];
  const langs = await call("/ai_optimization/chat_gpt/llm_scraper/languages");
  const hasId = (langs?.tasks?.[0]?.result ?? []).some((l) => l.language_code === "id");
  const entries = await placeList();
  md.push(`ChatGPT scraper lists Indonesian ('id'): ${hasId ? "yes" : "no / unknown"} · place list entries: ${entries.length}`, "");
  let notThin = 0;
  const scraperRows = [];

  for (const [bi, p] of PROFILES.entries()) {
    const n = bi + 1;
    const place = matchPlace(entries, p.city);
    const googleLoc = place?.code ?? INDONESIA;
    const phrases = p.services.map((s) => searchPhrase(s, p)).filter(Boolean).slice(0, 4);
    if (phrases.length < 2) phrases.push(p.category);
    md.push(`## ${n}. ${p.name} (${p.category}, ${p.city})`, "",
      `Place (R-03): ${place ? `${place.display} → ${place.name} (${place.code})` : "no single match, used Indonesia"}`, "",
      "Phrases (R-04a): " + p.services.map((s) => `"${s}" → "${searchPhrase(s, p) ?? "(skipped)"}"`).join("; "), "");

    // "People also ask" first: its SERPs also give the business names seen (R-04, R-05b).
    const wordings = [];
    const seenNames = [];
    const kota = place ? place.display.toLowerCase() : null;
    const paaSeeds = [kota ? `${p.category} terbaik di ${kota}` : `${p.category} terbaik`, `biaya ${phrases[0]}`];
    for (const [qi, seed] of paaSeeds.entries()) {
      const serp = await paid(`p${n}-paa-${qi + 1}`, "/serp/google/organic/live/advanced", { ...serpBody(seed), location_code: googleLoc, load_async_ai_overview: false }, { raw: false });
      for (const q of peopleAlsoAsk(serp)) wordings.push({ origin: "Orang lain juga bertanya", text: q });
      for (const it of serp?.items ?? []) {
        if (it.type === "local_pack" && it.title) seenNames.push(it.title);
        if (it.type === "organic" && it.website_name) seenNames.push(it.website_name);
      }
    }
    const distinct = distinctiveNames(seenNames, p, entries, phrases);

    // Topics (R-04, R-05, R-05a, R-05b, R-10a), de-duplicated.
    const topics = [];
    const dropped = [];
    const seenTopic = new Set();
    md.push("### Usable topics (R-05)", "");
    for (const [si, phrase] of phrases.entries()) {
      const r = await paid(`p${n}-suggest-${si + 1}`, "/dataforseo_labs/google/keyword_suggestions/live", {
        keyword: phrase, location_code: INDONESIA, language_code: LANG, limit: 20,
        include_seed_keyword: true, order_by: ["keyword_info.search_volume,desc"],
      }, { raw: false });
      const rows = [...(r?.seed_keyword_data ? [{ keyword: phrase, keyword_info: r.seed_keyword_data.keyword_info, search_intent_info: r.seed_keyword_data.search_intent_info }] : []), ...(r?.items ?? [])];
      const core = coreWordsOf(phrase, p);
      const good = [];
      for (const k of rows) {
        if (!k.keyword) continue;
        const key = norm(k.keyword);
        const why = !containsAll(k.keyword, core) ? null
          : seenTopic.has(key) ? "duplicate"
          : (k.keyword_info?.search_volume ?? 0) < 10 ? "volume < 10"
          : hasBrand(k.keyword, p) ? "brand"
          : namesBusiness(k.keyword, distinct) ? `names a business (${namesBusiness(k.keyword, distinct)})`
          : otherPlace(k.keyword, entries, place) ? `other place (${otherPlace(k.keyword, entries, place)})`
          : !relevant(k.keyword, phrases, p, place) ? "not relevant"
          : "";
        if (why === null) continue;
        if (why) { dropped.push({ text: k.keyword, why }); continue; }
        seenTopic.add(key);
        const months = k.keyword_info?.monthly_searches ?? [];
        good.push(k);
        topics.push({ topic: k.keyword, volume: k.keyword_info.search_volume, intent: k.search_intent_info?.main_intent ?? null, month: months[0] ? `${months[0].year}-${String(months[0].month).padStart(2, "0")}` : null, core: coreWordsOf(k.keyword, p) });
      }
      md.push(`- **${phrase}** (core: ${core.join(" ")}): ${good.length} of ${rows.length} — ${good.slice(0, 6).map((k) => `${k.keyword} (${k.keyword_info.search_volume})`).join("; ") || "none"}`);
    }

    // Autocomplete per phrase (R-04).
    for (const [si, phrase] of phrases.entries()) {
      const ac = await paid(`p${n}-autocomplete-${si + 1}`, "/serp/google/autocomplete/live/advanced", {
        keyword: kota ? `${phrase} ${kota}` : phrase, location_code: googleLoc, language_code: LANG,
      }, { raw: false });
      for (const i of ac?.items ?? []) if (i.suggestion) wordings.push({ origin: "Dicari di Google", text: i.suggestion });
    }

    // R-08 counting with R-05a, R-05b and R-10a.
    const seen = new Set();
    const counted = [];
    for (const w of wordings) {
      const key = norm(w.text);
      const why = seen.has(key) ? "duplicate"
        : hasBrand(w.text, p) ? "brand"
        : w.text.length > 120 ? "too long"
        : namesBusiness(w.text, distinct) ? `names a business (${namesBusiness(w.text, distinct)})`
        : otherPlace(w.text, entries, place) ? `other place (${otherPlace(w.text, entries, place)})`
        : !place && isPlaceDep(w.text) ? "place-dependent without a place"
        : !relevant(w.text, phrases, p, place) ? "not relevant"
        : "";
      seen.add(key);
      if (why) { dropped.push({ text: w.text, why }); continue; }
      const t = topics.filter((x) => containsAll(w.text, x.core)).sort((a, b) => b.topic.length - a.topic.length)[0];
      const provider = isProvider(w.text); // R-10: naming the place alone does not make it provider-choice
      counted.push({ ...w, topic: t?.topic ?? null, volume: t?.volume ?? null, provider, keepsLabel: !provider || !place || namesPlace(w.text, place) });
    }
    const thin = topics.length < 6 && counted.length < 5;
    if (!thin) notThin += 1;
    md.push("", `Usable topics: ${topics.length} · real wordings found: ${wordings.length} · counted (R-08): ${counted.length} · **${thin ? "THIN" : "not thin"}** · business names seen: ${distinct.length}`, "",
      "### Counted real wordings", "", ...(counted.length ? counted.slice(0, 15).map((w) =>
        `- [${w.keepsLabel ? w.origin : "Disusun dari topik yang dicari (needs the place added)"}] ${w.text} — ${w.topic ? `topic: ${w.topic} (±${w.volume}/bulan)` : "Tidak ada data jumlah pencarian"}${w.provider ? "" : " (advice)"}`) : ["- none"]),
      "", "### Dropped (first 15)", "", ...(dropped.length ? dropped.slice(0, 15).map((d) => `- ${d.text} — ${d.why}`) : ["- none"]), "");
    await save(`pool-${n}.json`, { clinic: p.name, place: place ? { display: place.display, code: place.code } : null, phrases, businessNamesSeen: distinct, topics, counted, dropped });

    // Two provider-choice questions, naming the place (R-10a), to both sources (R-12).
    const asks = counted.filter((w) => w.provider && w.keepsLabel).map((w) => w.text).slice(0, 2);
    while (asks.length < 2) asks.push(kota ? `${asks.length ? "harga" : `${p.category} terbaik di`} ${asks.length ? `${phrases[0]} di ` : ""}${place.display}` : `${p.category} terbaik`);
    for (const [qi, q] of asks.entries()) {
      const t0 = Date.now();
      const g = await paid(`p${n}-chatgpt-${qi + 1}`, "/ai_optimization/chat_gpt/llm_scraper/live/advanced", {
        keyword: q, location_code: INDONESIA, language_code: LANG, force_web_search: true,
      }, { raw: false });
      const secs = (Date.now() - t0) / 1000;
      const text = g?.markdown ?? "";
      const idHits = ID_WORDS.filter((x) => toks(text).includes(x)).length;
      const sources = (g?.sources ?? []).length;
      const types = [...new Set((g?.items ?? []).map((i) => i.type))];
      const pass = text.length > 0 && idHits >= 3 && sources >= 1 && secs <= 120;
      scraperRows.push(pass);
      const serp = await paid(`p${n}-google-${qi + 1}`, "/serp/google/organic/live/advanced", { ...serpBody(q), location_code: googleLoc, people_also_ask_click_depth: undefined }, { raw: false });
      const ai = aiOverviewText(serp);
      md.push(`### Q${qi + 1}: ${q}`, "",
        `- ChatGPT scraper: ${g ? `${text.length} chars, Indonesian words ${idHits}/7, ${sources} sources, ${secs.toFixed(1)} s, model ${g.model ?? "?"}, item types: ${types.join(", ") || "none"}` : `FAILED after ${secs.toFixed(1)} s`} → **${pass ? "pass" : "fail"}**`,
        `- Google (${place ? place.display : "Indonesia"}): ${ai ? (ai.text ? `summary with text (${ai.text.length} chars, ${ai.sources.length} sources)` : "empty element") : "not shown"}`,
        "", "<details><summary>ChatGPT answer (first 600 chars)</summary>", "", text.slice(0, 600).replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone removed]"), "", "</details>", "");
    }
  }

  const scraperPass = scraperRows.filter(Boolean).length;
  md.splice(2, 0,
    "## AC-00 result", "",
    `- Discovery rule (≥ 2 of 3 clinics not thin): ${notThin} of 3 → **${notThin >= 2 ? "PASS" : "FAIL"}**`,
    `- Scraper rule (≥ 5 of 6 calls: Indonesian text, ≥ 1 source, ≤ 120 s): ${scraperPass} of ${scraperRows.length} → **${scraperPass >= 5 ? "PASS" : "FAIL"}**`, "");
  return md;
}

startBalance = await balance();
const stages = { discover, answers, probe };
if (!stages[stage]) {
  console.error(`Unknown stage "${stage}". Use: ${Object.keys(stages).join(", ")}`);
  process.exit(1);
}
const md = await stages[stage]();
const endBalance = await balance();
md.push("", "## Cost", "", `Balance before: USD ${startBalance}`, `Balance after: USD ${endBalance}`, `Spent this run: USD ${spent.toFixed(4)}`, "", "## Call log", "", ...log.map((l) => `- ${l}`));
await save("SUMMARY.md", md.join("\n") + "\n");
console.log(log.join("\n"));
console.log(`Spent USD ${spent.toFixed(4)}; balance ${endBalance}`);
