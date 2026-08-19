# 05 — Audit Run

> Status: Working product plan
> Depends on: [`04-questions.md`](./04-questions.md)
> Updated: 2026-08-17

## Objective

Run the customer's ten locked questions as durable, independent AI
observations, preserve every result and attempt as evidence, recover only the
work that genuinely failed, and hand one frozen 10/10 evidence set to the Audit
Report module without requiring the customer to keep a browser page open.

The intended customer reaction is:

> “Nuave is doing the work I paid for. I can see genuine progress, I do not
> have to babysit the page, completed work will not be lost, and I can reach a
> person if something goes wrong.”

The audit run is the irreversible evidence-producing boundary. Before this
phase, the customer can correct facts and questions. After it begins, Nuave
must preserve the exact run design, avoid contaminating discovery questions,
and never rerun a valid result merely because it is commercially inconvenient.

## Position in the journey

```text
Verified payment
  → confirmed business-fact version
  → approved and locked ten-question pack
  → customer selects “Mulai audit sekarang”
  → durable audit job is created exactly once
  → ten questions run independently
  → only technical failures are retried
  → 10 of 10 evaluable observations are saved
  → one frozen evidence set is handed to 06 — Audit Report
  → 06 generates, validates, and delivers the report
```

Starting the durable job consumes the one-audit entitlement. Technical retries,
reopening the progress page, and retrying report generation never consume a
second order.

## Settled product decisions

1. The main customer experience does not foreground ChatGPT, OpenAI, Gemini,
   model names, API names, reasoning settings, or other provider mechanics.
2. Exact execution details remain available at the lowest information
   hierarchy in the report method footer, evidence export, and internal record.
3. One production audit uses one provider and one method. Nuave never mixes
   providers inside a run.
4. The current Groq/Tavily path is testing-only and must not produce a paid
   customer report or act as a production fallback.
5. The production implementation starts with OpenAI Responses API,
   GPT-5.6 Luna, required web search, low reasoning, Indonesian responses, and
   verified approximate location only when relevant.
6. The audit runs as a durable background job. Closing the page, changing
   network, or returning from another authorized device does not stop it.
7. Every question runs independently with no shared conversation history.
8. The execution request receives the neutral method instruction, exact locked
   question, and applicable verified location—not the full business brief.
9. Begin with two observations running concurrently after durable jobs exist.
10. Retry only technically failed questions. Never restart all ten because one
    failed.
11. Use one initial attempt and up to two automatic technical retries per
    question. A later customer-initiated retry remains available for a
    persistently failed question.
12. A valid negative, uncertain, conflicting, or source-less response is an
    observation, not a technical failure. A substantive refusal is evaluable;
    a provider or policy block with no usable answer is not.
13. The Audit Run hands evidence to 06 only after ten of ten observations are
    evaluable and frozen.
14. Report generation, report retries, report-ready email, delivery failure,
    and resend belong to 06. They reuse the frozen evidence and never rerun
    audit questions.
15. Every question attempt, configuration, source, cost, timestamp, and safe
    failure category remains in the evidence record.
16. The progress page may display report state returned by 06, but 06 owns any
    report-stage help incident and founder notification. This module owns help
    only for audit-start and observation failures.

## Target journey versus implementation phases

This document describes the final paid Audit Run behavior. It is not one
implementation package. Phase 3 connects the protected live observation path
and report-quality gate without requiring real payment, durable jobs, or
customer email. Phase 4 adds durable jobs and hands frozen evidence to 06.
Phase 5 later binds the same start transaction to a real paid entitlement.

## Customer-facing information hierarchy

The customer bought a business audit, not an API tutorial. The primary
experience explains:

- what Nuave is doing;
- how many questions are complete;
- whether anything needs another attempt;
- that the page may be closed safely;
- when the report is being prepared; and
- what the customer can do when recovery is needed.

Do not place provider or model terminology in the page title, progress summary,
question status, completion message, or primary report result.

Use:

> Nuave sedang menjalankan 10 pertanyaan yang Anda setujui. Setiap pertanyaan
> diuji secara terpisah.

Do not use:

> Nuave sedang menjalankan 10 panggilan OpenAI Responses API dengan GPT-5.6
> Luna dan web search.

### Method disclosure

Technical honesty remains mandatory but subordinate. Put it in:

- a collapsed **Tentang audit ini** section near the web-report footer;
- the method note in the PDF;
- the evidence export; and
- the restricted internal run record.

Customer-facing collapsed copy:

> **Tentang audit ini**
>
> Audit menjalankan setiap pertanyaan secara terpisah dengan pencarian web.
> Hasil merupakan pengamatan pada waktu tertentu dan dapat berubah.
>
> `[Lihat detail metode]`

