// ============================================================
//  ALBUM — sticker album pages & paste logic
// ============================================================

window.Album = (() => {

  // ── RENDER ──────────────────────────────────────────────────

  function render() {
    const profile = window.AppState.profile;
    const col     = (profile || {}).collection || {};
    const alb     = (profile || {}).album      || {};

    const container = document.getElementById('album-content');
    container.innerHTML = '';

    const teamNames = window.getTeamNames();

    teamNames.forEach(teamName => {
      const stickers = window.getStickersByTeam(teamName);

      const pasted  = stickers.filter(s => alb[s.id]).length;
      const section = document.createElement('div');
      section.className = 'team-section';
      section.id = `album-section-${teamName.replace(/\s/g, '_')}`;

      section.innerHTML = `
        <div class="team-header">
          <span class="team-name-text">${teamName.toUpperCase()}</span>
          <span class="team-progress-text">${pasted}/${stickers.length}</span>
        </div>
        <div class="album-grid" id="album-grid-${teamName.replace(/\s/g,'_')}"></div>
      `;

      container.appendChild(section);

      const grid = section.querySelector('.album-grid');
      stickers.forEach(sticker => {
        const inAlbum = !!(alb[sticker.id]);
        const owned   = (col[sticker.id] || 0) > 0;
        grid.appendChild(createSlot(sticker, inAlbum, owned));
      });
    });

    buildFilters(teamNames);
  }

  function createSlot(sticker, inAlbum, owned) {
    const slot = document.createElement('div');
    slot.className = 'album-slot';
    slot.dataset.stickerId = sticker.id;

    if (inAlbum) {
      slot.classList.add('filled');
      slot.innerHTML = `<img src="${sticker.image}" alt="${sticker.name}" loading="lazy">`;
    } else if (owned) {
      slot.classList.add('can-paste');
      slot.innerHTML = `
        <span class="slot-number">${sticker.id}</span>
        <span class="slot-name">${sticker.name}</span>
        <span class="slot-hint">Colar</span>
      `;
      slot.addEventListener('click', () => handlePaste(sticker.id, slot, sticker));
    } else {
      slot.innerHTML = `
        <span class="slot-number">${sticker.id}</span>
        <span class="slot-name">${sticker.name}</span>
      `;
    }

    return slot;
  }

  // ── FILTERS ──────────────────────────────────────────────────

  function buildFilters(teamNames) {
    const container = document.getElementById('album-filters');
    container.innerHTML = '';
    teamNames.forEach(team => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.textContent = team;
      btn.addEventListener('click', () => {
        const section = document.getElementById(`album-section-${team.replace(/\s/g, '_')}`);
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      container.appendChild(btn);
    });
  }

  // ── PASTE ───────────────────────────────────────────────────

  async function handlePaste(stickerId, slotEl, sticker) {
    const uid = window.AppState.uid;
    try {
      await DB.pasteSticker(uid, stickerId);

      // Animate: replace slot content with sticker image
      slotEl.classList.remove('can-paste');
      slotEl.classList.add('filled', 'just-pasted');
      slotEl.innerHTML = `<img src="${sticker.image}" alt="${sticker.name}" loading="lazy">`;
      slotEl.style.cursor = 'default';
      setTimeout(() => slotEl.classList.remove('just-pasted'), 600);

      showToast('📌 Figurinha colada!');

      // Update home progress
      App.refreshHomeStats();
    } catch (err) {
      showToast(err.message);
    }
  }

  // ── AUTO-PASTE ───────────────────────────────────────────────

  async function handleAutoPaste() {
    const uid = window.AppState.uid;
    try {
      const count = await DB.autoPaste(uid);
      if (count === 0) {
        showToast('Nenhuma figurinha nova para colar!');
      } else {
        showToast(`✅ ${count} figurinha(s) colada(s) automaticamente!`);
      }
    } catch (err) {
      showToast('Erro: ' + err.message);
    }
  }

  // ── INIT ────────────────────────────────────────────────────

  function init() {
    document.getElementById('autofill-btn').addEventListener('click', handleAutoPaste);
    registerViewHook('album', render);

    // Back-to-top button
    const scrollEl = document.getElementById('album-scroll');
    const backTopBtn = document.getElementById('album-back-top');
    scrollEl.addEventListener('scroll', () => {
      backTopBtn.classList.toggle('visible', scrollEl.scrollTop > 200);
    });
    backTopBtn.addEventListener('click', () => {
      scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  return { init, render };
})();
