// ============================================================
//  ADMIN — painel de administração
//  Acesso: clique 7× rápido no título do home ("🏆 Álbum Copa 2026")
//  Senha: definida em ADMIN_PASSWORD abaixo
// ============================================================

window.Admin = (() => {

  // ─── MUDE AQUI PARA ALTERAR A SENHA ADMIN ───────────────────
  const ADMIN_PASSWORD = 'Copa2026@';
  // ─────────────────────────────────────────────────────────────

  const SESSION_KEY = 'admin_unlocked';

  function isUnlocked() {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  }

  function unlock() {
    const pwd = prompt('🔐 Senha do administrador:');
    if (pwd === null) return; // cancelou
    if (pwd === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      open();
      window.showToast('✅ Acesso admin liberado!', 2000);
    } else {
      window.showToast('❌ Senha incorreta', 2500);
    }
  }

  function open() {
    if (!isUnlocked()) { unlock(); return; }
    const overlay = document.getElementById('admin-overlay');
    overlay.classList.remove('hidden');
    loadUsers();
  }

  function close() {
    document.getElementById('admin-overlay').classList.add('hidden');
  }

  // ── LOAD ALL USERS ──────────────────────────────────────────

  async function loadUsers() {
    const loading = document.getElementById('admin-loading');
    const list    = document.getElementById('admin-user-list');
    loading.classList.remove('hidden');
    list.innerHTML = '';

    try {
      const users = await DB.getAllUsers();

      if (users.length === 0) {
        list.innerHTML = '<p class="admin-empty">Nenhum usuário cadastrado.</p>';
        loading.classList.add('hidden');
        return;
      }

      // Sort by username
      users.sort((a, b) => (a.username || '').localeCompare(b.username || ''));

      users.forEach(user => {
        const col       = user.collection || {};
        const alb       = user.album      || {};
        const ownedQty  = Object.values(col).reduce((s, n) => s + n, 0);
        const uniqueOwn = Object.values(col).filter(n => n > 0).length;
        const pasted    = Object.values(alb).filter(Boolean).length;
        const total     = window.TOTAL_STICKERS;
        const pct       = total > 0 ? Math.round((pasted / total) * 100) : 0;
        const fmt       = n => (n || 0).toFixed(2).replace('.', ',');
        const createdAt = user.createdAt
          ? new Date(user.createdAt.seconds * 1000).toLocaleDateString('pt-BR')
          : '—';

        const card = document.createElement('div');
        card.className = 'admin-user-card';
        card.innerHTML = `
          <div class="admin-user-top">
            <div class="admin-user-avatar">${(user.username || '?')[0].toUpperCase()}</div>
            <div class="admin-user-info">
              <div class="admin-user-name">${user.username || user.uid}</div>
              <div class="admin-user-since">Desde ${createdAt}</div>
            </div>
            <button class="admin-fill-btn" data-uid="${user.uid}" data-name="${user.username}">
              📋 Preencher
            </button>
            <button class="admin-reset-btn" data-uid="${user.uid}" data-name="${user.username}">
              🗑️ Resetar
            </button>
          </div>
          <div class="admin-stats-row">
            <div class="admin-stat">
              <div class="admin-stat-val">R$${fmt(user.balance)}</div>
              <div class="admin-stat-lbl">Saldo</div>
            </div>
            <div class="admin-stat">
              <div class="admin-stat-val">${user.packsOpened || 0}</div>
              <div class="admin-stat-lbl">Pacotes</div>
            </div>
            <div class="admin-stat">
              <div class="admin-stat-val">${uniqueOwn}</div>
              <div class="admin-stat-lbl">Fig. únicas</div>
            </div>
            <div class="admin-stat">
              <div class="admin-stat-val">${ownedQty}</div>
              <div class="admin-stat-lbl">Fig. total</div>
            </div>
            <div class="admin-stat">
              <div class="admin-stat-val">${pasted}/${total}</div>
              <div class="admin-stat-lbl">Coladas</div>
            </div>
            <div class="admin-stat">
              <div class="admin-stat-val">R$${fmt(user.totalSpent)}</div>
              <div class="admin-stat-lbl">Gasto</div>
            </div>
          </div>
          <div class="admin-progress-row">
            <div class="admin-progress-track">
              <div class="admin-progress-fill" style="width:${pct}%"></div>
            </div>
            <span class="admin-progress-pct">${pct}%</span>
          </div>
        `;

        // Fill album button handler
        card.querySelector('.admin-fill-btn').addEventListener('click', () => fillAlbum(user.uid, user.username));

        // Reset button handler
        card.querySelector('.admin-reset-btn').addEventListener('click', () => resetUser(user.uid, user.username));

        list.appendChild(card);
      });

    } catch (err) {
      list.innerHTML = `<p class="admin-empty" style="color:#ff6b6b;">Erro ao carregar: ${err.message}</p>`;
    }

    loading.classList.add('hidden');
  }
  async function fillAlbum(uid, username) {
    const confirmed = confirm(`Preencher o álbum completo de "${username}"?\n\nTodas as figurinhas serão adicionadas à coleção e coladas no álbum.`);
    if (!confirmed) return;
    try {
      await DB.fillUserAlbum(uid);
      window.showToast(`✅ Álbum de "${username}" preenchido!`, 3000);
      loadUsers();
    } catch (err) {
      window.showToast(`❌ Erro: ${err.message}`, 3500);
    }
  }
  // ── RESET USER ──────────────────────────────────────────────

  async function resetUser(uid, username) {
    const confirmed = confirm(
      `⚠️ Resetar a conta de "${username}"?\n\nIsso irá remover TODAS as figurinhas, álbum e pacotes pendentes. O saldo será mantido.\n\nEssa ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    try {
      await DB.resetUserAccount(uid);
      window.showToast(`✅ Conta de "${username}" resetada!`, 3000);
      loadUsers(); // Reload list
    } catch (err) {
      window.showToast(`❌ Erro ao resetar: ${err.message}`, 3500);
    }
  }

  // ── INIT ────────────────────────────────────────────────────

  function init() {
    document.getElementById('admin-close-btn').addEventListener('click', close);

    // Close on backdrop click
    document.getElementById('admin-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('admin-overlay')) close();
    });
  }

  return { init, open, unlock, isUnlocked };

})();
