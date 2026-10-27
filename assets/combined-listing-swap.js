/*
  combined-listing-swap.js  (Concept theme)

  Makes a Combined Listing swap the active child in place (no full page reload) when a parent option
  (Strength / Sleeve) is changed, keeping one URL in the address bar.

  Approach (no theme.js edit):
    - Concept's stock variant picker renders combined-option values with a data-product-url attribute;
      Concept's default handler would hard-navigate there. We intercept the change in the CAPTURE
      phase and stop it before Concept's handlers run — but only for combined options (data-product-url).
      In-child options (Size) have none, so they pass through to Concept untouched.
    - We fetch the child and swap <product-info> (critical) and the <media-gallery> (best-effort, it
      sits outside product-info) via Concept's own theme.HTMLUpdateUtility.viewTransition, so custom
      elements re-initialize and inline scripts re-run as they do for a native variant change.
    - Address bar stays on the current (parent) URL.

  Resilience: the gallery swap is isolated so it can never abort the product swap. Any failure of the
  critical path logs to console ([combined-listing-swap]) and falls back to a normal navigation to the
  child, so a customer is never stuck.

  Loaded only by the combined PDP templates.
*/
(function () {
  'use strict';

  if (window.__combinedListingSwapInit) return;
  window.__combinedListingSwapInit = true;

  var TAG = '[combined-listing-swap]';
  var BUSY = 'data-combined-swapping';

  function canSwap() {
    return window.theme && theme.HTMLUpdateUtility && typeof theme.HTMLUpdateUtility.viewTransition === 'function';
  }

  function clearBusy(section, productInfo, oldGallery) {
    if (section) section.removeAttribute(BUSY);
    if (productInfo) productInfo.style.opacity = '';
    if (oldGallery) oldGallery.style.opacity = '';
  }

  function swapTo(childUrl, originInput) {
    var productInfo = originInput.closest && originInput.closest('product-info');
    if (!productInfo || !canSwap()) {
      console.warn(TAG, 'prerequisite missing (productInfo/viewTransition); navigating', { hasProductInfo: !!productInfo, canSwap: canSwap() });
      window.location.href = childUrl;
      return;
    }

    var section = productInfo.closest('.shopify-section') || document;
    if (section.hasAttribute && section.hasAttribute(BUSY)) return;
    if (section.setAttribute) section.setAttribute(BUSY, '');

    var oldGallery = section.querySelector('media-gallery[id^="ProductGallery-"]');
    if (oldGallery) oldGallery.style.opacity = '0.6';
    productInfo.style.opacity = '0.6';

    console.debug(TAG, 'swapping to', childUrl);

    fetch(childUrl, { headers: { 'X-Requested-With': 'fetch' } })
      .then(function (res) {
        if (!res.ok) throw new Error('fetch ' + res.status + ' for ' + childUrl);
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var newInfo = doc.querySelector('product-info');
        if (!newInfo) throw new Error('no <product-info> in fetched page ' + childUrl);

        // Critical path: swap product-info. If this throws we fall back to navigation.
        theme.HTMLUpdateUtility.viewTransition(productInfo, newInfo);

        // Best-effort: swap the gallery. Isolated so a gallery error cannot trigger a reload.
        try {
          var newGallery = doc.querySelector('media-gallery[id^="ProductGallery-"]');
          if (oldGallery && newGallery) {
            theme.HTMLUpdateUtility.viewTransition(oldGallery, newGallery);
          } else {
            console.warn(TAG, 'gallery not swapped', { oldGallery: !!oldGallery, newGallery: !!newGallery });
          }
        } catch (galleryErr) {
          console.error(TAG, 'gallery swap failed (continuing without it):', galleryErr);
          if (oldGallery) oldGallery.style.opacity = '';
        }

        // Keep one URL in the address bar: stop variant-param URL writes after a swap.
        var liveInfo = section.querySelector('product-info');
        if (liveInfo) {
          liveInfo.style.opacity = '';
          liveInfo.setAttribute('data-update-url', 'false');
        }

        if (section.removeAttribute) section.removeAttribute(BUSY);
        console.debug(TAG, 'swap complete', childUrl);

        section.dispatchEvent(
          new CustomEvent('combined-listing:swapped', { bubbles: true, detail: { productUrl: childUrl } })
        );
      })
      .catch(function (err) {
        console.error(TAG, 'swap failed, navigating to child:', err);
        clearBusy(section, productInfo, oldGallery);
        window.location.href = childUrl;
      });
  }

  // Capture phase: run before Concept's variant-picker/product-info handlers so we can stop the
  // default reload for combined options only.
  document.addEventListener(
    'change',
    function (event) {
      var input = event.target;
      if (!input || input.nodeType !== 1 || typeof input.getAttribute !== 'function') return;

      var childUrl = input.getAttribute('data-product-url');
      if (!childUrl) return; // Size and other in-child options have none -> let Concept handle them

      event.stopImmediatePropagation();
      swapTo(childUrl, input);
    },
    true
  );

  console.debug(TAG, 'ready');
})();
