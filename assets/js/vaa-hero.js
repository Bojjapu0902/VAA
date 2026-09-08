/*==========================================================================
  VAA — hero load-in
  --------------------------------------------------------------------------
  added.digital's pattern: the headline rises out of a line mask, the
  scattered work cards settle in from a tilt a beat later, the subcopy
  closes it out, and then the cards drift on a slow, randomised idle float
  for as long as the page sits open. Runs once, on load, independently of
  the horizontal stage that starts below the hero.

  The cards' resting position (top/left/width) is pure CSS — see .vaaHero in
  vaa-custom.css — so this file only ever animates transform + opacity and
  never has to know a pixel value.

  Below 992px the cards drop into an ordinary row (also CSS) and lose the
  scatter, the tilt and the idle float; they still fade up in place so the
  load still feels considered on a phone. prefers-reduced-motion skips
  straight to the resting state everywhere.

  A few more cards (.vaaHeroCardGhost) sit tucked around the headline,
  invisible until the cursor finds them. Those are a plain CSS crossfade —
  see vaa-custom.css — and are deliberately left out of everything below,
  load timeline, idle float and hover handlers alike, so this file never
  touches them.

  Depends on gsap, already loaded by the template.
==========================================================================*/
(function () {
    'use strict';

    if (typeof window.gsap === 'undefined') return;

    var hero = document.getElementById('heroTop');
    if (!hero) return;

    var lines = Array.prototype.slice.call(hero.querySelectorAll('.vaaHeroLineIn'));
    var cards = Array.prototype.slice.call(hero.querySelectorAll('.vaaHeroCard:not(.vaaHeroCardGhost)'));
    var sub   = hero.querySelector('.vaaHeroSub');

    var reduced   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isDesktop = window.matchMedia('(min-width: 992px)').matches;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* Reduced motion: land on the finished state, no timeline, no float. */
    if (reduced) {
        gsap.set(lines, { clearProps: 'all' });
        gsap.set(cards, { clearProps: 'all' });
        if (sub) gsap.set(sub, { clearProps: 'all' });
        return;
    }

    /* Each card gets its own resting tilt (2-4deg, randomised sign) and, on
       desktop, its own starting tilt (-4 to 4deg) to settle out of. Kept in
       one array so the hover handlers and the idle float agree on "home". */
    var restRotation = cards.map(function () {
        var sign = Math.random() < 0.5 ? -1 : 1;
        return sign * gsap.utils.random(2, 4);
    });

    gsap.set(lines, { yPercent: 100, opacity: 0 });
    if (sub) gsap.set(sub, { y: 20, opacity: 0 });

    if (isDesktop) {
        gsap.set(cards, {
            opacity: 0,
            scale: 0.85,
            rotation: function () { return gsap.utils.random(-4, 4); }
        });
    } else {
        /* No scatter to settle out of on a phone — just fade/scale up in place. */
        gsap.set(cards, { opacity: 0, scale: 0.92, rotation: 0 });
    }

    var tl = gsap.timeline({ delay: 0.15 });

    tl.to(lines, {
        yPercent: 0,
        opacity: 1,
        duration: 0.9,
        ease: 'power4.out',
        stagger: 0.08
    });

    tl.to(cards, {
        opacity: 1,
        scale: 1,
        rotation: function (i) { return isDesktop ? restRotation[i] : 0; },
        duration: 0.7,
        ease: 'power3.out',
        stagger: { each: 0.1, from: 'random' }
    }, '-=0.5');

    if (sub) {
        tl.to(sub, {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: 'power2.out'
        }, '-=0.25');
    }

    /* ---- idle float — the "alive" detail, cards only, desktop only ------- */
    var idleTweens = [];

    function startIdle(card, i) {
        idleTweens[i] = gsap.to(card, {
            y: '+=' + gsap.utils.random(6, 8),
            rotation: '+=' + (Math.random() < 0.5 ? -1 : 1) * gsap.utils.random(1, 2),
            duration: gsap.utils.random(3, 5),
            delay: gsap.utils.random(0, 2),
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });
    }

    tl.eventCallback('onComplete', function () {
        if (!isDesktop) return;
        cards.forEach(startIdle);
    });

    if (!isDesktop) return;

    /* ---- hover / focus micro-interaction --------------------------------
       Straighten, scale up a touch, reveal the "View project" label. The
       idle float is paused rather than killed, so it picks back up on the
       same randomised loop instead of restarting a fresh one every hover. */
    cards.forEach(function (card, i) {
        var label = card.querySelector('.vaaHeroCardView');

        function enter() {
            if (idleTweens[i]) idleTweens[i].pause();
            gsap.to(card, { scale: 1.05, rotation: 0, y: 0, duration: 0.3, ease: 'power2.out' });
            if (label) gsap.to(label, { opacity: 1, duration: 0.3, ease: 'power2.out' });
        }
        function leave() {
            gsap.to(card, {
                scale: 1, rotation: restRotation[i], y: 0,
                duration: 0.3, ease: 'power2.out',
                onComplete: function () { if (idleTweens[i]) idleTweens[i].resume(); }
            });
            if (label) gsap.to(label, { opacity: 0, duration: 0.2, ease: 'power2.out' });
        }

        card.addEventListener('mouseenter', enter);
        card.addEventListener('mouseleave', leave);
        card.addEventListener('focus', enter);
        card.addEventListener('blur', leave);
    });

    /* ---- optional: a very light cursor parallax --------------------------
       Shifts each card's image a few px opposite the pointer. Lives on the
       inner frame, not the card itself, so it never fights the card's own
       scale/rotation/idle-float tweens for the same transform. Desktop,
       fine-pointer only. */
    if (finePointer) {
        var setters = cards.map(function (card) {
            var frame = card.querySelector('.vaaHeroCardFrame');
            if (!frame) return null;
            return {
                x: gsap.quickTo(frame, 'x', { duration: 0.5, ease: 'power3' }),
                y: gsap.quickTo(frame, 'y', { duration: 0.5, ease: 'power3' })
            };
        });

        hero.addEventListener('mousemove', function (e) {
            var rect = hero.getBoundingClientRect();
            var dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
            var dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

            setters.forEach(function (s) {
                if (!s) return;
                s.x(dx * -8);
                s.y(dy * -8);
            });
        });

        hero.addEventListener('mouseleave', function () {
            setters.forEach(function (s) {
                if (!s) return;
                s.x(0);
                s.y(0);
            });
        });
    }
})();