Expanded details include the execution surface, requested and returned model,
language, approximate location when used, run date and time range, web-search
condition, retry count, and method version. Do not present an API result as the
customer's own personalized ChatGPT session.

## Production execution surface

### Initial production choice

The first implementation candidate is:

- OpenAI Responses API;
- GPT-5.6 Luna;
- web search required;
- low reasoning;
- medium answer verbosity;
- Indonesian output;
- one bounded search call initially;
- no stored provider conversation state; and
- an approximate verified location only for genuinely local questions.

This is an implementation choice, not primary customer copy. It must still
pass a live ten-question quality, latency, cost, and source-capture check before
the first paid delivery.

### One provider per audit

The provider and method are locked when the durable job is created. If the
production provider is unavailable:

- pause or retry the affected question using the same provider;
- retain the failed attempt;
- never switch that question to Gemini, Groq, Tavily, or another provider; and
- never merge outputs from different surfaces into one apparently uniform
  result.

A future Gemini audit may exist as a separately named surface or product
component. It is not an invisible fallback for this run.

### Testing-only providers

Groq/Tavily remains isolated behind non-production configuration. Production
startup or deployment must fail closed rather than silently selecting it when
the intended provider credential is missing.

Testing-only data must not be:

- attached to a paid order;
- included in a customer report;
- counted toward the ten observations;
- emailed as a completed audit; or
- used as automatic recovery for a production failure.

Cleanup of the test path is a later bounded engineering task; this plan does
not require that cleanup before specifying the production run contract.

## Observation request contract

Each of the ten questions is a new, independent observation.

The provider receives only:

1. a short neutral instruction;
2. the exact locked question text; and
3. a verified approximate country, city, or region when that context is
   relevant and not already sufficient in the question.

The provider does not receive:

- the complete Business Facts brief;
- the name of the audited business when the question intentionally omits it;
- a hidden brand, competitor, offering, URL, or differentiator hint;
- the report scoring method;
- the desired appearance outcome;
- another question's answer or sources;
- the customer's email or payment information; or
- a request to help Nuave produce a favorable report.

This separation is non-negotiable. Adding the audited brand to search or model
context for a discovery question destroys the measurement it is intended to
make.

### Neutral response instruction

The production instruction should preserve this substance:

```text
Jawab pertanyaan pengguna secara alami dalam Bahasa Indonesia.
Gunakan pencarian web.
Jangan membahas Nuave, audit, skor, metodologi, atau cara pertanyaan dibuat.
Jangan mengutamakan bisnis tertentu.
Jika informasi publik tidak lengkap atau berbeda, jelaskan ketidakpastiannya.
```

Keep it short. The response model acts as a general AI assistant answering the
customer's question, not as Nuave's auditor or report writer.

### Location

Use only the confirmed business market context:

- country: Indonesia;
- city: the confirmed city, when the decision is local; and
- region: the confirmed region, only when useful.

Do not use device GPS, IP-derived location, a customer's home location, or an
unverified default city. Omit location metadata for national ecommerce,
software, or service questions when a local city would distort the answer.

The question text remains the primary expression of market scope. Location
metadata must not silently change a nationwide question into a local one.

## Durable job architecture

The browser observes the audit; it does not own or execute it.

### Start transaction

When the customer confirms **Mulai audit sekarang**, the server performs one
atomic operation:

1. Verify the private order access and successful paid entitlement.
2. Confirm that the entitlement has not already started another audit.
3. Lock the confirmed business-fact version.
4. Lock the exact ten-question pack and its order.
5. Lock provider, model request, language, location, search, and instruction
   versions.
6. Create one durable audit job and ten observation records.
7. Mark the entitlement consumed by that job.
8. Return the existing job if the customer double-clicks or repeats the start
   request.

There must be no state where payment is consumed but no recoverable job
reference exists.

### Background worker

The worker:

- claims queued questions safely;
- runs no more than the configured concurrency;
- persists attempt start before calling the provider;
- persists the result immediately after the provider returns;
- releases or recovers abandoned work after a bounded lease;
- schedules technical retries without duplicating completed work;
- starts report generation only after all ten observations are evaluable; and
- can resume after a server restart or deployment.

The first version does not need a generalized workflow platform. A small
database-backed job table and one bounded worker mechanism are enough if they
satisfy durability, idempotency, and recovery.

### Browser progress

The progress page reads durable server state through polling, server events, or
another simple read channel. Streaming is optional presentation. It must not be
the only record of progress.

