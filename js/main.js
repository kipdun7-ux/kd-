/* ============================================================
   SMART LIVING HUB — main.js
   Modular affiliate product platform
   ============================================================ */

'use strict';

// ---- CONFIG ------------------------------------------------
const CONFIG = {
  dataPath: 'data/products.json',
  loadMoreStep: 6,
  whatsappNumber: '254728327873',
  email: 'kipenterpise@gmail.com',
};

// ---- STATE -------------------------------------------------
let allProducts = [];
let filteredProducts = [];
let visibleCount = 0;

// ---- FETCH PRODUCTS ----------------------------------------
async function fetchProducts() {
  try {
    const res = await fetch(CONFIG.dataPath);
    if (!res.ok) throw new Error('Failed to load products');
    allProducts = await res.json();
    return allProducts;
  } catch (err) {
    console.error('Product fetch error:', err);
    return [];
  }
}

// ---- RENDER HELPERS ----------------------------------------
function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.4 ? 1 : 0;
  const empty = 5 - full - half;
  let html = '<div class="stars" aria-label="Rating: ' + rating + ' out of 5">';
  for (let i = 0; i < full; i++) html += '<span class="star full">★</span>';
  if (half) html += '<span class="star half">★</span>';
  for (let i = 0; i < empty; i++) html += '<span class="star empty">☆</span>';
  html += '</div>';
  return html;
}

function renderBenefits(benefits, max = 3) {
  if (!benefits || !benefits.length) return '';
  const items = benefits.slice(0, max).map(b => `<li>${escHtml(b)}</li>`).join('');
  return `<ul class="card-benefits">${items}</ul>`;
}

function escHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, m => map[m]);
}

function categoryLabel(cat) {
  const map = { 'home-essentials': 'Home Essentials', 'smart-gadgets': 'Smart Gadgets' };
  return map[cat] || cat;
}

// ---- PRODUCT CARD HTML -------------------------------------
function buildProductCard(product) {
  const videoSection = product.video
    ? `<button class="card-video-toggle" onclick="toggleVideo(this)" aria-expanded="false">
        <span>▶</span> Watch video review
       </button>
       <div class="card-video-embed">
         <iframe src="${escHtml(product.video)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="${escHtml(product.name)} video review"></iframe>
       </div>`
    : '';

  const prosHtml = product.pros && product.pros.length
    ? `<ul class="pros-list">${product.pros.map(p => `<li>${escHtml(p)}</li>`).join('')}</ul>`
    : '';
  const consHtml = product.cons && product.cons.length
    ? `<ul class="cons-list">${product.cons.map(c => `<li>${escHtml(c)}</li>`).join('')}</ul>`
    : '';

  return `
  <article class="product-card fade-in" itemscope itemtype="https://schema.org/Product" data-id="${product.id}" data-category="${product.category}" data-rating="${product.rating}">
    <div class="card-image-wrap">
      <img src="${escHtml(product.image)}" alt="${escHtml(product.name)} product image" loading="lazy" width="400" height="300" itemprop="image" onerror="this.src='assets/images/placeholder.svg'">
      ${product.badge ? `<span class="card-badge">${escHtml(product.badge)}</span>` : ''}
      <span class="card-category-tag">${categoryLabel(product.category)}</span>
    </div>
    <div class="card-body">
      <div class="card-rating">
        ${renderStars(product.rating)}
        <span class="rating-num" itemprop="ratingValue">${product.rating}</span>
      </div>
      <h3 class="card-name" itemprop="name">${escHtml(product.name)}</h3>
      <p class="card-desc" itemprop="description">${escHtml(product.shortDescription)}</p>
      ${renderBenefits(product.benefits)}
      ${(product.pros?.length || product.cons?.length) ? `
      <button class="pros-cons-toggle" onclick="toggleProsConsCard(this)" aria-expanded="false">
        <span class="toggle-icon">▸</span> View Pros &amp; Cons
      </button>
      <div class="pros-cons-panel">
        ${prosHtml ? `<h5 class="pros-title">Pros</h5>${prosHtml}` : ''}
        ${consHtml ? `<h5 class="cons-title">Cons</h5>${consHtml}` : ''}
      </div>` : ''}
      ${videoSection}
      <div class="card-footer">
        <a href="${escHtml(product.affiliateLink)}" class="card-cta" target="_blank" rel="nofollow sponsored noopener" aria-label="Check price for ${escHtml(product.name)} on Amazon">
          🛒 Check Price on Amazon
        </a>
        <p class="card-urgency">⚡ Limited-time deal — price may change</p>
        <a href="product.html?id=${product.id}" class="card-details-link">
          Full review &amp; specs →
        </a>
      </div>
    </div>
  </article>`;
}

