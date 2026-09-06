/*==========================================================================
  VAA — the work data layer
  --------------------------------------------------------------------------
  One JSON file, two views. data/works.json is the only place a project is
  described; this file renders it into both places it appears:

    · the Selected work grid on VAA_Index.html
    · the case study on case-studies.html, chosen by ?id= in the URL

  Add a project to the JSON and it appears in the grid, in the filter counts,
  and at its own case-study URL — no markup to touch in either page.

  Ordering matters here. The grid's cards are what vaa-work.js binds its
  filter to, what vaa-split.js gives the fade-and-zoom reveal, and what
  vaa-horizontal.js measures the panel's scroll distance from — and none of
  those exist until the fetch resolves. So each of those three is given a
  nudge once the cards are in the DOM, rather than being left to bind to an
  empty grid: vaaSplitScan() picks up the new elements, vaaWorkInit() binds
  the filter, and ScrollTrigger.refresh() re-reads the travel distance.

  Served over http:// — a fetch() on file:// is blocked by CORS, so open the
  site through XAMPP rather than by double-clicking the file.
==========================================================================*/
(function () {
    'use strict';

    var DATA_URL = 'data/works.json';

    /*----------------------------------------------------------------------
      Small helpers
    ----------------------------------------------------------------------*/
    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }

    function fail(where, err) {
        /* Never leave a blank section with no explanation in the console */
        if (window.console) console.error('[VAA works] ' + where, err);
    }

    function load() {
        return fetch(DATA_URL, { cache: 'no-cache' }).then(function (r) {
            if (!r.ok) throw new Error(DATA_URL + ' → HTTP ' + r.status);
            return r.json();
        });
    }

    /*======================================================================
      The grid — VAA_Index.html
    ======================================================================*/
    function buildCard(w) {
        var a = el('a', 'vaaWorkCard');
        a.href = 'case-studies.html?id=' + encodeURIComponent(w.id);
        a.setAttribute('data-cat', w.category);
        a.setAttribute('data-id', w.id);

        var media = el('span', 'vaaWorkCardMedia');
        var img = new Image();
        img.className = 'vaaWorkCardZoom';
        img.src = w.image;
        img.alt = w.title + ' — ' + w.meta;
        img.width = 1200;
        img.height = 800;
        img.loading = 'lazy';
        img.decoding = 'async';
        media.appendChild(img);

        var cap = el('span', 'vaaWorkCardCap');
        cap.appendChild(el('span', 'vaaWorkCardName', w.title));
        cap.appendChild(el('span', 'vaaWorkCardMeta', w.meta));

        a.appendChild(media);
        a.appendChild(cap);
        return a;
    }

    function buildFilter(categories) {
        var menu = document.querySelector('.vaaFilterMenu');
        var label = document.querySelector('.vaaFilterLabel');
        if (!menu || !categories || !categories.length) return;

        menu.textContent = '';
        categories.forEach(function (c, i) {
            var li = el('li');
            var b = el('button', null, c.label);
            b.type = 'button';
            b.setAttribute('role', 'option');
            b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
            b.setAttribute('data-filter', c.id);
            li.appendChild(b);
            menu.appendChild(li);
        });
        if (label) label.textContent = categories[0].label;
    }

    function renderGrid(grid, doc) {
        var frag = document.createDocumentFragment();
        doc.works.forEach(function (w) { frag.appendChild(buildCard(w)); });

        grid.textContent = '';
        grid.appendChild(frag);
        buildFilter(doc.categories);

        /* Hand the freshly built cards to the modules that were waiting */
        if (typeof window.vaaSplitScan === 'function') window.vaaSplitScan();
        if (typeof window.vaaWorkInit === 'function') window.vaaWorkInit();
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }

    /*======================================================================
      The case study — case-studies.html
      Mirrors the template's own case-study order: title, a four-up fact
      row, the hero frame, the challenge, two supporting frames, the result.
    ======================================================================*/
    function pickWork(doc) {
        var id = new URLSearchParams(window.location.search).get('id');
        var found = id && doc.works.filter(function (w) { return w.id === id; })[0];
        return found || doc.works[0];   /* a bad or missing id shows the first */
    }

    function fillCase(root, doc) {
        var w = pickWork(doc);
        var idx = doc.works.indexOf(w);
        var next = doc.works[(idx + 1) % doc.works.length];

        document.title = w.title + ' — VAA, Vasantha Ad Agency';

        function set(sel, text) {
            var n = root.querySelector(sel);
            if (n) n.textContent = text;
        }
        function image(sel, src, alt) {
            var n = root.querySelector(sel);
            if (!n) return;
            var i = new Image();
            i.src = src; i.alt = alt; i.loading = 'lazy'; i.decoding = 'async';
            n.textContent = '';
            n.appendChild(i);
        }

        set('[data-case="title"]', w.title);
        set('[data-case="meta"]', w.meta);
        set('[data-case="crumb"]', w.title);
        set('[data-case="role"]', w.role);

        /* the four-up fact row */
        var info = root.querySelector('[data-case="info"]');
        if (info) {
            info.textContent = '';
            Object.keys(w.info).forEach(function (k) {
                var cell = el('div', 'vaaCaseFact');
                cell.appendChild(el('h3', null, k));
                cell.appendChild(el('p', null, w.info[k]));
                info.appendChild(cell);
            });
        }

        image('[data-case="hero"]', w.hero, w.title + ' — ' + w.meta);
        set('[data-case="challenge"]', w.challenge);
        set('[data-case="result"]', w.result);

        (w.gallery || []).slice(0, 2).forEach(function (src, i) {
            image('[data-case="gallery' + (i + 1) + '"]', src, w.title + ' — supporting frame ' + (i + 1));
        });

        /* next project */
        var nextLink = root.querySelector('[data-case="next"]');
        if (nextLink) {
            nextLink.href = 'case-studies.html?id=' + encodeURIComponent(next.id);
            set('[data-case="next-title"]', next.title);
            set('[data-case="next-meta"]', next.meta);
        }

        root.removeAttribute('hidden');

        if (typeof window.vaaSplitScan === 'function') window.vaaSplitScan();
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }

    /*======================================================================
      Route by what the page contains
    ======================================================================*/
    var grid = document.querySelector('[data-works-grid]');
    var caseRoot = document.querySelector('[data-case-root]');

    /* Published synchronously, before any other script parses, so
       vaa-horizontal.js can wait on it. That wait is not optional: the stage
       decides how many beats the work panel spends scrolling from the grid's
       measured height, and a grid that is still empty measures zero — the
       vertical segment would never be created at all. Resolves immediately
       on pages with no grid and no case study. */
    window.vaaWorksReady = (!grid && !caseRoot)
        ? Promise.resolve()
        : load().then(function (doc) {
              if (grid)     renderGrid(grid, doc);
              if (caseRoot) fillCase(caseRoot, doc);
          }).catch(function (err) {
              fail('could not load ' + DATA_URL + ' — the site must be served over http (XAMPP), not opened from disk.', err);
              if (caseRoot) caseRoot.removeAttribute('hidden');
          });

}());
