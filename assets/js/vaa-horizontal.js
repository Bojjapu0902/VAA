/*==========================================================================
  VAA — the stage: horizontal section travel, the services row stack,
        the work-list cursor preview, and the nav scrollspy.
  --------------------------------------------------------------------------
  On desktop (>=992px) everything after the hero rides ONE pinned stage. The
  panels sit side by side on a flex track and a single timeline moves between
  them, measured in beats — a beat is one viewport-height of scroll:

      hold        About sits still, long enough to read
      slide       About exits left, Services arrives from the right
      stack       Services holds while its rows rise over one another
      hold
      slide       Selected work arrives
      hold        long enough to browse the list
      slide       Contact closes the page
      hold

  It is deliberately one pin and one timeline. A pin nested inside a
  transformed ancestor cannot work: position:fixed resolves against the
  transform, not the viewport. Same reason the work preview lives outside
  the stage, at the end of the body.

  Below 992px, and for anyone who has asked for reduced motion, none of it
  runs — the panels are an ordinary vertical stack and the scrollspy falls
  back to plain triggers.

  Depends on gsap + ScrollTrigger, both already loaded by the template.
==========================================================================*/
(function () {
    'use strict';

    if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;

    var stage      = document.querySelector('.vaaStage');
    var stageTrack = document.querySelector('.vaaStageTrack');
    if (!stage || !stageTrack) return;

    gsap.registerPlugin(ScrollTrigger);

    var panels    = Array.prototype.slice.call(stageTrack.querySelectorAll('.vaaStagePanel'));
    var stack     = stageTrack.querySelector('.vaaStack');
    var stackRows = stack ? Array.prototype.slice.call(stack.querySelectorAll('.vaaStackRow')) : [];
    var workPanel = stageTrack.querySelector('.vaaWorkPanel');
    var workView  = workPanel ? workPanel.querySelector('.vaaWorkViewport') : null;
    var workScroll= workPanel ? workPanel.querySelector('.vaaWorkScroll') : null;
    var hero      = document.querySelector('#heroTop');
    var navLinks  = Array.prototype.slice.call(document.querySelectorAll('.mainMenu > ul > li > a[href^="#"]'));
    var reduced   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!panels.length) return;
    stageTrack.style.setProperty('--vaa-stage-panels', panels.length);

    /* How long each panel rests once it has arrived, in beats. */
    var HOLD = {
        about:    0.5,   /* the opening hold, before anything moves */
        services: 0.4,   /* after the last row lands */
        work:     1.0,   /* long enough to run the cursor down the list */
        contact:  0.4
    };
    function holdFor(panel) {
        var h = HOLD[panel.id];
        return typeof h === 'number' ? h : 0.4;
    }

    /* How far the work grid overruns its frame. Measured, not assumed: the
       grid is two columns of 3:2 tiles, so its height follows the panel's
       width, and the frame's height follows the title and the lede above it.
       Re-read on every refresh through the function-based tween value, so a
       resize or a change of filter cannot leave it scrolling into blank
       space — or stopping short of the last row. */
    function workOverflow() {
        if (!workView || !workScroll) return 0;
        return Math.max(0, workScroll.scrollHeight - workView.clientHeight);
    }

    /* Built inside the desktop branch, read by the click handler out here. */
    var stageTl    = null;
    var totalBeats = 0;
    var arriveAt   = [];   /* beat at which each panel has finished arriving */

    /*----------------------------------------------------------------------
      Nav highlight — reuses the template's own .current-menu-item state
    ----------------------------------------------------------------------*/
    var lastNav = null;
    function setActive(hash) {
        if (hash === lastNav) return;
        lastNav = hash;
        navLinks.forEach(function (link) {
            var li = link.parentNode;
            if (link.getAttribute('href') === hash) li.classList.add('current-menu-item');
            else li.classList.remove('current-menu-item');
        });
    }
    function navOf(panel) {
        return panel.getAttribute('data-nav') || '#' + panel.id;
    }

    /*----------------------------------------------------------------------
      Desktop: one pin, one timeline
    ----------------------------------------------------------------------*/
    var mm = gsap.matchMedia();

    /* The work grid is rendered from data/works.json, so on the index the
       stage cannot be laid out until that has landed — the beat count for
       the work panel's vertical travel is measured from the grid's height,
       and an empty grid measures zero. vaa-works.js publishes the promise
       before this file parses; pages without a grid get a resolved one. */
    (window.vaaWorksReady || Promise.resolve()).then(buildStage);

    function buildStage() {

    if (!reduced) mm.add('(min-width: 992px)', function () {

        document.body.classList.add('is-stack');

        /*  Rows carry different amounts of text, so their natural heights
            differ. An incoming row has to be at least as tall as the one it
            covers, or the row beneath shows past its edges. */
        function equaliseRows() {
            if (stackRows.length < 2) return;
            gsap.set(stackRows, { height: 'auto' });
            var tallest = 0;
            stackRows.forEach(function (row) { tallest = Math.max(tallest, row.offsetHeight); });
            gsap.set(stackRows, { height: tallest });
        }

        if (stackRows.length) {
            gsap.set(stackRows, { yPercent: -50 });
            equaliseRows();
        }

        /* ---- lay the beats out before building anything ---------------- */
        var slides    = [];   /* { at, to, panel } */
        var rowsAt    = null;
        var workAt    = null;
        var workBeats = 0;
        var navMarks = [{ at: 0, nav: navOf(panels[0]) }];

        arriveAt = [0];
        var beat = holdFor(panels[0]);

        for (var i = 1; i < panels.length; i++) {
            slides.push({ at: beat, to: i, panel: panels[i] });
            /* the nav flips once the slide is more than half done */
            navMarks.push({ at: beat + 0.55, nav: navOf(panels[i]) });
            beat += 1;
            arriveAt[i] = beat;

            if (panels[i] === stack && stackRows.length > 1) {
                rowsAt = beat;
                beat += stackRows.length - 1;
            }

            /* The work panel holds still sideways while its grid scrolls up
               through the frame — one beat per viewport-height of overrun, so
               the grid moves at roughly the speed the page would if it were
               scrolling normally. Clamped so a very tall or very short grid
               still spends a sensible amount of scroll here. */
            if (panels[i] === workPanel && workOverflow() > 8) {
                workAt = beat;
                workBeats = Math.min(9, Math.max(0.8, workOverflow() / window.innerHeight));
                beat += workBeats;
            }

            beat += holdFor(panels[i]);
        }
        totalBeats = beat;

        stageTl = gsap.timeline({
            scrollTrigger: {
                id: 'vaa-stage',
                trigger: stage,
                start: 'top top',
                end: '+=' + (totalBeats * 100) + '%',
                pin: true,
                scrub: 0.6,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                onRefreshInit: equaliseRows,
                onUpdate: function (self) {
                    var p = self.progress * totalBeats;
                    var want = navMarks[0].nav;
                    for (var k = 1; k < navMarks.length; k++) {
                        if (p >= navMarks[k].at) want = navMarks[k].nav;
                    }
                    setActive(want);
                }
            }
        });

        /* the holds have to occupy timeline space, so park a no-op across it */
        stageTl.to({}, { duration: totalBeats }, 0);

        /* ---- horizontal travel, one beat per panel --------------------- */
        slides.forEach(function (s) {
            stageTl.to(stageTrack, {
                x: function () { return -s.to * window.innerWidth; },
                ease: 'none',
                duration: 1
            }, s.at);
        });

        /* ---- the work grid scrolls up through its frame ---------------- */
        if (workAt !== null) {
            stageTl.fromTo(workScroll,
                { y: 0 },
                { y: function () { return -workOverflow(); },
                  ease: 'none', duration: workBeats },
                workAt);
        }

        /* ---- the services rows stack, one beat each -------------------- */
        if (rowsAt !== null) {
            stackRows.slice(1).forEach(function (row, i) {
                stageTl.fromTo(row,
                    { y: function () { return window.innerHeight * 0.85; } },
                    { y: 0, ease: 'none', duration: 1 },
                    rowsAt + i);
            });
        }

        /* ---- the hero owns the nav until the stage takes over ---------- */
        var heroTrigger = ScrollTrigger.create({
            id: 'vaa-hero-nav',
            trigger: hero,
            start: 'top 60%',
            end: 'bottom 40%',
            onToggle: function (self) { if (self.isActive) setActive('#heroTop'); }
        });

        return function () {
            document.body.classList.remove('is-stack');
            heroTrigger.kill();
            if (stageTl) {
                if (stageTl.scrollTrigger) stageTl.scrollTrigger.kill(true);
                stageTl.kill();
                stageTl = null;
            }
            gsap.set(stageTrack, { clearProps: 'transform' });
            if (workScroll) gsap.set(workScroll, { clearProps: 'transform' });
            if (stackRows.length) gsap.set(stackRows, { clearProps: 'transform,height' });
            totalBeats = 0;
            arriveAt = [];
        };
    });

    /*----------------------------------------------------------------------
      Tablet / phone / reduced motion: ordinary vertical scrollspy
    ----------------------------------------------------------------------*/
    mm.add(reduced ? '(min-width: 0px)' : '(max-width: 991px)', function () {
        var triggers = [];

        [hero].concat(panels).forEach(function (el) {
            if (!el) return;
            var navFor = el === hero ? '#heroTop' : navOf(el);
            triggers.push(ScrollTrigger.create({
                id: 'vaa-vnav-' + (el.id || 'panel'),
                trigger: el,
                start: 'top 55%',
                end: 'bottom 45%',
                onToggle: function (self) { if (self.isActive) setActive(navFor); }
            }));
        });

        return function () { triggers.forEach(function (t) { t.kill(); }); };
    });

    ScrollTrigger.refresh();
    }   /* end buildStage */

    /*----------------------------------------------------------------------
      Selected work — the preview that trails the cursor

      The list sits on the stage track, so nothing inside it can be
      position:fixed; the preview is parked at the end of the body instead
      and driven from here. gsap.quickTo gives it the lag that makes it read
      as following rather than snapping.
    ----------------------------------------------------------------------*/
    (function workPeek() {
        var peek = document.querySelector('.vaaWorkPeek');
        var list = document.querySelector('.vaaWorkList');
        if (!peek || !list) return;
        if (reduced) return;
        if (!window.matchMedia('(min-width: 992px)').matches) return;
        if (!window.matchMedia('(hover: hover)').matches) return;

        var moveX = gsap.quickTo(peek, 'x', { duration: 0.55, ease: 'power3' });
        var moveY = gsap.quickTo(peek, 'y', { duration: 0.55, ease: 'power3' });
        var shown = null;

        list.addEventListener('pointermove', function (e) {
            moveX(e.clientX);
            moveY(e.clientY);
        });

        Array.prototype.forEach.call(list.querySelectorAll('.vaaWorkLink'), function (link) {
            /* Placeholders rather than photography, so the preview carries the
               project's own name instead of loading an image. */
            var t = link.querySelector('.vaaWorkTitle');
            var m = link.querySelector('.vaaWorkMeta');
            var label = [t && t.textContent, m && m.textContent]
                            .filter(Boolean).join(' — ').trim();

            link.addEventListener('pointerenter', function (e) {
                if (label && label !== shown) { shown = label; peek.setAttribute('data-label', label); }
                /* land on the pointer first time, so it does not fly across
                   from wherever the previous row left it */
                if (!peek.classList.contains('is-on')) {
                    gsap.set(peek, { x: e.clientX, y: e.clientY });
                }
                peek.classList.add('is-on');
            });
            link.addEventListener('pointerleave', function () {
                peek.classList.remove('is-on');
            });
        });

        list.addEventListener('pointerleave', function () {
            peek.classList.remove('is-on');
        });
    }());

    /*----------------------------------------------------------------------
      Header height

      The hero video starts directly under the header, so the offset has to be
      the header's real height — which moves with the logo image and the
      breakpoint. Measure it rather than hard-coding a guess.
    ----------------------------------------------------------------------*/
    (function headerHeight() {
        var header = document.querySelector('.header02');
        if (!header) return;

        function measure() {
            var h = Math.round(header.getBoundingClientRect().height);
            if (h > 0) document.documentElement.style.setProperty('--vaa-header-h', h + 'px');
        }

        measure();
        window.addEventListener('load', measure);
        window.addEventListener('resize', measure);
        /* the logo is an image; its height is not known until it decodes */
        var logo = header.querySelector('img');
        if (logo && !logo.complete) logo.addEventListener('load', measure);
    }());

    /*----------------------------------------------------------------------
      Scroll progress
      Driven off the document rather than the stage, so it also covers the
      hero and reads as one continuous journey.
    ----------------------------------------------------------------------*/
    (function progress() {
        var bar = document.querySelector('.vaaProgressBar');
        if (!bar) return;
        gsap.to(bar, {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
                id: 'vaa-progress',
                trigger: document.documentElement,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.25
            }
        });
    }());

    /*----------------------------------------------------------------------
      Nav clicks
      On the stage an anchor jump means nothing — the panel never moves in the
      document. Convert its arrival beat into a page scroll position instead.
    ----------------------------------------------------------------------*/
    function goTo(hash) {
        var target = document.querySelector(hash);
        if (!target) return;

        if (hash === '#heroTop') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        var idx = panels.indexOf(target);
        var st  = stageTl && stageTl.scrollTrigger;

        if (idx > -1 && st && totalBeats) {
            window.scrollTo({
                top: st.start + (arriveAt[idx] / totalBeats) * (st.end - st.start) + 2,
                behavior: 'smooth'
            });
            return;
        }

        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    Array.prototype.forEach.call(
        document.querySelectorAll('.mainMenu a[href^="#"], .vaaScrollCue[href^="#"]'),
        function (link) {
            link.addEventListener('click', function (e) {
                var hash = link.getAttribute('href');
                if (!hash || hash === '#' || !document.querySelector(hash)) return;
                e.preventDefault();
                goTo(hash);
            });
        }
    );

    /*----------------------------------------------------------------------
      Retire the template's own scroll effects inside the stage

      common.js scrubs a handful of tweens (#videoPlay, .secHeading,
      .projectCat_area li, .testimonial01Wrapper) against VERTICAL scroll
      position. On a pinned horizontal stage their triggers never resolve, so
      they freeze part-way through — headings sit 80px low, and so on. Settle
      each tween at its finished state, drop the trigger, clear what it left.
    ----------------------------------------------------------------------*/
    function retireTemplateEffects() {
        if (!document.body.classList.contains('is-stack')) return;

        ScrollTrigger.getAll().forEach(function (st) {
            var id = st.vars && st.vars.id;
            if (id && String(id).indexOf('vaa-') === 0) return;

            var el = st.trigger;
            if (!el || !stageTrack.contains(el)) return;

            var anim = st.animation;
            st.kill(false);
            if (anim) { anim.progress(1); anim.kill(); }
            gsap.set(el, { clearProps: 'transform,opacity,scale,x,y' });
        });
    }

    /*----------------------------------------------------------------------
      Re-measure once everything that changes height has settled
    ----------------------------------------------------------------------*/
    function settle() {
        retireTemplateEffects();
        ScrollTrigger.refresh();
    }

    window.addEventListener('load', function () {
        settle();
        /* common.js builds its triggers on load, and the Revolution Slider
           sizes itself a beat later still. */
        setTimeout(settle, 700);
        setTimeout(settle, 2000);
    });

}());
