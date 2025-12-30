/* assets/api.v2.js (FINAL) */
(() => {
  "use strict";

  // =========================
  // CONFIG
  // =========================
  const API_BASE = String(window.MELZ_API_URL || "http://127.0.0.1:5050/api").replace(/\/$/, "");
  const CART_KEY = "melz_cart";
  const USE_MOCK_FALLBACK = true;

  const CONFIG = {
    FREE_SHIPPING_THRESHOLD: window.MELZ_CONFIG?.FREE_SHIPPING_THRESHOLD ?? 1000,
    SHIPPING_FEE: window.MELZ_CONFIG?.SHIPPING_FEE ?? 100,
    CURRENCY: "TRY",
    LOCALE: "tr-TR",
  };

  // =========================
  // HELPERS
  // =========================
  const safeJsonParse = (str) => {
    try { return JSON.parse(str); } catch { return null; }
  };

  const formatTRY = (value) => {
    const n = Number(value || 0);
    return new Intl.NumberFormat(CONFIG.LOCALE, { style: "currency", currency: CONFIG.CURRENCY }).format(n);
  };

  const normalizeId = (id) => String(id ?? "").trim();

  const readCartRaw = () => safeJsonParse(localStorage.getItem(CART_KEY));

  const writeCartRaw = (obj) => localStorage.setItem(CART_KEY, JSON.stringify(obj));

  // localStorage’daki eski/bozuk formatları da toparlar:
  // - array saklanmış olabilir
  // - {cart:[...]} olabilir
  // - {items:[...]} içinde id number olabilir vs.
  const normalizeCartObj = (raw) => {
    // hedef format: { items: [ {id:"", qty: number, variant?: {..}} ] }
    if (!raw) return { items: [] };

    // direkt array ise
    if (Array.isArray(raw)) return { items: raw.map(normalizeLineItem).filter(Boolean) };

    // object ama items array değilse yakala
    if (typeof raw === "object") {
      if (Array.isArray(raw.items)) return { items: raw.items.map(normalizeLineItem).filter(Boolean) };
      if (Array.isArray(raw.cart)) return { items: raw.cart.map(normalizeLineItem).filter(Boolean) };
      if (Array.isArray(raw.lines)) return { items: raw.lines.map(normalizeLineItem).filter(Boolean) };
    }

    return { items: [] };
  };

  const normalizeLineItem = (it) => {
    if (!it || typeof it !== "object") return null;
    const id = normalizeId(it.id ?? it.productId ?? it.pid);
    if (!id) return null;

    const qty = Number(it.qty ?? it.quantity ?? 1) || 1;

    // variant opsiyonel
    let variant = it.variant && typeof it.variant === "object" ? it.variant : null;
    if (variant) {
      // temizle
      variant = {
        ...(variant.size ? { size: String(variant.size) } : {}),
        ...(variant.color ? { color: String(variant.color) } : {}),
      };
      if (!variant.size && !variant.color) variant = null;
    }

    return variant ? { id, qty, variant } : { id, qty };
  };

  // =========================
  // MOCK PRODUCTS (API yoksa)
  // =========================
  const MOCK_PRODUCTS = [
    {
      id: "1",
      name: "Organik Pamuk Tulum",
      price: 450,
      images: ["/assets/img/products/p1.jpg"],
      sizes: ["0-3 Ay", "3-6 Ay", "6-9 Ay", "9-12 Ay"],
      colors: ["Bej", "Beyaz", "Krem"],
    },
    {
      id: "2",
      name: "Miniborn Bebeğin Body (Zıbın)",
      price: 199,
      images: ["/assets/img/products/p2.jpg"],
      sizes: ["0-3 Ay", "3-6 Ay", "6-9 Ay"],
      colors: ["Beyaz", "Krem"],
    },
    {
      id: "3",
      name: "Ahşap Oyuncak",
      price: 320,
      images: ["/assets/img/products/p3.jpg"],
      sizes: [],
      colors: [],
    },
    {
      id: "4",
      name: "Yeni Sezon Set",
      price: 398,
      images: ["/assets/img/products/p4.jpg"],
      sizes: ["0-3 Ay", "3-6 Ay"],
      colors: ["Pembe", "Bej"],
    },
  ];

  const mockGetProducts = async () => MOCK_PRODUCTS;
  const mockGetProductById = async (id) => MOCK_PRODUCTS.find((p) => String(p.id) === String(id)) || null;

  // =========================
  // API (opsiyonel) + FALLBACK
  // =========================
  const apiGetJSON = async (url) => {
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  };

  const getProducts = async () => {
    try {
      const data = await apiGetJSON(`${API_BASE}/products`);
      // API şekline göre normalize (data direkt array değilse)
      const list = Array.isArray(data) ? data : (data?.items || data?.data || []);
      if (Array.isArray(list) && list.length) return list.map(normalizeProduct);
      throw new Error("Empty products");
    } catch (e) {
      if (!USE_MOCK_FALLBACK) throw e;
      console.warn("[MelzV2] API products failed, using mock.", e?.message || e);
      return await mockGetProducts();
    }
  };

  const getProductById = async (id) => {
    try {
      const data = await apiGetJSON(`${API_BASE}/product?id=${encodeURIComponent(id)}`);
      const obj = data?.item || data?.data || data;
      const p = normalizeProduct(obj);
      if (p) return p;
      throw new Error("Product not found");
    } catch (e) {
      if (!USE_MOCK_FALLBACK) throw e;
      return await mockGetProductById(id);
    }
  };

  const normalizeProduct = (p) => {
    if (!p || typeof p !== "object") return null;
    const id = normalizeId(p.id ?? p._id ?? p.productId);
    if (!id) return null;

    const price = Number(p.price ?? p.salePrice ?? p.amount ?? 0) || 0;
    const name = String(p.name ?? p.title ?? `Ürün #${id}`);
    const images = Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []);
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const colors = Array.isArray(p.colors) ? p.colors : [];

    return { id, name, price, images, sizes, colors, raw: p };
  };

  // =========================
  // CART CORE
  // =========================
  const getCartObj = () => normalizeCartObj(readCartRaw());

  // DİKKAT: add-to-cart / badge tarafı için getCart() => ARRAY döndürür
  const getCart = () => getCartObj().items;

  const setCartItems = (itemsArray) => {
    const items = Array.isArray(itemsArray) ? itemsArray.map(normalizeLineItem).filter(Boolean) : [];
    writeCartRaw({ items });
    dispatchCartChanged();
    return items;
  };

  const clearCart = () => {
    writeCartRaw({ items: [] });
    dispatchCartChanged();
  };

  const sameVariant = (a, b) => {
    const av = a?.variant || null;
    const bv = b?.variant || null;
    if (!av && !bv) return true;
    if (!av || !bv) return false;
    return String(av.size || "") === String(bv.size || "") && String(av.color || "") === String(bv.color || "");
  };

  const addToCart = (id, qty = 1, variant = null) => {
    const pid = normalizeId(id);
    const q = Number(qty || 1) || 1;

    const cart = getCartObj();
    const items = cart.items.slice();

    const incoming = normalizeLineItem({ id: pid, qty: q, variant: variant || null });

    const idx = items.findIndex((it) => String(it.id) === String(pid) && sameVariant(it, incoming));
    if (idx >= 0) {
      items[idx].qty = (Number(items[idx].qty) || 0) + q;
    } else {
      items.push(incoming);
    }

    setCartItems(items);
    return getCart();
  };

  const updateQty = (id, qty, variant = null) => {
    const pid = normalizeId(id);
    const newQty = Number(qty || 0) || 0;

    const items = getCart();
    const updated = items
      .map((it) => {
        if (String(it.id) !== String(pid)) return it;
        if (!sameVariant(it, { id: pid, variant })) return it;
        return { ...it, qty: newQty };
      })
      .filter((it) => (Number(it.qty) || 0) > 0);

    setCartItems(updated);
    return getCart();
  };

  const removeFromCart = (id, variant = null) => {
    const pid = normalizeId(id);
    const items = getCart().filter((it) => {
      if (String(it.id) !== String(pid)) return true;
      // aynı varyant ise kaldır
      return !sameVariant(it, { id: pid, variant });
    });
    setCartItems(items);
    return getCart();
  };

  const getCartCount = () => {
    const items = getCart(); // ARRAY garanti
    return items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  };

  const calculateTotals = async () => {
    const items = getCart();
    if (!items.length) {
      return {
        subtotal: 0,
        shipping: 0,
        total: 0,
        subtotalFmt: formatTRY(0),
        shippingFmt: formatTRY(0),
        totalFmt: formatTRY(0),
      };
    }

    // ürünleri yükle (API veya mock)
    const products = await getProducts();
    const byId = new Map(products.map((p) => [String(p.id), p]));

    const subtotal = items.reduce((sum, it) => {
      const p = byId.get(String(it.id));
      const price = Number(p?.price || 0);
      return sum + price * (Number(it.qty) || 0);
    }, 0);

    const shipping = subtotal >= CONFIG.FREE_SHIPPING_THRESHOLD ? 0 : CONFIG.SHIPPING_FEE;
    const total = subtotal + shipping;

    return {
      subtotal,
      shipping,
      total,
      subtotalFmt: formatTRY(subtotal),
      shippingFmt: formatTRY(shipping),
      totalFmt: formatTRY(total),
    };
  };

  // =========================
  // EVENTS / BADGE HOOK
  // =========================
  const dispatchCartChanged = () => {
    try {
      window.dispatchEvent(new CustomEvent("melz:cart-changed", { detail: { key: CART_KEY } }));
    } catch {}
  };

  const updateCartBadge = () => {
    const el = document.getElementById("cart-badge");
    if (!el) return;
    const c = getCartCount();
    el.textContent = String(c);
    el.classList.toggle("hidden", c <= 0);
  };

  // ilk yüklemede badge
  const boot = async () => {
    updateCartBadge();

    // Sepet değişince badge güncelle
    window.addEventListener("melz:cart-changed", updateCartBadge);

    // debug log (istersen kaldır)
    try {
      console.log(`[MelzV2] Loaded. Cart count: ${getCartCount()} | API: ${API_BASE} | Mock fallback: ${USE_MOCK_FALLBACK}`);
    } catch {}
  };

  // =========================
  // PUBLIC API
  // =========================
  window.MelzV2 = {
    API_BASE,
    CART_KEY,
    config: CONFIG,

    // products
    getProducts,
    getProductById,

    // cart
    getCartObj,
    getCart,        // ARRAY
    getCartCount,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    setCartItems,

    // totals
    calculateTotals,

    // utils
    formatTRY,
    updateCartBadge,
  };

  // DOM ready değilse de çalışır; badge element’i sonra gelirse de cart-changed ile güncellersin.
  boot();
})();