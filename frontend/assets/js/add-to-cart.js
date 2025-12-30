/* assets/js/add-to-cart.js */
(() => {
  "use strict";

  const CART_KEY = "melz_cart";

  const safeJsonParse = (s) => {
    try { return JSON.parse(s); } catch { return null; }
  };

  const readCart = () => {
    const raw = localStorage.getItem(CART_KEY);
    const obj = safeJsonParse(raw);
    if (!obj || typeof obj !== "object") return { items: [] };
    if (!Array.isArray(obj.items)) obj.items = [];
    return obj;
  };

  const writeCart = (cart) => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  };

  const getCount = () => {
    const cart = readCart();
    return cart.items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  };

  const updateBadge = () => {
    const badge = document.getElementById("cart-badge");
    if (!badge) return;
    const count = getCount();
    badge.textContent = String(count);
    badge.classList.toggle("hidden", count <= 0);
  };

  // Butondan ürün id yakalama: data-product-id / data-id / href içinden vs.
  const detectProductId = (btn) => {
    const direct =
      btn.getAttribute("data-product-id") ||
      btn.getAttribute("data-id") ||
      btn.getAttribute("data-pid");

    if (direct) return direct;

    const holder = btn.closest("[data-product-id],[data-id],[data-pid]");
    if (holder) {
      return (
        holder.getAttribute("data-product-id") ||
        holder.getAttribute("data-id") ||
        holder.getAttribute("data-pid")
      );
    }

    // ürün detay sayfası ise url'den dene: ?id=7
    const u = new URL(location.href);
    const qid = u.searchParams.get("id");
    if (qid) return qid;

    return null;
  };

  const addToCart = (pid, qty = 1) => {
    const cart = readCart();
    const id = String(pid);

    const existing = cart.items.find((x) => String(x.id) === id);
    if (existing) existing.qty = (Number(existing.qty) || 0) + qty;
    else cart.items.push({ id, qty });

    writeCart(cart);
    updateBadge();
  };

  // Event delegation: sayfada sonradan gelen butonları da yakalar
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(
      '[data-add-to-cart], .js-add-to-cart, button, a'
    );
    if (!btn) return;

    // Sadece “Sepete Ekle” niyetli olanları yakala
    const t = (btn.textContent || "").toLowerCase();
    const isCartBtn =
      btn.hasAttribute("data-add-to-cart") ||
      btn.classList.contains("js-add-to-cart") ||
      t.includes("sepete ekle");

    if (!isCartBtn) return;

    const pid = detectProductId(btn);
    if (!pid) {
      console.warn("[ADD_TO_CART] Product id bulunamadı:", btn);
      return;
    }

    e.preventDefault();
    addToCart(pid, 1);
    console.log("[ADD_TO_CART] Added:", pid);
  });

  // ilk yüklemede badge güncelle
  window.addEventListener("DOMContentLoaded", () => {
    updateBadge();
    console.log("[ADD_TO_CART] Initialized ✓ key=", CART_KEY);
  });

  // debug için dışarı aç
  window.MELZ_CART = {
    readCart,
    writeCart,
    addToCart,
    updateBadge,
    clear: () => { localStorage.removeItem(CART_KEY); updateBadge(); }
  };
})();