On refresh or another authorized device, the page reconstructs its state from
the server. It never starts a replacement audit merely because the original
connection ended.

## Run and question states

### Overall job states

The minimum customer-relevant state model is:

```text
queued
  → running_questions
  → retrying_questions, when needed
  → observations_complete
  → generating_report
  → retrying_report, when needed
  → report_ready
```

Recovery branches:

```text
running_questions
  → question_attention_required

generating_report or retrying_report
  → report_attention_required
```

Internal implementation may use more detailed states, but it must not collapse
technical failure into business non-appearance.

### Per-question states

Customer-facing labels:

| Internal condition | Customer label |
|---|---|
| Not claimed | **Menunggu** |
| Provider call active | **Sedang diuji** |
| Technical retry scheduled or active | **Mencoba kembali** |
| Evaluable response durably saved | **Selesai** |
| Automatic technical recovery exhausted | **Belum berhasil diuji** |

Do not show raw stack traces, HTTP status codes, safety systems, cost errors, or
provider messages in the question row.

## Concurrency and ordering

Preserve the customer-approved question order in storage and the report.
Execution order does not create conversational context because every question
is independent.

After durable jobs are implemented, begin with concurrency **two**:

- at most two active observation calls;
- remaining questions remain queued;
- a retry joins the queue without invalidating another result; and
- the budget reservation remains server-side and concurrency-safe.

Concurrency two is a starting point, not a promise. Measure rate-limit errors,
latency, job completion time, and cost before increasing it. Do not run all ten
simultaneously merely to make the progress screen finish faster.

Before durable jobs and concurrency-safe budget accounting exist, keep the
private prototype sequential.

## What counts as a completed observation

Automatic report delivery requires ten of ten **evaluable observations**, not
ten favorable or source-rich answers.

### Completed and evaluable

These count toward 10/10 when the provider returned a usable response through
the locked method:

- the audited business did not appear;
- another business was recommended;
- the AI could not find the requested public information;
- public sources conflict;
- the response has uncertainty;
- no source was cited even though the required search action completed;
- the AI substantively declined to recommend or verify while still returning a
  usable answer; or
- the response contains inaccurate information.

They may lead to `not assessed`, `incomplete information`, `conflicting
information`, or another evidence status later. They are not technical
failures and cannot be retried to seek a more desirable answer.

### Technical failure

These do not count toward 10/10:

- connection timeout before a usable provider response is received;
- temporary provider or network failure;
- rate limiting that returns no observation;
- required web search did not execute;
- empty response;
- truncated output that cannot be evaluated;
- server process ended before the result was durably saved; or
- an invalid provider response could not be normalized safely; or
- a provider or policy refusal blocked the request and returned no usable
  answer.

The implementation must use safe, finite internal failure codes rather than
matching arbitrary provider prose in customer-facing logic.

## Question retry contract

### Automatic retries

For one technically failed question:

1. Persist the failed attempt.
2. Keep all completed questions unchanged.
3. Retry the exact question using the same locked configuration.
4. Use bounded backoff appropriate to the safe failure category.
5. Allow up to two automatic retries after the initial attempt.
6. Stop retrying as soon as one evaluable response is saved.

The retry uses the same:

- exact question text;
- provider and requested model;
- response instruction version;
- language;
- approximate location;
- search configuration; and
- method version.

Record the actual returned model and timestamp for every attempt. If the
provider changes the model behind an alias between attempts, preserve and
disclose that difference in the method record.

### Customer-initiated retry

If automatic recovery is exhausted, show only the affected question or
questions:

> **9 dari 10 pertanyaan selesai**
>
> Satu pertanyaan belum berhasil dijalankan karena gangguan teknis. Hasil yang
> sudah selesai tetap tersimpan dan tidak akan diulang.
>
> `[Coba lagi pertanyaan ini]`

The action creates one new attempt for that question. It cannot rerun any
completed question, modify the locked wording, change providers, or consume a
new purchase.

Once a usable result exists, the retry action disappears. The customer cannot
rerun a valid negative result until a preferred answer appears.

### Persistently unrecoverable question

If the same question cannot be technically executed after automatic and later
customer-initiated recovery, the report remains undelivered because the paid
scope is ten questions. Show a support path and route the order to a remedy
rather than quietly delivering nine.

The settled immediate remedy is delayed delivery, another targeted retry when
safe, and **Minta bantuan** for founder-assisted recovery. Founder support may
retry only the still-failed work under the locked method. It cannot replace the
question, change providers, edit evidence, or rerun a valid observation. Record
every intervention. The maximum delay and terminal remedy remain open and must
be settled before public checkout copy promises a final deadline.

