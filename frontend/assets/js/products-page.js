/* assets/js/products-page.js */
(function () {
    function $(id) {
      return document.getElementById(id);
    }
  
    function formatTry(amount) {
      try {
        return new Intl.NumberFormat("tr-TR", {
          style: "currency",
          currency: "TRY",
          maximumFractionDigits: 0,
        }).format(Number(amount) || 0);
      } catch (e) {
        return "₺" + (Number(amount) || 0);
      }
    }
  
    function escapeHtml(s) {
      return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  
    function getProductsSafe() {
      if (Array.isArray(window.MELZ_PRODUCTS)) return window.MELZ_PRODUCTS;
      if (window.MelzV2 && Array.isArray(window.MelzV2.products)) return window.MelzV2.products;
      return [];
    }
  
    function render(products) {
      var grid = $("products-grid");
      if (!grid) return false;
  
      var countEl = $("products-count");
      if (countEl) countEl.textContent = String(products.length || 0);
  
      if (!products.length) {
        // boş state
        grid.innerHTML = "";
        return true;
      }
  
      grid.innerHTML = products
        .map(function (p) {
          var id = p.id ?? p._id ?? "";
          var title = escapeHtml(p.title || p.name || ("Ürün #" + id));
          var cat = escapeHtml(p.category || "");
          var img = (p.images && p.images[0]) ? p.images[0] : (p.image || "/assets/img/logo.png");
          var shortDesc = escapeHtml(p.shortDescription || "");
          var price = p.price ?? p.salePrice ?? p.amount ?? 0;

          var detailHref = "/urun/dist/index.html";

          // Renk chipleri
          var colors = Array.isArray(p.colors) ? p.colors.slice(0, 4) : [];

          var colorChips = "";

          return `
  <article class="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
    <a href="${detailHref}?id=${encodeURIComponent(id)}" class="block">
      <div class="bg-slate-50 aspect-[4/3] flex items-center justify-center overflow-hidden">
        <img src="${escapeHtml(img)}" alt="${title}" class="w-full h-full object-cover" onerror="this.src='/assets/img/logo.png'">
      </div>
    </a>

    <div class="p-4">
      ${cat ? `<div class="text-xs text-slate-500 mb-1">${cat}</div>` : ""}

          <a href="${detailHref}?id=${encodeURIComponent(id)}" class="block">
            <h3 class="font-semibold text-slate-900 leading-snug min-h-[44px]">${title}</h3>
          </a>
          ${shortDesc ? `<p class="mt-2 text-sm text-slate-600 max-h-[3rem] overflow-hidden">${shortDesc}</p>` : ""}
          ${colorChips}

          <div class="mt-2 text-lg font-bold text-[#c47a3f]">${formatTry(price)}</div>

          <div class="mt-4 flex items-center gap-3">
            <button
              class="add-to-cart-btn flex-1 rounded-xl px-4 py-3 font-semibold text-white bg-[#c47a3f] hover:opacity-90"
              data-product-id="${escapeHtml(id)}"
            >
              Sepete Ekle
            </button>

            <a
              href="${detailHref}?id=${encodeURIComponent(id)}"
              class="rounded-xl px-4 py-3 font-semibold border border-slate-200 text-slate-800 hover:bg-slate-50"
            >
              Detay
            </a>
          </div>
        </div>
      </article>`;
        })
        .join("");
  
      return true;
    }
  
    function boot() {
      // Bu sayfa değilse noop
      if (!document.getElementById("products-grid")) return;
  
      var tries = 0;
      var maxTries = 80; // ~8sn
      var timer = setInterval(function () {
        tries++;
  
        var products = getProductsSafe();
        // api.v2 yüklendi mi?
        if (products && products.length) {
          render(products);
          clearInterval(timer);
          console.log("[PRODUCTS_PAGE] Rendered:", products.length);
          return;
        }
  
        // Son deneme: yine de render edip count 0 gösterelim
        if (tries >= maxTries) {
          render(products);
          clearInterval(timer);
          console.warn("[PRODUCTS_PAGE] Products empty after retries. Check api.v2.js output.");
        }
      }, 100);
    }
  
    document.addEventListener("DOMContentLoaded", boot);
  })();
