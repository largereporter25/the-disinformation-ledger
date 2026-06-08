import csv, json, os, re

rows = list(csv.DictReader(open("MASTER_GLOBAL.csv")))

# --- portrait manifest: actor (raw) -> styled png filename ---
roster = json.load(open("portrait_roster.json"))
def slug(n): return n.replace(' ','_').replace('/','_').replace('(','').replace(')','').replace('.','').replace("'","")
# map RAW actor string -> portrait info
raw_to_portrait = {}
for r in roster:
    fn = f"portraits_styled/{slug(r['name'])}.png"
    if os.path.exists(fn) and os.path.getsize(fn) > 50000:
        raw_to_portrait[r['raw_actor']] = {"name": r['name'], "img": f"portraits/{slug(r['name'])}.png", "country": r['country']}

def parse_int(s):
    if not s: return None
    s = re.sub(r'[^0-9]', '', str(s))
    return int(s) if s else None

# --- claims with normalized reach + person slug ---
claims = []
PLACEHOLDER_ACTORS = {"Amit Malviya":"Amit Malviya", "Rishi Bagree (@rishibagree)":"Rishi Bagree"}
for r in rows:
    actor = r['actor'].strip()
    p = raw_to_portrait.get(actor)
    placeholder_person = PLACEHOLDER_ACTORS.get(actor)
    claims.append({
        "id": r['claim_id'],
        "date": r['date_claimed'],
        "actor": actor,
        "person": p['name'] if p else placeholder_person,  # canonical person if tracked
        "country": r['country'],
        "category": r['actor_category'],
        "claim": r['claim_verbatim'],
        "topic": r['topic_tag'],
        "platform": r['platform'],
        "post_url": r['post_url'],
        "archived_url": r['archived_url'],
        "verdict": r['verdict'],
        "verdict_source": r['verdict_source'],
        "source_url": r['source_url'],
        "source_date": r['source_date'],
        "views": parse_int(r['views']),
        "reposts": parse_int(r['reposts']),
        "likes": parse_int(r['likes']),
        "platform_corrected": r['platform_corrected'],
        "status": r['claim_status'],
        "impact": r['electoral_political_impact'],
        "notes": r['notes'],
    })

# --- leaders board: aggregate per canonical person ---
from collections import defaultdict
agg = defaultdict(lambda: {"claims":0,"views":0,"reposts":0,"likes":0,"countries":set(),"category":"","checkers":set(),"topics":defaultdict(int)})
for c in claims:
    key = c['person'] or c['actor']
    a = agg[key]
    a['claims'] += 1
    if c['views']: a['views'] += c['views']
    if c['reposts']: a['reposts'] += c['reposts']
    if c['likes']: a['likes'] += c['likes']
    a['countries'].add(c['country'])
    a['category'] = c['category']
    if c['verdict_source']: a['checkers'].add(c['verdict_source'])
    if c['topic']: a['topics'][c['topic']] += 1

leaders = []
for raw, info in raw_to_portrait.items():
    name = info['name']
    a = agg.get(name)
    if not a: continue
    top_topics = sorted(a['topics'].items(), key=lambda x:-x[1])[:3]
    leaders.append({
        "name": name, "img": info['img'], "country": info['country'],
        "claims": a['claims'], "views": a['views'], "reposts": a['reposts'], "likes": a['likes'],
        "category": a['category'], "checkers": sorted(a['checkers']),
        "top_topics": [t for t,_ in top_topics],
        "slug": slug(name).lower(),
    })
leaders.sort(key=lambda x:-x['claims'])

# placeholder leaders (no portrait): Amit Malviya, Rishi Bagree -> monogram
PLACEHOLDER = {"Amit Malviya":("India","Amit Malviya"),"Rishi Bagree":("India","Rishi Bagree (@rishibagree)")}
for pname, (pc, rawkey) in PLACEHOLDER.items():
    a = agg.get(rawkey) or agg.get(pname)
    if not a: continue
    leaders.append({
        "name": pname, "img": None, "country": pc,
        "claims": a['claims'], "views": a['views'], "reposts": a['reposts'], "likes": a['likes'],
        "category": a['category'], "checkers": sorted(a['checkers']),
        "top_topics": [t for t,_ in sorted(a['topics'].items(), key=lambda x:-x[1])[:3]],
        "slug": slug(pname).lower(), "monogram": "".join(w[0] for w in pname.split()[:2]).upper(),
        "match_actor": rawkey,
    })
leaders.sort(key=lambda x:-x['claims'])

# --- global KPIs ---
def total(field): return sum(c[field] for c in claims if c[field])
countries = sorted(set(c['country'] for c in claims))
checkers = sorted(set(c['verdict_source'] for c in claims if c['verdict_source']))
topics = sorted(set(c['topic'] for c in claims if c['topic']))

kpi = {
    "total_claims": len(claims),
    "countries": len(countries),
    "tracked_leaders": len([l for l in leaders]),
    "total_views": total('views'),
    "total_reposts": total('reposts'),
    "total_likes": total('likes'),
    "checkers": len(checkers),
}

# by-country counts
from collections import Counter
by_country = dict(Counter(c['country'] for c in claims))
by_checker = dict(Counter(c['verdict_source'] for c in claims if c['verdict_source']))
by_topic = dict(Counter(c['topic'] for c in claims if c['topic']).most_common(20))

# claims per year
def year(d):
    m = re.search(r'(19|20)\d{2}', d or '')
    return m.group(0) if m else None
by_year = dict(sorted(Counter(y for c in claims if (y:=year(c['date']))).items()))

out = {
    "kpi": kpi,
    "claims": claims,
    "leaders": leaders,
    "filters": {"countries": countries, "checkers": checkers, "topics": topics},
    "by_country": by_country,
    "by_checker": by_checker,
    "by_topic": by_topic,
    "by_year": by_year,
}
json.dump(out, open("dashboard_data.json","w"), ensure_ascii=False)
print(f"claims={len(claims)} leaders={len(leaders)} countries={len(countries)} checkers={len(checkers)}")
print(f"KPI: {kpi}")
print(f"by_country: {by_country}")
print(f"Leaders with portraits: {sum(1 for l in leaders if l['img'])}, placeholders: {sum(1 for l in leaders if not l['img'])}")
print(f"Top 5 leaders: {[(l['name'],l['claims']) for l in leaders[:5]]}")