## Ten-of-ten delivery gate

The report pipeline starts automatically only when:

- all ten locked question records exist;
- each has one selected evaluable observation;
- the selected observation belongs to the locked provider and method;
- every attempt and source record is durable;
- the job has not been cancelled, revoked, or replaced; and
- the evidence set passes structural integrity checks.

Do not produce an automatic paid report from eight or nine observations. Nuave
sells ten tests and delivers ten tests.

Do not misinterpret 10/10 as requiring:

- ten mentions of the business;
- ten citations;
- ten confident answers;
- ten web sources visible in the final answer; or
- ten positive recommendations.

It means ten questions were successfully executed through the agreed method
and produced ten usable observations.

## Report handoff to 06 — Audit Report

Observation collection and report generation are separate durable stages.
This module owns the frozen evidence handoff. `06 — Audit Report` owns report
generation, validation, report-stage support, report-ready email, delivery
failure, and resend. The requirements below constrain that handoff and the
report state displayed on the shared progress page; they are not implementation
ownership for 05.

When the tenth observation completes:

1. Freeze the evidence-set version.
2. Run deterministic integrity and count preparation.
3. Start one report-generation attempt from the saved evidence.
4. Save the report draft and its validation result.
5. Deliver only a report that passes the report integrity and writing gates.

If report generation fails:

- retain all ten observations unchanged;
- retry only report generation;
- do not call the observation provider again;
- persist every report attempt and safe failure category;
- keep the customer informed that the audit results are safe; and
- make help available immediately.

Begin with one initial report-generation attempt and up to two automatic report
retries, subject to the report plan's evidence-integrity rules. An integrity
violation must never be “fixed” by changing protected observed facts.

## Report-stage help requirements for 06

### Product principle

A customer who has paid and sees a failed report must never reach a dead end.
The page should both continue safe automatic recovery and provide a clear human
help path.

Do not depend on the customer pressing the button to discover the problem.
Nuave should record the failure automatically. When automatic report recovery
is exhausted, it should also send an operational alert automatically. The help
button tells the founder that the customer is actively asking for assistance
and confirms how to contact them.

### Failure banner

Show this banner whenever a report attempt has failed, even while Nuave is
preparing an automatic retry:

> **Laporan belum berhasil dibuat**
>
> Sepuluh hasil pengujian Anda sudah tersimpan dan tidak akan dijalankan ulang.
> Nuave sedang mencoba menyiapkan laporan kembali.
>
> `[Minta bantuan]`

Do not say the results are safe unless the server has verified all ten durable
observations.

If automatic recovery is exhausted:

> **Kami memerlukan bantuan untuk menyelesaikan laporan Anda**
>
> Semua hasil pengujian sudah tersimpan, tetapi laporan belum berhasil dibuat.
> Anda dapat meminta bantuan tanpa menjalankan ulang audit.
>
> `[Minta bantuan]`

Do not expose the provider, exception, validation rule, or raw failure message
in the banner.

### One-click help request

Selecting **Minta bantuan**:

1. Authenticates the private order session.
2. Creates or reuses one support incident for this order and failure stage.
3. Marks `customer_requested_help` with a timestamp.
4. Sends an idempotent founder notification.
5. Confirms the masked recipient email that Nuave may use for this order.
6. Does not ask the customer to re-enter business, payment, or audit details.

Success state:

> **Permintaan bantuan sudah dikirim**
>
> Kami akan menghubungi **ya•••@example.com** mengenai pesanan ini.

Do not promise a response time until a truthful support commitment has been
approved. Provide a **Kirim ulang pemberitahuan** action only if delivery status
is known to have failed; repeated clicks must not create duplicate incidents or
notification storms.

### Founder notification content

The founder needs enough information to answer: who encountered the issue,
when, where in the journey, what failed, and what has already been attempted.

Include:

- support incident reference;
- Nuave order reference;
- audited business name and exact scope;
- report recipient email;
- customer-help-requested timestamp and timezone;
- first failure and latest failure timestamps;
- environment or deployment identifier;
- stage: `report_generation`;
- audit job reference and evidence-set version;
- confirmation that 10/10 observations are durable;
- report attempt count;
- safe internal failure category and error reference;
- requested and returned report model, internally;
- whether automatic recovery remains active or is exhausted;
- private authenticated internal link to inspect the incident; and
- last customer-visible state.

Do not include in the notification body:

- raw provider answers;
- full source contents;
- model reasoning;
- payment credentials or Midtrans secrets;
- private access secrets or bearer proofs;
- customer free text unrelated to the incident;
- stack traces; or
- raw provider payloads.

