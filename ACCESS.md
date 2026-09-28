# Access control in TDS apps (hub roles)

The hub (`hub-webapp`, `/admin`) decides who may open which app and with which role
(`READER` = sola lettura, `EDITOR`, `ADMIN`). It writes them into the shared `tds_session` JWT as
`apps: { order|price|data|accounting: role }`. The hub is the only place that issues the cookie.

Every app enforces it **on the server** in `src/proxy.ts`, and (for READER) makes the UI read-only.

## 1. proxy.ts (server enforcement)

```ts
import { checkAccess } from "tds-ui/access.js";

// after verifying the cookie and getting `session`:
const decision = checkAccess({
  session, appId: "data", url: request.url, method: request.method, headers: request.headers,
  hubLoginUrl: HUB_LOGIN_URL,
  crossAppReadPrefix: "/api/",                                            // optional, see below
  writeAlso: [{ path: "/api/products/from-order", apps: ["data", "order"] }], // optional
});
if (decision.action === "redirect") return NextResponse.redirect(decision.url);
if (decision.action === "deny") {
  return decision.html
    ? new NextResponse(decision.html, { status: decision.status, headers: { "content-type": "text/html; charset=utf-8" } })
    : NextResponse.json({ error: decision.error, message: decision.message }, { status: decision.status });
}
```

What it enforces: no role in this app -> 403; READER + any non-GET/HEAD/OPTIONS request (server
actions and API writes are POSTs, so they are covered) -> 403 `read_only`; `/logout` is always open.
`crossAppReadPrefix` is for master-data APIs that other apps' pickers call (anyone with any app may
GET them); `writeAlso` lets a role in another app write to one specific path.

**Freshness**: a token older than `REFRESH_AFTER_SECONDS` (10 min) - or issued before roles existed -
makes the next page navigation bounce through `hub /refresh`, which re-reads the database (role
changes and deactivations apply, a deactivated user is logged out) and returns to the page. Fetch/API
calls are never redirected; a token with no `apps` at all gets `401 session_outdated` (reload).
A tab left open keeps its rights until the next page load.

## 2. Read-only UI

`tds-ui/readonly.js` -> `enableReadOnly()` disables every non-GET form and the controls attached to it
(nothing is hidden). Give real GET forms (search/filter) `method="get"`. Next apps: a small client
component rendered only for READER (`<ReadOnlyGuard />`, `import("tds-ui/readonly.js")`), plus the
`.tds-readonly-banner` strip under the sub menu. Static apps: vendored copy loaded by a script tag.

## 3. New app checklist

Add the app to `APPS` in `hub-webapp/src/lib/apps.ts` (`href` set once live), add the proxy block
above with its own `appId`, the guard + banner in the layout, then grant rows in the hub `/admin`.
