/*==========================================================================
  VAA — shared page behaviour for the ordinary (vertical) pages
  --------------------------------------------------------------------------
  VAA_Index.html gets these from vaa-horizontal.js, which bails early when
  there is no pinned stage to build. Every other page loads this instead:

    · the real header height, published as --vaa-header-h so anything that
      sits under the sticky header can reserve exactly the right room;
    · the scroll-progress hairline.

  gsap and ScrollTrigger are optional — without them the progress bar simply
  does not animate, and the header measurement still runs.
==========================================================================*/
(function () {
    'use strict';

    /*----------------------------------------------------------------------
      Header height
      Measured rather than assumed: the logo is an image, so the header's
      height is not known until it has loaded.
    ----------------------------------------------------------------------*/
    (function headerHeight() {
        var header = document.querySelector('.header02');
        if (!header) return;

        function measure() {
            var h = Math.round(header.getBoundingClientRect().height);
            if (h > 0) {
                document.documentElement.style.setProperty('--vaa-header-h', h + 'px');
            }
        }

        measure();
        window.addEventListener('load', measure);
        window.addEventListener('resize', measure);

        var logo = header.querySelector('img');
        if (logo && !logo.complete) logo.addEventListener('load', measure);
    }());

    /* Fit-to-width display type lives in vaa-split.js, which every page
       that needs it already loads — see FIT_SELECTORS there. */

    /*----------------------------------------------------------------------
      Scroll progress
    ----------------------------------------------------------------------*/
    (function progress() {
        var bar = document.querySelector('.vaaProgressBar');
        if (!bar) return;

        if (window.gsap && window.ScrollTrigger) {
            gsap.registerPlugin(ScrollTrigger);
            gsap.to(bar, {
                scaleX: 1,
                ease: 'none',
                scrollTrigger: {
                    trigger: document.documentElement,
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: 0.25
                }
            });
            return;
        }

        /* No GSAP on the page — drive it straight off the scroll position */
        function paint() {
            var d = document.documentElement;
            var max = d.scrollHeight - window.innerHeight;
            bar.style.transform = 'scaleX(' + (max > 0 ? d.scrollTop / max : 0) + ')';
        }
        paint();
        window.addEventListener('scroll', paint, { passive: true });
        window.addEventListener('resize', paint);
    }());

    /*----------------------------------------------------------------------
      Back to top
    ----------------------------------------------------------------------*/
    (function backToTop() {
        var btn = document.getElementById('backtotop');
        if (!btn) return;

        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        function paint() {
            btn.classList.toggle('vaaOn', window.scrollY > window.innerHeight * 0.6);
        }
        paint();
        window.addEventListener('scroll', paint, { passive: true });
    }());

})();