The recipient email is necessary internal support context, but it remains out
of model prompts, reports, analytics, and Git.

### Notification mechanism

Use Resend for one transactional email to the configured founder-alert address,
consistent with essential Nuave order and report email. Customer-facing replies
come from **Tim Nuave <support@nuave.ai>**. Do not add Slack, a CRM, ticketing
platform, or multi-channel escalation before support volume proves the need.

Persist the incident before sending the email. Email failure must not erase the
support request. The internal incident remains visible and the notification can
be retried idempotently.

### Support resolution routing

The authenticated Module 05 run-stage support view may:

- inspect safe job and attempt metadata;
- retry only a technically failed observation under the locked method;
- confirm whether the evidence set has reached 10/10;
- record the selected remedy;
- grant one replacement audit chance linked to the original order after a
  verified customer wrong-business mistake, preserve the original run, and
  return the customer to 03 for new fact and question approval; and
- close the incident with an internal resolution category.

Report generation, report completion, report-ready email, and resend route to
06. Access provisioning and recovery route to 07. Module 05 support stops at
run-stage recovery or the frozen 10/10 evidence handoff.

Founder support must not edit raw observations, replace unfavorable answers,
change counts, or publish a report that fails the evidence-integrity gate.
The replacement-audit grant is an exceptional order remedy, not permission to
change or erase the original audit. Creating a replacement order is the last
resort.

## Dedicated customer-screen simulation

The following simulation uses the fictional **Kopi Taman Senja** order from the
previous plans. It contains no real result or customer.

### Job accepted

> ## Audit bisnis Anda sudah dimulai
>
> Nuave sedang menjalankan 10 pertanyaan yang Anda setujui. Setiap pertanyaan
> diuji secara terpisah.
>
> **0 dari 10 selesai**
>
> **Anda tidak perlu menunggu di halaman ini**
>
> Audit akan tetap berjalan jika halaman ditutup. Petunjuk akses laporan akan
> dikirim ke **ya•••@example.com** setelah selesai.
>
> `[Tetap lihat proses]` `[Tutup halaman]`

The close action does not cancel anything. It may navigate to the order-status
page or safely close the current modal; a web page cannot promise to close a
browser tab that it did not open.

### Normal progress

> ## Audit bisnis Anda sedang berjalan
>
> **6 dari 10 pertanyaan selesai**
>
> Waktu berjalan: **1 menit 42 detik**
>
> Anda boleh menutup halaman ini. Audit akan tetap berjalan.

Question rows:

> **1.** Rekomendasikan tempat yang asik untuk ngopi dan WFC di Dago.  
> **Selesai**

> **2.** Tempat rapat kecil di Bandung yang ada makanan, minuman, dan bisa
> dipakai kerja di mana ya?  
> **Selesai**

> **3.** Kedai kopi apa aja di Dago yang cocok untuk WFC atau meeting?  
> **Sedang diuji**

> **4.** Di mana ada cafe yang menyediakan kopi lokal dan bisa untuk kerja atau
> WFC di Bandung?  
> **Menunggu**

Continue through all ten exact questions. Do not show partial answers or
partial findings on this page.

### One question retrying

> ## 9 dari 10 pertanyaan selesai
>
> Satu pertanyaan belum berhasil dijalankan dan sedang dicoba kembali.
> Pertanyaan lain tidak akan diulang.

Affected row:

> **8.** Di mana alamat Kopi Taman Senja? Buka jam berapa?  
> **Mencoba kembali · percobaan 2**

### Automatic question recovery exhausted

> ## 9 dari 10 pertanyaan selesai
>
> Satu pertanyaan belum berhasil dijalankan karena gangguan teknis. Hasil yang
> sudah selesai tetap tersimpan dan tidak akan diulang.
>
> `[Coba lagi pertanyaan ini]` `[Minta bantuan]`

The report is not generated yet.

### All observations complete

> ## 10 dari 10 pertanyaan selesai
>
> Nuave sedang memeriksa bukti dan menyiapkan laporan Anda.
>
> Anda tetap boleh menutup halaman ini. Kami akan mengirimkan petunjuk akses
> laporan setelah selesai.

### Report generation failed but retrying

> **Laporan belum berhasil dibuat**
>
> Sepuluh hasil pengujian Anda sudah tersimpan dan tidak akan dijalankan ulang.
> Nuave sedang mencoba menyiapkan laporan kembali.
>
> `[Minta bantuan]`

### Report needs human attention

