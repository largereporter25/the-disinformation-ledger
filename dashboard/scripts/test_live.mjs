// Local smoke test for /api/live against the live Neon DB.
import handler from "../api/live.js";

function mockRes() {
  const res = { _status: 200, _headers: {}, _body: null };
  res.setHeader = (k, v) => { res._headers[k] = v; };
  res.status = (c) => { res._status = c; return res; };
  res.json = (o) => { res._body = o; return res; };
  return res;
}

const req = { method: "GET", url: "/api/live", headers: {} };
const res = mockRes();
await handler(req, res);

const b = res._body;
console.log("status:", res._status);
console.log("cache-control:", res._headers["Cache-Control"]);
console.log("ok:", b.ok, "| reason:", b.reason);
if (b.ok) {
  console.log("kpi:", JSON.stringify(b.kpi));
  console.log("overlay_count:", b.overlay_count);
  console.log("by_actor:", JSON.stringify(b.by_actor));
  console.log("sample overlay claim:", JSON.stringify(b.claims[0], null, 1));
} else {
  console.log("message:", b.message);
}
