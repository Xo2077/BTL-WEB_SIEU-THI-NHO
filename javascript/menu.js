// Lắng nghe sự kiện click trên nút có icon
document.querySelector('.select-header').addEventListener('click', function() {
    
    // Tìm phần tử danh sách tùy chọn tương ứng
    const optionsList = this.closest('.custom-select-menu').querySelector('.select-options');
    
    // Dùng thuộc tính 'toggle' của classList để đơn giản hóa việc ẩn/hiện
    optionsList.classList.toggle('show-list');
});

// Ẩn menu khi click ra ngoài (Tùy chọn)
window.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-select-menu')) {
        // Đảm bảo đóng tất cả các menu đang mở
        document.querySelectorAll('.select-options').forEach(options => {
            options.classList.remove('show-list');
        });
    }
});

// Cart and menu behavior
// ...existing code...
(function () {
  // Utility: format price (VND)
  function formatPrice(num) {
    if (!num && num !== 0) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫';
  }

  // Menu: toggle category list
  const selectHeader = document.querySelector('.select-header');
  const selectOptions = document.getElementById('categories');
  if (selectHeader && selectOptions) {
    selectHeader.addEventListener('click', () => {
      const isOpen = selectOptions.classList.toggle('show-list');
      selectHeader.setAttribute('aria-expanded', String(isOpen));
      selectOptions.hidden = !isOpen;
    });
    // close when clicking outside
    document.addEventListener('click', (e) => {
      if (!selectHeader.contains(e.target) && !selectOptions.contains(e.target)) {
        selectOptions.classList.remove('show-list');
        selectOptions.hidden = true;
        selectHeader.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ----------------------------
     Simple cart (client-side, localStorage)
     - intercept forms with action "/cart/add"
     - keeps items in localStorage under 'site_cart'
     - renders cart preview and badge
     ---------------------------- */

  const CART_KEY = 'site_cart_v1';
  const iconCart = document.getElementById('icon_cart');
  const cartPreview = document.getElementById('cart_preview');
  const cartItemsList = document.getElementById('cart_items');
  const cartCountEl = document.querySelector('.cart-count');
  const cartTotalEl = document.getElementById('cart_total');
  const cartCloseBtn = document.getElementById('cart_close');

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }
  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function getItemIdFromArticle(article) {
    // prefer data-product-id or hidden input named product, otherwise use image src
    if (!article) return null;
    if (article.dataset && article.dataset.productId) return article.dataset.productId;
    const hidden = article.querySelector('input[type="hidden"][name="product"]');
    if (hidden && hidden.value) return hidden.value;
    const img = article.querySelector('img');
    return img ? img.getAttribute('src') : null;
  }

  function parsePrice(text) {
    // remove non digits and parse integer (assumes VND)
    const digits = (text || '').replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }

  function renderCart() {
    const cart = loadCart();
    const total = cart.reduce((s, it) => s + it.price * it.qty, 0);
    cartItemsList.innerHTML = '';
    if (cart.length === 0) {
      cartItemsList.innerHTML = '<li class="text-small" style="padding:12px;color:#666">Giỏ hàng trống</li>';
    } else {
      cart.forEach((it) => {
        const li = document.createElement('li');
        li.className = 'cart-preview__item';
        li.dataset.id = it.id;
        li.innerHTML = `
          <img src="${it.image}" alt="${escapeHtml(it.title)}" />
          <div class="cart-preview__meta">
            <h4>${escapeHtml(it.title)}</h4>
            <p class="text-small">${formatPrice(it.price)}</p>
            <div class="qty-controls" data-id="${it.id}">
              <button class="qty-decrease" aria-label="Giảm">−</button>
              <span class="qty-value">${it.qty}</span>
              <button class="qty-increase" aria-label="Tăng">+</button>
              <button class="qty-remove" aria-label="Xóa" style="margin-left:8px;background:transparent;border:none;color:#c33;cursor:pointer">Xóa</button>
            </div>
          </div>
        `;
        cartItemsList.appendChild(li);
      });
    }
    if (cartCountEl) cartCountEl.textContent = String(cart.reduce((s, i) => s + i.qty, 0));
    if (cartTotalEl) cartTotalEl.textContent = formatPrice(total);
  }

  // Sanitize for minimal HTML injection risk (titles only)
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // add item to cart (merge by id)
  function addToCart(item) {
    if (!item || !item.id) return;
    const cart = loadCart();
    const idx = cart.findIndex((c) => c.id === item.id);
    if (idx >= 0) {
      cart[idx].qty += item.qty || 1;
    } else {
      cart.push(Object.assign({qty: 1}, item));
    }
    saveCart(cart);
    renderCart();
    // open preview briefly to show change
    openCartPreview();
  }

  // change qty or remove
  function updateItemQty(id, qty) {
    const cart = loadCart();
    const idx = cart.findIndex((c) => c.id === id);
    if (idx === -1) return;
    if (qty <= 0) cart.splice(idx, 1);
    else cart[idx].qty = qty;
    saveCart(cart);
    renderCart();
  }

  function openCartPreview() {
    if (!cartPreview || !iconCart) return;
    cartPreview.hidden = false;
    cartPreview.setAttribute('aria-hidden', 'false');
    iconCart.setAttribute('aria-expanded', 'true');
  }
  function closeCartPreview() {
    if (!cartPreview || !iconCart) return;
    cartPreview.hidden = true;
    cartPreview.setAttribute('aria-hidden', 'true');
    iconCart.setAttribute('aria-expanded', 'false');
  }

  // intercept add-to-cart forms
  document.addEventListener('submit', function (ev) {
    const form = ev.target;
    if (!form || form.getAttribute('action') !== '/cart/add') return;
    ev.preventDefault();
    // find associated product article
    const article = form.closest('.product');
    if (!article) return;
    const id = getItemIdFromArticle(article) || String(Date.now());
    const titleEl = article.querySelector('h3');
    const imgEl = article.querySelector('img');
    const priceEl = article.querySelector('.gia') || article.querySelector('.price');
    const price = parsePrice(priceEl ? priceEl.textContent : '');
    addToCart({
      id: id,
      title: titleEl ? titleEl.textContent.trim() : 'Sản phẩm',
      image: imgEl ? imgEl.getAttribute('src') : '',
      price: price || 0,
      qty: 1
    });
  }, true);

  // delegate clicks in cart preview (qty + remove)
  cartItemsList && cartItemsList.addEventListener('click', function (ev) {
    const btn = ev.target;
    const container = btn.closest('.qty-controls');
    if (!container) return;
    const id = container.dataset.id;
    const cart = loadCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;
    if (btn.classList.contains('qty-increase')) {
      updateItemQty(id, item.qty + 1);
    } else if (btn.classList.contains('qty-decrease')) {
      updateItemQty(id, item.qty - 1);
    } else if (btn.classList.contains('qty-remove')) {
      updateItemQty(id, 0);
    }
  });

  // toggle cart preview by clicking cart icon
  iconCart && iconCart.addEventListener('click', function () {
    if (!cartPreview) return;
    if (cartPreview.hidden) openCartPreview();
    else closeCartPreview();
  });

  // close button
  cartCloseBtn && cartCloseBtn.addEventListener('click', closeCartPreview);

  // close on outside click
  document.addEventListener('click', function (e) {
    if (!cartPreview || !iconCart) return;
    if (cartPreview.hidden) return;
    if (!cartPreview.contains(e.target) && !iconCart.contains(e.target)) {
      closeCartPreview();
    }
  });

  // init render
  renderCart();

})();

// Category preview + cart (client-side) behavior
// ...existing code...
(function () {
  /* --- Utilities --- */
  function qs(sel, ctx){ return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx){ return Array.from((ctx || document).querySelectorAll(sel)); }
  function formatPrice(num){ if (!num && num !== 0) return ''; return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫'; }
  function escapeHtml(str){ return String(str).replace(/[&<>"']/g, (m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  /* --- Category menu + preview --- */
  const selectHeader = qs('.select-header');
  const selectOptions = qs('#categories');
  const categoryPreview = qs('#category_preview');
  const categoryPreviewTitle = qs('#category_preview_title');

  if (selectHeader && selectOptions && categoryPreview) {
    // Toggle list
    selectHeader.addEventListener('click', () => {
      const open = selectOptions.classList.toggle('show-list');
      selectOptions.hidden = !open;
      selectHeader.setAttribute('aria-expanded', String(open));
      if (!open) {
        categoryPreview.classList.remove('show');
        categoryPreview.setAttribute('aria-hidden', 'true');
      }
    });

    // Keyboard toggle (Enter/Space)
    selectHeader.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectHeader.click(); }
    });

    // Bind hover/focus for each category item
    qsa('#categories .list-item').forEach((link) => {
      const bg = link.dataset.bg || '';
      const title = link.textContent.trim();

      function showPreview(){
        if (bg) categoryPreview.style.backgroundImage = `url("${bg}")`;
        else categoryPreview.style.backgroundImage = '';
        categoryPreviewTitle.textContent = title;
        categoryPreview.classList.add('show');
        categoryPreview.setAttribute('aria-hidden', 'false');
      }
      function hidePreview(){
        categoryPreview.classList.remove('show');
        categoryPreview.setAttribute('aria-hidden', 'true');
      }

      link.addEventListener('pointerenter', showPreview);
      link.addEventListener('focus', showPreview);
      link.addEventListener('pointerleave', hidePreview);
      link.addEventListener('blur', hidePreview);

      // close menu when user clicks a category (keeps normal navigation)
      link.addEventListener('click', () => {
        selectOptions.classList.remove('show-list');
        selectOptions.hidden = true;
        selectHeader.setAttribute('aria-expanded', 'false');
        hidePreview();
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!selectHeader.contains(e.target) && !selectOptions.contains(e.target) && !categoryPreview.contains(e.target)) {
        selectOptions.classList.remove('show-list');
        selectOptions.hidden = true;
        selectHeader.setAttribute('aria-expanded', 'false');
        categoryPreview.classList.remove('show');
        categoryPreview.setAttribute('aria-hidden', 'true');
      }
    });
  }

  /* ----------------------------
     Simple cart (client-side, localStorage)
     intercepts forms action="/cart/add" and renders preview
     ---------------------------- */
  const CART_KEY = 'site_cart_v1';
  const iconCart = qs('#icon_cart');
  const cartPreview = qs('#cart_preview');
  const cartItemsList = qs('#cart_items');
  const cartCountEl = qs('.cart-count');
  const cartTotalEl = qs('#cart_total');
  const cartCloseBtn = qs('#cart_close');

  function loadCart(){ try{ return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }catch(e){ return []; } }
  function saveCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

  function getItemIdFromArticle(article){
    if(!article) return null;
    if (article.dataset && article.dataset.productId) return article.dataset.productId;
    const hidden = article.querySelector('input[type="hidden"][name="product"]');
    if (hidden && hidden.value) return hidden.value;
    const img = article.querySelector('img');
    return img ? img.getAttribute('src') : String(Date.now());
  }

  function parsePrice(text){ const digits = (text||'').replace(/[^\d]/g,''); return digits ? parseInt(digits,10) : 0; }

  function renderCart(){
    const cart = loadCart();
    const total = cart.reduce((s,it)=>s + it.price * it.qty, 0);
    if (!cartItemsList) return;
    cartItemsList.innerHTML = '';
    if (cart.length === 0) {
      cartItemsList.innerHTML = '<li class="text-small" style="padding:12px;color:#666">Giỏ hàng trống</li>';
    } else {
      cart.forEach((it) => {
        const li = document.createElement('li');
        li.className = 'cart-preview__item';
        li.dataset.id = it.id;
        li.innerHTML = `
          <img src="${it.image}" alt="${escapeHtml(it.title)}" />
          <div class="cart-preview__meta">
            <h4>${escapeHtml(it.title)}</h4>
            <p class="text-small">${formatPrice(it.price)}</p>
            <div class="qty-controls" data-id="${it.id}">
              <button class="qty-decrease" aria-label="Giảm">−</button>
              <span class="qty-value">${it.qty}</span>
              <button class="qty-increase" aria-label="Tăng">+</button>
              <button class="qty-remove" aria-label="Xóa" style="margin-left:8px;background:transparent;border:none;color:#c33;cursor:pointer">Xóa</button>
            </div>
          </div>
        `;
        cartItemsList.appendChild(li);
      });
    }
    if (cartCountEl) cartCountEl.textContent = String(cart.reduce((s,i)=>s + i.qty, 0));
    if (cartTotalEl) cartTotalEl.textContent = formatPrice(total);
  }

  function addToCart(item){
    if(!item || !item.id) return;
    const cart = loadCart();
    const idx = cart.findIndex(c=>c.id === item.id);
    if (idx >= 0) cart[idx].qty += item.qty || 1;
    else cart.push(Object.assign({qty:1}, item));
    saveCart(cart);
    renderCart();
    openCartPreview();
  }

  function updateItemQty(id, qty){
    const cart = loadCart();
    const idx = cart.findIndex(c=>c.id === id);
    if (idx === -1) return;
    if (qty <= 0) cart.splice(idx,1);
    else cart[idx].qty = qty;
    saveCart(cart);
    renderCart();
  }

  function openCartPreview(){ if (!cartPreview || !iconCart) return; cartPreview.hidden = false; cartPreview.setAttribute('aria-hidden','false'); iconCart.setAttribute('aria-expanded','true'); }
  function closeCartPreview(){ if (!cartPreview || !iconCart) return; cartPreview.hidden = true; cartPreview.setAttribute('aria-hidden','true'); iconCart.setAttribute('aria-expanded','false'); }

  // Intercept add-to-cart forms
  document.addEventListener('submit', function (ev){
    const form = ev.target;
    if (!form || form.getAttribute('action') !== '/cart/add') return;
    ev.preventDefault();
    const article = form.closest('.product');
    if (!article) return;
    const id = getItemIdFromArticle(article);
    const titleEl = article.querySelector('h3');
    const imgEl = article.querySelector('img');
    const priceEl = article.querySelector('.gia') || article.querySelector('.price');
    const price = parsePrice(priceEl ? priceEl.textContent : '');
    addToCart({
      id: id,
      title: titleEl ? titleEl.textContent.trim() : 'Sản phẩm',
      image: imgEl ? imgEl.getAttribute('src') : '',
      price: price || 0,
      qty: 1
    });
  }, true);

  // Delegate cart preview actions
  if (cartItemsList) {
    cartItemsList.addEventListener('click', function (ev){
      const btn = ev.target;
      const container = btn.closest('.qty-controls');
      if (!container) return;
      const id = container.dataset.id;
      const cart = loadCart();
      const item = cart.find(i=>i.id === id);
      if (!item) return;
      if (btn.classList.contains('qty-increase')) updateItemQty(id, item.qty + 1);
      else if (btn.classList.contains('qty-decrease')) updateItemQty(id, item.qty - 1);
      else if (btn.classList.contains('qty-remove')) updateItemQty(id, 0);
    });
  }

  // Cart icon toggle and close handlers
  iconCart && iconCart.addEventListener('click', function () { if (!cartPreview) return; if (cartPreview.hidden) openCartPreview(); else closeCartPreview(); });
  cartCloseBtn && cartCloseBtn.addEventListener('click', closeCartPreview);
  document.addEventListener('click', function (e) { if (!cartPreview || !iconCart) return; if (cartPreview.hidden) return; if (!cartPreview.contains(e.target) && !iconCart.contains(e.target)) closeCartPreview(); });

  // Init
  renderCart();

})();

// ...existing code...

function renderCart() {
  const cart = loadCart();
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  
  // Show/hide count badge
  if (cartCountEl) {
    cartCountEl.textContent = String(count);
    cartCountEl.hidden = count === 0;
  }

  // Render cart items
  if (cartItemsList) {
    cartItemsList.innerHTML = cart.length === 0 
      ? '<div class="empty-cart">Giỏ hàng trống</div>'
      : cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
          <img src="${item.image}" alt="">
          <div class="cart-item__content">
            <h4>${escapeHtml(item.title)}</h4>
            <div class="cart-item__price">${formatPrice(item.price)}</div>
            <div class="cart-item__qty">
              <button class="qty-btn minus">-</button>
              <span>${item.qty}</span>
              <button class="qty-btn plus">+</button>
            </div>
          </div>
          <button class="remove-item">&times;</button>
        </div>
      `).join('');
  }

  // Update total
  if (cartTotalEl) {
    cartTotalEl.textContent = formatPrice(total);
  }
}

function addToCart(item) {
  if (!item || !item.id) return;
  const cart = loadCart();
  const existing = cart.find(i => i.id === item.id);
  
  if (existing) {
    existing.qty++;
  } else {
    cart.push({...item, qty: 1});
  }
  
  saveCart(cart);
  renderCart();
  
  // Show success feedback
  const badge = document.querySelector('.cart-count');
  if (badge) {
    badge.classList.add('pulse');
    setTimeout(() => badge.classList.remove('pulse'), 300);
  }
}

// ...existing code...