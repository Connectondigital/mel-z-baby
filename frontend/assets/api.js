/**
 * Mel'z Baby & Kids - Frontend API Integration
 * Minimal JS to connect static HTML pages to backend API
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const API_BASE_URL = window.MELZ_API_URL || 'http://127.0.0.1:5000/api';
  
  // Storage keys
  const TOKEN_KEY = 'melz_token';
  const USER_KEY = 'melz_user';

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  // Get auth token
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Set auth token
  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  // Get stored user
  function getUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  // Set user
  function setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  // Clear auth
  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // API fetch wrapper
  async function api(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getToken();

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API hatası');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Format price in Turkish Lira
  function formatPrice(price) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(price);
  }

  // Get URL parameter
  function getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  // ============================================
  // API FUNCTIONS
  // ============================================

  // Products
  async function fetchProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return api(`/products${query ? '?' + query : ''}`);
  }

  async function fetchProductById(id) {
    return api(`/products/${id}`);
  }

  // Categories
  async function fetchCategories() {
    return api('/categories');
  }

  async function fetchCategoryById(id) {
    return api(`/categories/${id}`);
  }

  // Auth
  async function login(email, password) {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) {
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  }

  async function register(name, email, password, phone) {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone })
    });
    if (data.token) {
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  }

  async function getMe() {
    return api('/auth/me');
  }

  function logout() {
    clearAuth();
    window.location.reload();
  }

  // Orders
  async function createOrder(orderData) {
    return api('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  async function getMyOrders() {
    return api('/orders/my');
  }

  // ============================================
  // RENDERING FUNCTIONS
  // ============================================

  // Render product card HTML
  function renderProductCard(product) {
    const imageUrl = product.images && product.images.length > 0 
      ? product.images[0] 
      : 'https://via.placeholder.com/300x300?text=No+Image';
    
    const hasDiscount = product.salePrice && product.salePrice < product.price;
    const displayPrice = hasDiscount ? product.salePrice : product.price;

    return `
      <a href="/urun/dist/index.html?id=${product.id}" class="group flex flex-col gap-3 pb-3">
        <div class="w-full aspect-square bg-center bg-no-repeat bg-cover rounded-xl overflow-hidden relative">
          <img src="${imageUrl}" alt="${product.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'">
          ${hasDiscount ? '<span class="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">İndirim</span>' : ''}
          ${product.stock <= 0 ? '<span class="absolute top-2 right-2 bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded">Tükendi</span>' : ''}
        </div>
        <div class="flex flex-col gap-1">
          <p class="text-[#111418] dark:text-white text-base font-medium leading-normal line-clamp-2">${product.name}</p>
          ${product.category ? `<p class="text-[#637588] dark:text-gray-400 text-sm">${product.category.name}</p>` : ''}
          <div class="flex items-center gap-2">
            <p class="text-[#111418] dark:text-white text-lg font-bold">${formatPrice(displayPrice)}</p>
            ${hasDiscount ? `<p class="text-[#637588] text-sm line-through">${formatPrice(product.price)}</p>` : ''}
          </div>
        </div>
      </a>
    `;
  }

  // Render products into container
  function renderProducts(products, containerId) {
    const container = document.getElementById(containerId) || document.querySelector('[data-products-grid]');
    if (!container) {
      console.warn('Products container not found');
      return;
    }

    if (products.length === 0) {
      container.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">Ürün bulunamadı</p>';
      return;
    }

    container.innerHTML = products.map(renderProductCard).join('');
  }

  // Render categories filter
  function renderCategoryFilter(categories, containerId) {
    const container = document.getElementById(containerId) || document.querySelector('[data-category-filter]');
    if (!container) return;

    const currentCategory = getParam('category');
    
    let html = `<button class="px-4 py-2 rounded-full text-sm font-medium transition-colors ${!currentCategory ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}" onclick="MelzAPI.filterByCategory('')">Tümü</button>`;
    
    categories.forEach(cat => {
      const isActive = currentCategory === cat.slug || currentCategory === String(cat.id);
      html += `<button class="px-4 py-2 rounded-full text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}" onclick="MelzAPI.filterByCategory('${cat.slug}')">${cat.name}</button>`;
    });

    container.innerHTML = html;
  }

  // Filter by category
  function filterByCategory(categorySlug) {
    const url = new URL(window.location);
    if (categorySlug) {
      url.searchParams.set('category', categorySlug);
    } else {
      url.searchParams.delete('category');
    }
    window.location.href = url.toString();
  }

  // Render product detail
  function renderProductDetail(product) {
    // Update all title elements
    document.querySelectorAll('[data-product-title]').forEach(el => {
      el.textContent = product.name;
    });

    // Update price
    const priceEl = document.querySelector('[data-product-price]');
    if (priceEl) {
      const hasDiscount = product.salePrice && product.salePrice < product.price;
      if (hasDiscount) {
        priceEl.innerHTML = `<span>${formatPrice(product.salePrice)}</span> <span class="text-gray-500 line-through text-lg ml-2">${formatPrice(product.price)}</span>`;
      } else {
        priceEl.innerHTML = `<span>${formatPrice(product.price)}</span>`;
      }
    }

    // Update description
    const descEl = document.querySelector('[data-product-description]');
    if (descEl) descEl.textContent = product.description || 'Ürün açıklaması bulunmuyor.';

    // Update category
    const catEls = document.querySelectorAll('[data-product-category]');
    catEls.forEach(el => {
      el.textContent = product.category ? `Kategori: ${product.category.name}` : 'Kategori';
    });

    // Update category links
    const catLinks = document.querySelectorAll('[data-product-category-link], [data-product-category-link2]');
    catLinks.forEach(el => {
      if (product.category) {
        el.textContent = product.category.name;
        el.href = `/kategori/liste/dist/index.html?category=${product.category.slug}`;
      }
    });

    // Update stock
    const stockEl = document.querySelector('[data-product-stock]');
    if (stockEl) {
      if (product.stock > 10) {
        stockEl.textContent = 'Stokta';
        stockEl.className = 'text-green-600 font-semibold';
      } else if (product.stock > 0) {
        stockEl.textContent = `Son ${product.stock} adet`;
        stockEl.className = 'text-orange-500 font-semibold';
      } else {
        stockEl.textContent = 'Tükendi';
        stockEl.className = 'text-red-500 font-semibold';
      }
    }

    // Update main image
    const mainImageContainer = document.querySelector('[data-product-image]');
    if (mainImageContainer && product.images && product.images.length > 0) {
      const mainImg = mainImageContainer.querySelector('[data-main-image]');
      const placeholder = mainImageContainer.querySelector('[data-image-placeholder]');
      if (mainImg) {
        mainImg.src = product.images[0];
        mainImg.alt = product.name;
        mainImg.classList.remove('hidden');
      }
      if (placeholder) {
        placeholder.classList.add('hidden');
      }

      // Update thumbnails
      const thumbsContainer = mainImageContainer.querySelector('[data-product-thumbnails]');
      if (thumbsContainer) {
        thumbsContainer.innerHTML = product.images.slice(0, 4).map((img, i) => `
          <div class="rounded-2xl bg-[#f4f2f0] aspect-square overflow-hidden cursor-pointer hover:ring-2 ring-primary transition" onclick="document.querySelector('[data-main-image]').src='${img}'">
            <img src="${img}" alt="${product.name} ${i+1}" class="w-full h-full object-cover">
          </div>
        `).join('');
      }
    }

    // Update sizes
    const sizesContainer = document.querySelector('[data-product-sizes]');
    if (sizesContainer) {
      if (product.sizes && product.sizes.length > 0) {
        sizesContainer.innerHTML = product.sizes.map(size => 
          `<button class="px-4 h-10 rounded-xl bg-[#f4f2f0] hover:bg-primary hover:text-white transition text-sm font-semibold" data-size="${size}">${size}</button>`
        ).join('');
      } else {
        const sizesSection = document.querySelector('[data-sizes-section]');
        if (sizesSection) sizesSection.style.display = 'none';
      }
    }

    // Update colors if present
    const colorsContainer = document.querySelector('[data-product-colors]');
    if (colorsContainer && product.colors && product.colors.length > 0) {
      colorsContainer.innerHTML = product.colors.map(color => 
        `<button class="px-4 py-2 border border-gray-300 rounded-lg hover:border-primary hover:bg-primary/10 transition-colors" data-color="${color}">${color}</button>`
      ).join('');
    }

    // Update page title
    document.title = `${product.name} - Mel'z Baby & Kids`;
  }

  // ============================================
  // PAGE INITIALIZERS
  // ============================================

  // Initialize product listing page
  async function initProductListing() {
    try {
      const category = getParam('category');
      const search = getParam('search');
      const page = getParam('page') || 1;

      // Fetch and render categories
      const catData = await fetchCategories();
      renderCategoryFilter(catData.categories, 'category-filter');

      // Fetch and render products
      const params = { page, limit: 12 };
      if (category) params.category = category;
      if (search) params.search = search;

      const prodData = await fetchProducts(params);
      renderProducts(prodData.products, 'products-grid');

      // Update count
      const countEl = document.querySelector('[data-products-count]');
      if (countEl) countEl.textContent = `${prodData.pagination.total} ürün`;

    } catch (error) {
      console.error('Failed to load products:', error);
      const container = document.querySelector('[data-products-grid]');
      if (container) {
        container.innerHTML = '<p class="col-span-full text-center text-red-500 py-8">Ürünler yüklenirken hata oluştu</p>';
      }
    }
  }

  // Initialize product detail page
  async function initProductDetail() {
    const productId = getParam('id') || getParam('slug');
    
    if (!productId) {
      console.error('No product ID provided');
      return;
    }

    try {
      const data = await fetchProductById(productId);
      renderProductDetail(data.product);
    } catch (error) {
      console.error('Failed to load product:', error);
      alert('Ürün yüklenirken hata oluştu');
    }
  }

  // Initialize category page
  async function initCategoryPage() {
    try {
      const categoryId = getParam('id') || getParam('slug');
      
      // Fetch all categories for filter
      const catData = await fetchCategories();
      renderCategoryFilter(catData.categories, 'category-filter');

      // Fetch products
      const params = { limit: 24 };
      if (categoryId) params.category = categoryId;

      const prodData = await fetchProducts(params);
      renderProducts(prodData.products, 'products-grid');

    } catch (error) {
      console.error('Failed to load category:', error);
    }
  }

  // Auto-initialize based on page
  function autoInit() {
    const path = window.location.pathname;

    // Product listing pages
    if (path.includes('bebek-urunleri') || path.includes('kategori')) {
      initProductListing();
    }
    // Product detail page
    else if (path.includes('urun/dist')) {
      initProductDetail();
    }
  }

  // ============================================
  // EXPOSE GLOBAL API
  // ============================================
  window.MelzAPI = {
    // Config
    API_BASE_URL,
    
    // Auth
    login,
    register,
    logout,
    getMe,
    getToken,
    getUser,
    isLoggedIn: () => !!getToken(),
    
    // Products
    fetchProducts,
    fetchProductById,
    renderProducts,
    renderProductCard,
    
    // Categories
    fetchCategories,
    fetchCategoryById,
    renderCategoryFilter,
    filterByCategory,
    
    // Orders
    createOrder,
    getMyOrders,
    
    // Utils
    formatPrice,
    getParam,
    api,
    
    // Page initializers
    initProductListing,
    initProductDetail,
    initCategoryPage,
    autoInit
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

})();
