/*==========================================================================
  <vaa-site-header> — the sticky site header, as a custom element.
  Renders into light DOM (not shadow DOM) so it keeps picking up the site's
  existing stylesheets (bootstrap.css, theme.css, vaa-custom.css, ...) and
  stays visible to document.querySelector('.header02') in vaa-page.js.
==========================================================================*/
(function () {
    'use strict';

    var TEMPLATE =
        '<div class="container">' +
            '<div class="row">' +
                '<div class="col-md-12">' +
                    '<div class="headerInner02">' +
                        '<div class="logo">' +
                            '<a href="VAA_Index.html" class="dfCursor vaaLogo" aria-label="VAA — Vasantha Ads &amp; Arts, home">' +
                                '<img src="assets/images/VAA/Logo_White.png" alt="VAA" style="width: 108px; margin-left: 30px;">' +
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
        }
    });
}());
