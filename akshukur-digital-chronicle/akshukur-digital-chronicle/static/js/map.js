/* ============================================================
   map.js — Leaflet интерактивті картасы
   - Санат бойынша сүзу (маркерлер + тізім + карточкалар)
   - Маркер popup: атауы, фото орны, сипаттама, дереккөз
   - Координатасыз нүктелерге жалған маркер қойылмайды
   - CDN жүктелмесе (интернетсіз) fallback хабарлама көрсетіледі
   ============================================================ */
(function () {
  'use strict';
  const mapEl = document.getElementById('map');
  const fallback = document.getElementById('mapFallback');
  if (!mapEl) return;

  const EV_LABELS = {
    written: '🟢 Жазба дерек', archive: '🔵 Архив дерегі', oral: '🟡 Ауызша дерек',
    research: '🟠 Зерттеу материалы', reconstruction: '🟣 3D реконструкция', needs_data: '⚪ Дерек қажет'
  };
  const CAT_COLORS = {
    auyl: '#2ecc71', qorym: '#e8c47a', medrese: '#a855f7', mektep: '#3b82f6', tulga: '#f97316'
  };

  // Leaflet жүктелмесе — жоба бұзылмайды, түсіндірме шығарамыз
  const leafletOK = typeof L !== 'undefined';
  let map = null;
  if (leafletOK) {
    const CENTER = [43.7832, 51.0605]; // Ақшұқыр — бастапқы бағыт
    map = L.map(mapEl, { scrollWheelZoom: true }).setView(CENTER, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> қатысушылары'
    }).addTo(map);
  } else {
    mapEl.style.display = 'none';
    if (fallback) fallback.hidden = false;
  }

  function markerIcon(cat) {
    const color = CAT_COLORS[cat] || '#d9b36c';
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
             background:${color};border:2px solid #0b1526;box-shadow:0 4px 12px rgba(0,0,0,.5)"></div>`,
      iconSize: [22, 22], iconAnchor: [11, 22], popupAnchor: [0, -22]
    });
  }

  const markers = {}; // place_id -> marker
  const bounds = [];

  fetch('/api/places')
    .then(r => r.json())
    .then(places => {
      if (leafletOK) {
        places.forEach(p => {
          if (p.lat === null || p.lng === null) return; // координатасыз нүкте картада көрсетілмейді
          const ev = EV_LABELS[p.evidence] || EV_LABELS.needs_data;
          const srcLinks = (p.sources || []).map(sid =>
            `<a href="/derek-kozder#${sid}" style="color:#e8c47a">${sid}</a>`).join(' · ');
          const imgHtml = p.image
            ? `<img src="/static/${p.image}" alt="${p.name}" style="border-radius:8px;margin:8px 0;max-width:100%">`
            : `<div style="padding:10px;border:1px dashed rgba(232,196,122,.4);border-radius:8px;color:#9fb0c6;font-size:.8rem;margin:8px 0">Фото қосу қажет</div>`;
          const m = L.marker([p.lat, p.lng], { icon: markerIcon(p.category) })
            .addTo(map)
            .bindPopup(
              `<strong>${p.name}</strong><br>
               <span class="popup-ev">${ev}</span>
               ${imgHtml}
               <span style="font-size:.85rem;color:#c6d2e2">${p.summary}</span>
               ${srcLinks ? `<div style="margin-top:6px;font-size:.78rem">Дереккөз: ${srcLinks}</div>` : ''}`,
              { maxWidth: 300 }
            );
          m._cat = p.category;
          markers[p.id] = m;
          bounds.push([p.lat, p.lng]);
        });
        // Барлық маркер сыйатындай шекара (Ақшұқыр аймағына бағытталған)
        if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds).pad(0.2));
      }

      /* ---- Санат сүзгісі ---- */
      const filterBar = document.getElementById('mapFilters');
      if (filterBar) {
        filterBar.addEventListener('click', e => {
          const btn = e.target.closest('.filter-btn');
          if (!btn) return;
          filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const cat = btn.dataset.cat;
          // Маркерлер
          if (leafletOK) {
            Object.values(markers).forEach(m => {
              const show = cat === 'all' || m._cat === cat;
              if (show && !map.hasLayer(m)) m.addTo(map);
              if (!show && map.hasLayer(m)) map.removeLayer(m);
            });
          }
          // Тізім + карточкалар
          document.querySelectorAll('.place-item').forEach(el => {
            el.style.display = (cat === 'all' || el.dataset.cat === cat) ? '' : 'none';
          });
          document.querySelectorAll('.place-card').forEach(el => {
            el.style.display = (cat === 'all' || el.dataset.cat === cat) ? '' : 'none';
          });
        });
      }

      /* ---- Тізімнен басқанда ---- */
      document.querySelectorAll('.place-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.place;
          const m = markers[id];
          if (leafletOK && m) {
            map.flyTo(m.getLatLng(), 15, { duration: 1 });
            setTimeout(() => m.openPopup(), 1000);
          } else {
            // Координатасыз нүкте — ақпараттық карточкасына скролл
            const card = document.getElementById('card-' + id);
            if (card) {
              card.scrollIntoView({ behavior: 'smooth', block: 'center' });
              card.style.borderColor = 'var(--gold)';
              setTimeout(() => { card.style.borderColor = ''; }, 2000);
            }
          }
        });
      });
    })
    .catch(() => {
      if (mapEl) mapEl.style.display = 'none';
      if (fallback) fallback.hidden = false;
    });
})();
