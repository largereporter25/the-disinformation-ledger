# Contributing to The Disinformation Ledger

Thank you for helping make the fact-checks travel faster than the lies. This project is open to OSINT investigators and journalists worldwide — but contributions are **gated by review** to protect the legal and editorial integrity of the ledger.

By contributing you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md), and that your data contributions are licensed under [CC-BY-NC-4.0](LICENSE-DATA) and any code contributions under the [MIT License](LICENSE).

## The one rule that cannot be broken

**Every claim with a verdict MUST cite a named, independent third-party fact-checker and include a working `source_url`.**

- If a reputable fact-checker (Full Fact, Reuters Fact Check, BBC Verify, Channel 4 FactCheck, FactCheckNI, The Ferret, PolitiFact, CCDH, AFP, AP, dpa, Maldita, Pagella Politica, BOOM, Alt News, etc.) has published a debunk → cite it.
- If **no** published check exists → set `verdict` empty and `claim_status` to `unverified — no published check`. **Never** write your own verdict.

This is not optional. It is what keeps this project credible and legally defensible.

## How to contribute data

1. **Fork** this repository.
2. Add rows to your country's CSV (or create a new one) following the schema in [`README.md`](README.md). Use the template in `data/TEMPLATE.csv`.
3. Use a country-prefixed `claim_id` (e.g. `CA::0001` for Canada).
4. Verify every `source_url` actually resolves and points to the specific fact-check.
5. **Flag any claim touching active legal proceedings** in the `notes` column for human review before inclusion. Be mindful of defamation and contempt-of-court exposure in the relevant jurisdiction.
6. Open a **Pull Request** describing your sources. A maintainer reviews against [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) before merging.

## What gets rejected

- Verdicts with no named fact-checker or no working link
- Claims you have adjudicated yourself
- Loaded or editorialised language in the `claim_verbatim` or `notes`
- Unverifiable reach metrics presented as fact
- Anything that creates active-litigation legal exposure without a review flag

## Non-technical contributors

You do not need to know Git. Open an Issue using the "Submit a claim" template and paste the claim, the figure, and the fact-check link. A maintainer will add it for you.

## Tone

Neutral, evidentiary, journalistic. Let the cited sources carry the judgement.

## Security & sensitive reports

For security vulnerabilities or sensitive data-integrity issues (e.g. a record touching active legal proceedings), do **not** open a public issue — follow [`SECURITY.md`](SECURITY.md).
