/*==========================================================================
  <vaa-site-header> — the sticky site header, as a custom element.
  Renders into light DOM (not shadow DOM) so it keeps picking up the site's
  existing stylesheets (bootstrap.css, theme.css, vaa-custom.css, ...) and
  stays visible to document.querySelector('.header02') in vaa-page.js.
  --------------------------------------------------------------------------
  Also owns the light/dark theme toggle: the applyStoredTheme() call below
  runs the instant this script executes (synchronously, in <head>, before
  <body> is even parsed), so the saved preference is on <html> before first
  paint — no dark-then-light flash. The toggle button itself is only wired
  up once the header connects.
==========================================================================*/
(function () {
    'use strict';

    var THEME_KEY = 'vaa-theme';
    var LOGO_WHITE = 'assets/images/VAA/Logo_White.png';
    var LOGO_BLACK = 'assets/images/VAA/Logo_black.png';

    function getStoredTheme() {
        try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
    }
    function storeTheme(theme) {
        try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
    }
    function currentTheme() {
        return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    }
    function applyTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    // Runs immediately — before <body> exists — so the page never flashes
    // the wrong theme on load.
    if (getStoredTheme() === 'light') applyTheme('light');

    var TEMPLATE =
        '<div class="container">' +
            '<div class="row">' +
                '<div class="col-md-12">' +
                    '<div class="headerInner02">' +
                        '<div class="logo">' +
                            '<a href="VAA_Index.html" class="dfCursor vaaLogo" aria-label="VAA — Vasantha Ads &amp; Arts, home">' +
                                '<img src="' + LOGO_WHITE + '" alt="VAA" class="vaaLogoImg" style="width: 108px; margin-left: 30px;">' +
                            '</a>' +
                        '</div>' +
                        '<nav class="mainMenu">' +
                            '<ul>' +
                                '<li><a data-title="Hero" href="VAA_Index.html#heroTop"><span>Hero</span></a></li>' +
                                '<li><a data-title="About" href="VAA_Index.html#about"><span>About</span></a></li>' +
                                '<li><a data-title="Services" href="services.html"><span>Services</span></a></li>' +
                                '<li><a data-title="Contact Us" href="VAA_Index.html#contact"><span>Contact Us</span></a></li>' +
                            '</ul>' +
                        '</nav>' +
                        '<div class="headerOniAccess02">' +
                            '<button type="button" class="vaaThemeToggle" aria-label="Switch to light theme" aria-pressed="false">' +
                                '<svg class="vaaThemeIcon vaaThemeIcon--sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"></path></svg>' +
                                '<svg class="vaaThemeIcon vaaThemeIcon--moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg>' +
                            '</button>' +
                            '<a class="hdSupportBtn" href="mailto:info@vaidads.com"><i class="boozy-chat"></i> Start a project</a>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

    customElements.define('vaa-site-header', class extends HTMLElement {
        connectedCallback() {
            if (this.childElementCount === 0) {
                this.setAttribute('role', 'banner');
                this.classList.add('header02', 'isSticky');
                this.innerHTML = TEMPLATE;
            }

            var logoImg = this.querySelector('.vaaLogoImg');
            var toggleBtn = this.querySelector('.vaaThemeToggle');
            var metaTheme = document.querySelector('meta[name="theme-color"]');
            var darkMeta = metaTheme ? metaTheme.getAttribute('content') : null;

            function syncToUI(theme) {
                if (logoImg) logoImg.src = theme === 'light' ? LOGO_BLACK : LOGO_WHITE;
                if (toggleBtn) {
                    toggleBtn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
                    toggleBtn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
                }
                if (metaTheme) {
                    metaTheme.setAttribute('content', theme === 'light' ? '#F6F3EC' : (darkMeta || '#000000'));
                }
            }

            syncToUI(currentTheme());

            if (toggleBtn) {
                toggleBtn.addEventListener('click', function () {
                    var next = currentTheme() === 'light' ? 'dark' : 'light';
                    applyTheme(next);
                    storeTheme(next);
                    syncToUI(next);
                });
            }
        }
    });
}());
