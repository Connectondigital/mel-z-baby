/* assets/js/cart-page.js */
(() => {
  "use strict";

  const CART_KEY = "melz_cart";
  const PRODUCTS_URL = "/assets/data/products.json";
  const PLACEHOLDER_IMG = "https://via.placeholder.com/120x120?text=Melz";

  const $ = (sel, root = document) => root.querySelector(sel);

  const els = {
    wrap: $("#cart-wrap"),
    empty: $("#cart-empty"),
    items: $("#cart-items"),

    // ✅ Sepet HTML'indeki id'ler
    subtotal: $("#sum-subtotal"),
    shipping: $("#sum-shipping"),
    total: $("#sum-total"),

    clearBtn: $("#cart-clear"),
  };

  // In-memory products index
  let PRODUCTS = [];
  let PRODUCTS_BY_ID = new Map();

  // ---------- Utils ----------
  function safeParse(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  function formatTRY(n) {
    const v = Number(n || 0);
    const val = Number.isFinite(v) ? v : 0;
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(val);
  }

  // Melz cart formatı: bazen array, bazen {items:[...]}
  function normalizeItems(items) {
    return (items || [])
      .map((it) => {
        const id = String(it.id ?? it.pid ?? it.productId ?? "");
        const qty = Number(it.qty ?? it.quantity ?? it.count ?? 1);
        return { id, qty: Number.isFinite(qty) && qty > 0 ? qty : 1 };
      })
      .filter((x) => x.id);
  }

  function readCartItems() {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = safeParse(raw);

    if (Array.isArray(parsed)) return normalizeItems(parsed);
    if (parsed && Array.isArray(parsed.items)) return normalizeItems(parsed.items);

    return [];
  }

  function writeCartItems(items) {
    const payload = { items: normalizeItems(items) };
    localStorage.setItem(CART_KEY, JSON.stringify(payload));
    // badge vb dinleyenler için event
    window.dispatchEvent(new CustomEvent("melz:cart:updated", { detail: payload }));
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/`/g, "&#096;");
  }

  function getProductById(id) {
    const sid = String(id);
    if (PRODUCTS_BY_ID && PRODUCTS_BY_ID.get) return PRODUCTS_BY_ID.get(sid) || null;
    return (PRODUCTS || []).find((p) => String(p.id ?? p._id) === sid) || null;
  }

  function getProductImage(p) {
    if (!p) return PLACEHOLDER_IMG;
    if (Array.isArray(p.images) && p.images[0]) return p.images[0];
    if (typeof p.image === "string" && p.image) return p.image;
    return PLACEHOLDER_IMG;
  }

  function getUnitPrice(p) {
    const price = Number(p?.salePrice ?? p?.price ?? 0);
    return Number.isFinite(price) ? price : 0;
  }

  function calcLinePrice(product, qty) {
    const unit = getUnitPrice(product);
    return (unit > 0 ? unit : 0) * qty;
  }

  function setSummary(subtotal, shipping) {
    const total = subtotal + shipping;

    if (els.subtotal) els.subtotal.textContent = formatTRY(subtotal);
    if (els.shipping) els.shipping.textContent = formatTRY(shipping);
    if (els.total) els.total.textContent = formatTRY(total);
  }

  // ---------- Render ----------
  function render() {
    const items = readCartItems();
    const hasItems = items.length > 0;

    if (els.empty) els.empty.classList.toggle("hidden", hasItems);
    if (els.wrap) els.wrap.classList.toggle("hidden", !hasItems);

    if (!els.items) return;

    if (!hasItems) {
      els.items.innerHTML = "";
      setSummary(0, 0);
      return;
    }

    let subtotal = 0;

    els.items.innerHTML = items
      .map(({ id, qty }) => {
        const p = getProductById(id);

        const name = p?.title || p?.name || `Ürün #${id}`;
        const img = getProductImage(p);

        const unitPrice = getUnitPrice(p);
        const unitPriceText = unitPrice > 0 ? formatTRY(unitPrice) : "—";

        const line = calcLinePrice(p, qty);
        subtotal += line;

        return `
          <div class="flex gap-4 py-4 border-b border-[#eee]">
            <div class="w-20 h-20 rounded-xl overflow-hidden bg-[#f4f2f0] shrink-0">
              <img src="${img}" alt="${escapeHtml(name)}" class="w-full h-full object-cover" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="font-bold truncate">${escapeHtml(name)}</div>
                  <div class="text-sm text-text-secondary mt-1">
                    <span class="opacity-70">Birim:</span> <span class="font-semibold">${unitPriceText}</span>
                    <span class="mx-2 opacity-40">•</span>
                    <span class="opacity-70">ID:</span> ${escapeHtml(id)}
                  </div>
                </div>
                <div class="font-bold">${formatTRY(line)}</div>
              </div>

              <div class="flex items-center justify-between mt-3">
                <div class="inline-flex items-center gap-2 rounded-xl bg-[#f4f2f0] px-2 py-2">
                  <button class="w-8 h-8 rounded-lg bg-white hover:bg-[#eee] font-black" data-action="dec" data-id="${escapeAttr(id)}">-</button>
                  <div class="w-8 text-center font-bold">${qty}</div>
                  <button class="w-8 h-8 rounded-lg bg-white hover:bg-[#eee] font-black" data-action="inc" data-id="${escapeAttr(id)}">+</button>
                </div>

                <button class="text-red-600 font-semibold hover:underline" data-action="remove" data-id="${escapeAttr(id)}">
                  Kaldır
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    // demo: kargo 0
    const shipping = 0;
    setSummary(subtotal, shipping);
  }

  // ---------- Events ----------
  function onItemsClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    if (!id) return;

    const items = readCartItems();
    const idx = items.findIndex((x) => x.id === id);

    if (action === "inc") {
      if (idx >= 0) items[idx].qty += 1;
      else items.push({ id, qty: 1 });
      writeCartItems(items);
      render();
      return;
    }

    if (action === "dec") {
      if (idx >= 0) {
        items[idx].qty -= 1;
        if (items[idx].qty <= 0) items.splice(idx, 1);
        writeCartItems(items);
        render();
      }
      return;
    }

    if (action === "remove") {
      if (idx >= 0) {
        items.splice(idx, 1);
        writeCartItems(items);
        render();
      }
      return;
    }
  }

  function clearCart() {
    localStorage.removeItem(CART_KEY);
    window.dispatchEvent(new CustomEvent("melz:cart:updated", { detail: { items: [] } }));
    render();
  }

  // ---------- Load products ----------
  async function loadProducts() {
    try {
      const res = await fetch(PRODUCTS_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      PRODUCTS = Array.isArray(data) ? data : [];
      PRODUCTS_BY_ID = new Map(PRODUCTS.map((p) => [String(p.id ?? p._id), p]));
    } catch (err) {
      console.error("[CART_PAGE] products.json load failed:", err);
      PRODUCTS = [];
      PRODUCTS_BY_ID = new Map();
    }
  }

  // ---------- INIT (ÖNEMLİ) ----------
  // Bu dosya sepet sayfasına sonradan enjekte edilebiliyor.
  // DOMContentLoaded çoktan geçmişse eski init hiç çalışmıyordu → sepet boş kalıyordu.
  async function init() {
    // click handlers (1 kere bağla)
    if (els.items) els.items.addEventListener("click", onItemsClick);
    if (els.clearBtn) els.clearBtn.addEventListener("click", clearCart);

    // 1) İlk render: ürünler yüklenmeden de satırlar görünür
    render();

    // 2) Ürünleri yükle
    await loadProducts();

    // 3) İkinci render: isim/görsel/fiyatlar oturur
    render();

    console.log("[CART_PAGE] Ready ✓", {
      key: CART_KEY,
      items: readCartItems().length,
      products: PRODUCTS.length,
      readyState: document.readyState,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
