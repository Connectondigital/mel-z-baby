/* assets/js/product-detail.js (SAFE, REBUILD) */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatTry(amount) {
    try {
      return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 })
        .format(Number(amount) || 0);
    } catch {
      return "₺" + (Number(amount) || 0);
    }
  }

  function getIdFromUrl() {
    try { return new URLSearchParams(location.search).get("id"); }
    catch { return null; }
  }

  function normalizeColor(c) {
    const s = String(c || "").trim();
    if (!s) return null;

    // hex
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return { label: s, css: s };

    // basic map
    const m = {
      siyah: "#111827",
      beyaz: "#ffffff",
      krem: "#f5f5dc",
      bej: "#e7d7c1",
      kahverengi: "#8b5a2b",
      bordo: "#7f1d1d",
      kirmizi: "#dc2626",
      kırmızı: "#dc2626",
      pembe: "#f472b6",
      mavi: "#2563eb",
      lacivert: "#1e3a8a",
      yesil: "#16a34a",
      yeşil: "#16a34a",
      gri: "#6b7280",
    };
    const key = s.toLowerCase();
    return { label: s, css: m[key] || "#e5e7eb" }; // fallback neutral
  }

  async function waitForProducts(maxMs) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      if (Array.isArray(window.MELZ_PRODUCTS) && window.MELZ_PRODUCTS.length) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  }

  async function getProductSafe(id) {
    const list = Array.isArray(window.MELZ_PRODUCTS) ? window.MELZ_PRODUCTS : [];
    const found = list.find((x) => String(x.id) === String(id));
    if (found) return found;

    if (window.MelzV2 && typeof window.MelzV2.getProductById === "function") {
      try { return await window.MelzV2.getProductById(id); } catch {}
    }
    return null;
  }

  function collectImages(p) {
    const imgs = [];
    if (Array.isArray(p?.images)) imgs.push.apply(imgs, p.images);
    if (p?.image) imgs.push(p.image);
    // uniq + truthy
    const seen = new Set();
    return imgs.filter(Boolean).filter((x) => {
      const k = String(x);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function render(p) {
    const root = $("product-detail");
    if (!root) return;

    const title = escapeHtml(p.title || p.name || ("Ürün #" + p.id));
    const price = Number(p.price || 0);
    const shortDesc = escapeHtml(p.shortDescription || "");
    const desc = escapeHtml(p.description || "");

    const imgs = collectImages(p);
    const mainImg = escapeHtml(imgs[0] || "/assets/img/logo.png");

    const thumbs = imgs.slice(0, 6).map((src, idx) => {
      const s = escapeHtml(src);
      return `
        <button type="button" class="pd-thumb rounded-xl overflow-hidden border border-slate-200 hover:border-[#c47a3f]" data-img="${s}" aria-label="Görsel ${idx + 1}">
          <img src="${s}" class="w-20 h-20 object-cover bg-slate-50" onerror="this.src='/assets/img/logo.png'">
        </button>
      `;
    }).join("");

    const sizes = Array.isArray(p.sizes) ? p.sizes.filter(Boolean) : [];
    const colorsRaw = Array.isArray(p.colors) ? p.colors.filter(Boolean) : [];
    const colors = colorsRaw.map(normalizeColor).filter(Boolean);

    let selectedSize = null;
    let selectedColor = null;

    const sizeHtml = sizes.length ? `
      <div class="mt-6">
        <div class="text-sm font-semibold text-slate-900 mb-2">Beden</div>
        <div class="flex flex-wrap gap-2" id="pd-sizes">
          ${sizes.map((s) => `
            <button type="button"
              class="pd-size rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-[#c47a3f] hover:bg-[#c47a3f]/10"
              data-size="${escapeHtml(s)}">${escapeHtml(s)}</button>
          `).join("")}
        </div>
      </div>
    ` : "";

    const colorHtml = colors.length ? `
      <div class="mt-6">
        <div class="text-sm font-semibold text-slate-900 mb-2">Renk</div>
        <div class="flex flex-wrap gap-2" id="pd-colors">
          ${colors.map((c) => `
            <button type="button"
              class="pd-color w-10 h-10 rounded-full border border-slate-300 hover:border-[#c47a3f] flex items-center justify-center"
              data-color="${escapeHtml(c.label)}"
              aria-label="Renk ${escapeHtml(c.label)}"
              title="${escapeHtml(c.label)}">
              <span class="w-7 h-7 rounded-full border border-white" style="background:${escapeHtml(c.css)}"></span>
            </button>
          `).join("")}
        </div>
        <div class="text-xs text-slate-500 mt-2" id="pd-color-label"></div>
      </div>
    ` : "";

    root.innerHTML = `
      <div class="max-w-[1100px] mx-auto px-4 py-10">
        <a href="/bebek-urunleri/dist/index.html" class="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6">
          ← Ürünlere geri dön
        </a>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div class="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <img id="pd-main-img" src="${mainImg}" alt="${title}"
                   class="w-full aspect-[4/3] object-cover bg-slate-50"
                   onerror="this.src='/assets/img/logo.png'">
            </div>
            ${thumbs ? `<div class="mt-4 flex flex-wrap gap-3">${thumbs}</div>` : ""}
          </div>

          <div>
            <h1 class="text-2xl font-extrabold text-slate-900">${title}</h1>
            <div class="mt-2 text-2xl font-extrabold text-[#c47a3f]">${formatTry(price)}</div>

            ${shortDesc ? `<p class="mt-4 text-slate-600">${shortDesc}</p>` : ""}
            ${desc ? `<div class="mt-4 text-slate-700 leading-relaxed">${desc}</div>` : ""}

            ${sizeHtml}
            ${colorHtml}

            <div class="mt-8 flex items-center gap-3">
              <button type="button" class="pd-add rounded-2xl px-6 py-4 font-extrabold text-white bg-[#c47a3f] hover:opacity-90">
                Sepete Ekle
              </button>
              <a href="/sepet/dist/index.html" class="rounded-2xl px-6 py-4 font-extrabold border border-slate-200 text-slate-900 hover:bg-slate-50">
                Sepete Git
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

    // thumbs click
    root.querySelectorAll(".pd-thumb").forEach((btn) => {
      btn.addEventListener("click", () => {
        const src = btn.getAttribute("data-img");
        const img = root.querySelector("#pd-main-img");
        if (img && src) img.src = src;
      });
    });

    // size select
    const sizeWrap = root.querySelector("#pd-sizes");
    if (sizeWrap) {
      sizeWrap.querySelectorAll(".pd-size").forEach((b) => {
        b.addEventListener("click", () => {
          selectedSize = b.getAttribute("data-size");
          sizeWrap.querySelectorAll(".pd-size").forEach((x) => x.classList.remove("border-[#c47a3f]", "bg-[#c47a3f]/10"));
          b.classList.add("border-[#c47a3f]", "bg-[#c47a3f]/10");
        });
      });
    }

    // color select
    const colorWrap = root.querySelector("#pd-colors");
    const colorLabel = root.querySelector("#pd-color-label");
    if (colorWrap) {
      colorWrap.querySelectorAll(".pd-color").forEach((b) => {
        b.addEventListener("click", () => {
          selectedColor = b.getAttribute("data-color");
          colorWrap.querySelectorAll(".pd-color").forEach((x) => x.classList.remove("ring-2", "ring-[#c47a3f]"));
          b.classList.add("ring-2", "ring-[#c47a3f]");
          if (colorLabel) colorLabel.textContent = selectedColor ? ("Seçilen: " + selectedColor) : "";
        });
      });
    }

    // add to cart (direct, robust)
    const addBtn = root.querySelector(".pd-add");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (colors.length && !selectedColor) {
          alert("Lütfen önce bir renk seçiniz.");
          return;
        }
        if (sizes.length && !selectedSize) {
          alert("Lütfen önce bir beden seçiniz.");
          return;
        }

        if (window.MelzV2 && typeof window.MelzV2.addToCart === "function") {
          window.MelzV2.addToCart(String(p.id), 1, {
            ...(selectedSize ? { size: selectedSize } : {}),
            ...(selectedColor ? { color: selectedColor } : {}),
          });
          if (typeof window.MelzV2.updateCartBadge === "function") window.MelzV2.updateCartBadge();
          alert("Sepete eklendi ✅");
        } else {
          alert("Sepet sistemi bulunamadı.");
        }
      });
    }

    try { console.log("[PRODUCT_DETAIL] Rendered:", p.id); } catch {}
  }

  async function boot() {
    if (!$("product-detail")) return;

    const id = getIdFromUrl();
    console.log("[PRODUCT_DETAIL] script loaded, id:", id);

    if (!id) {
      $("product-detail").innerHTML = '<div class="max-w-[1100px] mx-auto px-4 py-10">Ürün bulunamadı.</div>';
      return;
    }

    await waitForProducts(5000);
    const p = await getProductSafe(id);

    if (!p) {
      $("product-detail").innerHTML = '<div class="max-w-[1100px] mx-auto px-4 py-10">Ürün bulunamadı. (ID: ' + escapeHtml(id) + ')</div>';
      return;
    }

    render(p);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
