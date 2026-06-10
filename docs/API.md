# The Disinformation Ledger — Public API

A free, read-only REST API over the entire ledger: **104,217 fact-checked
political disinformation claims across 14 countries and 493 tracked public
figures**, every verdict attributed to a named, independent third-party
fact-checker with a working source link.

- **Base URL:** `https://disinformation-ledger.vercel.app`
- **License:** Dataset is [CC-BY-NC-4.0](../LICENSE-DATA). Attribute
  *"The Disinformation Ledger — Vansh Kunal Shah"* and link back to the live
  dashboard. Non-commercial use.
- **Format:** JSON. Bulk dataset is gzipped NDJSON.
- **Auth:** A shared, rate-limited demo key (below). Pass it as a Bearer token
  **or** a `key` query parameter.

> **Compile, never adjudicate.** The API never returns a verdict that the
> Ledger invented. Every `verdict` is the wording of the named
> `verdict_source`, and `source_url` always links to that organisation's
> published check. Always cite `source_url` when you republish.

---

## Authentication

```
Demo API key:  dl_live_bb0a86eadd276c14654f52f84f73470531b2bc3e
```

Two equivalent ways to send it:

```bash
# 1) Bearer header (recommended)
curl -H "Authorization: Bearer dl_live_bb0a86eadd276c14654f52f84f73470531b2bc3e" \
  "https://disinformation-ledger.vercel.app/api/v1/stats"

# 2) key query parameter
curl "https://disinformation-ledger.vercel.app/api/v1/stats?key=dl_live_bb0a86eadd276c14654f52f84f73470531b2bc3e"
```

The demo key is read-only and rate-limited. For higher limits or a dedicated
key, contact **vanshkunalshah@gmail.com**.

---

## Endpoints

### `GET /api/v1/claims`

Query the claim records with filters, full-text search, and pagination.

**Query parameters** (all optional, combinable):

| Param | Type | Description |
|---|---|---|
| `country` | string | Filter by jurisdiction, e.g. `United States`, `India`, `United Kingdom` |
| `actor` | string | Filter by the person/account who made the claim, e.g. `Donald Trump` |
| `checker` | string | Filter by the named fact-checker, e.g. `PolitiFact`, `Full Fact`, `Alt News` |
| `verdict` | string | Filter by verdict, e.g. `FALSE`, `Pants on Fire`, `Half True` |
| `topic` | string | Filter by topic tag, e.g. `immigration`, `elections`, `health` |
| `year` | int | Filter by year of the claim, e.g. `2024` |
| `q` | string | Full-text search across the claim text |
| `sort` | string | `none` (default), or sort directives supported by the API |
| `limit` | int | Page size (default small; max enforced server-side) |
| `offset` | int | Pagination offset; the response returns `next_offset` |

**Example**

```bash
curl -H "Authorization: Bearer dl_live_bb0a86eadd276c14654f52f84f73470531b2bc3e" \
  "https://disinformation-ledger.vercel.app/api/v1/claims?country=United%20States&verdict=false&limit=2"
```

**Response (shape)**

```json
{
  "ok": true,
  "query": { "country": "United States", "verdict": "false", "q": null, "sort": "none" },
  "total_matched": 49242,
  "returned": 2,
  "limit": 2,
  "offset": 0,
  "next_offset": 2,
  "license": "CC-BY-NC-4.0",
  "attribution": "The Disinformation Ledger — Vansh Kunal Shah (editor-in-chief)",
  "results": [
    {
      "claim_id": "US::DT_0001",
      "date_claimed": "2015-11-21",
      "actor": "Donald Trump",
      "country": "United States",
      "actor_category": "Primary",
      "claim_verbatim": "Watched in Jersey City, N.J., where thousands and thousands of people were cheering as the World Trade Center collapsed",
      "topic_tag": "conspiracy/race",
      "platform": "Rally speech",
      "post_url": "",
      "archived_url": "",
      "verdict": "Pants on Fire",
      "verdict_source": "PolitiFact",
      "source_url": "https://www.politifact.com/factchecks/2015/nov/22/donald-trump/fact-checking-trumps-claim-thousands-new-jersey-ch/",
      "source_date": "2015-11-22",
      "views": null,
      "reposts": null,
      "likes": null,
      "claim_status": "canonical",
      "electoral_political_impact": ""
    }
  ]
}
```

To paginate, pass the returned `next_offset` back as `offset` until
`returned` is `0`.

---

### `GET /api/v1/stats`

Aggregate counts. Accepts the same scoping filters (e.g. `country`).

