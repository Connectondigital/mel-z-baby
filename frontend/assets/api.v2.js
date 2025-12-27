/**
 * Mel'z Baby & Kids - API v2 (Cart & Checkout)
 * Lightweight cart management using localStorage
 * Exposes window.MelzV2
 */

(() => {
  "use strict";

  // ============================================
  // CONFIG (from window.MELZ_CONFIG or defaults)
  // ============================================
  const getConfig = () => ({
    FREE_SHIPPING_THRESHOLD: window.MELZ_CONFIG?.FREE_SHIPPING_THRESHOLD ?? 1000,
    SHIPPING_FEE: window.MELZ_CONFIG?.SHIPPING_FEE ?? 100,
  });

  const API_BASE = (window.MELZ_API_URL || "http://127.0.0.1:5050/api").replace(/\/$/, "");
  const CART_KEY = "melz_cart";
  const PRODUCT_CACHE_KEY = "melz_products_cache";

  // ============================================
  // UTILS
  // ============================================
  function fmtTRY(n) {
    try {
      return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(n || 0));
    } catch {
      return `₺ ${Number(n || 0).toFixed(2)}`;
    }
  }

  function safeText(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  async function fetchJSON(url, options = {}) {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // ============================================
  // CART STORAGE
  // ============================================
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    dispatchCartUpdate();
  }

  function dispatchCartUpdate() {
    window.dispatchEvent(new CustomEvent("melz:cart:update", { detail: getCart() }));
  }

  // ============================================
  // CART API
  // ============================================
  function addToCart(productId, qty = 1, options = {}) {
    const cart = getCart();
    const id = String(productId);
    const existing = cart.find((item) => item.id === id);

    if (existing) {
      existing.qty += qty;
      if (options.size) existing.size = options.size;
      if (options.color) existing.color = options.color;
    } else {
      cart.push({
        id,
        qty,
        size: options.size || null,
        color: options.color || null,
        addedAt: Date.now(),
      });
    }

    saveCart(cart);
    console.log(`[MelzV2] Added to cart: ${id} x${qty}`);
    return cart;
  }

  function removeFromCart(productId) {
    const cart = getCart().filter((item) => item.id !== String(productId));
    saveCart(cart);
    console.log(`[MelzV2] Removed from cart: ${productId}`);
    return cart;
  }

  function updateQty(productId, qty) {
    const cart = getCart();
    const item = cart.find((i) => i.id === String(productId));
    if (item) {
      if (qty <= 0) {
        return removeFromCart(productId);
      }
      item.qty = qty;
      saveCart(cart);
    }
    return cart;
  }

  function clearCart() {
    saveCart([]);
    return [];
  }

  function getCartCount() {
    return getCart().reduce((sum, item) => sum + item.qty, 0);
  }

  // ============================================
  // CART TOTALS (with shipping logic)
  // ============================================
  async function getCartTotals() {
    const cart = getCart();
    const config = getConfig();
    const products = await getCartProducts();

    let subtotal = 0;

    for (const item of cart) {
      const product = products.find((p) => String(p.id) === item.id);
      if (product) {
        const price = product.salePrice != null && Number(product.salePrice) < Number(product.price)
          ? Number(product.salePrice)
          : Number(product.price);
        subtotal += price * item.qty;
      }
    }

    const shipping = subtotal >= config.FREE_SHIPPING_THRESHOLD ? 0 : config.SHIPPING_FEE;
    const total = subtotal + shipping;

    return {
      subtotal,
      shipping,
      total,
      freeShippingThreshold: config.FREE_SHIPPING_THRESHOLD,
      isFreeShipping: shipping === 0,
      itemCount: cart.length,
      totalQty: cart.reduce((sum, i) => sum + i.qty, 0),
    };
  }

  // ============================================
  // PRODUCT DATA HELPERS
  // ============================================
  async function fetchProduct(id) {
    try {
      const data = await fetchJSON(`${API_BASE}/products/${id}`);
      return data?.product || data;
    } catch (e) {
      console.warn(`[MelzV2] Failed to fetch product ${id}:`, e.message);
      return null;
    }
  }

  async function getCartProducts() {
    const cart = getCart();
    if (cart.length === 0) return [];

    const products = [];
    for (const item of cart) {
      const product = await fetchProduct(item.id);
      if (product) {
        products.push({ ...product, cartQty: item.qty, cartSize: item.size, cartColor: item.color });
      }
    }
    return products;
  }

  // ============================================
  // PRODUCT DETAIL PAGE INIT
  // ============================================
  async function initProductDetail() {
    const productId = getParam("id");
    if (!productId) {
      console.warn("[MelzV2] No product ID in URL");
      return;
    }

    const product = await fetchProduct(productId);
    if (!product) {
      document.querySelector("[data-product-title]")?.replaceChildren(document.createTextNode("Ürün bulunamadı"));
      return;
    }

    // Title
    document.querySelectorAll("[data-product-title]").forEach((el) => {
      el.textContent = product.name;
    });

    // Price
    const priceEl = document.querySelector("[data-product-price]");
    if (priceEl) {
      const hasSale = product.salePrice != null && Number(product.salePrice) < Number(product.price);
      if (hasSale) {
        priceEl.innerHTML = `<span>${fmtTRY(product.salePrice)}</span> <span class="text-gray-400 line-through text-lg ml-2">${fmtTRY(product.price)}</span>`;
      } else {
        priceEl.textContent = fmtTRY(product.price);
      }
    }

    // Description
    const descEl = document.querySelector("[data-product-description]");
    if (descEl) descEl.textContent = product.description || "Açıklama bulunmuyor.";

    // Category
    const catName = product.category?.name || "Ürün";
    document.querySelectorAll("[data-product-category]").forEach((el) => {
      el.textContent = catName;
    });
    document.querySelectorAll("[data-product-category-link], [data-product-category-link2]").forEach((el) => {
      el.textContent = catName;
      if (product.category?.slug) {
        el.href = `/kategori/liste/dist/index.html?category=${product.category.slug}`;
      }
    });

    // Stock
    const stockEl = document.querySelector("[data-product-stock]");
    if (stockEl) {
      const stock = product.stock ?? 0;
      if (stock > 10) {
        stockEl.textContent = "Stokta";
        stockEl.className = "text-green-600 font-semibold";
      } else if (stock > 0) {
        stockEl.textContent = `Son ${stock} adet`;
        stockEl.className = "text-orange-500 font-semibold";
      } else {
        stockEl.textContent = "Tükendi";
        stockEl.className = "text-red-500 font-semibold";
      }
    }

    // Main Image
    const mainImg = document.querySelector("[data-main-image]");
    const placeholder = document.querySelector("[data-image-placeholder]");
    if (product.images && product.images.length > 0 && mainImg) {
      mainImg.src = product.images[0];
      mainImg.alt = product.name;
      mainImg.classList.remove("hidden");
      if (placeholder) placeholder.classList.add("hidden");
    }

    // Thumbnails
    const thumbsContainer = document.querySelector("[data-product-thumbnails]");
    if (thumbsContainer && product.images && product.images.length > 0) {
      thumbsContainer.innerHTML = product.images.slice(0, 4).map((img, i) => `
        <div class="rounded-2xl bg-[#f4f2f0] aspect-square overflow-hidden cursor-pointer hover:ring-2 ring-primary transition" onclick="document.querySelector('[data-main-image]').src='${img}'">
          <img src="${img}" alt="${safeText(product.name)} ${i + 1}" class="w-full h-full object-cover">
        </div>
      `).join("");
    }

    // Sizes
    const sizesContainer = document.querySelector("[data-product-sizes]");
    const sizesSection = document.querySelector("[data-sizes-section]");
    if (sizesContainer) {
      if (product.sizes && product.sizes.length > 0) {
        sizesContainer.innerHTML = product.sizes.map((s) =>
          `<button class="px-4 h-10 rounded-xl bg-[#f4f2f0] hover:bg-primary hover:text-white transition text-sm font-semibold" data-size="${safeText(s)}">${safeText(s)}</button>`
        ).join("");
      } else if (sizesSection) {
        sizesSection.style.display = "none";
      }
    }

    // Wire Add to Cart button
    const addBtn = document.querySelector("[data-add-to-cart]");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const selectedSize = document.querySelector("[data-product-sizes] button.bg-primary")?.dataset.size;
        addToCart(product.id, 1, { size: selectedSize });
        showToast("Ürün sepete eklendi!");
      });
    }

    // Wire size selection
    document.querySelectorAll("[data-product-sizes] button").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-product-sizes] button").forEach((b) => {
          b.classList.remove("bg-primary", "text-white");
          b.classList.add("bg-[#f4f2f0]");
        });
        btn.classList.remove("bg-[#f4f2f0]");
        btn.classList.add("bg-primary", "text-white");
      });
    });
  }

  // ============================================
  // CHECKOUT PAGE
  // ============================================
  async function initCheckout() {
    const cartItemsEl = document.getElementById("checkout-cart-items");
    const subtotalEl = document.getElementById("checkout-subtotal");
    const shippingEl = document.getElementById("checkout-shipping");
    const totalEl = document.getElementById("checkout-total");
    const cartCountEl = document.getElementById("checkout-cart-count");
    const emptyCartEl = document.getElementById("checkout-empty");
    const checkoutFormEl = document.getElementById("checkout-form");

    const cart = getCart();

    if (cart.length === 0) {
      if (emptyCartEl) emptyCartEl.classList.remove("hidden");
      if (checkoutFormEl) checkoutFormEl.classList.add("hidden");
      return;
    }

    const products = await getCartProducts();
    const totals = await getCartTotals();

    // Update count
    if (cartCountEl) cartCountEl.textContent = totals.totalQty;

    // Render cart items
    if (cartItemsEl) {
      cartItemsEl.innerHTML = products.map((p) => {
        const img = (p.images && p.images[0]) || "/assets/melz-logo.png";
        const price = p.salePrice != null && Number(p.salePrice) < Number(p.price) ? p.salePrice : p.price;
        const lineTotal = Number(price) * p.cartQty;

        return `
          <div class="bg-white dark:bg-[#181411] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex gap-4" data-cart-item="${p.id}">
            <div class="w-20 h-20 shrink-0 rounded-lg bg-gray-100 overflow-hidden">
              <img src="${img}" alt="${safeText(p.name)}" class="w-full h-full object-cover">
            </div>
            <div class="flex-1 flex flex-col justify-between">
              <div class="flex justify-between items-start gap-2">
                <div>
                  <h4 class="font-bold leading-tight">${safeText(p.name)}</h4>
                  <p class="text-sm text-gray-500 mt-1">${p.cartSize ? `Beden: ${safeText(p.cartSize)}` : ""}</p>
                </div>
                <span class="font-bold">${fmtTRY(lineTotal)}</span>
              </div>
              <div class="flex justify-between items-end mt-2">
                <button onclick="MelzV2.removeFromCart('${p.id}'); MelzV2.initCheckout();" class="text-red-500 hover:text-red-600 text-sm font-medium flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">delete</span>
                  <span>Sil</span>
                </button>
                <div class="flex items-center bg-[#f4f2f0] dark:bg-[#333] rounded-lg p-1">
                  <button onclick="MelzV2.updateQty('${p.id}', ${p.cartQty - 1}); MelzV2.initCheckout();" class="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow-sm hover:text-primary transition-colors">
                    <span class="material-symbols-outlined text-sm">remove</span>
                  </button>
                  <span class="w-8 text-center text-sm font-bold">${p.cartQty}</span>
                  <button onclick="MelzV2.updateQty('${p.id}', ${p.cartQty + 1}); MelzV2.initCheckout();" class="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow-sm hover:text-primary transition-colors">
                    <span class="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join("");
    }

    // Update totals
    if (subtotalEl) subtotalEl.textContent = fmtTRY(totals.subtotal);
    if (shippingEl) {
      if (totals.isFreeShipping) {
        shippingEl.innerHTML = `<span class="text-green-600 font-medium">Ücretsiz</span>`;
      } else {
        shippingEl.textContent = fmtTRY(totals.shipping);
      }
    }
    if (totalEl) totalEl.textContent = fmtTRY(totals.total);

    // Free shipping progress
    const progressEl = document.getElementById("free-shipping-progress");
    if (progressEl && !totals.isFreeShipping) {
      const remaining = totals.freeShippingThreshold - totals.subtotal;
      progressEl.innerHTML = `
        <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300">
          <span class="material-symbols-outlined text-sm align-middle mr-1">local_shipping</span>
          Ücretsiz kargo için <strong>${fmtTRY(remaining)}</strong> daha ekleyin!
        </div>
      `;
    } else if (progressEl) {
      progressEl.innerHTML = `
        <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm text-green-700 dark:text-green-300">
          <span class="material-symbols-outlined text-sm align-middle mr-1">check_circle</span>
          Ücretsiz kargo kazandınız!
        </div>
      `;
    }
  }

  // ============================================
  // CHECKOUT INIT (Iyzico placeholder)
  // ============================================
  async function checkoutInit(payload) {
    console.log("[MelzV2] checkoutInit called with payload:", payload);

    // Validate payload
    if (!payload.name || !payload.phone || !payload.address) {
      showToast("Lütfen tüm alanları doldurun.", "error");
      return { success: false, error: "Eksik bilgi" };
    }

    const cart = getCart();
    if (cart.length === 0) {
      showToast("Sepetiniz boş.", "error");
      return { success: false, error: "Sepet boş" };
    }

    const totals = await getCartTotals();

    // Placeholder: Iyzico integration would go here
    const iyzicoContainer = document.getElementById("iyzico-checkout-form");
    if (iyzicoContainer) {
      iyzicoContainer.innerHTML = `
        <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
          <span class="material-symbols-outlined text-4xl text-yellow-600 mb-2">warning</span>
          <h3 class="font-bold text-lg mb-2">Ödeme Entegrasyonu Hazırlanıyor</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Iyzico ödeme formu burada görünecek. Şu an geliştirme aşamasında.
          </p>
          <div class="text-sm text-gray-500">
            <strong>Sipariş Tutarı:</strong> ${fmtTRY(totals.total)}
          </div>
          <button onclick="MelzV2.simulatePayment()" class="mt-4 bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-primary/90 transition">
            Test: Ödemeyi Simüle Et
          </button>
        </div>
      `;
    }

    return {
      success: true,
      totals,
      payload,
      message: "Iyzico entegrasyonu için hazır",
    };
  }

  // Simulate payment for testing
  function simulatePayment() {
    const orderId = "MLZ-" + Date.now().toString(36).toUpperCase();
    clearCart();
    window.location.href = `/siparis-onayi/dist/index.html?orderId=${orderId}&status=success`;
  }

  // ============================================
  // ORDER PAGES
  // ============================================
  function initOrderConfirmation() {
    const orderId = getParam("orderId");
    const status = getParam("status");

    const orderIdEl = document.getElementById("order-id");
    const statusEl = document.getElementById("order-status");
    const statusIconEl = document.getElementById("order-status-icon");

    if (orderIdEl) orderIdEl.textContent = orderId || "Bilinmiyor";

    if (statusEl && statusIconEl) {
      if (status === "success") {
        statusEl.textContent = "Ödeme Başarılı";
        statusEl.className = "text-green-600 font-bold text-xl";
        statusIconEl.innerHTML = '<span class="material-symbols-outlined text-6xl text-green-500">check_circle</span>';
      } else if (status === "failed") {
        statusEl.textContent = "Ödeme Başarısız";
        statusEl.className = "text-red-600 font-bold text-xl";
        statusIconEl.innerHTML = '<span class="material-symbols-outlined text-6xl text-red-500">cancel</span>';
      } else {
        statusEl.textContent = "Beklemede";
        statusEl.className = "text-yellow-600 font-bold text-xl";
        statusIconEl.innerHTML = '<span class="material-symbols-outlined text-6xl text-yellow-500">hourglass_empty</span>';
      }
    }
  }

  function initOrderDetail() {
    const orderId = getParam("orderId");
    const orderIdEl = document.getElementById("order-detail-id");

    if (orderIdEl) orderIdEl.textContent = orderId || "Bilinmiyor";

    // Mock order data
    const mockOrderEl = document.getElementById("mock-order-notice");
    if (mockOrderEl && !orderId) {
      mockOrderEl.classList.remove("hidden");
    }
  }

  // ============================================
  // CART BADGE UPDATE
  // ============================================
  function updateCartBadge() {
    const count = getCartCount();
    const badges = document.querySelectorAll("[data-cart-badge]");
    badges.forEach((badge) => {
      badge.textContent = count;
      badge.style.display = count > 0 ? "flex" : "none";
    });
  }

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================
  function showToast(message, type = "success") {
    const existing = document.getElementById("melz-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "melz-toast";
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 transition-all transform translate-y-0 opacity-100 ${
      type === "error" ? "bg-red-500 text-white" : "bg-green-500 text-white"
    }`;
    toast.innerHTML = `
      <span class="material-symbols-outlined">${type === "error" ? "error" : "check_circle"}</span>
      <span>${safeText(message)}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("translate-y-full", "opacity-0");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ============================================
  // AUTO INIT
  // ============================================
  window.addEventListener("DOMContentLoaded", () => {
    const path = location.pathname;

    // Update cart badge on all pages
    updateCartBadge();

    // Listen for cart updates
    window.addEventListener("melz:cart:update", updateCartBadge);

    // Page-specific init
    if (path.includes("/urun/")) initProductDetail();
    if (path.includes("/odeme/")) initCheckout();
    if (path.includes("/siparis-onayi/")) initOrderConfirmation();
    if (path.includes("/siparis-detay/")) initOrderDetail();
  });

  // ============================================
  // EXPOSE API
  // ============================================
  window.MelzV2 = {
    // Cart
    getCart,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    getCartCount,
    getCartTotals,
    getCartProducts,

    // Product
    fetchProduct,

    // Pages
    initProductDetail,
    initCheckout,
    initOrderConfirmation,
    initOrderDetail,

    // Checkout
    checkoutInit,
    simulatePayment,

    // Utils
    fmtTRY,
    showToast,
    updateCartBadge,
    getConfig,
  };

  console.log("[MelzV2] Loaded. Cart count:", getCartCount());
})();
