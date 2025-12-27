/**
 * Mel'z Baby & Kids - Frontend API Integration (SINGLE SOURCE)
 * - Works with static HTML pages
 * - Backend: http://127.0.0.1:5050/api
 */

(() => {
  "use strict";

  // ✅ Tek doğru base
  const API_BASE = (window.MELZ_API_URL || "http://127.0.0.1:5050/api").replace(/\/$/, "");

  const qs = (s, root = document) => root.querySelector(s);

  function fmtTRY(n) {
    try {
      return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(n || 0));
    } catch {
      return `₺ ${Number(n || 0).toFixed(2)}`;
    }
  }

  async function fetchJSON(url, options = {}) {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    let data = null;
    try { data = await res.json(); } catch { /* ignore */ }
    if (!res.ok) {
      const msg = data?.error || data?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  function safeText(s) {
    return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  function renderCard(p) {
    const img = (p.images && p.images[0]) ? p.images[0] : "/assets/melz-logo.png";
    const hasSale = p.salePrice != null && Number(p.salePrice) < Number(p.price);
    const priceHtml = hasSale
      ? `<span class="text-[#4a4a4a] dark:text-white font-black text-xl">${fmtTRY(p.salePrice)}</span>
         <span class="text-gray-400 text-sm line-through">${fmtTRY(p.price)}</span>`
      : `<span class="text-[#4a4a4a] dark:text-white font-black text-xl">${fmtTRY(p.price)}</span>`;

    return `
      <a href="/urun/dist/index.html?id=${encodeURIComponent(p.id)}"
         class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-[var(--melz-beige-dark)] dark:border-gray-700 hover:shadow-xl hover:border-primary/30 transition-all duration-300 group flex flex-col">
        <div class="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-[var(--melz-beige)] dark:bg-gray-700">
          ${hasSale ? `<span class="absolute top-3 left-3 bg-[#e87c7c] text-white text-xs font-bold px-2 py-1 rounded-md z-10">İndirim</span>` : ``}
          <img src="${img}" alt="${safeText(p.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy">
        </div>
        <div class="pt-5 px-1 pb-2 flex-1 flex flex-col">
          <p class="text-xs text-primary/80 dark:text-primary font-bold mb-1 uppercase tracking-wide">${safeText(p.category?.name || "Ürün")}</p>
          <h3 class="text-[#4a4a4a] dark:text-white font-bold text-lg leading-snug mb-auto group-hover:text-primary transition-colors">${safeText(p.name)}</h3>
          <div class="flex items-center gap-3 mt-3">${priceHtml}</div>
        </div>
      </a>
    `;
  }

  // =========================
  // PAGE: HOME (Anasayfa)
  // =========================
  async function initHomeFeatured() {
    const grid = qs("#home-featured-grid");
    if (!grid) return;

    try {
      // İstersen backend’de “featured” parametresi yoksa bu şekilde son eklenenleri çeker
      const data = await fetchJSON(`${API_BASE}/products?limit=8&page=1`);
      const products = data?.products || [];

      if (!products.length) {
        grid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-10">Şu an ürün bulunamadı.</div>`;
        return;
      }

      grid.innerHTML = products.slice(0, 8).map(renderCard).join("");
    } catch (e) {
      console.error("[Home Featured] error:", e);
      grid.innerHTML = `<div class="col-span-full text-center text-red-500 py-10">Ürünler yüklenemedi: ${safeText(e.message)}</div>`;
    }
  }

  // =========================
  // PAGE: LIST (bebek-urunleri / kategori)
  // =========================
  async function initProductList() {
    const grid = qs("#productGrid");
    if (!grid) return;

    const searchInput = qs("#searchInput");
    const categorySelect = qs("#categorySelect");
    const prevBtn = qs("#prevPage");
    const nextBtn = qs("#nextPage");
    const pageInfo = qs("#pageInfo");

    let page = 1;
    const limit = 12;

    async function load() {
      const search = (searchInput?.value || "").trim();
      const category = categorySelect?.value || "";
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (category) params.set("category", category);

      const data = await fetchJSON(`${API_BASE}/products?${params.toString()}`);
      const products = data?.products || [];
      const pg = data?.pagination || { page, pages: 1 };

      grid.innerHTML = products.map(renderCard).join("");
      if (pageInfo) pageInfo.textContent = `Sayfa ${pg.page} / ${pg.pages}`;
      if (prevBtn) prevBtn.disabled = pg.page <= 1;
      if (nextBtn) nextBtn.disabled = pg.page >= pg.pages;
    }

    const debounce = (fn, ms = 300) => {
      let t;
      return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    };

    const safeLoad = debounce(() => { page = 1; load().catch(console.error); }, 350);

    searchInput?.addEventListener("input", safeLoad);
    categorySelect?.addEventListener("change", () => { page = 1; load().catch(console.error); });
    prevBtn?.addEventListener("click", () => { if (page > 1) { page--; load().catch(console.error); } });
    nextBtn?.addEventListener("click", () => { page++; load().catch(console.error); });

    load().catch(console.error);
  }

  // =========================
  // ROUTE AUTO INIT
  // =========================
  window.addEventListener("DOMContentLoaded", () => {
    const p = location.pathname;

    if (p.includes("/anasayfa/")) initHomeFeatured();
    if (p.includes("/bebek-urunleri/") || p.includes("/kategori/")) initProductList();
  });

  // Debug helper (istersen)
  window.MelzAPI = { API_BASE, initHomeFeatured, initProductList };

})();