// ---- TOGGLE HELPERS ----------------------------------------
function toggleProsConsCard(btn) {
  const panel = btn.nextElementSibling;
  const isOpen = panel.classList.toggle('open');
  btn.setAttribute('aria-expanded', isOpen);
  btn.querySelector('.toggle-icon').textContent = isOpen ? '▾' : '▸';
  btn.innerHTML = btn.innerHTML.replace(
    isOpen ? 'View Pros' : 'Hide Pros',
    isOpen ? 'Hide Pros' : 'View Pros'
  );
}

function toggleVideo(btn) {
  const embed = btn.nextElementSibling;
  const isOpen = embed.classList.toggle('open');
  btn.setAttribute('aria-expanded', isOpen);
  btn.innerHTML = isOpen ? '<span>✕</span> Hide video' : '<span>▶</span> Watch video review';
}

// ---- HOMEPAGE INJECTION ------------------------------------
async function initHomepage() {
  const container = document.getElementById('product-container');
  if (!container) return;

  // Show skeletons
  container.innerHTML = Array(3).fill('<div class="skeleton skeleton-card"></div>').join('');
  container.style.display = 'grid';

  const products = await fetchProducts();
  if (!products.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px">Products unavailable. Please try again later.</p>';
    return;
  }

  // Top picks = top rated, max 6
  const topPicks = [...products].sort((a, b) => b.rating - a.rating).slice(0, 6);
  container.innerHTML = topPicks.map(buildProductCard).join('');
}

// ---- CATEGORY PAGE -----------------------------------------
async function initCategoryPage() {
  const container = document.getElementById('product-container');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const catParam = params.get('cat') || 'all';

  // Update page heading
  const pageTitle = document.getElementById('category-title');
  const pageDesc = document.getElementById('category-desc');
  if (catParam === 'home-essentials') {
    if (pageTitle) pageTitle.textContent = 'Home Essentials';
    if (pageDesc) pageDesc.textContent = 'Kitchen tools, organization, comfort & style — curated for the modern home.';
    document.title = 'Home Essentials | Smart Living Hub';
  } else if (catParam === 'smart-gadgets') {
    if (pageTitle) pageTitle.textContent = 'Smart Gadgets';
    if (pageDesc) pageDesc.textContent = 'IoT devices, automation & cutting-edge tech for connected living.';
    document.title = 'Smart Gadgets | Smart Living Hub';
  }

  // Set active filter button
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === catParam || (catParam === 'all' && btn.dataset.cat === 'all'));
  });

  // Show skeleton
  container.innerHTML = '<div class="loading-grid">' + Array(6).fill('<div class="skeleton skeleton-card"></div>').join('') + '</div>';

  const products = await fetchProducts();
  allProducts = products;
  applyFilters(catParam);

  // Filter button events
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const searchVal = document.getElementById('search-input')?.value || '';
      applyFilters(btn.dataset.cat, searchVal);
    });
  });

  // Search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const activeCat = document.querySelector('.filter-btn.active')?.dataset.cat || 'all';
      applyFilters(activeCat, searchInput.value);
    });
  }

  // Load more
  document.getElementById('load-more-btn')?.addEventListener('click', loadMore);
}

function applyFilters(cat = 'all', query = '') {
  const q = query.toLowerCase().trim();
  filteredProducts = allProducts.filter(p => {
    const matchCat = cat === 'all' || p.category === cat;
    const matchQ = !q ||
      p.name.toLowerCase().includes(q) ||
      p.shortDescription.toLowerCase().includes(q) ||
      p.benefits?.some(b => b.toLowerCase().includes(q));
    return matchCat && matchQ;
  });

  visibleCount = 0;
  const container = document.getElementById('product-container');
  container.innerHTML = '';
  loadMore();

  const noResults = document.getElementById('no-results');
  if (noResults) noResults.style.display = filteredProducts.length === 0 ? 'block' : 'none';
}

function loadMore() {
  const container = document.getElementById('product-container');
  const chunk = filteredProducts.slice(visibleCount, visibleCount + CONFIG.loadMoreStep);
  chunk.forEach(p => {
    const div = document.createElement('div');
    div.innerHTML = buildProductCard(p);
    container.appendChild(div.firstElementChild);
  });
  visibleCount += chunk.length;

  const btn = document.getElementById('load-more-btn');
  if (btn) {
    const remaining = filteredProducts.length - visibleCount;
    btn.style.display = remaining > 0 ? 'inline-flex' : 'none';
    btn.textContent = `Load More (${remaining} remaining)`;
  }
}

