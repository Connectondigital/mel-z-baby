/* assets/js/cart-page.js */
(() => {
  "use strict";

  const CART_KEY = "melz_cart";

  const $ = (sel, root = document) => root.querySelector(sel);

  const els = {
    wrap: $("#cart-wrap"),
    empty: $("#cart-empty"),
    items: $("#cart-items"),
    subtotal: $("#subtotal"),
    shipping: $("#shipping"),
    total: $("#total"),
    clearBtn: $("#cart-clear"),
  };

  function safeParse(str) {
    try { return JSON.parse(str); } catch { return null; }
  }

  // ✅ HER ZAMAN [{id, qty}] array’i döndür
  function readCartItems() {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = safeParse(raw);

    if (Array.isArray(parsed)) return normalizeItems(parsed);
    if (parsed && Array.isArray(parsed.items)) return normalizeItems(parsed.items);

    return [];
  }

  function normalizeItems(items) {
    return (items || [])
      .map((it) => {
        const id = String(it.id ?? it.pid ?? it.productId ?? "");
        const qty = Number(it.qty ?? it.quantity ?? it.count ?? 1);
        return { id, qty: Number.isFinite(qty) && qty > 0 ? qty : 1 };
      })
      .filter((x) => x.id);
  }

  function writeCartItems(items) {
    const payload = { items: normalizeItems(items) };
    localStorage.setItem(CART_KEY, JSON.stringify(payload));
    // Badge vb dinleyenler için event
    window.dispatchEvent(new CustomEvent("melz:cart:updated", { detail: payload }));
  }

  // Güvenli ürün bulma fonksiyonu: window.MELZ_PRODUCTS, window.MelzV2.products, window.MELZ_PRODUCTS_BY_ID
  function getProductByIdSafe(id) {
    const sid = String(id);
    const list = Array.isArray(window.MELZ_PRODUCTS)
      ? window.MELZ_PRODUCTS
      : Array.isArray(window.MelzV2?.products)
      ? window.MelzV2.products
      : [];
    let p = list.find((x) => String(x.id ?? x._id) === sid);
    if (!p && window.MELZ_PRODUCTS_BY_ID) {
      try {
        p = window.MELZ_PRODUCTS_BY_ID.get
          ? window.MELZ_PRODUCTS_BY_ID.get(sid)
          : window.MELZ_PRODUCTS_BY_ID[sid];
      } catch (e) {}
    }
    return p || null;
  }

  // Removed top-level usage of items to fix ReferenceError
  // els.items.innerHTML = items.map(({ id, qty }) => {
  //   const p = getProductById(id);
  //   const name = p?.title || p?.name || `Ürün #${id}`;
  //   const img = (p?.images && p.images[0]) || "https://via.placeholder.com/120x120?text=Melz";
  //   const line = calcLinePrice(p, qty);
  //   subtotal += line;

  //   return `
  //   <div class="flex gap-4 py-4 border-b border-[#eee]">
  //     <div class="w-20 h-20 rounded-xl overflow-hidden bg-[#f4f2f0] shrink-0">
  //       <img src="${img}" alt="${name}" class="w-full h-full object-cover" />
  //     </div>

  //     <div class="flex-1 min-w-0">
  //       <div class="flex items-start justify-between gap-3">
  //         <div class="min-w-0">
  //           <div class="font-bold truncate">${name}</div>
  //           <div class="text-sm text-text-secondary mt-1">ID: ${id}</div>
  //         </div>
  //         <div class="font-bold">${formatTRY(line)}</div>
  //       </div>

  //       <div class="flex items-center justify-between mt-3">
  //         <div class="inline-flex items-center gap-2 rounded-xl bg-[#f4f2f0] px-2 py-2">
  //           <button class="w-8 h-8 rounded-lg bg-white hover:bg-[#eee] font-black" data-action="dec" data-id="${id}">-</button>
  //           <div class="w-8 text-center font-bold">${qty}</div>
  //           <button class="w-8 h-8 rounded-lg bg-white hover:bg-[#eee] font-black" data-action="inc" data-id="${id}">+</button>
  //         </div>

  //         <button class="text-red-600 font-semibold hover:underline" data-action="remove" data-id="${id}">
  //           Kaldır
  //         </button>
  //       </div>
  //     </div>
  //   </div>
  //   `;
  // }).join("");

  function formatTRY(n) {
    const v = Number(n || 0);
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(v);
  }

  function calcLinePrice(product, qty) {
    const price = Number(product?.salePrice ?? product?.price ?? 0);
    return (Number.isFinite(price) ? price : 0) * qty;
  }

  function render() {
    const items = readCartItems();

    const hasItems = items.length > 0;
    if (els.empty) els.empty.classList.toggle("hidden", hasItems);
    if (els.wrap) els.wrap.classList.toggle("hidden", !hasItems);

    if (!els.items) return;

    if (!hasItems) {
      els.items.innerHTML = "";
      if (els.subtotal) els.subtotal.textContent = formatTRY(0);
      if (els.shipping) els.shipping.textContent = formatTRY(0);
      if (els.total) els.total.textContent = formatTRY(0);
      return;
    }

    let subtotal = 0;

    els.items.innerHTML = items.map(({ id, qty }) => {
      const p = getProductByIdSafe(id);
      const name = p?.title || p?.name || `Ürün #${id}`;
      const img = (p?.images && p.images[0]) || "https://via.placeholder.com/120x120?text=Melz";
      const line = calcLinePrice(p, qty);
      subtotal += line;

      return `
      <div class="flex gap-4 py-4 border-b border-[#eee]">
        <div class="w-20 h-20 rounded-xl overflow-hidden bg-[#f4f2f0] shrink-0">
          <img src="${img}" alt="${name}" class="w-full h-full object-cover" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-bold truncate">${name}</div>
              <div class="text-sm text-text-secondary mt-1">ID: ${id}</div>
            </div>
            <div class="font-bold">${formatTRY(line)}</div>
          </div>

          <div class="flex items-center justify-between mt-3">
            <div class="inline-flex items-center gap-2 rounded-xl bg-[#f4f2f0] px-2 py-2">
              <button class="w-8 h-8 rounded-lg bg-white hover:bg-[#eee] font-black" data-action="dec" data-id="${id}">-</button>
              <div class="w-8 text-center font-bold">${qty}</div>
              <button class="w-8 h-8 rounded-lg bg-white hover:bg-[#eee] font-black" data-action="inc" data-id="${id}">+</button>
            </div>

            <button class="text-red-600 font-semibold hover:underline" data-action="remove" data-id="${id}">
              Kaldır
            </button>
          </div>
        </div>
      </div>
      `;
    }).join("");

    // Shipping demo: sabit 0 (istersen kural ekleriz)
    const shipping = 0;
    const total = subtotal + shipping;

    if (els.subtotal) els.subtotal.textContent = formatTRY(subtotal);
    if (els.shipping) els.shipping.textContent = formatTRY(shipping);
    if (els.total) els.total.textContent = formatTRY(total);
  }

  function onClick(e) {
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

  // ✅ INIT
  document.addEventListener("click", onClick);
  if (els.clearBtn) els.clearBtn.addEventListener("click", clearCart);

  render();
  console.log("[CART_PAGE] Ready ✓ key=", CART_KEY, "items=", readCartItems().length);
})();
