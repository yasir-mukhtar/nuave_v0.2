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


// Probe (Spec 018 AC-00): runs R-04a, R-04, R-05, R-08 and R-12 exactly as the
// spec writes them, on three real clinics. Saves only extracted summaries (no
// raw responses: they hold other businesses' phone numbers).
const PROFILES = [
  { name: "MS Glow Aesthetic Clinic", category: "klinik kecantikan", city: "Bandung",
    brandWords: ["MS Glow", "MS Glow Clinic"], services: ["Laser", "Meso", "Skin rejuvenation", "V shape"] },
  { name: "CS Dental Aesthetic Clinic", category: "klinik gigi", city: "Surabaya",
    brandWords: ["CS Dental"], services: ["Veneer porselen", "Behel (orthodonti)", "Clear aligner", "Implan gigi"] },
  { name: "NK Health", category: "klinik fisioterapi", city: "Jakarta",
    brandWords: ["NK Health"], services: ["Fisioterapi saraf kejepit", "Fisioterapi stroke", "Cedera olahraga pasca operasi", "Nyeri lutut"] },
];
const FILLER = new Set(["layanan", "paket", "promo", "dan", "untuk", "di"]);
const UNITS = new Set(["ml", "cc", "unit", "sesi", "x"]);
const PROVIDER = ["rekomendasi", "terbaik", "terdekat", "bagus", "mana", "dimana", "di mana", "harga", "biaya", "berapa", "murah", "tempat", "klinik"];
const PLACE_DEP = ["terdekat", "dekat sini", "di sekitar", "near me"];
const ID_WORDS = ["yang", "dan", "di", "untuk", "dengan", "bisa", "ini"];

const words = (t) => t.toLowerCase().split(/\s+/).filter(Boolean);
const subjectWord = (category) => words(category).filter((w) => w !== "klinik").at(-1) ?? null;

// R-04a: service -> search phrase.
function searchPhrase(service, p) {
  const brand = new Set(p.brandWords.flatMap(words));
  let t = service.toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g, " ").replace(/-/g, " ").replace(/[0-9]/g, " ").replace(/[^\p{L}\s]/gu, " ");
  let w = words(t).filter((x) => !UNITS.has(x) && !brand.has(x) && !FILLER.has(x)).slice(0, 4);
  if (!w.length) return null;
  const subj = subjectWord(p.category);
  if (w.length === 1 && subj && !w.includes(subj)) w = [...w, subj];
  return w.join(" ");
}
function coreWordsOf(phrase, p) {
  const subj = subjectWord(p.category);
  const core = words(phrase).filter((x) => x !== "klinik" && x !== subj);
  return core.length ? core : words(phrase);
}
const containsAll = (text, core) => core.every((c) => new RegExp(`\\b${c}\\b`, "i").test(text));
const hasBrand = (text, p) => p.brandWords.some((b) => text.toLowerCase().includes(b.toLowerCase()));
const isProvider = (q, city) => PROVIDER.some((x) => q.toLowerCase().includes(x)) || (city && q.toLowerCase().includes(city.toLowerCase()));
const placeOk = (q, city) => !PLACE_DEP.some((x) => q.toLowerCase().includes(x)) || (city && q.toLowerCase().includes(city.toLowerCase()));

async function cityLocation(city) {
  const json = await call("/serp/google/locations/id");
  const hit = (json?.tasks?.[0]?.result ?? []).find((l) => l.country_iso_code === "ID" && l.location_type === "City" && new RegExp(`^${city}\\b`, "i").test(l.location_name ?? ""));
  return hit ? { code: hit.location_code, name: hit.location_name } : null;
}