> ## Kami memerlukan bantuan untuk menyelesaikan laporan Anda
>
> Semua hasil pengujian sudah tersimpan, tetapi laporan belum berhasil dibuat.
> Anda dapat meminta bantuan tanpa menjalankan ulang audit.
>
> `[Minta bantuan]`

After the action:

> **Permintaan bantuan sudah dikirim**
>
> Kami akan menghubungi **ya•••@example.com** mengenai pesanan ini.

### Report ready

> ## Laporan Anda sudah siap
>
> Audit untuk **Kopi Taman Senja** selesai pada 17 Agustus 2026.
>
> Petunjuk akses laporan juga sudah dikirim ke **ya•••@example.com**.
>
> `[Lihat laporan]`

Do not use **Selamat!** merely because processing completed. The report may
contain unfavorable evidence.

## Progress and time presentation

Show:

- completed question count;
- exact questions and honest states;
- elapsed time from durable job start;
- whether recovery is active;
- the safe-to-close message; and
- masked report-recipient email.

Do not show:

- fake provider thinking;
- fabricated live answer excerpts;
- a smooth percentage unrelated to completed observations;
- a remaining-time estimate before sufficient latency evidence exists;
- provider or model terminology in the primary hierarchy;
- raw technical errors; or
- a celebration before the report is ready.

After a representative sample of complete runs, Nuave may show a broad,
truthful expectation such as **“Biasanya selesai dalam beberapa menit.”** It
must be derived from observed completion times and include retry cases.

## Evidence retained for each question

For every locked question retain:

- audit job, order, and question-pack references;
- exact question text and order;
- final name/no-name classification;
- selected evaluable observation reference;
- every attempt in order;
- attempt start and completion timestamps;
- system and execution surface;
- requested and returned model;
- neutral instruction version;
- language;
- approximate location, when used;
- search configuration;
- provider search action or query when safely returned;
- raw answer or restricted durable reference;
- inline cited sources;
- complete consulted-source list available from the provider;
- response ID;
- token usage, web-search calls, and accounted cost;
- latency;
- provider completion status;
- safe failure category;
- whether the attempt was automatic or customer-initiated; and
- the rule used to select the reported attempt.

Keep raw answers and unnecessary provider metadata in restricted evidence
storage. The customer report displays only what its evidence and method sections
need. Sources displayed to the customer are visible and clickable.

## Operational cost controls

Cost protection is enforced server-side and attached to the durable order. The
browser cannot lower prior accounted spend, change the limit, increase retry
allowance, or select another provider.

Retain:

- one configured run ceiling;
- one observation-call ceiling per question attempt;
- one search-call allowance initially;
- maximum output tokens;
- maximum attempts per automatic retry policy;
- concurrency limit;
- report-call ceiling; and
- aggregate actual and conservatively reserved cost.

Concurrency must reserve budget atomically. Two workers cannot both observe the
same remaining allowance and overspend it.

Cost exhaustion caused by Nuave's internal configuration is not presented as a
customer fault. Preserve completed work, stop safely, expose help, and route the
order to founder attention.

## Privacy and trust requirements

- Keep recipient email and payment data out of observation and report model
  prompts.
- Do not send raw answers, sources, or provider payloads in founder-notification
  email.
- Use only public business information and confirmed market context.
- Do not use customer device or IP location to influence the audit.
- Do not store provider conversation history when an independent response is
  sufficient.
- Keep private report and order access secrets out of logs and notification
  bodies.
- Never treat a citation URL alone as visible business appearance.
- Never retry an unfavorable result to seek a better one.
- Never change protected observations during report recovery or founder help.
- Record every support action that can affect delivery or remedy status.

## Failure and recovery matrix

| Situation | Customer experience | System behaviour |
|---|---|---|
| Start is clicked twice | One audit-progress destination | Return the same durable job; consume one entitlement |
| Page closes during questions | No interruption | Worker continues; reopening restores state |
| Network changes | Progress may pause briefly in browser | Durable job continues; client reconnects to saved state |
| One question times out | Show **Mencoba kembali** | Retry only that question with the same configuration |
| One question returns a valid negative answer | Show **Selesai** | Preserve it; never retry for desirability |
| Provider returns a substantive refusal with a usable answer | Show **Selesai** | Preserve it as an observation; later dimensions may be not assessed |
| Provider or policy block returns no usable answer | Show retrying or not yet tested | Preserve the attempt and apply targeted same-method recovery |
| Web search was required but did not run | Show retrying or not yet tested | Treat as technical failure; retry only that question |
| Automatic question retries are exhausted | Show completed count, affected question, retry and help actions | Preserve completed observations and await targeted recovery |
| Tenth observation completes | Show report preparation | Freeze evidence and start report generation once |
| Report generation fails | Show failure banner and help action | Preserve observations, record incident, retry only report generation |
| Report retries are exhausted | Show human-attention state | Notify founder automatically; keep help request available |
| Customer requests help repeatedly | Show one existing request | Reuse incident and suppress duplicate notifications |
| Founder notification email fails | Customer request remains recorded | Retry notification; incident is still visible internally |
| Report later succeeds after help request | Show and email the report | Update incident; do not create another audit |
| Report email fails in 06 | Report remains ready through its private access | 06 retries delivery and exposes help; it does not rerun report or questions |

