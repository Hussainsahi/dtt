'use strict';
/* Rate limiting.
 * Default: in-memory sliding window per serverless instance (good enough to blunt abuse; resets on cold start).
 * Optional: Upstash Redis REST (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) for a shared counter.
 */
const buckets = new Map();

function memoryHit(key, limit, windowMs) {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 5000) { // crude GC
    for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > windowMs) buckets.delete(k);
  }
  return { allowed: arr.length <= limit, remaining: Math.max(0, limit - arr.length) };
}

async function upstashHit(key, limit, windowMs) {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const bucket = `${key}:${Math.floor(Date.now() / windowMs)}`;
  const r = await fetch(`${url}/pipeline`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([["INCR", bucket], ["PEXPIRE", bucket, String(windowMs)]])
  });
  if (!r.ok) throw new Error(`upstash ${r.status}`);
  const [{ result: count }] = await r.json();
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}

/** @returns {Promise<{allowed:boolean, remaining:number, backend:'upstash'|'memory'}>} */
async function hit(key, limit, windowMs) {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try { return { ...(await upstashHit(key, limit, windowMs)), backend: 'upstash' }; } catch { /* fall through to memory */ }
  }
  return { ...memoryHit(key, limit, windowMs), backend: 'memory' };
}

module.exports = { hit, _reset: () => buckets.clear() };
