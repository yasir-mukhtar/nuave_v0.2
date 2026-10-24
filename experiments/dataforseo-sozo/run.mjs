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


// Probe: does unbranded discovery give usable questions for different
// clinics, and does the real ChatGPT app (LLM Scraper) work for Indonesia?
// Saves only extracted summaries (no raw responses: they hold other
// businesses' phone numbers).
const PROFILES = [
  { name: "Klinik gigi, Surabaya", city: "Surabaya", category: "klinik gigi",
    services: ["scaling gigi", "behel gigi", "tambal gigi", "implan gigi"] },
  { name: "Klinik kecantikan, Bandung", city: "Bandung", category: "klinik kecantikan",
    services: ["facial jerawat", "laser flek hitam", "botox", "skin booster"] },
  { name: "Klinik fisioterapi, Medan", city: "Medan", category: "klinik fisioterapi",
    services: ["fisioterapi saraf kejepit", "fisioterapi stroke", "fisioterapi cedera olahraga"] },
];

async function findLocation(path, city) {
  const json = await call(path);
  const rows = json?.tasks?.[0]?.result ?? [];
  const hit = rows.find((l) => l.country_iso_code === "ID" && new RegExp(`^${city}\\b`, "i").test(l.location_name ?? ""));
  return { total: rows.length, idRows: rows.filter((l) => l.country_iso_code === "ID").length, hit: hit ? { code: hit.location_code, name: hit.location_name, type: hit.location_type } : null };
}

const coreWords = (seed) => seed.split(" ").filter((w) => !["gigi", "klinik"].includes(w) || seed.split(" ").length === 1);

async function probe() {
  const md = ["# Probe: discovery on three clinics + real ChatGPT app", ""];
  const serpLoc = {};
  const gptLoc = {};
  for (const p of PROFILES) {
    serpLoc[p.city] = await findLocation("/serp/google/locations/id", p.city);
    gptLoc[p.city] = await findLocation("/ai_optimization/chat_gpt/llm_scraper/locations/id", p.city);
  }
  const gptLangs = await call("/ai_optimization/chat_gpt/llm_scraper/languages");
  const hasId = (gptLangs?.tasks?.[0]?.result ?? []).some((l) => l.language_code === "id");
  md.push("## Locations", "", `ChatGPT scraper supports Indonesian language: ${hasId ? "yes" : "no / unknown"}`, "");
  for (const p of PROFILES) {
    md.push(`- ${p.city}: Google SERP city location ${serpLoc[p.city].hit ? `${serpLoc[p.city].hit.name} (${serpLoc[p.city].hit.code})` : "NOT FOUND"}; ChatGPT scraper city location ${gptLoc[p.city].hit ? `${gptLoc[p.city].hit.name} (${gptLoc[p.city].hit.code})` : `not found (Indonesia rows: ${gptLoc[p.city].idRows})`}`);
  }

  for (const [bi, p] of PROFILES.entries()) {
    const n = bi + 1;
    md.push("", `## ${n}. ${p.name}`, "");
    const googleLoc = serpLoc[p.city].hit?.code ?? INDONESIA;
    const chatLoc = gptLoc[p.city].hit?.code ?? INDONESIA;

    // Topics: keyword suggestions that contain the service phrase (national volumes).
    md.push("### Topics (keyword suggestions containing the service, Indonesia, monthly searches)", "");
    let usable = 0;
    for (const [si, seed] of p.services.entries()) {
      const r = await paid(`p${n}-suggest-${si + 1}`, "/dataforseo_labs/google/keyword_suggestions/live", {
        keyword: seed, location_code: INDONESIA, language_code: LANG, limit: 15,
        order_by: ["keyword_info.search_volume,desc"], include_seed_keyword: true,
      }, { raw: false });
      const rows = [...(r?.seed_keyword_data ? [{ keyword: seed, keyword_info: r.seed_keyword_data.keyword_info }] : []), ...(r?.items ?? [])];
      const words = coreWords(seed);
      const good = rows.filter((k) => words.every((w) => k.keyword?.includes(w)) && (k.keyword_info?.search_volume ?? 0) >= 10);
      usable += good.length;
      md.push(`- **${seed}**: ${good.length} usable of ${rows.length} — ${good.slice(0, 6).map((k) => `${k.keyword} (${k.keyword_info.search_volume})`).join("; ") || "none"}`);
    }
    md.push("", `Usable topics: ${usable}`, "");

    // Autocomplete for the category + city, then real questions from People also ask.
    const ac = await paid(`p${n}-autocomplete`, "/serp/google/autocomplete/live/advanced", {
      keyword: `${p.category} ${p.city.toLowerCase()}`, location_code: googleLoc, language_code: LANG,
    }, { raw: false });
    const suggestions = (ac?.items ?? []).map((i) => i.suggestion).filter(Boolean);
    md.push(`### Google autocomplete for "${p.category} ${p.city.toLowerCase()}"`, "", ...(suggestions.length ? suggestions.slice(0, 10).map((s) => `- ${s}`) : ["- none"]), "");

    const paaSeeds = [`${p.category} terbaik di ${p.city.toLowerCase()}`, `biaya ${p.services[0]}`];
    const paa = [];
    for (const [qi, seed] of paaSeeds.entries()) {
      const serp = await paid(`p${n}-paa-${qi + 1}`, "/serp/google/organic/live/advanced", { ...serpBody(seed), location_code: googleLoc }, { raw: false });
      paa.push(...peopleAlsoAsk(serp));
    }
    md.push(`### People also ask (seeds: ${paaSeeds.join(" | ")})`, "", ...(paa.length ? [...new Set(paa)].map((q) => `- ${q}`) : ["- none"]), "");

    // Two real questions to the real ChatGPT app and to Google.
    const asks = [...new Set(paa)].slice(0, 2);
    if (asks.length < 2) asks.push(`${p.category} terbaik di ${p.city} yang mana?`);
    for (const [qi, q] of asks.slice(0, 2).entries()) {
      const g = await paid(`p${n}-chatgpt-app-${qi + 1}`, "/ai_optimization/chat_gpt/llm_scraper/live/advanced", {
        keyword: q, location_code: chatLoc, language_code: LANG, force_web_search: true,
      }, { raw: false });
      const brands = [...new Set((JSON.stringify(g?.brand_entities ?? []).match(/"title":"[^"]+"/g) ?? []).map((t) => t.slice(9, -1)))];
      const serp = await paid(`p${n}-google-${qi + 1}`, "/serp/google/organic/live/advanced", { ...serpBody(q), location_code: googleLoc, people_also_ask_click_depth: undefined }, { raw: false });
      const ai = aiOverviewText(serp);
      md.push(`### Q${qi + 1}: ${q}`, "",
        `- ChatGPT app: ${g ? `answered (model ${g.model ?? "?"}, ${(g.markdown ?? "").length} chars, ${(g.sources ?? []).length} sources)` : "FAILED"}; businesses named: ${brands.slice(0, 8).join(", ") || "none listed"}`,
        `- Google: AI summary ${ai ? (ai.text ? `with text (${ai.text.length} chars, ${ai.sources.length} sources)` : "element present but EMPTY") : "not shown"}`,
        "", "<details><summary>ChatGPT app answer (first 600 chars)</summary>", "", (g?.markdown ?? "").slice(0, 600), "", "</details>", "");
    }
  }
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
