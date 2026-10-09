/* ============================================================
   main.js — ортақ логика: loader, navbar, іздеу, reveal,
   before/after slider, модаль, галерея, back-to-top
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Loader ---------- */
  const loader = document.getElementById('loader');
  window.addEventListener('load', () => loader && loader.classList.add('done'));
  setTimeout(() => loader && loader.classList.add('done'), 2500); // сақтық шегі

  /* ---------- Navbar scroll күйі ---------- */
  const navbar = document.getElementById('navbar');
  const onScrollNav = () => navbar && navbar.classList.toggle('scrolled', window.scrollY > 30);
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  /* ---------- Мобильді мәзір ---------- */
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileMenu.addEventListener('click', e => {
      if (e.target.tagName === 'A') burger.click();
    });
  }

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('visible'));
  }

  /* ---------- Модаль (жалпы) ---------- */
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  function openModal(html) {
    if (!modal) return;
    modalBody.innerHTML = html;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.addEventListener('click', e => {
    const opener = e.target.closest('[data-modal-open]');
    if (opener) {
      openModal(`<h3>${opener.dataset.title || ''}</h3>${opener.dataset.body || ''}`);
      return;
    }
    if (e.target.closest('[data-modal-close]')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeSearch(); } });

  /* ---------- Галерея: басса — үлкейтілген карточка ---------- */
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const caption = item.dataset.galleryCaption || 'Фото';
      const img = item.querySelector('img');
      openModal(img
        ? `<h3>${caption}</h3><img src="${img.src}" alt="${caption}" style="border-radius:12px">`
        : `<h3>${caption}</h3><p>Фото әлі енгізілмеді. Нақты фото қосылғанда осы жерде толық өлшемде көрсетіледі.</p>`);
    });
  });

  /* ---------- Іздеу ---------- */
  const overlay = document.getElementById('searchOverlay');
  const input = document.getElementById('searchInput');
  const resultsBox = document.getElementById('searchResults');
  const searchBtn = document.getElementById('searchBtn');
  let debounce;
  function openSearch() { overlay.classList.add('open'); input.focus(); }
  function closeSearch() { overlay && overlay.classList.remove('open'); }
  if (searchBtn) searchBtn.addEventListener('click', openSearch);
  const searchClose = document.getElementById('searchClose');
  if (searchClose) searchClose.addEventListener('click', closeSearch);
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });
  if (input) input.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = input.value.trim();
    if (q.length < 2) { resultsBox.innerHTML = '<p class="muted">Кемінде 2 әріп енгізіңіз…</p>'; return; }
    debounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const hits = await res.json();
        resultsBox.innerHTML = hits.length
          ? hits.map(h => `<a class="search-hit" href="${h.url}">
              <span class="hit-sec">${h.section}</span>
              <span class="hit-title">${h.title}</span>
              <span class="hit-snippet">${h.snippet || ''}</span>
            </a>`).join('')
          : '<p class="muted">Ештеңе табылмады.</p>';
      } catch {
        resultsBox.innerHTML = '<p class="muted">Іздеу қатесі — сервермен байланысты тексеріңіз.</p>';
      }
    }, 250);
  });

  /* ---------- Back to top ---------- */
  const btt = document.getElementById('backToTop');
  window.addEventListener('scroll', () => btt && btt.classList.toggle('show', window.scrollY > 600), { passive: true });
  if (btt) btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Before/After slider ---------- */
  const baContainer = document.getElementById('baContainer');
  if (baContainer) {
    const before = document.getElementById('baBefore');
    const handle = document.getElementById('baHandle');
    const slider = document.getElementById('baSlider');
    const setPos = pct => {
      before.style.width = pct + '%';
      handle.style.left = pct + '%';
      // ішкі қабат енін тұрақты ұстау (бейне қысылмайды)
      const inner = before.firstElementChild;
      if (inner) inner.style.width = baContainer.offsetWidth + 'px';
    };
    slider.addEventListener('input', () => setPos(slider.value));
    window.addEventListener('resize', () => setPos(slider.value));
    setPos(50);
  }

  /* ---------- Статистика: сандарды анимациямен санау ---------- */
  const statValues = document.querySelectorAll('.stat-value[data-count]');
  if ('IntersectionObserver' in window && statValues.length) {
    const io2 = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        io2.unobserve(en.target);
        const raw = en.target.dataset.count;
        const num = parseInt(raw, 10);
        if (isNaN(num)) return;
        const suffix = raw.replace(String(num), '');
        const t0 = performance.now(), dur = 1200;
        (function tick(t) {
          const p = Math.min((t - t0) / dur, 1);
          en.target.textContent = Math.round(num * (1 - Math.pow(1 - p, 3))) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.5 });
    statValues.forEach(el => io2.observe(el));
  }
})();
