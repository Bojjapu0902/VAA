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

    /* Reserve .vaaStackTrack's height synchronously, before the fetch below
       even starts — not after it resolves. Every other ScrollTrigger on the
       page (the hero fade, the cursor-trail fade, #about, #services) is set
       up moments later in the inline script at the bottom of the page, and
       each one's start/end is measured from the CURRENT layout at creation
       time. If this track were still its natural (near-zero) height when
       those get created, then jumped to 600vh once the fetch resolved, every
       trigger positioned below #work would need to shift — and the
       ScrollTrigger.refresh() that shift requires can land at an arbitrary
       moment (whenever the network settles), including well after the user
       has already scrolled elsewhere. A refresh mid-scrub forces that scrub
       to re-settle from scratch, which is exactly what produced the bug this
       fixes: scroll back to the top shortly after load and the hero could be
       caught mid-resettle, stuck partway through its fade with the stack
       frozen alongside it. Sizing the track up front means the fetch
       resolving late only ever populates content already sitting in a
       correctly-sized box — nothing downstream ever has to move. */
    var trackEl = document.querySelector('[data-stack-track]');
    if (trackEl) trackEl.style.height = (COUNT * 100) + 'vh';

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

        /* Height is already reserved above (COUNT * 100vh), synchronously,
           before any other ScrollTrigger on the page was set up. Only
           re-assert it here if the fetched count ever ends up different
           from COUNT — normally a no-op. */
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

        /* No ScrollTrigger.refresh() here on purpose. The track was already
           sized to its final height before this fetch even started (see
           above), so nothing on the page has moved — this timeline's own
           ScrollTrigger measures correctly the instant it's created, same as
           any other. A refresh() call forces every scrub-driven animation on
           the page to resync, which — arriving at an unpredictable moment
           determined by network timing — is what caused the bug this file
           now avoids: catch the hero (or this stack) mid-scrub when that
           resync lands and it has to visibly re-settle, which can leave it
           looking stuck if the user has already stopped scrolling. */
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
