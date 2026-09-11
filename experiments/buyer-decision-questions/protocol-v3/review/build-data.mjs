#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
const root = path.resolve(process.cwd(), "experiments/buyer-decision-questions/protocol-v3");
const fixtures = JSON.parse(readFileSync(path.join(root,"fixtures/manifest.json"),"utf8")).fixtures.map((x)=>({...x, ...JSON.parse(readFileSync(path.join(root,"fixtures",x.file),"utf8"))}));
const resultDir = path.join(root,"results");
const results = existsSync(resultDir) ? readdirSync(resultDir).filter(x=>x.startsWith("stage1-")&&x.endsWith(".json")).sort().map(x=>JSON.parse(readFileSync(path.join(resultDir,x),"utf8"))) : [];
if (results.length !== 16) throw new Error(`Expected 16 Stage 1 pack records, found ${results.length}`);
mkdirSync(path.join(root,"review"),{recursive:true});
const bundle={schema:"nuave-buyer-decision-protocol-v3-review-data-v1",built_at:new Date().toISOString(),fixtures,results,contract:JSON.parse(readFileSync(path.join(root,"contract.json"),"utf8")),schedule:readFileSync(path.join(root,"review-schedule.md"),"utf8")};
const out = path.join(root,"review","data.js");
writeFileSync(out,`window.PROTOCOL_V3_DATA=${JSON.stringify(bundle).replace(/</g,"\\u003c")};\n`);
console.log(`Wrote ${out} (${fixtures.length} fixtures, ${results.length} packs)`);
