# Security & Responsible Disclosure

The Disinformation Ledger publishes records about named public figures and
serves a public read API. We take both application security and data integrity
seriously.

## Reporting a vulnerability

If you discover a security vulnerability — in the dashboard, the API, the build
scripts, or the infrastructure — please report it **privately**. Do not open a
public issue for security problems.

- Email: **vanshkunalshah@gmail.com**
- Use the subject line: `SECURITY: <short description>`

Please include:

- A description of the issue and its impact
- Steps to reproduce (proof of concept if possible)
- The affected component and, where relevant, the request/response involved

We aim to acknowledge reports within 72 hours and to provide a remediation
timeline after triage. Please give us reasonable time to fix the issue before
any public disclosure.

## Data-integrity reports

If you find a **factual error, a broken `source_url`, a mis-attributed
fact-check, or a record that may create legal exposure** (e.g. one touching
active legal proceedings), report it through:

- A regular GitHub Issue using the data-correction template, **or**
- Email **vanshkunalshah@gmail.com** if the matter is sensitive

Every correction is reviewed against `docs/METHODOLOGY.md` before any change is
merged. We will never silently adjudicate a claim ourselves — corrections must
point to a named, independent third-party fact-check.

## API keys

The public API key shipped in the documentation is a shared, rate-limited,
read-only key intended for evaluation and light use. Do not attempt to abuse,
exfiltrate, or brute-force keys or endpoints. If you need higher limits or a
dedicated key, contact the maintainer.

## Scope

In scope: the dashboard front-end, the `/api/v1/*` endpoints, the bulk dataset
endpoints, the build/validation scripts, and the repository configuration.

Out of scope: third-party fact-checker websites linked via `source_url`, and
the social platforms referenced in `post_url`. Report issues with those to
their respective owners.
