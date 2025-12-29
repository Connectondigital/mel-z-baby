(function () {
  // Tek sefer çalışsın
  if (window.__melz_addtocart_final_v1) return;
  window.__melz_addtocart_final_v1 = true;

  function isAddBtn(el) {
    const t = (el?.textContent || "").trim().toLowerCase();
    return t.includes("sepete ekle");
  }

  function getApi() {
    return window.MelzV2 || window.MelzApiV2;
  }

  function toast(type, msg) {
    const api = getApi();
    try {
      if (api?.showToast) return api.showToast(type, msg);
    } catch (e) {}
    alert(msg);
  }

  function ensureApiThenBind() {
    let tries = 0;

    const timer = setInterval(() => {
      tries++;
      const api = getApi();

      if (api && typeof api.addToCart === "function") {
        clearInterval(timer);

        // Event delegation (dinamik butonlarda da çalışır)
        document.addEventListener("click", function (e) {
          const btn = e.target?.closest?.("button");
          if (!btn || !isAddBtn(btn)) return;

          e.preventDefault();

          // data-pid varsa onu kullan; yoksa buton sırasına göre 1..6
          if (!btn.dataset.pid) {
            const buttons = Array.from(document.querySelectorAll("button")).filter(isAddBtn);
            const idx = Math.max(0, buttons.indexOf(btn));
            btn.dataset.pid = String((idx % 6) + 1);
          }

          const pid = btn.dataset.pid;

          try {
            // MelzV2 signature: addToCart(productId, qty, options)
            api.addToCart(pid, 1);

            try { api.updateCartBadge && api.updateCartBadge(); } catch (e2) {}

            toast("success", "Sepete eklendi ✅");

            // küçük görsel feedback
            btn.classList.add("opacity-80");
            setTimeout(() => btn.classList.remove("opacity-80"), 200);
          } catch (err) {
            console.error("[ADD_TO_CART_ERROR]", err);
            toast("error", "Sepete eklenemedi.");
          }
        }, { capture: true });

        console.log("[ADD_TO_CART] Bound ✅");
      }

      // çok beklemesin
      if (tries > 80) {
        clearInterval(timer);
        console.warn("[ADD_TO_CART] API bulunamadı (timeout).");
      }
    }, 50);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureApiThenBind);
  } else {
    ensureApiThenBind();
  }
})();