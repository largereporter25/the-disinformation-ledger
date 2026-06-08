import json, subprocess, csv, os

SHEETS = {
    "UK":        ("1j1rljEv-OEWjrRp8X3mF3WFWBI0EyEeaP7JZqmBLaFU", "Claims (Master)"),
    "US_ISRAEL": ("1BOdSIsYoTnZrbNDMG3atPsRRfod4SDCcUTU9pReW4OQ", "Claims (US + Israel)"),
    "INDIA":     ("1SsBn7UDjIbLy5RTctwIzW79ly7ygw2uMCcWLKihWHDU", "Claims (India)"),
    "FRANCE":    ("14ZmEJewi4Anv6uYwMRhlIjNUk_MEJtNeR5Vyjq9ilDY", "Claims (France)"),
    "GERMANY":   ("18qUMczhVM6yJtcGv0bEOd7wpGYEdgvwkhD5iWqv6zMs", "Claims (Germany)"),
    "ITALY":     ("1HwzC8aSBBpWlmZZGoziZ1E_soqP-TwU5qxSl7LHzark", "Claims (Italy)"),
    "SPAIN":     ("1FSDchn8XSeUQxxizQ9cf23K71PuVT39FGxDSUb60apM", "Claims (Spain)"),
}

os.makedirs("drive_csvs", exist_ok=True)
for label, (sid, tab) in SHEETS.items():
    params = json.dumps({"spreadsheetId": sid, "range": f"{tab}!A1:U1000"})
    p = subprocess.run(["gws", "sheets", "spreadsheets", "values", "get",
                        "--params", params], capture_output=True, text=True)
    if p.returncode != 0:
        print(f"{label}: FAIL {p.stderr[:150]}"); continue
    d = json.loads(p.stdout)
    rows = d.get("values", [])
    # pad rows to equal length of header
    if not rows:
        print(f"{label}: EMPTY"); continue
    hlen = len(rows[0])
    norm = [r + [""]*(hlen-len(r)) for r in rows]
    out = f"drive_csvs/{label}.csv"
    with open(out, "w", newline="") as fh:
        csv.writer(fh).writerows(norm)
    print(f"{label}: {len(rows)-1} data rows, {hlen} cols -> {out}")
    print(f"   header: {rows[0]}")
