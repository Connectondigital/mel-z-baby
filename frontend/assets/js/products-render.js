// assets/js/products-render.js
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

  function formatTRY(val) {
    const n = Number(val || 0);
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
  }

  function imgFallback(imgEl) {
    imgEl.onerror = null;
    imgEl.src = "/assets/img/logo.png"; // veya /assets/melz-logo.png
  }

  function render(products) {
    const grid = $("#product-grid");
    if (!grid) return;

    grid.innerHTML = "";

    products.forEach((p) => {
      const priceText = p.price ? formatTRY(p.price) : ""; // fiyat yoksa boş

      const card = document.createElement("div");
      card.className =
        "rounded-2xl border border-[#e8e6e4] bg-white overflow-hidden shadow-sm";

      card.innerHTML = `
        <div class="aspect-[4/3] bg-[#f5f2ef] flex items-center justify-center">
          <img
            src="${p.image || "/assets/img/logo.png"}"
            alt="${p.name}"
            class="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        <div class="p-5">
          <div class="text-xs text-text-secondary mb-1">${p.category || ""}</div>
          <div class="text-lg font-black leading-snug">${p.name}</div>

          ${
            priceText
              ? `<div class="mt-2 text-primary font-black text-lg">${priceText}</div>`
              : `<div class="mt-2 text-text-secondary text-sm">Fiyat yakında</div>`
          }

          <div class="mt-4 flex gap-3">
            <button
              class="flex-1 h-12 rounded-xl bg-primary text-white font-bold hover:opacity-95 transition add-to-cart-btn"
              data-product-id="${p.id}"
            >
              Sepete Ekle
            </button>

            <a
              class="h-12 px-4 rounded-xl border border-[#e8e6e4] font-bold flex items-center justify-center hover:bg-[#faf9f8] transition"
              href="/urun/dist/index.html?pid=${encodeURIComponent(p.id)}"
            >
              İncele
            </a>
          </div>
        </div>
      `;

      const img = card.querySelector("img");
      if (img) imgFallback(img);

      grid.appendChild(card);
    });
  }

  function init() {
    const products = (window.MELZ_PRODUCTS || []).slice();

    // Kategori dropdown doldur
    const sel = $("#product-filter");
    if (sel) {
      const cats = ["Hepsi", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
      sel.innerHTML = cats.map((c) => `<option value="${c}">${c}</option>`).join("");
      sel.addEventListener("change", () => {
        const v = sel.value;
        render(v === "Hepsi" ? products : products.filter((p) => p.category === v));
      });
    }

    render(products);
  }

  document.addEventListener("DOMContentLoaded", init);
})();