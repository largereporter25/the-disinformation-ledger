# Methodology & Media-Law Safety Note

**Project:** Reform UK / Farage / Yaxley-Lennon ("Tommy Robinson") / Musk Misinformation Tracker
**Maintained by:** Vansh Kunal Shah (investigative-journalism project)
**Last updated:** 2026-06-07

---

## 1. Core principle — compile, never adjudicate

This dataset **does not rule claims true or false on its own authority.** Every row that carries a verdict cites a **named, reputable third-party fact-checker.** The compiler's job is to aggregate and structure existing, published debunks — not to make original truth determinations.

If no third-party debunk exists for a notable claim, it is logged with verdict = **`Unverified`** and `verdict_source` = **"no published check"**. Such rows are evidence of a *coverage gap*, not a finding of falsity, and must be excluded from any chart that counts "false/misleading claims."

## 2. Approved verdict sources

A verdict may only be entered if it comes from one of these organisations:

- **Full Fact** (UK flagship independent fact-checker)
- **Reuters Fact Check**
- **BBC Verify / BBC Reality Check**
- **Channel 4 FactCheck**
- **FactCheckNI** (Northern Ireland)
- **Ferret Fact Service** (Scotland)
- **Center for Countering Digital Hate (CCDH)** — used primarily for reach/amplification quantification
- **AFP Fact Check**, **Logically Facts**, **PolitiFact**, **Left Foot Forward** (secondary, for items the primaries did not cover)
- **UK courts** — only where a claim has been adjudicated in a libel/contempt judgment (e.g. the *Jamal Hijazi v Yaxley-Lennon* libel case, which Yaxley-Lennon lost in 2021).

The exact **wording used by the source** is preserved in the `verdict` field (False / Misleading / Unsubstantiated / Mixed). The dataset does not paraphrase a "Misleading" rating into "False".

## 3. Tone

Neutral, evidentiary, journalistic. No editorialising, no loaded adjectives in `claim_verbatim` or `notes`. The cited sources carry the judgement.

## 4. Jurisdiction & legal-safety rules (UK)

This project assumes **UK defamation and contempt-of-court exposure.**

- Any claim touching **active legal proceedings** is flagged `LEGAL REVIEW NEEDED` in `notes` and must be reviewed by a human before publication.
- Claims **defamatory of a named living individual** (e.g. allegations about specific politicians) are flagged `LEGAL REVIEW NEEDED — named individual`. They are logged for completeness but not published without review.
- **Contempt of court:** Yaxley-Lennon has been subject to multiple contempt proceedings. Reporting on his claims that relate to active proceedings is restricted; such rows are flagged and held for review.
- The dataset records **what an actor claimed and what a fact-checker found** — it does not assert the actor's intent or state of mind.

## 5. Data-integrity rules

1. **One row per claim.** Append and version; never overwrite history.
2. **Required before a row counts in any chart:** verbatim claim, actor, date, working source-debunk URL from an approved checker, the verdict wording, and the platform/post URL where available.
3. **Incomplete rows** (missing source URL or verdict source) are marked `DRAFT — needs source` and excluded from charts.
4. **Reach metrics** (`views`, `reposts`, `likes`) are recorded **only where a source published them.** They are never estimated. CCDH-style aggregate figures (e.g. "~2 billion combined views") are recorded against the CCDH report, not split across individual posts.
5. **`platform_corrected`** (Yes/No/Unknown) records whether the platform itself (e.g. X Community Notes) corrected the post. This is the project's **headline variable** — the reach-vs-correction asymmetry.
6. **Deduplicate** by claim text + actor + date before adding.
7. **Archiving:** every sourced post URL is submitted to the Wayback Machine and the archived URL stored in `archived_url`. Highest-reach posts are additionally screenshotted.

## 6. Schema (columns)

`claim_id, date_claimed, actor, claim_verbatim, topic_tag, platform, post_url, archived_url, verdict, verdict_source, source_url, source_date, views, reposts, likes, platform_corrected, electoral_political_impact, notes`

## 7. Known limitations

- The universe of rows is bounded by **published fact-checks**, which are far fewer than the volume of contested posts. This dataset therefore **undercounts** the true volume of misinformation and should be described as "documented, third-party-checked claims," not "all false claims."
- Per-post reach is available only for a minority of posts; aggregate reach (CCDH) is the more reliable amplification measure.
- Electoral-impact links are **correlational**, graded by evidence strength, and never asserted as causation unless a cited source does so.

---

*This note exists before data entry so the rules are auditable. Verdicts and legally sensitive entries are drafted by the research assistant and approved by the human editor before publication.*
