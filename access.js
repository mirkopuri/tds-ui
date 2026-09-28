// Shared access rules for every TDS app behind the hub SSO (see ACCESS.md).
//
// The hub puts `apps: { <appId>: "READER" | "EDITOR" | "ADMIN" }` (+ the standard `iat`) into the
// `tds_session` JWT. Each app's proxy.ts verifies the cookie with its own jose and then asks
// `checkAccess(...)` what to do. This file is plain ESM with no dependencies, so it runs in the
// Next proxy (edge/node) and in the browser.

/** Session older than this (seconds) is re-issued by the hub on the next page load. */
export const REFRESH_AFTER_SECONDS = 600;

const WRITE_ROLES = new Set(["EDITOR", "ADMIN"]);
const ROLES = new Set(["READER", "EDITOR", "ADMIN"]);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** The user's role in one app, or null when they have no access to it. */
export function roleFor(session, appId) {
  const role = session && session.apps ? session.apps[appId] : undefined;
  return ROLES.has(role) ? role : null;
}

/** True when the user has some role in at least one app. */
export function hasAnyApp(session) {
  return !!session && !!session.apps && Object.keys(session.apps).some((id) => ROLES.has(session.apps[id]));
}

export function canWrite(role) {
  return WRITE_ROLES.has(role);
}

export function isMutating(method) {
  return !SAFE_METHODS.has(String(method).toUpperCase());
}

/** A full page navigation (not a fetch / RSC / API call). */
export function isDocumentRequest(method, headers) {
  if (String(method).toUpperCase() !== "GET") return false;
  const dest = headers.get("sec-fetch-dest");
  if (dest) return dest === "document";
  return (headers.get("accept") || "").includes("text/html");
}

/** Tokens issued before the access rollout have no `apps`; old tokens are re-issued too. */
export function needsRefresh(session, nowMs = Date.now()) {
  if (!session || !session.apps || !session.iat) return true;
  return nowMs / 1000 - session.iat > REFRESH_AFTER_SECONDS;
}

/** Hub URL that re-issues the cookie from the database and sends the browser back to `currentUrl`. */
export function refreshUrl(hubLoginUrl, currentUrl) {
  const hub = new URL(hubLoginUrl);
  hub.pathname = "/refresh";
  hub.search = "";
  const back = new URL(currentUrl);
  back.searchParams.set("tdsr", "1"); // loop guard, stripped again by checkAccess
  hub.searchParams.set("next", back.toString());
  return hub.toString();
}

function deniedHtml(hubUrl, message) {
  return (
    '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>Accesso negato</title></head>" +
    '<body style="font-family:system-ui,sans-serif;background:#f4f5f7;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px">' +
    '<div style="background:#fff;border:1px solid #dde1e6;border-radius:10px;padding:28px;max-width:380px;text-align:center">' +
    '<h1 style="font-size:1.15rem;margin:0 0 8px">Accesso negato</h1>' +
    '<p style="color:#6b7280;margin:0 0 18px;font-size:14px">' +
    message +
    "</p>" +
    '<a href="' +
    hubUrl +
    '" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:9px 16px;border-radius:8px;font-size:14px">Torna all\'hub</a>' +
    "</div></body></html>"
  );
}

/**
 * Decide what an app's proxy should do with a request from a signed-in user.
 *
 * Returns one of:
 *   { action: "allow" }
 *   { action: "redirect", url }                       (refresh via the hub, or strip the loop guard)
 *   { action: "deny", status, error, message, html }  (html only for page navigations)
 *
 * options:
 *   session, appId, url, method, headers, hubLoginUrl   (required)
 *   crossAppReadPrefix  e.g. "/api/": GET/HEAD/OPTIONS under it are open to anyone with any app
 *                       (master-data APIs used by the other apps' pickers)
 *   writeAlso           e.g. [{ path: "/api/products/from-order", apps: ["data", "order"] }]:
 *                       writes to that exact path are also allowed for EDITOR+ in any listed app
 */
export function checkAccess(options) {
  const { session, appId, url, method, headers, hubLoginUrl, crossAppReadPrefix, writeAlso = [] } = options;
  const u = new URL(url);
  const doc = isDocumentRequest(method, headers);
  const hubUrl = new URL(hubLoginUrl).origin;

  if (u.pathname === "/logout") return { action: "allow" };

  const stale = needsRefresh(session);
  if (u.searchParams.has("tdsr") && doc && !stale) {
    u.searchParams.delete("tdsr");
    return { action: "redirect", url: u.toString() };
  }
  if (stale) {
    if (doc && !u.searchParams.has("tdsr")) return { action: "redirect", url: refreshUrl(hubLoginUrl, url) };
    if (!session.apps) {
      return { action: "deny", status: 401, error: "session_outdated", message: "Sessione da aggiornare: ricarica la pagina." };
    }
  }

  const role = roleFor(session, appId);
  const mutating = isMutating(method);
  const deny = (status, error, message) => ({ action: "deny", status, error, message, html: doc ? deniedHtml(hubUrl, message) : undefined });

  if (!mutating && crossAppReadPrefix && u.pathname.startsWith(crossAppReadPrefix) && hasAnyApp(session)) {
    return { action: "allow" };
  }
  if (mutating) {
    const rule = writeAlso.find((r) => r.path === u.pathname);
    if (rule && rule.apps.some((id) => canWrite(roleFor(session, id)))) return { action: "allow" };
  }

  if (!role) return deny(403, "no_access", "Il tuo utente non è abilitato a questa app.");
  if (role === "READER" && mutating) return deny(403, "read_only", "Il tuo utente ha accesso in sola lettura: non puoi modificare i dati.");
  return { action: "allow" };
}
