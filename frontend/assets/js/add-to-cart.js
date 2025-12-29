/* Melz Add-to-Cart + Badge (Hard Update)
   - Event delegation
   - Works with MelzV2 / MelzApiV2
*/

(function () {
  if (window.__melz_add_to_cart_hard) return;
  window.__melz_add_to_cart_hard = true;

  function getApi() {
    return window.MelzApiV2 || window.MelzV2 || null;
  }

  function getLocalCartCount() {
    const api = getApi();
    try {
      if (api && typeof api.getCart === "function") {
        const cart = api.getCart() || [];
        return cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
      }
    } catch (e) {}
    return 0;
  }

  function updateBadgeHard() {
    const badge = document.getElementById("cart-badge");
    if (!badge) {
      console.warn("[MELZ] cart-badge element not found in DOM.");
      return;
    }

    const count = getLocalCartCount();
    badge.textContent = String(count);

    if (count > 0) badge.classList.remove("hidden");
    else badge.classList.add("hidden");
  }

  function waitForApi(maxMs = 4000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        const api = getApi();
        if (api && typeof api.addToCart === "function") return resolve(api);
        if (Date.now() - start > maxMs) return reject(new Error("API not ready"));
        setTimeout(tick, 50);
      };
      tick();
    });
  }

  function toast(msg) {
    // basit
    try { console.log("[MELZ]", msg); } catch (e) {}
  }

  function bindClicks() {
    document.addEventListener("click", function (e) {
      const btn = e.target.closest(".js-add-to-cart");
      if (!btn) return;

      e.preventDefault();

      const pid = btn.dataset.pid;
      if (!pid) return;

      const api = getApi();
      if (!api || typeof api.addToCart !== "function") {
        console.warn("[MELZ] API not available for addToCart");
        return;
      }

      const old = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Ekleniyor...";

      try {
        api.addToCart(String(pid), 1);
        updateBadgeHard();
        toast("Sepete eklendi ✅");
        btn.textContent = "Eklendi ✅";
      } catch (err) {
        console.error("[MELZ] addToCart error:", err);
        btn.textContent = old;
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = old;
        }, 900);
      }
    });
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  onReady(async () => {
    try {
      await waitForApi();
      bindClicks();
      updateBadgeHard();
      console.log("[ADD_TO_CART] Initialized ✓");
    } catch (e) {
      console.warn("[ADD_TO_CART] API not ready, badge/clicks may not work.", e);
    }
  });
})();