/*==========================================================================
  VAA — split-text motion layer (RNO1 pattern)
  --------------------------------------------------------------------------
  Two movements, both taken from rno1.com:

    letters  a per-character fade from above — each letter drops in and fades
             up one after the next, left to right, on a 35ms stagger. This is
             what the titles use: the hero headline and every section title.

    lines    a masked rise — each line sits in its own clipping box and
             travels up from beneath it, staggered. Kept for the editorial
             statement, where a per-letter stagger across a paragraph-length
             heading would take too long to resolve.

  SplitText is a Club GreenSock plugin, so it cannot be shipped here. This
  file carries its own splitter with the same shape (lines / words / chars),
  and if the licensed plugin is ever dropped in it is picked up automatically
  — see splitInto().

  Both movements toggle. Each is built once, paused, then played as its
  panel arrives and reversed as it leaves — so scrolling back and forth
  re-runs the reveal instead of leaving the type stranded on screen.

  Triggering: the panels after the hero live on a pinned, horizontally
  translated track. A ScrollTrigger inside that track would need the stage
  timeline handed to it as a containerAnimation, which couples this file to
  the other one. IntersectionObserver measures the real, post-transform box
  instead, so it reports correctly wherever the panel is and needs to know
  nothing about the stage.

  Depends on gsap, already loaded by the template.
==========================================================================*/
(function () {
    'use strict';

    if (typeof window.gsap === 'undefined') return;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /*----------------------------------------------------------------------
      What gets split, and how
    ----------------------------------------------------------------------*/
    var RECIPES = [
        { sel: '.secHeading h3',       type: 'chars',  anim: 'letters' },
        { sel: '.vaaAboutBody h2',     type: 'lines',  anim: 'lines'   },
        { sel: '.vaaAboutBody > p',    type: 'lines',  anim: 'fade'    },

        /* Services page. The outro is split per half rather than as one
           heading: its two words are laid out as flex items, and flattening
           the whole thing would drop the spans that make that work. */
        { sel: '.vaaPageTitle',        type: 'chars',  anim: 'letters' },
        { sel: '.vaaPageLede',         type: 'lines',  anim: 'fade'    },
        { sel: '.vaaPkgName',          type: 'chars',  anim: 'letters' },
        { sel: '.vaaProcNum',          type: 'chars',  anim: 'letters' },
        { sel: '.vaaOutroTitle > span',  type: 'chars',  anim: 'letters' },

        /* Case study page */
        { sel: '.secHeading-plain',    type: 'chars',  anim: 'letters' },
        /* not .vaaCaseRole — its label and value are separate inline
           elements, and flattening for a line mask would drop them */
        { sel: '.vaaCaseProseInner > p:not(.vaaCaseRole)', type: 'lines', anim: 'fade' },

        /* Not text: the work tiles. Each watches itself rather than the
           panel — the grid is taller than its frame now, so cards below the
           fold would otherwise play their reveal unseen and be sitting there
           finished by the time you scrolled to them. */
        { sel: '.vaaWorkCard',  type: 'self', anim: 'zoom', scopeSelf: true }
    ];

    /*======================================================================
      Splitter
    ======================================================================*/

    /* Wrap every word in its own inline-block, recursing through nested
       inline elements so an accent span or a link survives the pass. */
    function wrapWords(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (kid) {

            if (kid.nodeType === 3) {                       // text
                if (!kid.textContent.trim()) return;
                var frag = document.createDocumentFragment();
                kid.textContent.split(/(\s+)/).forEach(function (bit) {
                    if (!bit) return;
                    if (/^\s+$/.test(bit)) {
                        frag.appendChild(document.createTextNode(' '));
                        return;
                    }
                    var w = document.createElement('span');
                    w.className = 'vaaWord';
                    w.textContent = bit;
                    frag.appendChild(w);
                });
                node.replaceChild(frag, kid);
                return;
            }

            if (kid.nodeType === 1 && kid.tagName !== 'BR' &&
                !kid.classList.contains('vaaWord')) {
                wrapWords(kid);
            }
        });
    }

    /* Flatten the word spans up to the top level, carrying the colour and
       weight they inherited from whatever wrapper they were in. Without this
       a line mask cannot be built around words that sit at different depths. */
    function flatten(el) {
        var words = Array.prototype.slice.call(el.querySelectorAll('.vaaWord'));

        words.forEach(function (w) {
            var cs = window.getComputedStyle(w);
            w.style.color      = cs.color;
            w.style.fontWeight = cs.fontWeight;
            w.style.fontStyle  = cs.fontStyle;
        });

        /* Rebuild the element from the flat sequence of words and <br>s */
        var seq = [];
        (function walk(node) {
            Array.prototype.slice.call(node.childNodes).forEach(function (kid) {
                if (kid.nodeType === 1 && kid.classList &&
                    kid.classList.contains('vaaWord')) { seq.push(kid); return; }
                if (kid.nodeType === 1 && kid.tagName === 'BR') { seq.push(kid); return; }
                if (kid.nodeType === 1) walk(kid);
            });
        }(el));

        el.textContent = '';
        seq.forEach(function (n, i) {
            el.appendChild(n);
            if (n.tagName !== 'BR' && seq[i + 1] && seq[i + 1].tagName !== 'BR') {
                el.appendChild(document.createTextNode(' '));
            }
        });

        return seq.filter(function (n) { return n.tagName !== 'BR'; });
    }

    /* Group flattened words into lines by their measured top, then wrap each
       group in a clipping box. Returns the inner, movable halves. */
    function groupLines(el, words) {
        if (!words.length) return [];

        var lines = [];
        var top   = null;

        words.forEach(function (w) {
            var t = w.offsetTop;
            if (top === null || Math.abs(t - top) > 4) { lines.push([]); top = t; }
            lines[lines.length - 1].push(w);
        });

        var inners = [];
        el.textContent = '';

        lines.forEach(function (group) {
            var outer = document.createElement('span');
            var inner = document.createElement('span');
            outer.className = 'vaaLine';
            inner.className = 'vaaLineIn';

            group.forEach(function (w, i) {
                inner.appendChild(w);
                if (i < group.length - 1) inner.appendChild(document.createTextNode(' '));
            });

            outer.appendChild(inner);
            el.appendChild(outer);
            inners.push(inner);
        });

        return inners;
    }

    function splitChars(words) {
        var chars = [];
        words.forEach(function (w) {
            var text = w.textContent;
            w.textContent = '';
            text.split('').forEach(function (c) {
                var s = document.createElement('span');
                s.className = 'vaaChar';
                s.textContent = c;
                w.appendChild(s);
                chars.push(s);
            });
        });
        return chars;
    }

    /* One entry point. Uses the licensed plugin when it is present, and the
       splitter above when it is not — the caller gets the same shape either way. */
    function splitInto(el, type) {
        /* Nothing to split — the element's own children are the parts */
        if (type === 'children') return Array.prototype.slice.call(el.children);
        /* …or the element itself is the part */
        if (type === 'self') return [el];

        if (window.SplitText && gsap.registerPlugin) {
            try {
                gsap.registerPlugin(window.SplitText);
                var st = new window.SplitText(el, {
                    type: type === 'chars' ? 'lines,words,chars' : 'lines,words',
                    linesClass: 'vaaLineIn',
                    wordsClass: 'vaaWord',
                    charsClass: 'vaaChar'
                });
                /* the plugin's lines need the clipping box adding around them */
                if (type === 'lines') {
                    st.lines.forEach(function (line) {
                        var box = document.createElement('span');
                        box.className = 'vaaLine';
                        line.parentNode.insertBefore(box, line);
                        box.appendChild(line);
                    });
                }
                return type === 'chars' ? st.chars
                     : type === 'words' ? st.words
                     : st.lines;
            } catch (e) { /* fall through to the built-in splitter */ }
        }

        wrapWords(el);
        var words = flatten(el);
        if (type === 'words') return words;
        if (type === 'chars') return splitChars(words);
        return groupLines(el, words);
    }

    /*======================================================================
      Movements
    ======================================================================*/
    /* Every movement is built once, paused at its start, and then played or
       reversed as the panel enters and leaves — so the type toggles rather
       than firing once and staying put. Each returns a paused tween. */
    var MOVES = {
        lines: function (parts, delay) {
            return gsap.fromTo(parts,
                { yPercent: 115 },
                { yPercent: 0, duration: 1.05, ease: 'power4.out',
                  stagger: 0.085, paused: true, delay: delay });
        },

        /* Letters fade in from above, one after another, left to right. The
           stagger is the whole effect, so each character gets a long, soft
           fade and drops a third of an em into place. Reversed on the way
           out, the same wave runs backwards and the line lifts away. */
        letters: function (parts, delay) {
            return gsap.fromTo(parts,
                { opacity: 0, yPercent: -20 },
                {
                    opacity: 1, yPercent: 0,
                    duration: 0.75, ease: 'power2.out',
                    stagger: { each: 0.035, from: 'start' },
                    paused: true, delay: delay
                });
        },

        /* Fade in and zoom in together: each tile arrives from 8% down and
           92% of its size, so the grid resolves outward rather than sliding.
           Reversed on the way out, it settles back the same way. */
        zoom: function (parts, delay) {
            return gsap.fromTo(parts,
                { opacity: 0, scale: 0.92, yPercent: 6 },
                { opacity: 1, scale: 1, yPercent: 0,
                  duration: 0.9, ease: 'power3.out',
                  stagger: { each: 0.075, from: 'start' },
                  paused: true, delay: delay });
        },

        fade: function (parts, delay) {
            return gsap.fromTo(parts,
                { yPercent: -28, opacity: 0 },
                { yPercent: 0, opacity: 1, duration: 0.85, ease: 'power3.out',
                  stagger: 0.045, paused: true, delay: delay });
        }
    };

    /* The resting state, applied up front so nothing flashes in place first */
    var RESTS = {
        lines:   { yPercent: 115 },
        letters: { opacity: 0, yPercent: -20 },
        zoom:    { opacity: 0, scale: 0.92, yPercent: 6 },
        fade:    { yPercent: -28, opacity: 0 }
    };

    /*======================================================================
      Fit-to-width display type

      A clamp() sizes type against the viewport, which says nothing about
      whether the words actually fit their column — and the answer changes
      with the face that loaded. At 1920 "Selected work" set from 13vh is
      1310px wide in the fallback and 855px in Anton: one wraps to two lines
      and eats a third of the panel, the other does not.

      So the size is measured. An element is set to a known size, its true
      single-line width is read, and it scales to the column — never above
      the size the stylesheet already asked for, so the clamp still governs
      and this only ever pulls a title back from wrapping.

      data-fit="300" caps it at 300px instead; data-fit alone (or a match in
      FIT_SELECTORS) caps it at whatever the stylesheet computed.
    ======================================================================*/
    var FIT_SELECTORS = '[data-fit], .secHeading h3, .secHeading-plain';

    function fitOne(el) {
        var parent = el.parentElement;
        if (!parent) return;

        var ps    = window.getComputedStyle(parent);
        var avail = parent.clientWidth
                  - parseFloat(ps.paddingLeft || 0)
                  - parseFloat(ps.paddingRight || 0);
        if (avail <= 0) return;

        /* Cap: the attribute if it carries a number, otherwise whatever the
           stylesheet computed before we touched anything. */
        var max = parseFloat(el.getAttribute('data-fit'));
        if (!max) {
            if (!el.dataset.fitBase) {
                el.style.fontSize = '';
                el.dataset.fitBase = parseFloat(window.getComputedStyle(el).fontSize);
            }
            max = parseFloat(el.dataset.fitBase);
        }
        if (!max) return;

        /* Measure at a known size. Both overrides matter: nowrap stops the
           words breaking mid-measure, and max-content is what makes the
           reading the TEXT's width — an ordinary block element just reports
           the column back, whatever the type is doing inside it. */
        var prevWS = el.style.whiteSpace;
        var prevW  = el.style.width;

        el.style.whiteSpace = 'nowrap';
        el.style.width      = 'max-content';
        el.style.fontSize   = '100px';

        var w = el.getBoundingClientRect().width;

        el.style.whiteSpace = prevWS;
        el.style.width      = prevW;

        if (!w) { el.style.fontSize = ''; return; }

        /* 0.99, and nowrap on top of it. A size that fills the column to the
           last sub-pixel still wraps — the trailing letter-space after the
           final character counts in a max-content measurement but has
           nowhere to go on the line. The margin costs 1% of the size and
           removes the whole class of one-word-orphan headings. */
        el.style.fontSize = Math.min(max, (avail / w) * 99) + 'px';
        el.classList.add('vaaFitted');
    }

    function fitAll() {
        Array.prototype.forEach.call(document.querySelectorAll(FIT_SELECTORS), fitOne);
    }

    /*======================================================================
      Build
    ======================================================================*/
    function build() {
        /* Size before splitting: a line mask measured against a title that is
           about to change size would be built in the wrong place. */
        fitAll();

        if (reduced) return;

        var items = [];

        RECIPES.forEach(function (recipe) {
            Array.prototype.forEach.call(
                document.querySelectorAll(recipe.sel),
                function (el) {
                    if (el.dataset.splitDone) return;
                    if (!el.textContent.trim()) return;

                    /* Flattening rebuilds the element from bare word spans,
                       which would take any link, button or icon inside it with
                       it. Anything interactive is left alone. 'children' never
                       rewrites the DOM, so the guard does not apply to it. */
                    if (recipe.type !== 'children' && recipe.type !== 'self' &&
                        el.querySelector('a, button, input, svg, img, i')) return;

                    el.dataset.splitDone = '1';
                    el.setAttribute('data-split', recipe.type);

                    var parts = splitInto(el, recipe.type);
                    if (!parts || !parts.length) return;

                    gsap.set(parts, RESTS[recipe.anim]);
                    items.push({
                        el: el, parts: parts, anim: recipe.anim,
                        scopeSelf: !!recipe.scopeSelf, tween: null
                    });
                }
            );
        });

        if (!items.length) return;

        /* Watch the panel each piece of type belongs to rather than the type
           itself — a title sitting at the top of a 100vh panel would otherwise
           be counted as "seen" while the panel is still mostly off screen. */
        function scopeOf(el) {
            /* Only the index's horizontal panels are grouped: they arrive as
               one unit, so their contents should too. Everywhere else each
               piece of type watches itself — grouping a title to a 1400px
               package section would leave it sitting on screen, blank, until
               a third of the section had scrolled past. */
            return el.closest('.vaaStagePanel, .vaaHero') || el;
        }

        var byScope = new Map();
        items.forEach(function (item) {
            var scope = item.scopeSelf ? item.el : scopeOf(item.el);
            if (!byScope.has(scope)) byScope.set(scope, []);
            byScope.get(scope).push(item);
        });

        /* Build a scope's tweens the first time it is asked for, then just
           drive them. Later blocks in the same panel are held back a beat so
           the title leads and the copy follows. */
        function tweensFor(scope) {
            var group = byScope.get(scope);
            if (!group) return null;
            group.forEach(function (item, i) {
                if (!item.tween) item.tween = MOVES[item.anim](item.parts, i * 0.12);
            });
            return group;
        }

        function toggle(scope, on) {
            var group = tweensFor(scope);
            if (!group) return;
            group.forEach(function (item) {
                if (on) item.tween.play();
                else    item.tween.reverse();
            });
        }

        if (!('IntersectionObserver' in window)) {
            byScope.forEach(function (_, scope) { toggle(scope, true); });
            return;
        }

        /* Two thresholds rather than one. Playing at 35% and reversing only
           below 15% leaves a dead band in the middle, so a panel sitting near
           the trigger point cannot flutter between the two states. */
        var IN = 0.35, OUT = 0.15;
        var lit = new WeakMap();

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var scope = entry.target;
                var on    = lit.get(scope) === true;
                var r     = entry.intersectionRatio;

                if (!on && r >= IN)      { lit.set(scope, true);  toggle(scope, true); }
                else if (on && r < OUT)  { lit.set(scope, false); toggle(scope, false); }
            });
        }, { threshold: [0, OUT, IN, 0.6, 1] });

        byScope.forEach(function (_, scope) { io.observe(scope); });

        document.documentElement.classList.add('vaaSplitDone');
    }

    /* Wait for the webfonts — splitting before Anton and General Sans land
       measures line breaks against the fallback and puts the masks in the
       wrong places. */
    function start() {
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(build).catch(build);
        } else {
            build();
        }
    }

    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start);

    /* Elements that arrive after the first pass — the work cards, which are
       rendered from data/works.json — call this to be picked up. build() is
       idempotent: anything already split carries data-split-done and is
       skipped, so only the new elements get observers. */
    window.vaaSplitScan = function () {
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(build).catch(build);
        } else {
            build();
        }
    };

    /* Re-measure line masks when the viewport changes width enough to rewrap.
       Splitting again is not safe, so the masks simply stop clipping — the
       type stays correct, it just loses the reveal it has already played. */
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () {
        fitAll();
        if (Math.abs(window.innerWidth - lastW) < 60) return;
        lastW = window.innerWidth;
        Array.prototype.forEach.call(document.querySelectorAll('.vaaLine'), function (l) {
            l.style.overflow = 'visible';
        });
    });

})();
