/*==========================================================================
  VAA — image scroll reveal (scale + pan -> normal)
  --------------------------------------------------------------------------
  Any <img class="vaaImgReveal"> starts zoomed in and nudged right — the
  resting transform lives in vaa-custom.css as a CSS transition. The instant
  the image visually enters the viewport this adds .is-inview, and the CSS
  transition eases it back to scale(1) / translateX(0).

  IntersectionObserver rather than GSAP ScrollTrigger on purpose: the
  Selected-work images sit inside .vaaStackItem, which vaa-work-stack.js
  already moves with its own scroll-scrubbed transform (translateY from
  off-screen). A second, independent ScrollTrigger on the image would cache
  its "has this crossed 85% of the viewport" math against wherever the image
  happened to be at the moment it was created — before that scrub had run —
  and never fire correctly. IntersectionObserver measures the actual
  rendered position on every frame, so it reveals correctly regardless of
  what is moving the element (scroll, a GSAP scrub, position:sticky, or
  nothing at all), which is what makes it a genuine drop-in for any image
  anywhere in the project.

  A MutationObserver keeps watching after the initial scan, so images
  injected later — the Selected-work stack is built asynchronously from
  data/works.json — get wired up the moment they land in the DOM.
==========================================================================*/
(function () {
    'use strict';

    if (!('IntersectionObserver' in window)) return;

    var wired = new WeakSet();

    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-inview');
            io.unobserve(entry.target);
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

    function wire(img) {
        if (wired.has(img)) return;
        wired.add(img);
        io.observe(img);
    }

    function scan(root) {
        if (!root.querySelectorAll) return;
        if (root.matches && root.matches('.vaaImgReveal')) wire(root);
        var found = root.querySelectorAll('.vaaImgReveal');
        for (var i = 0; i < found.length; i++) wire(found[i]);
    }

    scan(document);

    new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            m.addedNodes.forEach(function (node) {
                if (node.nodeType === 1) scan(node);
            });
        });
    }).observe(document.body, { childList: true, subtree: true });
}());