// ---- PRODUCT DETAIL PAGE -----------------------------------
async function initProductPage() {
  const container = document.getElementById('product-detail-container');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));

  if (!id) {
    container.innerHTML = '<p style="text-align:center;padding:80px 20px;color:var(--text-muted)">Product not found. <a href="index.html" style="color:var(--accent)">Return home →</a></p>';
    return;
  }

  // Skeleton
  container.innerHTML = '<div class="skeleton" style="height:500px;border-radius:22px;"></div>';

  const products = await fetchProducts();
  const product = products.find(p => p.id === id);

  if (!product) {
    container.innerHTML = '<p style="text-align:center;padding:80px 20px;color:var(--text-muted)">Product not found. <a href="index.html" style="color:var(--accent)">Return home →</a></p>';
    return;
  }

  document.title = `${product.name} Review | Smart Living Hub`;

  // Update meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', product.shortDescription);

  const prosHtml = product.pros?.length
    ? product.pros.map(p => `<li>${escHtml(p)}</li>`).join('') : '';
  const consHtml = product.cons?.length
    ? product.cons.map(c => `<li>${escHtml(c)}</li>`).join('') : '';

  container.innerHTML = `
  <div class="product-detail-grid" itemscope itemtype="https://schema.org/Product">
    <div class="product-detail-image">
      <img src="${escHtml(product.image)}" alt="${escHtml(product.name)}" itemprop="image" loading="eager" onerror="this.src='assets/images/placeholder.svg'">
    </div>
    <div class="product-detail-info">
      <div class="badge-row">
        ${product.badge ? `<span class="detail-badge accent">${escHtml(product.badge)}</span>` : ''}
        <span class="detail-badge cat">${categoryLabel(product.category)}</span>
      </div>
      <h1 itemprop="name">${escHtml(product.name)}</h1>
      <div class="detail-rating" itemprop="aggregateRating" itemscope itemtype="https://schema.org/AggregateRating">
        ${renderStars(product.rating)}
        <span class="rating-num"><span itemprop="ratingValue">${product.rating}</span> / 5</span>
        <meta itemprop="ratingCount" content="100">
      </div>
      <p class="detail-desc" itemprop="description">${escHtml(product.shortDescription)}</p>
      ${product.benefits?.length ? `
      <div class="detail-benefits">
        <h4>Key Benefits</h4>
        <ul>${product.benefits.map(b => `<li>${escHtml(b)}</li>`).join('')}</ul>
      </div>` : ''}
      <div class="detail-cta-block">
        <a href="${escHtml(product.affiliateLink)}" class="btn btn-cta" target="_blank" rel="nofollow sponsored noopener">
          🛒 Check Price on Amazon
        </a>
        <p class="detail-urgency">⚡ Limited-time deal — price may change</p>
      </div>
    </div>
  </div>

  ${(product.pros?.length || product.cons?.length) ? `
  <section class="section-sm" aria-label="Pros and Cons">
    <div class="section-header">
      <span class="eyebrow">Honest Review</span>
      <h2>Pros &amp; Cons</h2>
    </div>
    <div class="pros-cons-grid">
      ${product.pros?.length ? `<div class="pros-block"><h4>✓ Pros</h4><ul>${prosHtml}</ul></div>` : ''}
      ${product.cons?.length ? `<div class="cons-block"><h4>✗ Cons</h4><ul>${consHtml}</ul></div>` : ''}
    </div>
  </section>` : ''}

  ${product.video ? `
  <section class="video-section section-sm">
    <span class="eyebrow">Video Review</span>
    <h3>See It In Action</h3>
    <div class="video-embed">
      <iframe src="${escHtml(product.video)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="${escHtml(product.name)} video review"></iframe>
    </div>
  </section>` : ''}

  <section class="section-sm" aria-label="Comparison">
    <span class="eyebrow">How It Compares</span>
    <h3 style="margin-bottom:24px">Quick Comparison</h3>
    <div class="comparison-table-wrap">
      <table class="comparison-table">
        <thead>
          <tr><th>Feature</th><th>This Product</th><th>Budget Option</th><th>Premium Option</th></tr>
        </thead>
        <tbody>
          <tr class="highlight"><td>${escHtml(product.name)}</td><td><span class="check">✓</span> Recommended</td><td>—</td><td>—</td></tr>
          <tr><td>Price Range</td><td>Mid-range</td><td>Low</td><td>High</td></tr>
          <tr><td>Build Quality</td><td><span class="check">★★★★★</span></td><td>★★★</td><td>★★★★★</td></tr>
          <tr><td>Warranty</td><td><span class="check">✓</span> Included</td><td>Limited</td><td>Extended</td></tr>
          <tr><td>Our Rating</td><td><strong>${product.rating}/5</strong></td><td>~3.5/5</td><td>~4.9/5</td></tr>
        </tbody>
      </table>
    </div>
    <p style="font-size:0.78rem;color:var(--text-muted);margin-top:10px">* Comparison data is for illustrative purposes. Always verify current specs and prices.</p>
  </section>

  <section class="section-sm" aria-label="FAQ">
    <span class="eyebrow">FAQ</span>
    <h3 style="margin-bottom:28px">Frequently Asked Questions</h3>
    <div class="faq-list" id="faq-list">
      ${buildFAQItems(product)}
    </div>
  </section>

  <section class="section-sm" style="text-align:center;background:var(--surface-2);border-radius:22px;padding:60px 40px;border:1px solid var(--border);">
    <span class="eyebrow">Ready to Buy?</span>
    <h2 style="margin-bottom:12px">${escHtml(product.name)}</h2>
    <p style="margin-bottom:28px;max-width:460px;margin-left:auto;margin-right:auto;">${escHtml(product.shortDescription)}</p>
    <a href="${escHtml(product.affiliateLink)}" class="btn btn-cta" target="_blank" rel="nofollow sponsored noopener">
      🛒 Get Best Price on Amazon
    </a>
    <p style="margin-top:14px;font-size:0.78rem;color:var(--text-muted);">⚡ Price may change. Affiliate link — we earn a small commission at no extra cost to you.</p>
  </section>`;

  // Init FAQ
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

