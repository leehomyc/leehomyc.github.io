# Operational analytics

Production dashboard: https://spelllegion.com/admin/

- Firebase signed ID tokens identify players. Anonymous accounts count as visitors; nonanonymous accounts count separately as observed registered accounts. Only the verified administrator email configured in ADMIN_EMAILS can read aggregate data.
- Heartbeats count foreground browsing and active battle wall time separately. Battle time excludes pauses, card choices, menu panels, demos and background tabs, following shared-arena simulation rules. Simulation time is separate.
- Activity is aggregated by Hong Kong calendar day, including sessions that cross midnight. Countries are network exit countries supplied by Cloudflare; referrers are hostname only. No email, player name, full IP address or query string is stored in telemetry.
- The historical Firebase account count is an explicitly dated console snapshot, separate from live observed account counts. Historical playtime, location and retention cannot be reconstructed.
- Values are operational client telemetry and cannot authorize match rewards or rankings. Browser/account resets can create extra anonymous identities; tests and administrator play are included.
- JSON export is available. Heartbeats send about every 30 seconds; online means a heartbeat in the last 90 seconds. Network loss or rejected requests can make counts incomplete.

## Capacity

Game assets use Pages/CDN directly. Only /api/analytics/* invokes the Worker, so exhausted analytics quota does not prevent loading the game. Firebase still has its own limits. This release does not establish a concurrent-player capacity or support a claim of one million concurrent players.

The initial analytics implementation writes each heartbeat to one D1 database. Before large traffic, move ingestion to buffered batches, partition write load, add preaggregated dashboard reads and receipt/data retention, select paid limits explicitly, and load-test realistic traffic. Do not interpret unlimited static requests as unlimited account or game simulation capacity.

## Verification

Run client.test.mjs, security.test.mjs and storage.test.mjs with Node. Storage checks use SQLite and signed tokens to exercise atomic deduplication, ownership, cross-midnight time/active-user totals, retention, permitted-origin CORS and admin denial.
