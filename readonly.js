// Read-only mode for a user whose role in the app is READER (see ACCESS.md).
//
// The server already refuses every write (checkAccess in the app's proxy) - this only makes the UI
// honest: every form except plain GET forms (search/filter) is shown but disabled, including
// controls attached from elsewhere with the `form="id"` attribute. Forms rendered later (client
// navigation) are locked too. Mark a GET form with method="get" to keep it usable.
// Non-invasive: nothing is removed or hidden, data stays visible and selectable.

const WRITE_FORM = 'form:not([method="get" i])';
const CONTROLS = "input, select, textarea, button";

function lockForm(form) {
  form.setAttribute("data-tds-readonly", "");
  form.querySelectorAll(CONTROLS).forEach((el) => {
    el.disabled = true;
  });
  if (form.id) {
    document.querySelectorAll('[form="' + CSS.escape(form.id) + '"]').forEach((el) => {
      el.disabled = true;
    });
  }
}

function lockWithin(root) {
  if (root.matches && root.matches(WRITE_FORM)) lockForm(root);
  if (root.querySelectorAll) root.querySelectorAll(WRITE_FORM).forEach(lockForm);
  // controls that live outside their form but point at it via form="id" and arrived on their own
  if (root.matches && root.matches("[form]")) {
    const owner = document.getElementById(root.getAttribute("form"));
    if (owner && owner.matches(WRITE_FORM)) root.disabled = true;
  }
}

let observer = null;

export function enableReadOnly() {
  if (typeof document === "undefined" || observer) return;
  document.body.setAttribute("data-tds-readonly", "");
  lockWithin(document.body);
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType === 1) lockWithin(node);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export function disableReadOnly() {
  if (observer) observer.disconnect();
  observer = null;
  if (typeof document !== "undefined") document.body.removeAttribute("data-tds-readonly");
}
