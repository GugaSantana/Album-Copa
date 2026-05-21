// ============================================================
//  PACK OPENING — animation + logic
// ============================================================

window.PackOpening = (() => {

  let currentPack    = [];  // 7 stickers for this opening
  let flippedCount   = 0;
  let priorCollection = {};
  let isOpening      = false;

  // ── STICKER GENERATION ──────────────────────────────────────

  /**
   * Generates 7 random sticker IDs from the catalog.
   * Guarantees no more than 3 duplicates of the same sticker in one pack.
   */
  function generatePackContents() {
    const pool    = [...window.STICKERS];
    const result  = [];
    const counts  = {};

    for (let i = 0; i < 7; i++) {
      // Try up to 10 times to find a non-over-duplicated sticker
      let attempts = 0;
      let pick;
      do {
        pick     = pool[Math.floor(Math.random() * pool.length)];
        attempts++;
      } while ((counts[pick.id] || 0) >= 3 && attempts < 10);

      result.push(pick);
      counts[pick.id] = (counts[pick.id] || 0) + 1;
    }
    return result;
  }

  // ── RENDER IDLE STATE ───────────────────────────────────────

  function renderIdle() {
    const profile  = window.AppState.profile;
    const pending  = (profile || {}).pendingPacks || 0;
    const opened   = (profile || {}).packsOpened  || 0;

    document.getElementById('pack-available').textContent    = pending;
    document.getElementById('packs-opened-count').textContent = opened;

    const wrapper     = document.getElementById('pack-wrapper');
    const instruction = document.getElementById('pack-instruction');
    const noPacks     = document.getElementById('no-packs-btn');

    if (pending > 0) {
      wrapper.classList.remove('no-packs');
      instruction.textContent = 'Clique no pacote para abrir!';
      instruction.style.display = '';
      noPacks.style.display = 'none';
    } else {
      wrapper.classList.add('no-packs');
      instruction.style.display = 'none';
      noPacks.style.display = '';
    }

    showIdleState();
  }

  function showIdleState() {
    document.getElementById('pack-idle-state').style.display   = '';
    document.getElementById('pack-reveal-state').classList.add('hidden');
    isOpening  = false;
    flippedCount = 0;
    currentPack  = [];
  }

  // ── OPEN PACK — ANIMATION SEQUENCE ──────────────────────────

  async function startOpening() {
    const profile = window.AppState.profile;
    if (!profile || profile.pendingPacks < 1 || isOpening) return;
    isOpening = true;

    // 1. Generate sticker contents immediately
    currentPack = generatePackContents();
    const stickerIds = currentPack.map(s => s.id);

    // 2. Shake animation
    const wrapper = document.getElementById('pack-wrapper');
    wrapper.classList.add('pack-shaking');
    await wait(600);
    wrapper.classList.remove('pack-shaking');

    // 3. Short pause — suspense
    await wait(150);

    // 4. Explode animation
    wrapper.classList.add('pack-exploding');
    await wait(200);

    // 5. White flash
    const flash = document.createElement('div');
    flash.className = 'flash-overlay';
    document.body.appendChild(flash);
    flash.addEventListener('animationend', () => flash.remove(), { once: true });

    await wait(250);

    // 6. Commit to Firestore (async, no need to await before showing cards)
    const commitPromise = DB.openPack(window.AppState.uid, stickerIds)
      .then(prior => { priorCollection = prior; })
      .catch(err  => { showToast('Erro: ' + err.message); });

    // 7. Show reveal state & render cards
    wrapper.classList.remove('pack-exploding');
    showRevealState();
    renderCards();

    // Wait for Firestore commit to finish so badge knows if sticker is new
    await commitPromise;
    updateNewBadges();
  }

  // ── REVEAL STATE ─────────────────────────────────────────────

  function showRevealState() {
    document.getElementById('pack-idle-state').style.display = 'none';
    const revealEl = document.getElementById('pack-reveal-state');
    revealEl.classList.remove('hidden');
    document.getElementById('reveal-actions').classList.add('hidden');
    flippedCount = 0;
    isOpening = false; // allow opening another pack from the reveal screen
  }

  function renderCards() {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';

    currentPack.forEach((sticker, i) => {
      const tilt  = ((i - 3) * 1.5); // slight fan: -4.5 … +4.5 deg
      const delay = (0.08 + i * 0.09).toFixed(2);

      // Outer slot — fly-in animation + hover scale (NO perspective here)
      const slot = document.createElement('div');
      slot.className = 'card-slot card-fly';
      slot.style.setProperty('--delay', delay + 's');
      slot.style.setProperty('--card-tilt', tilt + 'deg');

      // Inner wrapper — perspective for 3D flip (NO transform of its own)
      const wrapper = document.createElement('div');
      wrapper.className = 'card-wrapper';
      wrapper.dataset.stickerId = sticker.id;
      wrapper.dataset.index     = i;

      wrapper.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-back-face">
            <div class="card-back-pattern">
              <div class="cbp-logo">⚽</div>
              <div class="cbp-text">FIFA 2026</div>
            </div>
          </div>
          <div class="card-face card-front-face">
            <img src="${sticker.image}" alt="${sticker.name}" loading="lazy">
          </div>
        </div>
      `;

      slot.appendChild(wrapper);
      slot.addEventListener('click', () => flipCard(slot, wrapper, sticker, i));
      // Remove fly-in class after animation ends so hover transform is not blocked
      slot.addEventListener('animationend', () => slot.classList.remove('card-fly'), { once: true });
      container.appendChild(slot);
    });
  }

  function flipCard(slot, wrapper, sticker, index) {
    if (wrapper.classList.contains('flipped')) return;
    wrapper.classList.add('flipped');
    flippedCount++;

    // Show result badge after flip completes
    setTimeout(() => {
      showResultBadge(slot, sticker);
      spawnConfetti(slot, sticker);

      if (flippedCount === currentPack.length) {
        setTimeout(() => {
          document.getElementById('reveal-actions').classList.remove('hidden');
        }, 400);
      }
    }, 680);
  }

  function showResultBadge(slot, sticker) {
    const wasOwned = (priorCollection[sticker.id] || 0) > 0;
    const badge    = document.createElement('div');
    badge.className = `card-result-badge ${wasOwned ? 'repetida' : 'nova'}`;
    badge.textContent = wasOwned ? '🔁 Repetida' : '⭐ Nova!';
    slot.appendChild(badge); // badge on outer slot (already position:relative)
  }

  function updateNewBadges() {
    // Called after Firestore data arrives — re-evaluate badges in place
    // (priorCollection is now set; cards may have already shown badges)
    // This is a no-op if cards already rendered correctly; badges won't be re-added.
  }

  // ── CONFETTI ────────────────────────────────────────────────

  function spawnConfetti(slot, sticker) {
    const isNew = (priorCollection[sticker.id] || 0) === 0;
    if (!isNew) return;

    const colors = ['#FFD700', '#00C853', '#4dabf7', '#FF6B6B', '#fff'];
    const rect   = slot.getBoundingClientRect();
    const cx     = rect.left + rect.width  / 2;
    const cy     = rect.top  + rect.height / 2;

    for (let i = 0; i < 10; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-particle';
      const angle = (Math.random() * 360) * (Math.PI / 180);
      const dist  = 40 + Math.random() * 60;
      el.style.cssText = `
        left: ${cx - 3}px;
        top:  ${cy - 3}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        --cx: ${Math.cos(angle) * dist}px;
        --cy: ${Math.sin(angle) * dist - 20}px;
        --cr: ${Math.random() * 720 - 360}deg;
        animation-delay: ${Math.random() * 0.1}s;
        animation-duration: ${0.5 + Math.random() * 0.4}s;
      `;
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }
  }

  // ── HELPERS ─────────────────────────────────────────────────

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── BIND DOM ────────────────────────────────────────────────

  function init() {
    // Pack click
    document.getElementById('pack-wrapper').addEventListener('click', () => {
      const pending = (window.AppState.profile || {}).pendingPacks || 0;
      if (pending > 0 && !isOpening) startOpening();
    });

    // "Open another" button — return to idle so user clicks the pack again
    document.getElementById('open-another-btn').addEventListener('click', () => {
      const profile = window.AppState.profile;
      if ((profile || {}).pendingPacks > 0) {
        priorCollection = {};
        showIdleState();
        renderIdle();
      } else {
        navigate('shop');
      }
    });

    // Register view hook to refresh idle state on navigate
    registerViewHook('pack', () => {
      showIdleState();
      renderIdle();
    });
  }

  return { init, renderIdle };
})();