async function probe() {
  const md = ["# Probe (Spec 018 AC-00): discovery on three clinics + real ChatGPT app", ""];
  const langs = await call("/ai_optimization/chat_gpt/llm_scraper/languages");
  const hasId = (langs?.tasks?.[0]?.result ?? []).some((l) => l.language_code === "id");
  md.push(`ChatGPT scraper lists Indonesian ('id'): ${hasId ? "yes" : "no / unknown"}`, "");
  let notThin = 0;
  const scraperRows = [];

  for (const [bi, p] of PROFILES.entries()) {
    const n = bi + 1;
    const loc = await cityLocation(p.city);
    const googleLoc = loc?.code ?? INDONESIA;
    const phrases = p.services.map((s) => searchPhrase(s, p)).filter(Boolean).slice(0, 4);
    if (phrases.length < 2) phrases.push(p.category);
    md.push(`## ${n}. ${p.name} (${p.category}, ${p.city})`, "",
      `Google city location: ${loc ? `${loc.name} (${loc.code})` : "NOT FOUND, used Indonesia"}`, "",
      "Phrases (R-04a): " + p.services.map((s) => `"${s}" → "${searchPhrase(s, p) ?? "(skipped)"}"`).join("; "), "");

    // Topics (R-04, R-05).
    const topics = [];
    md.push("### Usable topics (R-05)", "");
    for (const [si, phrase] of phrases.entries()) {
      const r = await paid(`p${n}-suggest-${si + 1}`, "/dataforseo_labs/google/keyword_suggestions/live", {
        keyword: phrase, location_code: INDONESIA, language_code: LANG, limit: 20,
        include_seed_keyword: true, order_by: ["keyword_info.search_volume,desc"],
      }, { raw: false });
      const rows = [...(r?.seed_keyword_data ? [{ keyword: phrase, keyword_info: r.seed_keyword_data.keyword_info }] : []), ...(r?.items ?? [])];
      const core = coreWordsOf(phrase, p);
      const good = rows.filter((k) => k.keyword && containsAll(k.keyword, core) && (k.keyword_info?.search_volume ?? 0) >= 10 && !hasBrand(k.keyword, p));
      for (const k of good) topics.push({ topic: k.keyword, volume: k.keyword_info.search_volume, core: coreWordsOf(k.keyword, p) });
      md.push(`- **${phrase}** (core: ${core.join(" ")}): ${good.length} of ${rows.length} — ${good.slice(0, 6).map((k) => `${k.keyword} (${k.keyword_info.search_volume})`).join("; ") || "none"}`);
    }

    // Real wordings: autocomplete per phrase + People also ask (R-04).
    const wordings = [];
    for (const [si, phrase] of phrases.entries()) {
      const ac = await paid(`p${n}-autocomplete-${si + 1}`, "/serp/google/autocomplete/live/advanced", {
        keyword: `${phrase} ${p.city.toLowerCase()}`, location_code: googleLoc, language_code: LANG,
      }, { raw: false });
      for (const i of ac?.items ?? []) if (i.suggestion) wordings.push({ origin: "Dicari di Google", text: i.suggestion });
    }
    for (const [qi, seed] of [`${p.category} terbaik di ${p.city.toLowerCase()}`, `biaya ${phrases[0]}`].entries()) {
      const serp = await paid(`p${n}-paa-${qi + 1}`, "/serp/google/organic/live/advanced", { ...serpBody(seed), location_code: googleLoc }, { raw: false });
      for (const q of peopleAlsoAsk(serp)) wordings.push({ origin: "Orang lain juga bertanya", text: q });
    }
    // R-08 counting: brand-free, relevant to a phrase, <= 120 chars, place rule.
    const seen = new Set();
    const counted = wordings.filter((w) => {
      const k = w.text.toLowerCase().trim();
      if (seen.has(k)) return false;
      seen.add(k);
      return !hasBrand(w.text, p) && w.text.length <= 120 && placeOk(w.text, p.city) && phrases.some((ph) => containsAll(w.text, coreWordsOf(ph, p)));
    });
    const thin = topics.length < 6 && counted.length < 5;
    if (!thin) notThin += 1;
    md.push("", `Usable topics: ${topics.length} · real wordings found: ${wordings.length} · counted (R-08): ${counted.length} · **${thin ? "THIN" : "not thin"}**`, "",
      "### Counted real wordings", "", ...(counted.length ? counted.slice(0, 15).map((w) => {
        const t = topics.filter((x) => containsAll(w.text, x.core)).sort((a, b) => b.topic.length - a.topic.length)[0];
        return `- [${w.origin}] ${w.text}${t ? ` — topic: ${t.topic} (±${t.volume}/bulan)` : " — no number"}${isProvider(w.text, p.city) ? "" : " (advice)"}`;
      }) : ["- none"]), "");

    // Two questions to the ChatGPT scraper and Google (R-12).
    const asks = counted.filter((w) => isProvider(w.text, p.city)).map((w) => w.text).slice(0, 2);
    while (asks.length < 2) asks.push(asks.length ? `harga ${phrases[0]} di ${p.city}` : `${p.category} terbaik di ${p.city}`);
    for (const [qi, q] of asks.entries()) {
      const t0 = Date.now();
      const g = await paid(`p${n}-chatgpt-${qi + 1}`, "/ai_optimization/chat_gpt/llm_scraper/live/advanced", {
        keyword: q, location_code: INDONESIA, language_code: LANG, force_web_search: true,
      }, { raw: false });
      const secs = (Date.now() - t0) / 1000;
      const text = g?.markdown ?? "";
      const idHits = ID_WORDS.filter((x) => new RegExp(`\\b${x}\\b`, "i").test(text)).length;
      const sources = (g?.sources ?? []).length;
      const types = [...new Set((g?.items ?? []).map((i) => i.type))];
      const pass = text.length > 0 && idHits >= 3 && sources >= 1 && secs <= 120;
      scraperRows.push(pass);
      const serp = await paid(`p${n}-google-${qi + 1}`, "/serp/google/organic/live/advanced", { ...serpBody(q), location_code: googleLoc, people_also_ask_click_depth: undefined }, { raw: false });
      const ai = aiOverviewText(serp);
      md.push(`### Q${qi + 1}: ${q}`, "",
        `- ChatGPT scraper: ${g ? `${text.length} chars, Indonesian words ${idHits}/7, ${sources} sources, ${secs.toFixed(1)} s, model ${g.model ?? "?"}, item types: ${types.join(", ") || "none"}` : `FAILED after ${secs.toFixed(1)} s`} → **${pass ? "pass" : "fail"}**`,
        `- Google (${loc ? p.city : "Indonesia"}): ${ai ? (ai.text ? `summary with text (${ai.text.length} chars, ${ai.sources.length} sources)` : "empty element") : "not shown"}`,
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
