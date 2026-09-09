/*==========================================================================
  VAA — Selected work, pinned stack
  --------------------------------------------------------------------------
  Reads the same data/works.json every other work view reads from, builds
  one frame per project, then scrubs a GSAP timeline to the scroll position:

    · each frame rises from below and settles centred, full size
    · the frame behind it scales down, drifts back and fades as the next
      one arrives, so depth reads through the stack
    · the top frame is a plain <a> to its case study — click it any time

  The section's sticky viewport (CSS) does the actual pinning; ScrollTrigger
  only measures progress along .vaaStackTrack and drives the timeline.
==========================================================================*/
(function () {
    'use strict';

    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    var DATA_URL = 'data/works.json';
    var COUNT = 6;

    function el(tag, cls) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        return n;
    }

    function buildItem(w, i) {
        var a = el('a', 'vaaStackItem');
        a.href = 'case-studies.html?id=' + encodeURIComponent(w.id);

        var frame = el('span', 'vaaStackFrame');
        var img = new Image();
        img.src = w.image;
        img.alt = w.title + ' — ' + w.meta;
        img.loading = i < 2 ? 'eager' : 'lazy';
        img.decoding = 'async';
        img.className = 'vaaImgReveal';
        frame.appendChild(img);

        var cap = el('span', 'vaaStackCaption');
        var idx = el('span', 'vaaStackIndex');
        idx.textContent = (i < 9 ? '0' : '') + (i + 1);
        var title = el('span', 'vaaStackTitle');
        title.textContent = w.title;
        var meta = el('span', 'vaaStackMeta');
        meta.textContent = w.meta;
        cap.appendChild(idx);
        cap.appendChild(title);
        cap.appendChild(meta);

        a.appendChild(frame);
        a.appendChild(cap);
        return a;
    }

    function init(works) {
        var track = document.querySelector('[data-stack-track]');
        var viewport = document.querySelector('[data-stack-viewport]');
        if (!track || !viewport || !works.length) return;

        var frag = document.createDocumentFragment();
        works.forEach(function (w, i) { frag.appendChild(buildItem(w, i)); });
        viewport.appendChild(frag);

        var items = Array.prototype.slice.call(viewport.querySelectorAll('.vaaStackItem'));
        var n = items.length;

        /* one viewport-height of scroll per item to arrive and settle */
        track.style.height = (n * 100) + 'vh';

        gsap.set(items, { yPercent: 130, scale: 1.08, opacity: 0 });

        var tl = gsap.timeline({
            defaults: { ease: 'power2.out', duration: 1 },
            scrollTrigger: {
                trigger: track,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.4
            }
        });

        items.forEach(function (item, i) {
            tl.to(item, { yPercent: 0, scale: 1, opacity: 1 }, i);
            if (i > 0) {
                /* the pinned frame ahead of it holds — position, size and
                   opacity untouched — until this one is halfway risen, then
                   recedes in the remaining half so both settle together */
                tl.to(items[i - 1], { scale: 0.86, yPercent: -14, opacity: 0.35, duration: 0.5 }, i + 0.5);
            }
        });

        ScrollTrigger.refresh();
    }

    fetch(DATA_URL, { cache: 'no-cache' })
        .then(function (r) {
            if (!r.ok) throw new Error(DATA_URL + ' → HTTP ' + r.status);
            return r.json();
        })
        .then(function (doc) { init((doc.works || []).slice(0, COUNT)); })
        .catch(function (err) {
            if (window.console) console.error('[VAA work stack] could not load ' + DATA_URL, err);
        });
}());
