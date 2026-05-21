// ============================================================
//  COLLECTION — gallery of all owned stickers
// ============================================================

window.Collection = (() => {

  let activeFilter = 'all';
  let currentModalStickerId = null;

  // ── RENDER ──────────────────────────────────────────────────

  function render() {
    const profile = window.AppState.profile;
    const col     = (profile || {}).collection || {};
    const alb     = (profile || {}).album      || {};

    // Count unique stickers owned
    const ownedIds  = Object.keys(col).filter(id => col[id] > 0);
    const totalQty  = Object.values(col).reduce((s, v) => s + v, 0);
    document.getElementById('collection-count-badge').textContent = `${totalQty} fig.`;

    // Filter stickers
    const ownedTeams = [...new Set(
      window.STICKERS.filter(s => ownedIds.includes(s.id)).map(s => s.team)
    )];

    // If active filter no longer has stickers, reset to 'all'
    if (activeFilter !== 'all' && !ownedTeams.includes(activeFilter)) {
      activeFilter = 'all';
    }

    buildFilters(ownedTeams);

    let stickers = window.STICKERS.filter(s => ownedIds.includes(s.id));
    if (activeFilter !== 'all') {
      stickers = stickers.filter(s => s.team === activeFilter);
    }

    const grid = document.getElementById('collection-grid');
    grid.innerHTML = '';

    if (stickers.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <p>Abra seus primeiros pacotes<br>para ver suas figurinhas aqui!</p>
          <button class="btn btn-primary" onclick="navigate('shop')">Ir para a Loja</button>
        </div>`;
      return;
    }

    stickers.forEach(sticker => {
      const qty      = col[sticker.id] || 0;
      const inAlbum  = alb[sticker.id] || false;
      const card     = createStickerCard(sticker, qty, inAlbum);
      grid.appendChild(card);
    });
  }

  function createStickerCard(sticker, qty, inAlbum) {
    const div = document.createElement('div');
    div.className = 'sticker-card';

    div.innerHTML = `
      <img src="${sticker.image}" alt="${sticker.name}" loading="lazy">
      ${qty > 1 ? `<div class="sticker-qty-badge">x${qty}</div>` : ''}
      ${inAlbum  ? `<div class="sticker-in-album-badge">📌 Colada</div>` : ''}
    `;

    div.addEventListener('click', () => openModal(sticker));
    return div;
  }

  // ── FILTER BUTTONS ──────────────────────────────────────────

  function buildFilters(ownedTeams) {
    const container = document.getElementById('collection-filters');
    container.innerHTML = '';

    const makeBtn = (label, team) => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn' + (activeFilter === team ? ' active' : '');
      btn.dataset.team = team;
      btn.textContent = label;
      btn.addEventListener('click', () => {
        activeFilter = team;
        render();
      });
      return btn;
    };

    container.appendChild(makeBtn('Todas', 'all'));
    ownedTeams.forEach(team => container.appendChild(makeBtn(team, team)));
  }

  // ── MODAL ────────────────────────────────────────────────────

  function openModal(sticker) {
    const profile   = window.AppState.profile;
    const col       = (profile || {}).collection || {};
    const alb       = (profile || {}).album      || {};
    const qty       = col[sticker.id] || 0;
    const inAlbum   = alb[sticker.id] || false;

    currentModalStickerId = sticker.id;

    document.getElementById('modal-sticker-img').src           = sticker.image;
    document.getElementById('modal-sticker-name').textContent  = sticker.name;
    document.getElementById('modal-sticker-team').textContent  = `${sticker.flag || ''} ${sticker.team} — #${sticker.number}`;
    document.getElementById('modal-qty-badge').textContent     = `x${qty}`;
    document.getElementById('modal-album-status').textContent  = inAlbum ? '📌 Já colada no álbum' : '';

    const pasteBtn = document.getElementById('modal-paste-btn');
    pasteBtn.disabled   = inAlbum;
    pasteBtn.textContent = inAlbum ? '✅ Já está no álbum' : '📌 Colar no Álbum';

    document.getElementById('sticker-modal').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('sticker-modal').classList.add('hidden');
    currentModalStickerId = null;
  }

  async function handleModalPaste() {
    if (!currentModalStickerId) return;
    const uid = window.AppState.uid;
    try {
      await DB.pasteSticker(uid, currentModalStickerId);
      showToast('📌 Figurinha colada no álbum!');
      closeModal();
      render();
      Album.render();
    } catch (err) {
      showToast(err.message);
    }
  }

  // ── INIT ────────────────────────────────────────────────────

  function init() {
    // Modal close
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-backdrop').addEventListener('click', closeModal);

    // Modal paste
    document.getElementById('modal-paste-btn').addEventListener('click', handleModalPaste);

    registerViewHook('collection', render);
  }

  return { init, render, openModal };
})();
