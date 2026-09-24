/*
 * Searchable, Apple-style option list for long <select>s in every TDS app.
 *
 * Design goal: zero regression risk. The native <select> is NEVER replaced,
 * hidden, wrapped or moved - it stays exactly where the app put it, keeps its
 * value, form submission, validation, layout and framework bindings. This
 * script only intercepts the moment the browser would open its own list (mouse
 * click / Enter / Space / Alt+Down on a mouse-driven device) and shows a
 * searchable list instead. Picking an item sets the select and fires the same
 * `input` + `change` events the browser would, so React onChange, vanilla
 * listeners and native forms behave identically.
 *
 * Applies to single-choice selects with >= 12 options, or any select with
 * data-tds-search; opt out with data-tds-native. On touch devices nothing is
 * intercepted (the native picker is better there - on iPhone it IS the Apple
 * picker). Load once per page; it uses event delegation, so selects created
 * later (React renders, vanilla templates) work with no setup.
 */
(function () {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__tdsSelectSearch) return;
  window.__tdsSelectSearch = true;

  var MIN_OPTIONS = 12;
  var current = null; // { select, pop, cleanup }

  function isEligible(el) {
    if (!el || el.tagName !== "SELECT") return false;
    if (el.disabled || el.multiple || el.size > 1) return false;
    if (el.hasAttribute("data-tds-native")) return false;
    if (!window.matchMedia || !window.matchMedia("(pointer: fine)").matches) return false;
    return el.hasAttribute("data-tds-search") || el.options.length >= MIN_OPTIONS;
  }

  function norm(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

  function make(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function close(refocus) {
    if (!current) return;
    var c = current;
    current = null;
    c.cleanup();
    if (c.pop.parentNode) c.pop.parentNode.removeChild(c.pop);
    if (refocus) c.select.focus();
  }

  function open(select) {
    close(false);

    var items = []; // { opt, li, text, key }
    var pop = make("div", "tds-select-pop");
    var search = make("input", "tds-select-search");
    search.type = "text";
    search.placeholder = "Search…";
    search.setAttribute("autocomplete", "off");
    search.setAttribute("aria-label", "Search options");
    var list = make("ul", "tds-select-list");
    list.setAttribute("role", "listbox");
    var empty = make("div", "tds-select-empty");
    empty.textContent = "No results";
    empty.hidden = true;

    function addOption(opt) {
      var li = make("li", "tds-select-item");
      li.setAttribute("role", "option");
      var text = opt.text || "";
      var label = make("span", "tds-select-item-label");
      label.textContent = text === "" ? "—" : text;
      li.appendChild(label);
      if (opt.value === "") li.classList.add("is-placeholder");
      if (opt.disabled) li.classList.add("is-disabled");
      if (opt.selected) {
        li.classList.add("is-selected");
        li.setAttribute("aria-selected", "true");
      }
      list.appendChild(li);
      items.push({ opt: opt, li: li, text: text, key: norm(text), group: null });
    }

    Array.prototype.forEach.call(select.children, function (child) {
      if (child.tagName === "OPTGROUP") {
        var g = make("li", "tds-select-group");
        g.textContent = child.label;
        list.appendChild(g);
        var start = items.length;
        Array.prototype.forEach.call(child.children, addOption);
        for (var i = start; i < items.length; i++) items[i].group = g;
      } else if (child.tagName === "OPTION") {
        addOption(child);
      }
    });

    pop.appendChild(search);
    pop.appendChild(list);
    pop.appendChild(empty);
    document.body.appendChild(pop);

    var active = -1;
    function visibleItems() {
      return items.filter(function (it) {
        return !it.li.hidden && !it.opt.disabled;
      });
    }
    function setActive(item, scroll) {
      items.forEach(function (it) {
        it.li.classList.toggle("is-active", it === item);
      });
      active = item ? items.indexOf(item) : -1;
      if (item && scroll) item.li.scrollIntoView({ block: "nearest" });
    }
    function filter() {
      var words = norm(search.value).split(/\s+/).filter(Boolean);
      var shownGroups = [];
      items.forEach(function (it) {
        var ok = words.every(function (w) {
          return it.key.indexOf(w) !== -1;
        });
        it.li.hidden = !ok;
        if (ok && it.group && shownGroups.indexOf(it.group) === -1) shownGroups.push(it.group);
      });
      Array.prototype.forEach.call(list.querySelectorAll(".tds-select-group"), function (g) {
        g.hidden = shownGroups.indexOf(g) === -1;
      });
      var vis = visibleItems();
      empty.hidden = vis.length > 0;
      setActive(vis[0] || null, true);
    }
    function choose(item) {
      if (!item || item.opt.disabled) return;
      select.selectedIndex = item.opt.index;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      close(true);
    }

    // Position under the select (or above when there is more room there).
    var rect = select.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var width = Math.min(Math.max(rect.width, 260), vw - 16);
    var left = Math.min(Math.max(8, rect.left), vw - width - 8);
    var below = vh - rect.bottom - 14;
    var above = rect.top - 14;
    pop.style.width = width + "px";
    pop.style.left = left + "px";
    if (below < 240 && above > below) {
      pop.style.bottom = vh - rect.top + 6 + "px";
      pop.style.maxHeight = Math.min(380, above) + "px";
    } else {
      pop.style.top = rect.bottom + 6 + "px";
      pop.style.maxHeight = Math.min(380, below) + "px";
    }

    search.addEventListener("input", filter);
    search.addEventListener("keydown", function (e) {
      var vis = visibleItems();
      var idx = vis.indexOf(items[active]);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive(vis[Math.min(idx + 1, vis.length - 1)] || null, true);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(vis[Math.max(idx - 1, 0)] || null, true);
      } else if (e.key === "Enter") {
        e.preventDefault();
        choose(items[active]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      } else if (e.key === "Tab") {
        close(false);
      }
    });
    list.addEventListener("mousedown", function (e) {
      e.preventDefault(); // keep focus in the search box
      var li = e.target.closest ? e.target.closest(".tds-select-item") : null;
      var item = items.filter(function (it) {
        return it.li === li;
      })[0];
      choose(item);
    });
    list.addEventListener("mousemove", function (e) {
      var li = e.target.closest ? e.target.closest(".tds-select-item") : null;
      var item = items.filter(function (it) {
        return it.li === li && !it.opt.disabled;
      })[0];
      if (item && items.indexOf(item) !== active) setActive(item, false);
    });

    function onDocDown(e) {
      if (!pop.contains(e.target) && e.target !== select) close(false);
    }
    function onScrollOrResize(e) {
      if (e && e.target && e.target.nodeType === 1 && pop.contains(e.target)) return;
      close(false);
    }
    document.addEventListener("mousedown", onDocDown, true);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    current = {
      select: select,
      pop: pop,
      cleanup: function () {
        document.removeEventListener("mousedown", onDocDown, true);
        window.removeEventListener("scroll", onScrollOrResize, true);
        window.removeEventListener("resize", onScrollOrResize);
      },
    };

    var selected = items.filter(function (it) {
      return it.opt.selected;
    })[0];
    setActive(selected || visibleItems()[0] || null, false);
    search.focus();
    if (selected) selected.li.scrollIntoView({ block: "center" });
  }

  // Block the browser's own list and show ours instead.
  document.addEventListener(
    "mousedown",
    function (e) {
      if (e.button !== 0) return;
      var t = e.target;
      if (!isEligible(t)) return;
      e.preventDefault();
      t.focus();
      if (current && current.select === t) close(false);
      else open(t);
    },
    true
  );

  document.addEventListener(
    "keydown",
    function (e) {
      var t = e.target;
      if (!isEligible(t) || current) return;
      var trigger = e.key === "Enter" || e.key === " " || e.key === "F4" || (e.altKey && e.key === "ArrowDown");
      if (!trigger) return;
      e.preventDefault();
      open(t);
    },
    true
  );
})();
