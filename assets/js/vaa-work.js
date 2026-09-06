/*==========================================================================
  VAA — work grid category filter
  --------------------------------------------------------------------------
  The dropdown from rno1.com/work: a pill that opens a short list of
  categories and narrows the grid to one of them.

  Filtering is done by hiding cards rather than by reordering them, so the
  grid never reflows sideways — the surviving tiles simply close up. Hidden
  cards get `hidden` (not display:none from a class), which keeps them out
  of the accessibility tree and out of the tab order for free.

  The reveal in vaa-split.js owns the cards' opacity and scale, so this file
  never fights it: it animates only the cards it is about to hide or show,
  and always lands them back on the reveal's finished values.

  gsap is optional — without it the filter still works, just without the
  cross-fade.
==========================================================================*/
(function () {
    'use strict';

    /* Exposed so vaa-works.js can bind the filter once the cards have been
       rendered from data/works.json. Calling it again re-reads the DOM and
       rebinds from scratch; the guards below make a call with no grid a
       no-op, which is what happens on the first, pre-fetch run. */
    window.vaaWorkInit = function init() {

    var root = document.querySelector('.vaaWorkFilter');
    var grid = document.querySelector('.vaaWorkGrid');
    if (!root || !grid) return;

    var btn     = root.querySelector('.vaaFilterBtn');
    var label   = root.querySelector('.vaaFilterLabel');
    var menu    = root.querySelector('.vaaFilterMenu');
    var options = Array.prototype.slice.call(menu.querySelectorAll('[data-filter]'));
    var cards   = Array.prototype.slice.call(grid.querySelectorAll('.vaaWorkCard'));
    if (!btn || !menu || !options.length || !cards.length) return;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var current = 'all';

    /* The grid is no longer fitted to the frame — it runs at its natural
       two-column height and vaa-horizontal.js scrolls the panel through the
       overrun. Nothing here has to measure anything. */

    /*----------------------------------------------------------------------
      Open / close
    ----------------------------------------------------------------------*/
    function open(on) {
        menu.hidden = !on;
        btn.setAttribute('aria-expanded', on ? 'true' : 'false');
        root.classList.toggle('is-open', on);
    }

    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        open(menu.hidden);
    });

    /* Bound once per page, not once per rebind — the handlers look the
       current root up through the closure, and a second binding would just
       double every close. */
    if (!window.__vaaFilterDocBound) {
        window.__vaaFilterDocBound = true;

        document.addEventListener('click', function (e) {
            var r = document.querySelector('.vaaWorkFilter');
            if (r && !r.contains(e.target)) {
                var m = r.querySelector('.vaaFilterMenu');
                var b = r.querySelector('.vaaFilterBtn');
                if (m) m.hidden = true;
                if (b) b.setAttribute('aria-expanded', 'false');
                r.classList.remove('is-open');
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            var r = document.querySelector('.vaaWorkFilter');
            if (!r) return;
            var m = r.querySelector('.vaaFilterMenu');
            var b = r.querySelector('.vaaFilterBtn');
            if (!m || m.hidden) return;
            m.hidden = true;
            r.classList.remove('is-open');
            if (b) { b.setAttribute('aria-expanded', 'false'); b.focus(); }
        });
    }

    /*----------------------------------------------------------------------
      Apply a category
    ----------------------------------------------------------------------*/

    /* Filtering changes the grid's height, and the stage sizes the work
       panel's vertical travel from exactly that. Without this, filtering down
       to two cards would leave the panel scrolling into empty space. */
    function remeasure() {
        if (window.ScrollTrigger) ScrollTrigger.refresh();
    }

    function apply(cat) {
        if (cat === current) { open(false); return; }
        current = cat;

        var show = [];
        var hide = [];

        cards.forEach(function (card) {
            var keep = (cat === 'all') || card.getAttribute('data-cat') === cat;
            (keep ? show : hide).push(card);
        });

        if (!window.gsap || reduced) {
            hide.forEach(function (c) { c.hidden = true; });
            show.forEach(function (c) { c.hidden = false; });
            remeasure();
            return;
        }

        /* Out first, then the survivors settle into the gaps that opened */
        if (hide.length) {
            gsap.to(hide, {
                opacity: 0, scale: 0.92, duration: 0.3, ease: 'power2.in',
                stagger: 0.03,
                onComplete: function () { hide.forEach(function (c) { c.hidden = true; }); }
            });
        }

        show.forEach(function (c) { c.hidden = false; });
        gsap.fromTo(show,
            { opacity: 0, scale: 0.94 },
            {
                opacity: 1, scale: 1, yPercent: 0,
                duration: 0.55, ease: 'power3.out',
                stagger: 0.05,
                delay: hide.length ? 0.22 : 0,
                onComplete: remeasure
            });
    }

    options.forEach(function (opt) {
        opt.addEventListener('click', function () {
            options.forEach(function (o) { o.setAttribute('aria-selected', String(o === opt)); });
            label.textContent = opt.textContent.trim();
            apply(opt.getAttribute('data-filter'));
            open(false);
        });
    });

    };   /* end vaaWorkInit */

    window.vaaWorkInit();

}());
