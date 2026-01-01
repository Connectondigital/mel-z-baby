/* frontend/assets/api.v2.js (CLEAN + STABLE: local products.json) */
(() => {
  "use strict";

  // =========================
  // CONFIG
  // =========================
  const CART_KEY = "melz_cart";

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
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const formatTRY = (value) => {
    const n = Number(value || 0);
    return new Intl.NumberFormat(CONFIG.LOCALE, {
      style: "currency",
      currency: CONFIG.CURRENCY,
    }).format(n);
  };

  const normalizeId = (id) => String(id ?? "").trim();

  const readCartRaw = () => safeJsonParse(localStorage.getItem(CART_KEY));
  const writeCartRaw = (obj) => localStorage.setItem(CART_KEY, JSON.stringify(obj));

  const normalizeLineItem = (it) => {
    if (!it || typeof it !== "object") return null;
    const id = normalizeId(it.id ?? it.productId ?? it.pid);
    if (!id) return null;

    const qty = Number(it.qty ?? it.quantity ?? 1) || 1;

    let variant = it.variant && typeof it.variant === "object" ? it.variant : null;
    if (variant) {
      variant = {
        ...(variant.size ? { size: String(variant.size) } : {}),
        ...(variant.color ? { color: String(variant.color) } : {}),
      };
      if (!variant.size && !variant.color) variant = null;
    }

    return variant ? { id, qty, variant } : { id, qty };
  };

  const normalizeCartObj = (raw) => {
    if (!raw) return { items: [] };

    if (Array.isArray(raw)) return { items: raw.map(normalizeLineItem).filter(Boolean) };

    if (typeof raw === "object") {
      if (Array.isArray(raw.items)) return { items: raw.items.map(normalizeLineItem).filter(Boolean) };
      if (Array.isArray(raw.cart)) return { items: raw.cart.map(normalizeLineItem).filter(Boolean) };
      if (Array.isArray(raw.lines)) return { items: raw.lines.map(normalizeLineItem).filter(Boolean) };
    }

    return { items: [] };
  };

  const sameVariant = (a, b) => {
    const av = a?.variant || null;
    const bv = b?.variant || null;
    if (!av && !bv) return true;
    if (!av || !bv) return false;
    return String(av.size || "") === String(bv.size || "") && String(av.color || "") === String(bv.color || "");
  };

  // =========================
  // LOCAL PRODUCTS (JSON)
  // =========================
  async function loadLocalProducts() {
    // dist altından açıldığı için root path çalışır: /assets/data/products.json
    const res = await fetch("/assets/data/products.json", { cache: "no-store" });
    if (!res.ok) throw new Error("products.json okunamadı");
    const data = await res.json();
    return Array.isArray(data) ? data : (data?.items || data?.data || []);
  }

  const normalizeProduct = (p) => {
    if (!p || typeof p !== "object") return null;

    const id = normalizeId(p.id ?? p._id ?? p.productId);
    if (!id) return null;

    const title = String(p.title ?? p.name ?? p.productName ?? `Ürün #${id}`);

    // Price normalization helper
    const parsePrice = (val) => {
      if (val == null) return 0;
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        // Remove currency symbols and spaces, replace comma with dot
        const cleaned = val.replace(/[^\d,.-]/g, "").replace(",", ".");
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      }
      if (typeof val === "object") {
        return parsePrice(val.value ?? val.amount ?? val.current ?? 0);
      }
      return 0;
    };

    const price = parsePrice(p.price ?? p.salePrice ?? p.amount ?? 0);

    const category = String(p.category ?? p.tag ?? p.group ?? "");
    const slug = String(p.slug ?? p.handle ?? "");

    // Description normalization
    const shortDescription =
      String(
        p.shortDescription ??
        p.short_description ??
        p.subtitle ??
        p.summary ??
        p.shortDesc ??
        ""
      );

    const description =
      String(
        p.description ??
        p.longDescription ??
        p.long_description ??
        p.details ??
        p.detail ??
        p.desc ??
        ""
      );

    // Images normalization
    let images = [];
    if (Array.isArray(p.images) && p.images.length) images = p.images;
    else if (Array.isArray(p.imageUrls) && p.imageUrls.length) images = p.imageUrls;
    else if (Array.isArray(p.gallery) && p.gallery.length) images = p.gallery;
    else {
      const singleImages = [];
      if (typeof p.image === "string") singleImages.push(p.image);
      if (typeof p.img === "string") singleImages.push(p.img);
      if (typeof p.mainImage === "string") singleImages.push(p.mainImage);
      images = singleImages;
    }

    const image = images[0] || "";

    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const colors = Array.isArray(p.colors) ? p.colors : [];

    return {
      id,
      title,
      name: String(p.name ?? p.title ?? title),

      price,

      category,
      slug,

      shortDescription,
      description,

      image,
      images,

      sizes,
      colors,

      url: p.url ? String(p.url) : "",

      raw: p,
    };
  };

  const setGlobalProducts = (list) => {
    const arr = Array.isArray(list) ? list.filter(Boolean) : [];
    window.MELZ_PRODUCTS = arr;

    const byId = Object.create(null);
    for (const p of arr) byId[String(p.id)] = p;
    window.MELZ_PRODUCTS_BY_ID = byId;

    try {
      window.dispatchEvent(new CustomEvent("melz:products-ready", { detail: { count: arr.length } }));
    } catch {}
  };

  // Cache promise: sayfalar arası aynı anda çağrılırsa tek fetch
  let _productsPromise = null;

  const getProducts = async () => {
    if (_productsPromise) return _productsPromise;

    _productsPromise = (async () => {
      try {
        const list = await loadLocalProducts();
        const normalized = Array.isArray(list) ? list.map(normalizeProduct).filter(Boolean) : [];
        setGlobalProducts(normalized);
        return normalized;
      } catch (e) {
        console.error("[MelzV2] Local products failed", e);
        setGlobalProducts([]);
        return [];
      }
    })();

    return _productsPromise;
  };

  const getProductById = async (id) => {
    const pid = normalizeId(id);
    if (!pid) return null;

    // önce cache
    const cached = window.MELZ_PRODUCTS_BY_ID?.[String(pid)];
    if (cached) return cached;

    // cache yoksa yükle
    const list = await getProducts();
    const byId = new Map(list.map((p) => [String(p.id), p]));
    return byId.get(String(pid)) || null;
  };

  // =========================
  // CART CORE
  // =========================
  const getCartObj = () => normalizeCartObj(readCartRaw());

  // dışarıya ARRAY dönsün (badge, add-to-cart vs)
  const getCart = () => getCartObj().items;

  const dispatchCartChanged = () => {
    try {
      window.dispatchEvent(new CustomEvent("melz:cart-changed", { detail: { key: CART_KEY } }));
    } catch {}
  };

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

  const addToCart = (id, qty = 1, variant = null) => {
    const pid = normalizeId(id);
    const q = Number(qty || 1) || 1;

    const cart = getCartObj();
    const items = cart.items.slice();

    const incoming = normalizeLineItem({ id: pid, qty: q, variant: variant || null });
    if (!incoming) return getCart();

    const idx = items.findIndex((it) => String(it.id) === String(pid) && sameVariant(it, incoming));
    if (idx >= 0) items[idx].qty = (Number(items[idx].qty) || 0) + q;
    else items.push(incoming);

    setCartItems(items);
    return getCart();
  };

  const updateQty = (id, qty, variant = null) => {
    const pid = normalizeId(id);
    const newQty = Number(qty || 0) || 0;

    const items = getCart()
      .map((it) => {
        if (String(it.id) !== String(pid)) return it;
        if (!sameVariant(it, { id: pid, variant })) return it;
        return { ...it, qty: newQty };
      })
      .filter((it) => (Number(it.qty) || 0) > 0);

    setCartItems(items);
    return getCart();
  };

  const removeFromCart = (id, variant = null) => {
    const pid = normalizeId(id);
    const items = getCart().filter((it) => {
      if (String(it.id) !== String(pid)) return true;
      return !sameVariant(it, { id: pid, variant });
    });
    setCartItems(items);
    return getCart();
  };

  const getCartCount = () => getCart().reduce((sum, it) => sum + (Number(it.qty) || 0), 0);

  const updateCartBadge = () => {
    const el = document.getElementById("cart-badge");
    if (!el) return;
    const c = getCartCount();
    el.textContent = String(c);
    el.classList.toggle("hidden", c <= 0);
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
  // BOOT
  // =========================
  const boot = () => {
    // badge ilk kez
    updateCartBadge();

    // sepet değişince badge güncelle
    window.addEventListener("melz:cart-changed", updateCartBadge);

    // ürünleri sayfa açılışında preload et (products-page.js beklemeden)
    // hata olsa bile boş array set eder
    getProducts();

    // debug
    try {
      console.log(`[MelzV2] Loaded. Cart count: ${getCartCount()} | Products source: /assets/data/products.json`);
    } catch {}
  };

  // =========================
  // PUBLIC API
  // =========================
  window.MelzV2 = {
    CART_KEY,
    config: CONFIG,

    // products
    getProducts,
    getProductById,

    // cart
    getCartObj,
    getCart, // ARRAY
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

  // legacy alias (bazı yerlerde MELZ_CART aranıyordu)
  window.MELZ_CART = { key: CART_KEY };

  boot();
})();