```bash
curl -H "Authorization: Bearer dl_live_bb0a86eadd276c14654f52f84f73470531b2bc3e" \
  "https://disinformation-ledger.vercel.app/api/v1/stats?country=India"
```

Returns `total_claims`, `by_country`, `by_verdict`, and related breakdowns.

---

### `GET /api/v1/meta`

The self-describing manifest: dataset name, version, license, attribution,
the full field list, the country / verdict / checker / topic / year
breakdowns, top actors, the bulk-download shard map, and the canonical
endpoint templates.

```bash
curl -H "Authorization: Bearer dl_live_bb0a86eadd276c14654f52f84f73470531b2bc3e" \
  "https://disinformation-ledger.vercel.app/api/v1/meta"
```

---

### Bulk download

The entire dataset as gzipped NDJSON (one JSON claim per line):

```
GET /dataset/all.ndjson.gz
```

Per-country shards are listed in the `shards` array of `/api/v1/meta`
(large countries such as the United States are split into numbered parts).

```bash
curl -L "https://disinformation-ledger.vercel.app/dataset/all.ndjson.gz" -o ledger.ndjson.gz
gunzip -c ledger.ndjson.gz | head -1
```

---

## Record schema

Every claim object contains these fields (`null`/empty where unavailable):

| Field | Description |
|---|---|
| `claim_id` | Globally unique, country-prefixed ID (`US::`, `UK::`, `IN::`, …) |
| `date_claimed` | Date the claim was made |
| `actor` | Person or account that made the claim |
| `country` | Jurisdiction |
| `actor_category` | Role/category (e.g. Primary, politician, influencer) |
| `claim_verbatim` | The claim, quoted exactly |
| `topic_tag` | Topic classification |
| `platform` | Where it was posted |
| `post_url` | Link to the original post |
| `archived_url` | Archived snapshot where available |
| `verdict` | The **fact-checker's** verdict (never the Ledger's own) |
| `verdict_source` | The **named third-party fact-checker** |
| `source_url` | **Working link to the published fact-check** — always cite this |
| `source_date` | Date of the fact-check |
| `views` / `reposts` / `likes` | Reach metrics where available |
| `claim_status` | Status flag (`canonical`, `unverified — no published check`, …) |
| `electoral_political_impact` | Notes on electoral/political consequence |

---

## Quickstart snippets

### Python

```python
import requests

BASE = "https://disinformation-ledger.vercel.app"
KEY  = "dl_live_bb0a86eadd276c14654f52f84f73470531b2bc3e"
H    = {"Authorization": f"Bearer {KEY}"}

def claims(**params):
    """Page through every matching claim."""
    offset = 0
    while True:
        params.update(offset=offset, limit=200)
        r = requests.get(f"{BASE}/api/v1/claims", headers=H, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        for c in data["results"]:
            yield c
        if not data["results"]:
            break
        offset = data["next_offset"]

# Every Full Fact debunk of a UK claim
for c in claims(country="United Kingdom", checker="Full Fact"):
    print(c["date_claimed"], c["actor"], "→", c["verdict"], "|", c["source_url"])
```

### JavaScript (fetch)

```js
const BASE = "https://disinformation-ledger.vercel.app";
const KEY  = "dl_live_bb0a86eadd276c14654f52f84f73470531b2bc3e";

async function stats(country) {
  const url = new URL(`${BASE}/api/v1/stats`);
  if (country) url.searchParams.set("country", country);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${KEY}` } });
  return res.json();
}

stats("India").then(s => console.log(s.total_claims, s.by_verdict));
```

### curl one-liners

```bash
KEY=dl_live_bb0a86eadd276c14654f52f84f73470531b2bc3e
B=https://disinformation-ledger.vercel.app

# How many false claims in the US?
curl -s -H "Authorization: Bearer $KEY" "$B/api/v1/stats?country=United%20States" | jq '.by_verdict[0]'

# Search every claim mentioning "vaccine"
curl -s -H "Authorization: Bearer $KEY" "$B/api/v1/claims?q=vaccine&limit=5" | jq '.results[].claim_verbatim'

# All claims fact-checked by Alt News
curl -s -H "Authorization: Bearer $KEY" "$B/api/v1/claims?checker=Alt%20News&limit=5" | jq '.total_matched'
```

---

## Terms of use

- Attribute the Ledger and link back to
  https://disinformation-ledger.vercel.app.
- Non-commercial use only under [CC-BY-NC-4.0](../LICENSE-DATA); contact the
  maintainer for commercial licensing.
- When you republish a verdict, **cite the `source_url`** — the verdict belongs
  to the named fact-checker, not to the Ledger.
- Be mindful of defamation and contempt-of-court exposure in the relevant
  jurisdiction when reusing records about named individuals.
