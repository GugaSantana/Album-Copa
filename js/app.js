// ============================================================
//  APP — main entry point, state management, auth wiring
// ============================================================

// ── GLOBAL STATE ─────────────────────────────────────────────
window.AppState = {
  uid:     null,
  profile: null,
};

// ── SHOW TOAST ───────────────────────────────────────────────
window.showToast = (function() {
  let timer = null;
  return function(message, durationMs = 2800) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.remove('hidden');
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => el.classList.add('hidden'), durationMs);
  };
})();

// ── GENERATE STARS IN AUTH BG ────────────────────────────────
function generateStars() {
  const container = document.getElementById('stars');
  if (!container) return;
  for (let i = 0; i < 60; i++) {
    const star = document.createElement('div');
    const size = Math.random() * 2 + 1;
    star.className = 'star';
    star.style.cssText = `
      width:  ${size}px;
      height: ${size}px;
      top:    ${Math.random() * 100}%;
      left:   ${Math.random() * 100}%;
      --duration: ${1.5 + Math.random() * 3}s;
      --delay:    ${Math.random() * 4}s;
    `;
    container.appendChild(star);
  }
}

// ── REFRESH HOME STATS ───────────────────────────────────────
window.App = {
  refreshHomeStats
};

function refreshHomeStats() {
  const profile = window.AppState.profile;
  if (!profile) return;

  const fmt = n => (n || 0).toFixed(2).replace('.', ',');

  document.getElementById('home-username').textContent  = profile.username || 'jogador';
  document.getElementById('stat-balance').textContent   = fmt(profile.balance);
  document.getElementById('stat-packs').textContent     = profile.packsOpened    || 0;
  document.getElementById('stat-spent').textContent     = fmt(profile.totalSpent);
  document.getElementById('stat-trades').textContent    = profile.tradesCompleted || 0;
  document.getElementById('home-pending').textContent   = profile.pendingPacks    || 0;

  // Total stickers in collection
  const col        = profile.collection || {};
  const totalInCol = Object.values(col).reduce((s, v) => s + v, 0);
  document.getElementById('stat-collection-total').textContent = totalInCol;

  // Album progress
  const alb       = profile.album      || {};
  const pasted    = Object.values(alb).filter(Boolean).length;
  const total     = window.TOTAL_STICKERS;
  const pct       = total > 0 ? Math.round((pasted / total) * 100) : 0;

  document.getElementById('stat-album-count').textContent  = pasted;
  document.getElementById('stat-album-total').textContent  = total;
  document.getElementById('album-progress-pct').textContent = pct + '%';
  document.getElementById('album-progress-bar').style.width = pct + '%';
}

// ── ON PROFILE CHANGE (Firestore real-time) ──────────────────
let profileUnsubscribe = null;

function subscribeToProfile(uid) {
  if (profileUnsubscribe) profileUnsubscribe();
  profileUnsubscribe = DB.onProfileChange(uid, profile => {
    window.AppState.profile = profile;
    refreshHomeStats();

    // Refresh active view stats without resetting animations.
    const activeView = document.querySelector('.app-view.active');
    if (activeView) {
      const viewId = activeView.id.replace('-view', '');
      if (viewId === 'shop') {
        Shop.render();
      } else if (viewId === 'pack') {
        // Update counters only — do NOT call renderIdle() to avoid resetting reveal state
        const el = document.getElementById('packs-opened-count');
        const av = document.getElementById('pack-available');
        if (el) el.textContent = profile.packsOpened  || 0;
        if (av) av.textContent = profile.pendingPacks || 0;
      }
    }
  });
}

// ── AUTH STATE CHANGE ────────────────────────────────────────

Auth.onAuthChange(async user => {
  if (user) {
    // Logged in
    window.AppState.uid = user.uid;

    // Show app, hide auth
    document.getElementById('auth-view').classList.remove('active');
    document.getElementById('app').classList.remove('hidden');

    // Start real-time profile listener
    subscribeToProfile(user.uid);

    // Navigate to home
    navigate('home');

  } else {
    // Logged out
    window.AppState.uid     = null;
    window.AppState.profile = null;
    if (profileUnsubscribe) profileUnsubscribe();

    document.getElementById('app').classList.add('hidden');
    document.getElementById('auth-view').classList.add('active');
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
  }
});

// ── INIT ─────────────────────────────────────────────────────

function init() {
  if (!window.FIREBASE_CONFIGURED) {
    const errEl = document.getElementById('login-error');
    if (errEl) errEl.textContent = '⚠️ Configure o Firebase em js/firebase-config.js antes de usar.';
  }

  generateStars();
  Admin.init();
  Shop.init();
  PackOpening.init();
  Collection.init();
  Album.init();
  Trades.init();

  // Register home hook
  registerViewHook('home',       refreshHomeStats);
  registerViewHook('collection', () => { Collection.render(); Trades.refreshBadge(); });

  // ── ADMIN SECRET TRIGGER ─────────────────────────────────────
  // Clique 7× rápido no título do home para abrir o painel admin
  let clickCount = 0;
  let clickTimer = null;
  const brand = document.querySelector('.header-brand');
  if (brand) {
    brand.addEventListener('click', () => {
      clickCount++;
      clearTimeout(clickTimer);
      if (clickCount >= 7) {
        clickCount = 0;
        if (Admin.isUnlocked()) {
          Admin.open();
        } else {
          Admin.unlock();
        }
        return;
      }
      clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
    });
  }

  // Start on home view if already logged in (handled by onAuthChange)
}

init();
