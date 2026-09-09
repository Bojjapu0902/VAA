/*==========================================================================
  VAA — text scroll reveal (word rise, then letter light)
  --------------------------------------------------------------------------
  Any [data-reveal-text] inside a [data-reveal-track] starts invisible.
  SplitText breaks it into words and chars, and one scrubbed timeline drives
  two phases in sequence:

    1. Words rise up from below and fade in, one after another, settling in
       a light gray. There's no pre-split "line" — each word is just placed
       in normal text flow, so a line fills and wraps (or breaks at a <br>)
       entirely through ordinary reflow as words arrive.
    2. Once every word is in, letters light up white in reading order,
       char by char — except letters inside words named in the text
       element's own data-reveal-keywords attribute (comma-separated),
       which light up in the brand accent instead, so those terms stand out.

  Both phases are scrubbed to the same scroll distance: the track's own top
  to bottom against the viewport. A taller track held pinned via
  position:sticky (both About and Services use this) stretches the reveal
  into a slower, held pass — the pacing comes from the track's own
  height/CSS, not this file, so any section can opt in just by using the
  same markup pattern.

  A track carrying data-reveal-zoom-out gets a third phase appended once the
  two above finish: the whole text element scales up and fades out, as if
  pushed toward the screen. It runs against the same scrubbed timeline, so it
  only plays once the track has scroll room left over after the letters
  finish lighting up (see .vaaServicesTrack's extra height).
==========================================================================*/
(function () {
    'use strict';

    if (!window.gsap || !window.SplitText || !window.ScrollTrigger) return;
    gsap.registerPlugin(SplitText, ScrollTrigger);

    var rootStyle = getComputedStyle(document.documentElement);
    var accentColor = rootStyle.getPropertyValue('--vaa-accent').trim() || '#c9a96e';
    var textColor = rootStyle.getPropertyValue('--vaa-text').trim() || '#fff';

    var tracks = document.querySelectorAll('[data-reveal-track]');

    tracks.forEach(function (track) {
        var text = track.querySelector('[data-reveal-text]');
        if (!text) return;

        var keywords = (text.getAttribute('data-reveal-keywords') || '')
            .split(',')
            .map(function (k) { return k.trim().toLowerCase(); })
            .filter(Boolean);

        var split = new SplitText(text, {
            type: 'words, chars',
            mask: 'words',
            wordsClass: 'vaaRevealWord',
            charsClass: 'vaaRevealChar'
        });

        split.words.forEach(function (word) {
            var clean = word.textContent.toLowerCase().replace(/[^a-z]/g, '');
            if (keywords.indexOf(clean) !== -1) word.classList.add('vaaRevealImportant');
        });

        gsap.set(split.words, { yPercent: 100, opacity: 0 });

        var tl = gsap.timeline({
            scrollTrigger: {
                trigger: track,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.3
            }
        });

        /* Phase 1 — words rise into view one by one, in light gray */
        tl.to(split.words, {
            yPercent: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.08,
            ease: 'power2.out'
        }, 0);

        /* Phase 2 — starts once every word has arrived; letters light up
           white, keyword letters light up the brand accent, both in one
           reading-order sweep */
        tl.to(split.chars, {
            color: function (i, target) {
                return target.closest('.vaaRevealImportant') ? accentColor : textColor;
            },
            duration: 0.4,
            stagger: 0.03,
            ease: 'none'
        }, '>');

        /* Phase 3 (opt-in) — once every letter is lit, the whole line scales
           up and fades, reading as if it were pushed toward the screen and
           past it. Runs on the text element itself rather than the split
           parts, so it moves as one piece instead of drifting apart. */
        if (track.hasAttribute('data-reveal-zoom-out')) {
            tl.to(text, {
                scale: 2.4,
                opacity: 0,
                duration: 0.6,
                ease: 'power1.in'
            }, '>0.1');
        }
    });
}());