function buildFAQItems(product) {
  const faqs = [
    {
      q: `Is the ${product.name} worth buying?`,
      a: `Based on our research and user reviews, the ${product.name} rates ${product.rating}/5 stars. ${product.pros?.[0] ? 'Key strength: ' + product.pros[0] + '.' : ''} It's a solid pick for most buyers.`
    },
    {
      q: 'Does this come with a warranty?',
      a: 'Warranty terms vary by seller and region. Check the product listing on Amazon for the current warranty details before purchasing.'
    },
    {
      q: 'Can I return it if I\'m not satisfied?',
      a: 'Amazon typically offers a standard return policy. Check the listing for the exact return window and conditions.'
    },
    {
      q: 'Are there any common issues to be aware of?',
      a: product.cons?.length
        ? `Some users have noted: ${product.cons.slice(0, 2).join('; ')}. These are minor concerns for most buyers.`
        : 'No major issues reported in our research. Always read recent reviews on Amazon for the latest feedback.'
    },
    {
      q: 'How does the price compare to alternatives?',
      a: `The ${product.name} sits in the mid-range category, offering strong value for money. See our comparison table above for context.`
    }
  ];
  return faqs.map(faq => `
    <div class="faq-item">
      <button class="faq-question">${escHtml(faq.q)} <span class="faq-chevron">▼</span></button>
      <div class="faq-answer">${escHtml(faq.a)}</div>
    </div>`).join('');
}

// ---- SHARED NAVBAR MOBILE TOGGLE ---------------------------
function initNavbar() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  // Close on outside click
  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !links.contains(e.target)) {
      links.classList.remove('open');
    }
  });
}

// ---- BACK TO TOP -------------------------------------------
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ---- EMAIL CAPTURE -----------------------------------------
function initEmailForm() {
  const form = document.getElementById('email-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const btn = form.querySelector('button');
    if (input && input.value) {
      btn.textContent = '✓ You\'re subscribed!';
      btn.style.background = 'var(--accent-2)';
      input.value = '';
      btn.disabled = true;
    }
  });
}

// ---- ACTIVE NAV LINK ----------------------------------------
function setActiveNavLink() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href').split('?')[0];
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

// ---- INIT --------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  initBackToTop();
  initEmailForm();
  setActiveNavLink();

  const body = document.body.dataset.page;

  if (body === 'home') {
    await initHomepage();
  } else if (body === 'category') {
    await initCategoryPage();
  } else if (body === 'product') {
    await initProductPage();
  }
});