## Evaluation before production approval

Run at least one complete Indonesian ten-question audit for the first supported
vertical and city, then repeat enough times to evaluate operational variation.

Measure:

- ten-question completion rate;
- per-question latency and total job duration;
- rate-limit and transient-failure frequency;
- automatic retry success rate;
- provider search execution rate;
- source and citation capture quality;
- Indonesian answer naturalness;
- discovery contamination checks;
- actual and reserved cost;
- browser close/reopen recovery;
- worker restart recovery;
- report generation success and retry behaviour;
- help-incident creation and notification delivery; and
- absence of duplicate jobs, observations, emails, and incidents.

### Production gate

The run is ready for paid-customer verification only when:

- closing and reopening the page does not lose or duplicate work;
- every discovery observation receives no hidden audited-business identity;
- all ten questions can complete or enter targeted recovery independently;
- retries never rerun completed questions;
- the report starts only at 10/10 evaluable observations;
- report failure preserves all evidence and exposes working help;
- a founder notification contains actionable safe context and no secrets;
- cost limits remain correct under concurrency and retries; and
- the resulting method disclosure matches the actual run.

## Implementation work packages

This plan is not an approved implementation specification. Before code changes,
the orchestrator must reconcile it with canonical audit, product, report,
delivery, privacy, and payment contracts and prepare or amend one bounded
approved specification.

The eventual implementation order is:

### 1. Canonical audit contract

- Update `docs/AUDIT.md` for dynamic question composition, Indonesian
  execution, one production surface, durable jobs, targeted retries, and the
  10/10 gate.
- Update `docs/PRODUCT.md` so the customer journey no longer assumes a
  browser-bound run.
- Define the production surface in ordinary internal terms while preserving
  low-hierarchy customer disclosure.
- Resolve the commercial remedy for a persistently unexecutable question or
  report.

### 2. Durable data and entitlement boundary

- Store orders, one consumed entitlement, one audit job, locked fact and
  question versions, ten observation records, attempts, and the frozen evidence
  set required by 06.
- Make audit start idempotent and atomic.
- Restore the durable run through the access mechanism selected by the later
  access-and-recovery module.

### 3. Worker and provider isolation

- Move observation execution out of the browser request lifecycle.
- Lock one production provider and configuration per job.
- Exclude Groq/Tavily from production selection.
- Add concurrency-safe budget reservation and a starting limit of two.

### 4. Observation integrity

- Pass no business brief to discovery observations.
- Use the exact Indonesian question and neutral instruction.
- Capture complete evidence and safe telemetry.
- Distinguish evaluable responses from technical failure.

### 5. Targeted retry system

- Add one initial plus two automatic attempts per technical failure.
- Queue only the affected question.
- Add customer-initiated retry for exhausted technical failures.
- Prevent repeat execution after a valid response exists.

### 6. Progress experience

- Build durable progress reads and reconnection.
- Add Indonesian question states and safe-to-close messaging.
- Avoid partial-answer display and provider jargon.
- Restore correctly after refresh and another authorized device.

### 7. Evidence handoff to 06

- Freeze the evidence set at 10/10.
- Emit one idempotent report request bound to the evidence-set version.
- Expose report state from 06 as read-only progress without owning report
  generation, email, delivery failure, or resend.

### 8. Run-stage help and notification

- Create one support incident for audit-start or observation failure.
- Add idempotent **Minta bantuan** behavior.
- Send founder notification through the selected transactional email service.
- Build the smallest authenticated internal incident view needed for recovery.
- Leave report-stage incident and email behavior to 06.

### 9. Independent verification

- Verify every state transition and acceptance criterion.
- Simulate browser closure, process restart, provider timeout, partial question
  failure, report failure, notification failure, and repeated customer actions.
- Inspect one complete real evidence record and customer-facing method
  disclosure for exact agreement.

## Acceptance criteria

The Audit Run touchpoint is ready for implementation verification when:

1. One explicit start action creates or returns exactly one durable audit job
   and consumes one paid entitlement.
