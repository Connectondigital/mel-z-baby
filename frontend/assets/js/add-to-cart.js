/**
 * Add-to-Cart Module for Mel'z Baby & Kids
 * Works with MelzV2 API
 * Handles cart badge updates and add-to-cart button clicks
 */
(function () {
  'use strict';

  // Prevent multiple initializations
  if (window.__melz_addtocart_v2_loaded) return;
  window.__melz_addtocart_v2_loaded = true;

  /**
   * Get the API instance (MelzV2 or MelzApiV2)
   */
  function getApi() {
    return window.MelzV2 || window.MelzApiV2 || null;
  }

  /**
   * Get cart count from localStorage (fallback if API not ready)
   */
  function getLocalCartCount() {
    const api = getApi();
    if (api && typeof api.getCartCount === 'function') {
      return api.getCartCount();
    }
    // Fallback: read directly from localStorage
    try {
      const cart = JSON.parse(localStorage.getItem('melz_cart') || '[]');
      return cart.reduce((sum, item) => sum + (item.qty || 0), 0);
    } catch (e) {
      return 0;
    }
  }

  /**
   * Force update the cart badge element
   */
  function updateBadgeHard() {
    const badge = document.getElementById('cart-badge');
    if (!badge) {
      console.warn('[ADD_TO_CART] cart-badge element not found in DOM');
      return;
    }
    const count = getLocalCartCount();
    badge.textContent = String(count);
    badge.style.display = count > 0 ? 'flex' : 'none';
    console.log('[ADD_TO_CART] Badge updated to:', count);
  }

  /**
   * Show toast notification
   */
  function showToast(message, type) {
    const api = getApi();
    if (api && typeof api.showToast === 'function') {
      api.showToast(message, type);
      return;
    }
    // Fallback: simple console log
    console.log('[ADD_TO_CART] Toast:', type, message);
  }

  /**
   * Check if element is an add-to-cart button
   */
  function isAddToCartButton(el) {
    if (!el) return false;
    // Check for explicit class
    if (el.classList.contains('js-add-to-cart')) return true;
    // Check button text
    const text = (el.textContent || '').trim().toLowerCase();
    return text.includes('sepete ekle');
  }

  /**
   * Handle add to cart click
   */
  function handleAddToCart(btn) {
    const pid = btn.dataset.pid;
    if (!pid) {
      console.warn('[ADD_TO_CART] Button missing data-pid attribute');
      return;
    }

    const api = getApi();
    if (!api || typeof api.addToCart !== 'function') {
      console.error('[ADD_TO_CART] MelzV2 API not available');
      showToast('Hata: API yüklenemedi', 'error');
      return;
    }

    try {
      // Add to cart using MelzV2 API
      api.addToCart(pid, 1);
      console.log('[ADD_TO_CART] Product added:', pid);

      // Update badge immediately
      setTimeout(updateBadgeHard, 10);

      // Show success toast
      showToast('Sepete eklendi ✓', 'success');

      // Visual feedback
      btn.classList.add('opacity-70');
      setTimeout(() => btn.classList.remove('opacity-70'), 250);

    } catch (err) {
      console.error('[ADD_TO_CART] Error:', err);
      showToast('Sepete eklenemedi', 'error');
    }
  }

  /**
   * Initialize the module
   */
  function init() {
    console.log('[ADD_TO_CART] Initializing...');

    // Wait for API to be available
    let attempts = 0;
    const maxAttempts = 100;
    
    const waitForApi = setInterval(() => {
      attempts++;
      const api = getApi();

      if (api && typeof api.addToCart === 'function') {
        clearInterval(waitForApi);
        console.log('[ADD_TO_CART] API ready, binding events');

        // Update badge on load
        updateBadgeHard();

        // Use event delegation for click handling
        document.addEventListener('click', function(e) {
          const btn = e.target.closest('.js-add-to-cart');
          if (btn) {
            e.preventDefault();
            e.stopPropagation();
            handleAddToCart(btn);
          }
        }, true);

        // Listen for cart update events
        window.addEventListener('melz:cart:update', updateBadgeHard);

        console.log('[ADD_TO_CART] Initialized ✓');
      }

      if (attempts >= maxAttempts) {
        clearInterval(waitForApi);
        console.warn('[ADD_TO_CART] Timeout waiting for API');
      }
    }, 50);
  }

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose functions globally (as required by problem statement)
  window.getApi = getApi;
  window.getLocalCartCount = getLocalCartCount;
  window.updateBadgeHard = updateBadgeHard;

})();
