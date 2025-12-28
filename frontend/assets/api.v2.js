/**
 * Mel'z Baby & Kids - API v2 (Cart & Checkout)
 * Lightweight cart management using localStorage
 * With MOCK fallback data for development preview
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
  const USE_MOCK_FALLBACK = true; // Enable mock fallback when API unavailable

  // ============================================
  // MOCK DATA (fallback when API unavailable)
  // ============================================
  const MOCK_PRODUCTS = [
    {
      id: 1,
      name: "Organik Pamuk Bebek Tulumu",
      slug: "organik-pamuk-bebek-tulumu",
      description: "Bebeğinizin hassas cildine uygun, %100 organik pamuktan üretilmiş yumuşacık tulum. Nefes alabilen kumaşı sayesinde tüm mevsimlerde kullanılabilir.",
      price: 450,
      salePrice: null,
      stock: 25,
      images: [
        "https://lh3.googleusercontent.com/aida-public/AB6AXuARYGHiRtdlfCot2wwyNQKVH-dmAbRW61HiyJoZ79U9dK-6mXxM4PEouAkEPrDfavY1FqkDpD9p30aQZlJbGWGtQi1PQdND1uwPD5_HW3zRELzBrq5S8Y69m_HMb6Y6sDAkTmCraqvwJk786w_tb0v2-ToXECAjv0geRMT8_uI6ox1JGwBh-rKPe87-UBbDTlVC7DL3mf2gmnEb_x7zE-V-uSNX3eCqG4isgyUOa71gmw4dXqV6infOY32KEiHlGSnIKQp9S81dJBiW"
      ],
      sizes: ["0-3 Ay", "3-6 Ay", "6-9 Ay", "9-12 Ay"],
      colors: ["Beyaz", "Bej", "Pembe"],
      category: { id: 1, name: "Bebek Giyim", slug: "bebek-giyim" }
    },
    {
      id: 2,
      name: "Doğal Ahşap Diş Kaşıyıcı",
      slug: "dogal-ahsap-dis-kasiyici",
      description: "Tamamen doğal akçaağaç ağacından el yapımı diş kaşıyıcı. BPA, ftalat ve kimyasal içermez. Bebeklerin ağzına güvenle verilebilir.",
      price: 180,
      salePrice: 150,
      stock: 50,
      images: [
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD8pcGHFlfcLPwHGJ3FIrwcO6BVzFy2YMKTaN0TzPfVRMpOTzzKmnhTJyU7mOMJY4DbjbaCjKpLhOoSwqjbSA9IuAJV0eRTYnuK-F5VvZ2dStvq0j4dcJ3tsLZezPyyQ9foxAOkx2R_db1Ov6sGti6EwbMUKLq2PEZRDVSB6hF_AhIQFPBmy3NENdVZkj0AZprJ32gXgbuODYWYGu1AVJLSTMUSVfzSQeomFZaFXM0UOKGB2G-PHbArq38ReV9Vpij8M8WM2C27BHH-"
      ],
      sizes: [],
      colors: ["Doğal"],
      category: { id: 2, name: "Oyuncak", slug: "oyuncak" }
    },
    {
      id: 3,
      name: "Bebek Bakım Çantası - Haki",
      slug: "bebek-bakim-cantasi-haki",
      description: "Su geçirmez malzemeden üretilmiş, geniş iç hacimli bebek bakım çantası. Bebek bezi, biberon ve tüm ihtiyaçlarınız için özel bölmeler.",
      price: 750,
      salePrice: null,
      stock: 15,
      images: [
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAltjAvE62x2Sw_J8majoXrBi0G_PnlYzV-wCyd4t1Gt-gKUkFN7z6SwU05moZQcxMEoJwyMPTBKNExKV_MhAkZP5ITh0W4cdmAlBzfYXUSQEFjrfG2s0WZ-c3P5ocXQiszWAqmwQZn-B_LrdLsJ0WS8GX0uwiPIgArTptG1rWq-p_e7PigZEgU23tJ9rbx9DoNR0FFzWC_aXrk_OEnNQHNAGRB81RS9n5yElNd8ww-ijO7nJ1EPBOmg8-ahzjqLElU7R7ONkb9hbTG"
      ],
      sizes: [],
      colors: ["Haki", "Siyah", "Lacivert"],
      category: { id: 3, name: "Aksesuar", slug: "aksesuar" }
    },
    {
      id: 4,
      name: "Ergonomik Kanguru - Gri",
      slug: "ergonomik-kanguru-gri",
      description: "Bebeğinizi güvenle taşıyabileceğiniz ergonomik tasarımlı kanguru. Omuz ve bel desteği ile uzun süreli kullanımda bile konfor sağlar.",
      price: 1250,
      salePrice: 1100,
      stock: 8,
      images: [
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAfNbPJCmzXiIPSprVUTsTCl2G77IGvr2eSSLWWOanHX8KjXDwUAOavRbOV6KUIiMQWzZuZ1PLqpMyL0sAjVAUSpCyBL1as3dirL-ZER11qK3xfLjdjnFoawESR8EeLlVPwmI2o2-CXlr6Ic68WrIACfZxszy3h9td2rEHTa5HqGjZK2DzWUfX0od5BWI41JZyASrScLsWwSkiJw2BZ_jnwODfGT35a0l0wMcUMNU50UnFR9L-fv_eX1TZ0W6HiQUOpFwilANkC-sTX"
      ],
      sizes: ["Standart"],
      colors: ["Gri", "Siyah"],
      category: { id: 3, name: "Aksesuar", slug: "aksesuar" }
    },
    {
      id: 5,
      name: "Hassas Cilt Losyonu",
      slug: "hassas-cilt-losyonu",
      description: "Parabensiz, parfümsüz bebek losyonu. Hassas bebek cildini nemlendirip korur. Dermatolojik olarak test edilmiştir.",
      price: 180,
      salePrice: null,
      stock: 100,
      images: [
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDhSlO_CbIwSORgQCBxrn4csQEsr_Y72jPZ0dczOojT8KdPOSIvCGMS_Wp_nH25h0KR3XXrKPLNaoGwoYqopBSmilBwaYE4GP0_bP9myOdIk6kPul4mfCxilFcLj_6_z9nsxBSR6aw0KqHKPK4bnIrk0vtJ7256feKQMlu2yOq3NWPN0AuDrx6UoRsJROZzeRqGjNpFFYl9YPD1KUYt0uqcUJOAXYagPi3aj9pHVfIrQ4LVAOCZSNMoWiyjk-dsD6ephdSzPM0BSQxG"
      ],
      sizes: ["200ml", "400ml"],
      colors: [],
      category: { id: 4, name: "Bakım", slug: "bakim" }
    },
    {
      id: 6,
      name: "Eğitici Ahşap Oyuncak Seti",
      slug: "egitici-ahsap-oyuncak-seti",
      description: "Montessori eğitim metoduna uygun, doğal ahşaptan üretilmiş eğitici oyuncak seti. Renk ve şekil tanıma becerisini geliştirir.",
      price: 520,
      salePrice: 450,
      stock: 30,
      images: [
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCYn41MjjMx0JJtY50LIaCri5Y9NfRVKGGwhv1hTNN56BZanYAnUIJY4dZxtepvHH5PsRlo6I_IVZZh05f55JixREoU7OwI2l2-J_Kq_B2CF-F-QwJe6apCX7QIQItmyK8PXcVV6VB7wuVyHvBtM2YgEm2uFfhiKkKR4FqRXdMN-mvcOxZdcuhGDEn1TBcl80VxyzmW8-A1JBx8feoCkWXkDvXldQGBrkmJkvenYSFP28UFYVmNkXtxeyoMqLJZ5dRHMfhytZYMEUXQ"
      ],
      sizes: [],
      colors: ["Renkli"],
      category: { id: 2, name: "Oyuncak", slug: "oyuncak" }
    }
  ];

  const MOCK_CATEGORIES = [
    { id: 1, name: "Bebek Giyim", slug: "bebek-giyim" },
    { id: 2, name: "Oyuncak", slug: "oyuncak" },
    { id: 3, name: "Aksesuar", slug: "aksesuar" },
    { id: 4, name: "Bakım", slug: "bakim" }
  ];

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

  // Default placeholder image
  const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500' viewBox='0 0 400 500'%3E%3Crect fill='%23f4f2f0' width='400' height='500'/%3E%3Ctext fill='%23999' font-family='system-ui' font-size='16' text-anchor='middle' x='200' y='250'%3EGörsel Yükleniyor%3C/text%3E%3C/svg%3E";

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
    const key = `${id}_${options.size || "default"}_${options.color || "default"}`;
    const existing = cart.find((item) => item.key === key);

    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({
        id,
        key,
        qty,
        size: options.size || null,
        color: options.color || null,
        addedAt: Date.now(),
      });
    }

    saveCart(cart);
    console.log(`[MelzV2] Added to cart: ${id} x${qty}`, options);
    return cart;
  }

  function removeFromCart(productId, key = null) {
    let cart = getCart();
    if (key) {
      cart = cart.filter((item) => item.key !== key);
    } else {
      cart = cart.filter((item) => item.id !== String(productId));
    }
    saveCart(cart);
    console.log(`[MelzV2] Removed from cart: ${productId}`);
    return cart;
  }

  function updateQty(productId, qty, key = null) {
    const cart = getCart();
    const item = key 
      ? cart.find((i) => i.key === key)
      : cart.find((i) => i.id === String(productId));
    
    if (item) {
      if (qty <= 0) {
        return removeFromCart(productId, key);
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
  // PRODUCT DATA HELPERS (with mock fallback)
  // ============================================
  async function fetchProduct(id) {
    // Try API first
    try {
      const data = await fetchJSON(`${API_BASE}/products/${id}`);
      const product = data?.product || data;
      if (product && product.id) {
        console.log(`[MelzV2] Product ${id} loaded from API`);
        return product;
      }
    } catch (e) {
      console.warn(`[MelzV2] API unavailable for product ${id}:`, e.message);
    }

    // Fallback to mock data
    if (USE_MOCK_FALLBACK) {
      const mockProduct = MOCK_PRODUCTS.find(p => String(p.id) === String(id));
      if (mockProduct) {
        console.log(`[MelzV2] Product ${id} loaded from MOCK data`);
        return mockProduct;
      }
    }

    return null;
  }

  async function fetchProducts(params = {}) {
    // Try API first
    try {
      const queryString = new URLSearchParams(params).toString();
      const data = await fetchJSON(`${API_BASE}/products?${queryString}`);
      if (data?.products?.length) {
        console.log(`[MelzV2] Products loaded from API`);
        return data;
      }
    } catch (e) {
      console.warn(`[MelzV2] API unavailable for products:`, e.message);
    }

    // Fallback to mock data
    if (USE_MOCK_FALLBACK) {
      console.log(`[MelzV2] Products loaded from MOCK data`);
      const limit = parseInt(params.limit) || 12;
      const page = parseInt(params.page) || 1;
      const start = (page - 1) * limit;
      const products = MOCK_PRODUCTS.slice(start, start + limit);
      return {
        products,
        pagination: {
          page,
          pages: Math.ceil(MOCK_PRODUCTS.length / limit),
          total: MOCK_PRODUCTS.length
        }
      };
    }

    return { products: [], pagination: { page: 1, pages: 1, total: 0 } };
  }

  async function getCartProducts() {
    const cart = getCart();
    if (cart.length === 0) return [];

    const products = [];
    const seenIds = new Set();

    for (const item of cart) {
      if (seenIds.has(item.id)) {
        // Already fetched this product, just add cart info
        const existing = products.find(p => String(p.id) === item.id);
        if (existing) continue;
      }
      
      const product = await fetchProduct(item.id);
      if (product) {
        seenIds.add(item.id);
        products.push({ 
          ...product, 
          cartQty: item.qty, 
          cartSize: item.size, 
          cartColor: item.color,
          cartKey: item.key
        });
      }
    }
    return products;
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
  // PRODUCT DETAIL PAGE INIT
  // ============================================
  async function initProductDetail() {
    const productId = getParam("id");
    const page = document.getElementById("product-detail-page");
    
    if (!page) return;

    // Show loading state
    const titleEls = document.querySelectorAll("[data-product-title]");
    titleEls.forEach(el => el.textContent = "Yükleniyor...");

    // If no ID, try to get first mock product for preview
    const idToFetch = productId || (USE_MOCK_FALLBACK ? "1" : null);
    
    if (!idToFetch) {
      titleEls.forEach(el => el.textContent = "Ürün bulunamadı");
      console.warn("[MelzV2] No product ID in URL");
      return;
    }

    const product = await fetchProduct(idToFetch);
    
    if (!product) {
      titleEls.forEach(el => el.textContent = "Ürün bulunamadı");
      document.querySelector("[data-product-description]")?.replaceChildren(
        document.createTextNode("Bu ürün mevcut değil veya kaldırılmış olabilir.")
      );
      return;
    }

    // Title (multiple elements)
    document.querySelectorAll("[data-product-title]").forEach((el) => {
      el.textContent = product.name;
    });

    // Price
    const priceEl = document.querySelector("[data-product-price]");
    if (priceEl) {
      const hasSale = product.salePrice != null && Number(product.salePrice) < Number(product.price);
      if (hasSale) {
        priceEl.innerHTML = `<span class="text-primary">${fmtTRY(product.salePrice)}</span> <span class="text-gray-400 line-through text-lg ml-2">${fmtTRY(product.price)}</span>`;
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
        el.href = `/bebek-urunleri/dist/index.html?category=${product.category.slug}`;
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

    // Main Image with fallback
    const mainImg = document.querySelector("[data-main-image]");
    const placeholder = document.querySelector("[data-image-placeholder]");
    const imgUrl = (product.images && product.images.length > 0) ? product.images[0] : null;
    
    if (mainImg) {
      if (imgUrl) {
        mainImg.src = imgUrl;
        mainImg.alt = product.name;
        mainImg.onerror = () => {
          mainImg.src = PLACEHOLDER_IMAGE;
          mainImg.onerror = null;
        };
        mainImg.classList.remove("hidden");
        if (placeholder) placeholder.classList.add("hidden");
      } else {
        mainImg.src = PLACEHOLDER_IMAGE;
        mainImg.classList.remove("hidden");
        if (placeholder) placeholder.classList.add("hidden");
      }
    }

    // Thumbnails
    const thumbsContainer = document.querySelector("[data-product-thumbnails]");
    if (thumbsContainer) {
      if (product.images && product.images.length > 0) {
        thumbsContainer.innerHTML = product.images.slice(0, 4).map((img, i) => `
          <div class="rounded-2xl bg-[#f4f2f0] aspect-square overflow-hidden cursor-pointer hover:ring-2 ring-primary transition ${i === 0 ? 'ring-2 ring-primary' : ''}" data-thumb-index="${i}">
            <img src="${img}" alt="${safeText(product.name)} ${i + 1}" class="w-full h-full object-cover" onerror="this.src='${PLACEHOLDER_IMAGE}'">
          </div>
        `).join("");
        
        // Add click handlers for thumbnails
        thumbsContainer.querySelectorAll("[data-thumb-index]").forEach(thumb => {
          thumb.addEventListener("click", () => {
            const idx = parseInt(thumb.dataset.thumbIndex);
            if (mainImg && product.images[idx]) {
              mainImg.src = product.images[idx];
              // Update active state
              thumbsContainer.querySelectorAll("[data-thumb-index]").forEach(t => t.classList.remove("ring-2", "ring-primary"));
              thumb.classList.add("ring-2", "ring-primary");
            }
          });
        });
      } else {
        // Show placeholder thumbnails
        thumbsContainer.innerHTML = Array(4).fill(`
          <div class="rounded-2xl bg-[#f4f2f0] aspect-square"></div>
        `).join("");
      }
    }

    // Sizes
    const sizesContainer = document.querySelector("[data-product-sizes]");
    const sizesSection = document.querySelector("[data-sizes-section]");
    if (sizesContainer) {
      if (product.sizes && product.sizes.length > 0) {
        sizesContainer.innerHTML = product.sizes.map((s, i) =>
          `<button class="px-4 h-10 rounded-xl ${i === 0 ? 'bg-primary text-white' : 'bg-[#f4f2f0] hover:bg-primary hover:text-white'} transition text-sm font-semibold" data-size="${safeText(s)}">${safeText(s)}</button>`
        ).join("");
        
        // Wire size selection
        sizesContainer.querySelectorAll("button[data-size]").forEach((btn) => {
          btn.addEventListener("click", () => {
            sizesContainer.querySelectorAll("button[data-size]").forEach((b) => {
              b.classList.remove("bg-primary", "text-white");
              b.classList.add("bg-[#f4f2f0]");
            });
            btn.classList.remove("bg-[#f4f2f0]");
            btn.classList.add("bg-primary", "text-white");
          });
        });
      } else if (sizesSection) {
        sizesSection.style.display = "none";
      }
    }

    // Convert CTA links to buttons with cart functionality
    const ctaContainer = document.querySelector(".mt-6.grid.grid-cols-1.sm\\:grid-cols-2.gap-3");
    if (ctaContainer) {
      const selectedSize = () => sizesContainer?.querySelector("button.bg-primary")?.dataset.size || null;
      
      ctaContainer.innerHTML = `
        <button data-add-to-cart class="h-11 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition">
          <span class="material-symbols-outlined text-[20px]">add_shopping_cart</span>
          Sepete Ekle
        </button>
        <button data-buy-now class="h-11 rounded-xl bg-[#f4f2f0] text-text-main font-bold flex items-center justify-center gap-2 hover:bg-[#e8e6e4] transition">
          <span class="material-symbols-outlined text-[20px]">bolt</span>
          Hemen Al
        </button>
      `;

      // Add to Cart
      ctaContainer.querySelector("[data-add-to-cart]")?.addEventListener("click", () => {
        addToCart(product.id, 1, { size: selectedSize() });
        showToast(`${product.name} sepete eklendi!`);
        updateCartBadge();
      });

      // Buy Now
      ctaContainer.querySelector("[data-buy-now]")?.addEventListener("click", () => {
        addToCart(product.id, 1, { size: selectedSize() });
        window.location.href = "/odeme/dist/index.html";
      });
    }

    // Load Related Products
    loadRelatedProducts(product);
  }

  // ============================================
  // RELATED PRODUCTS
  // ============================================
  async function loadRelatedProducts(currentProduct) {
    const container = document.querySelector(".mt-8 .grid.grid-cols-2.gap-3");
    if (!container) return;

    try {
      const data = await fetchProducts({ limit: 4, category: currentProduct.category?.slug });
      const related = (data.products || []).filter(p => String(p.id) !== String(currentProduct.id)).slice(0, 2);

      if (related.length === 0) {
        // If no related in same category, get any other products
        const fallbackData = await fetchProducts({ limit: 4 });
        related.push(...(fallbackData.products || []).filter(p => String(p.id) !== String(currentProduct.id)).slice(0, 2));
      }

      if (related.length > 0) {
        container.innerHTML = related.map(p => {
          const img = (p.images && p.images[0]) || PLACEHOLDER_IMAGE;
          const hasSale = p.salePrice != null && Number(p.salePrice) < Number(p.price);
          const price = hasSale ? p.salePrice : p.price;
          
          return `
            <a href="/urun/dist/index.html?id=${p.id}" class="rounded-3xl border border-[#f4f2f0] bg-white p-3 hover:shadow-md transition group">
              <img src="${img}" alt="${safeText(p.name)}" class="w-full aspect-[4/5] object-cover rounded-2xl bg-[#f4f2f0]" onerror="this.src='${PLACEHOLDER_IMAGE}'" />
              <div class="mt-3 font-semibold text-text-main group-hover:text-primary transition">${safeText(p.name)}</div>
              <div class="text-sm text-text-secondary">${fmtTRY(price)}</div>
            </a>
          `;
        }).join("");
      }
    } catch (e) {
      console.warn("[MelzV2] Failed to load related products:", e.message);
    }
  }

  // ============================================
  // CHECKOUT PAGE
  // ============================================
  async function initCheckout() {
    const cart = getCart();
    
    // DOM elements - use specific IDs from checkout page
    const cartItemsEl = document.getElementById("checkout-cart-items");
    const cartCountEl = document.getElementById("cart-item-count");
    const subtotalEl = document.getElementById("checkout-subtotal");
    const shippingEl = document.getElementById("checkout-shipping");
    const totalEl = document.getElementById("checkout-total");
    const freeShippingEl = document.getElementById("free-shipping-progress");
    const cartSectionEl = document.querySelector(".lg\\:col-span-7");

    // Check if we're on the checkout page
    if (!cartItemsEl && !cartSectionEl) return;

    if (cart.length === 0) {
      // Show empty cart message
      if (cartItemsEl) {
        cartItemsEl.innerHTML = `
          <div class="text-center py-12">
            <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">shopping_cart</span>
            <h3 class="text-xl font-bold text-gray-600 mb-2">Sepetiniz Boş</h3>
            <p class="text-gray-500 mb-6">Henüz sepetinize ürün eklemediniz.</p>
            <a href="/bebek-urunleri/dist/index.html" class="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition">
              <span class="material-symbols-outlined">storefront</span>
              Alışverişe Başla
            </a>
          </div>
        `;
      }
      if (cartCountEl) cartCountEl.textContent = "0";
      if (subtotalEl) subtotalEl.textContent = fmtTRY(0);
      if (shippingEl) shippingEl.textContent = fmtTRY(0);
      if (totalEl) totalEl.textContent = fmtTRY(0);
      return;
    }

    const products = await getCartProducts();
    const totals = await getCartTotals();
    const config = getConfig();

    // Update cart count in header
    if (cartCountEl) {
      cartCountEl.textContent = totals.totalQty;
    }

    // Render cart items
    if (cartItemsEl) {
      cartItemsEl.innerHTML = products.map((p) => {
        const cartItem = cart.find(c => c.id === String(p.id));
        const img = (p.images && p.images[0]) || PLACEHOLDER_IMAGE;
        const price = p.salePrice != null && Number(p.salePrice) < Number(p.price) ? p.salePrice : p.price;
        const lineTotal = Number(price) * (cartItem?.qty || 1);
        const qty = cartItem?.qty || 1;
        const itemKey = cartItem?.key || `${p.id}_default_default`;

        return `
          <div class="bg-white dark:bg-[#181411] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex gap-4 transition-all hover:shadow-md" data-cart-item="${p.id}">
            <div class="w-24 h-24 shrink-0 rounded-lg bg-gray-100 overflow-hidden relative">
              <img src="${img}" alt="${safeText(p.name)}" class="w-full h-full object-cover" onerror="this.src='${PLACEHOLDER_IMAGE}'">
            </div>
            <div class="flex-1 flex flex-col justify-between">
              <div class="flex justify-between items-start gap-2">
                <div>
                  <h4 class="font-bold text-lg leading-tight">${safeText(p.name)}</h4>
                  <p class="text-sm text-[#897561] mt-1">${cartItem?.size ? `Beden: ${safeText(cartItem.size)}` : ''} ${cartItem?.color ? `| Renk: ${safeText(cartItem.color)}` : ''}</p>
                </div>
                <span class="font-bold text-lg">${fmtTRY(lineTotal)}</span>
              </div>
              <div class="flex justify-between items-end mt-2">
                <button onclick="MelzV2.removeFromCart('${p.id}', '${itemKey}'); MelzV2.initCheckout();" class="text-red-500 hover:text-red-600 text-sm font-medium flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">delete</span>
                  <span>Sil</span>
                </button>
                <div class="flex items-center bg-[#f4f2f0] dark:bg-[#333] rounded-lg p-1">
                  <button onclick="MelzV2.updateQty('${p.id}', ${qty - 1}, '${itemKey}'); MelzV2.initCheckout();" class="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-[#444] shadow-sm hover:text-primary transition-colors">
                    <span class="material-symbols-outlined text-sm">remove</span>
                  </button>
                  <span class="w-8 text-center text-sm font-bold">${qty}</span>
                  <button onclick="MelzV2.updateQty('${p.id}', ${qty + 1}, '${itemKey}'); MelzV2.initCheckout();" class="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-[#444] shadow-sm hover:text-primary transition-colors">
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
      shippingEl.textContent = totals.isFreeShipping ? 'Ücretsiz' : fmtTRY(totals.shipping);
      shippingEl.className = totals.isFreeShipping ? 'font-medium text-green-600' : 'font-medium';
    }
    if (totalEl) totalEl.textContent = fmtTRY(totals.total);

    // Update free shipping progress
    if (freeShippingEl) {
      if (totals.isFreeShipping) {
        freeShippingEl.innerHTML = `
          <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm text-green-700 dark:text-green-300">
            <span class="material-symbols-outlined text-sm align-middle mr-1">check_circle</span>
            Ücretsiz kargo kazandınız!
          </div>
        `;
      } else {
        const remaining = config.FREE_SHIPPING_THRESHOLD - totals.subtotal;
        freeShippingEl.innerHTML = `
          <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            <span class="material-symbols-outlined text-sm align-middle mr-1">local_shipping</span>
            Ücretsiz kargo için <strong>${fmtTRY(remaining)}</strong> daha ekleyin!
          </div>
        `;
      }
    }
  }

  // ============================================
  // PAYMENT FLOW (Iyzico Placeholder)
  // ============================================
  function proceedToPayment() {
    const cart = getCart();
    if (cart.length === 0) {
      showToast("Sepetiniz boş.", "error");
      return;
    }

    // Get form data using specific IDs
    const nameInput = document.getElementById('checkout-name');
    const surnameInput = document.getElementById('checkout-surname');
    const phoneInput = document.getElementById('checkout-phone');
    const addressInput = document.getElementById('checkout-address');

    const name = [nameInput?.value, surnameInput?.value].filter(Boolean).join(" ").trim();
    const phone = phoneInput?.value?.trim() || "";
    const address = addressInput?.value?.trim() || "";

    if (!name || !phone || !address) {
      showToast("Lütfen teslimat bilgilerini doldurun.", "error");
      return;
    }

    // Show Iyzico placeholder modal
    showPaymentModal({ name, phone, address });
  }

  function showPaymentModal(customerInfo) {
    // Remove existing modal
    document.getElementById("payment-modal")?.remove();

    getCartTotals().then(totals => {
      const modal = document.createElement("div");
      modal.id = "payment-modal";
      modal.className = "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4";
      modal.innerHTML = `
        <div class="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-md w-full p-6 shadow-2xl">
          <div class="text-center mb-6">
            <div class="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="material-symbols-outlined text-4xl text-yellow-600">credit_card</span>
            </div>
            <h3 class="text-xl font-bold mb-2">Ödeme Entegrasyonu</h3>
            <p class="text-gray-500 text-sm">Iyzico ödeme formu burada görünecek.</p>
          </div>
          
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
            <div class="flex justify-between mb-2">
              <span class="text-gray-600 dark:text-gray-400">Toplam Tutar:</span>
              <span class="font-bold text-primary text-lg">${fmtTRY(totals.total)}</span>
            </div>
            <div class="text-xs text-gray-500">
              <p><strong>Ad:</strong> ${safeText(customerInfo.name)}</p>
              <p><strong>Tel:</strong> ${safeText(customerInfo.phone)}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <button onclick="document.getElementById('payment-modal').remove();" class="py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              İptal
            </button>
            <button onclick="MelzV2.simulatePayment()" class="py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition">
              Test Ödemesi
            </button>
          </div>
          
          <p class="text-xs text-center text-gray-400 mt-4">
            Bu bir test ödemesidir. Gerçek ödeme alınmayacaktır.
          </p>
        </div>
      `;

      document.body.appendChild(modal);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.remove();
      });
    });
  }

  async function simulatePayment() {
    document.getElementById("payment-modal")?.remove();
    
    const orderId = "MLZ-" + Date.now().toString(36).toUpperCase();
    
    // Store order data for confirmation page
    try {
      const cart = getCart();
      const products = await getCartProducts();
      const totals = await getCartTotals();
      
      // Get delivery info from form
      const nameInput = document.getElementById('checkout-name');
      const surnameInput = document.getElementById('checkout-surname');
      const phoneInput = document.getElementById('checkout-phone');
      const addressInput = document.getElementById('checkout-address');
      
      const orderData = {
        orderId,
        items: products.map(p => ({
          id: p.id,
          name: p.name,
          price: p.salePrice != null && Number(p.salePrice) < Number(p.price) ? p.salePrice : p.price,
          qty: cart.find(c => c.id === String(p.id))?.qty || 1,
          size: cart.find(c => c.id === String(p.id))?.size || null,
          image: (p.images && p.images[0]) || null
        })),
        subtotal: totals.subtotal,
        shipping: totals.shipping,
        total: totals.total,
        isFreeShipping: totals.isFreeShipping,
        delivery: {
          name: [nameInput?.value, surnameInput?.value].filter(Boolean).join(' ').trim(),
          phone: phoneInput?.value?.trim() || '',
          address: addressInput?.value?.trim() || ''
        },
        createdAt: new Date().toISOString()
      };
      
      // Store in both sessionStorage and localStorage for persistence
      sessionStorage.setItem('melz_last_order', JSON.stringify(orderData));
      localStorage.setItem('melz_last_order', JSON.stringify(orderData));
      console.log('[MelzV2] Order saved:', orderId);
    } catch (e) {
      console.warn('[MelzV2] Could not save order data:', e);
    }
    
    clearCart();
    window.location.href = `/siparis-onayi/dist/index.html?orderId=${orderId}&status=success`;
  }

  // ============================================
  // ORDER PAGES
  // ============================================
  function initOrderConfirmation() {
    const orderId = getParam("orderId");
    const status = getParam("status");

    const orderIdEl = document.querySelector("h2.text-3xl");
    if (orderIdEl && orderId) {
      orderIdEl.textContent = `#${orderId}`;
    }

    // Update status icon based on status param
    const iconContainer = document.querySelector(".flex.items-center.justify-center.rounded-full.bg-green-50");
    if (iconContainer && status === "failed") {
      iconContainer.className = "flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 p-4 mb-2";
      iconContainer.innerHTML = '<span class="material-symbols-outlined text-[64px] text-red-500">cancel</span>';
      
      const titleEl = document.querySelector("h1");
      if (titleEl) titleEl.textContent = "Ödeme Başarısız";
      
      const descEl = titleEl?.nextElementSibling;
      if (descEl) descEl.textContent = "Ödeme işlemi tamamlanamadı. Lütfen tekrar deneyin.";
    }
  }

  function initOrderDetail() {
    const orderId = getParam("orderId");
    const orderIdEl = document.querySelector("h1");

    if (orderIdEl && orderId) {
      orderIdEl.textContent = `Sipariş #${orderId}`;
    }
  }

  // ============================================
  // CART BADGE UPDATE
  // ============================================
  function updateCartBadge() {
    const count = getCartCount();
    
    // Update all cart badges
    document.querySelectorAll("[data-cart-badge]").forEach((badge) => {
      badge.textContent = count;
      badge.style.display = count > 0 ? "flex" : "none";
    });

    // Also update cart icon in header if exists
    const cartLinks = document.querySelectorAll('a[href*="odeme"]');
    cartLinks.forEach(link => {
      let badge = link.querySelector(".cart-badge");
      if (!badge && count > 0) {
        badge = document.createElement("span");
        badge.className = "cart-badge absolute -top-1 -right-1 bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold";
        badge.dataset.cartBadge = "";
        link.style.position = "relative";
        link.appendChild(badge);
      }
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? "flex" : "none";
      }
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
    fetchProducts,

    // Pages
    initProductDetail,
    initCheckout,
    initOrderConfirmation,
    initOrderDetail,

    // Payment
    proceedToPayment,
    simulatePayment,

    // Utils
    fmtTRY,
    showToast,
    updateCartBadge,
    getConfig,

    // Mock data (for debugging)
    MOCK_PRODUCTS,
    MOCK_CATEGORIES,
  };

  console.log("[MelzV2] Loaded. Cart count:", getCartCount(), "| API:", API_BASE, "| Mock fallback:", USE_MOCK_FALLBACK);
})();