2. The exact fact version, ten questions, question order, provider, language,
   location, search settings, and instruction version are locked before work
   starts.
3. The primary progress experience uses ordinary customer language and does not
   foreground a provider or model.
4. Exact method details remain accessible in the report footer, PDF, evidence
   export, and internal record.
5. Groq/Tavily cannot be selected for a production paid job.
6. Closing, refreshing, reconnecting, or using another authorized device does
   not stop, replace, or duplicate the audit.
7. Every question executes in a new independent context.
8. Discovery requests receive no hidden audited-business identity or full
   business brief.
9. Indonesian questions receive Indonesian answers under the neutral response
   instruction.
10. Only verified relevant approximate location is used.
11. At most two observations run concurrently in the initial durable
    implementation.
12. Each attempt is persisted before and after the provider call with complete
    safe evidence and telemetry.
13. Valid negative, uncertain, conflicting, source-less, inaccurate, or
    substantive-refusal responses count as completed observations; provider or
    policy blocks without a usable answer do not.
14. Only technical failures trigger retries.
15. One failed question retries independently and leaves all completed
    observations unchanged.
16. Automatic recovery performs at most two retries after the initial attempt.
17. A customer can later retry only a still-failed question without another
    payment.
18. A completed question cannot be rerun through the recovery interface.
19. Exactly one report request is handed to 06 only after all ten observations
    are evaluable, durable, and frozen.
20. A report retry or delivery retry in 06 can never rerun an observation.
21. Automatic observation-recovery exhaustion notifies the founder even if the
    customer leaves the page.
22. The run-stage help action creates or reuses one incident, records the request, sends
    an idempotent notification, and confirms the masked recipient email.
23. Founder notification identifies who, when, where in the journey, what safe
    category failed, what was attempted, and how to inspect it without exposing
    secrets or raw evidence.
24. Notification-delivery failure does not lose the incident.
25. Cost ceilings remain enforced atomically across concurrency and retries.
26. The report and evidence export exactly describe the method and attempts
    that actually occurred.
27. Automated tests and independent review pass the production gate.

## Known conflicts requiring reconciliation

The founder-approved direction intentionally changes current repository
behaviour:

- `src/app/api/audit/run/route.ts` currently owns the run inside one streaming
  HTTP request and uses sequential concurrency one.
- `src/app/audit/AuditWorkflow.tsx` treats a closed stream as an interrupted run
  and does not restore a durable server job.
- `src/app/audit/AuditStages.tsx` currently offers to rerun all ten after an
  interruption rather than only failed questions.
- OpenAI and Gemini observation instructions currently ask for English answers.
- The Groq/Tavily test path injects the audited business into search and model
  context and must remain outside production.
- Current budget limits allow ten observation calls total, which does not yet
  account for targeted technical retries.
- Current storage is browser session state rather than durable order, attempt,
  evidence, report, and incident state.
- No transactional support incident or founder-notification path exists.
- The current fixture includes one failed observation for evidence testing, but
  the paid target requires 10/10 evaluable observations before automatic
  delivery. The fixture is not permission to deliver a partial paid report.

An implementor must not repair these only with front-end messages. Durable
state, provider isolation, retry accounting, help, and report gating are
server-side product requirements.

## Decisions required before live implementation approval

- Transactional email provider for report delivery and founder alerts.
- Founder notification address and authorized internal incident access.
- Truthful support response wording; no SLA is assumed by this plan.
- Remedy after a question remains technically unexecutable.
- Remedy after report generation remains blocked despite founder assistance.
- Report and evidence retention duration.
- Private order/report access and recovery rules, owned by the later module.
- Exact deployed worker mechanism and durable datastore.
- Live model snapshot or alias policy for comparable re-checks.
- Whether one required search call provides enough evidence for the first
  vertical's comparison and factual questions.

## Out of scope

- multiple AI providers in one audit;
- presenting the run as a personalized ChatGPT conversation;
- exposing provider detail in the primary progress experience;
- showing partial answers or findings while the audit runs;
- rerunning valid negative results;
- delivering fewer than ten evaluable observations automatically;
- customer cancellation after the durable job has started;
- extra question packs, credits, subscriptions, or overage pricing;
- a general CRM, help desk, Slack integration, or operations dashboard;
- editing protected evidence through founder support;
- cross-business monitoring or scheduled audits; and
- the report's visual design and narrative structure, which belong to the next
  touchpoint plan.

## Next smallest product decision

After this plan is accepted, scrutinize the **Audit Report** touchpoint: the
result hierarchy, score and denominators, findings, competitor evidence,
recommended actions, question details, method footer, PDF design, and what
makes a report worth paying for.
