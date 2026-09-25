/*
 * Shared number-display rule for every TDS app (UI, prints, and Excel):
 *
 *   Numbers the user ENTERS (unit prices, weights, rates, amounts...) are shown
 *   with at least 2 decimals. If more were typed (up to 4) they are shown
 *   exactly as typed - NEVER rounded - e.g. 0,125 stays "0,125", 0,15 shows
 *   "0,15", 1234,5 shows "1.234,50". Values COMPUTED from other numbers
 *   (line/order totals) keep the normal 2 decimals.
 *
 * Works as a CommonJS/ESM-interop import (Next apps) and, loaded with a plain
 * <script>, as window.tdsFormat (static apps like order-webapp).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.tdsFormat = api;
})(typeof self !== "undefined" ? self : this, function () {
  var LOCALE = "it-IT";
  var MIN = 2;
  var MAX = 4;

  // Strip floating-point noise (0.1 + 0.2 -> 0.30000000000000004) before formatting.
  function clean(n) {
    return Number(Number(n).toPrecision(12));
  }

  function isBlank(v) {
    return v === null || v === undefined || v === "" || isNaN(Number(v));
  }

  // formatEntered(0.125) -> "0,125"; (0.15) -> "0,15"; (1234.5) -> "1.234,50"
  function formatEntered(value, opts) {
    if (isBlank(value)) return "";
    var o = opts || {};
    var min = o.min == null ? MIN : o.min;
    var max = Math.max(o.max == null ? MAX : o.max, min);
    return clean(value).toLocaleString(o.locale || LOCALE, {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
      useGrouping: true,
    });
  }

  // Same rule with a currency symbol via Intl (code like "EUR"); falls back to
  // "<number> <code>" when the code is not a valid ISO currency.
  function formatCurrencyEntered(value, currency, opts) {
    if (isBlank(value)) return "";
    var o = opts || {};
    var min = o.min == null ? MIN : o.min;
    var max = Math.max(o.max == null ? MAX : o.max, min);
    try {
      return clean(value).toLocaleString(o.locale || LOCALE, {
        style: "currency",
        currency: currency || "EUR",
        minimumFractionDigits: min,
        maximumFractionDigits: max,
      });
    } catch (e) {
      return formatEntered(value, o) + " " + (currency || "");
    }
  }

  return { formatEntered: formatEntered, formatCurrencyEntered: formatCurrencyEntered, MIN_DECIMALS: MIN, MAX_DECIMALS: MAX };
});
