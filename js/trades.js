// ============================================================
//  TRADES — sticker trading system
// ============================================================

window.Trades = (() => {

  let activeTab            = 'pending';
  let selectedUser         = null;   // { uid, username }
  let selectedMyStickers   = [];     // array of sticker IDs
  let selectedTheirStickers = [];    // array of sticker IDs

  // ── OPEN / CLOSE ─────────────────────────────────────────────

  function open() {
    document.getElementById('trades-overlay').classList.remove('hidden');
    loadTab('pending');
  }

  function close() {
    document.getElementById('trades-overlay').classList.add('hidden');
    _resetPropose();
  }

  function _resetPropose() {
    selectedUser          = null;
    selectedMyStickers    = [];
    selectedTheirStickers = [];
    const form = document.getElementById('trades-propose-form');
    const list = document.getElementById('trades-user-list');
    if (form) form.classList.add('hidden');
    if (list) list.classList.remove('hidden');
  }

  // ── TABS ─────────────────────────────────────────────────────

  function loadTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.trades-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === tab)
    );
    document.getElementById('trades-tab-pending').classList.toggle('hidden', tab !== 'pending');
    document.getElementById('trades-tab-search').classList.toggle('hidden', tab !== 'search');
    if (tab === 'pending') _loadPending();
    else                   _loadSearch();
  }

  // ── PENDING TAB ──────────────────────────────────────────────

  async function _loadPending() {
    const uid    = window.AppState.uid;
    const recEl  = document.getElementById('trades-received-section');
    const sentEl = document.getElementById('trades-sent-section');
    recEl.innerHTML  = '<p class="trades-loading">Carregando…</p>';
    sentEl.innerHTML = '';

    try {
      const { sent, received, resolved } = await DB.getUserTrades(uid);
      _updateBadge(received.length + resolved.length);

      recEl.innerHTML = '<div class="trades-section-title">📬 Propostas recebidas</div>';
      if (received.length === 0) {
        recEl.innerHTML += '<p class="trades-empty">Nenhuma proposta recebida ainda.</p>';
      } else {
        received.forEach(trade => _renderTradeCard(recEl, trade, 'received'));
      }

      sentEl.innerHTML = '<div class="trades-section-title">📤 Propostas enviadas</div>';
      if (sent.length === 0) {
        sentEl.innerHTML += '<p class="trades-empty">Nenhuma proposta enviada ainda.</p>';
      } else {
        sent.forEach(trade => _renderTradeCard(sentEl, trade, 'sent'));
      }

      // Resolved notifications (only visible to proposer until dismissed)
      if (resolved.length > 0) {
        sentEl.innerHTML += '<div class="trades-section-title">🔔 Resultado das suas propostas</div>';
        resolved.forEach(trade => _renderResolvedCard(sentEl, trade));
      }
    } catch (err) {
      recEl.innerHTML = `<p class="trades-error">Erro ao carregar trocas: ${err.message}</p>`;
    }
  }

  function _renderTradeCard(container, trade, direction) {
    const isSent = direction === 'sent';
    // Support both new (arrays) and old (single string) format
    const giveIds    = isSent
      ? (trade.fromStickers || (trade.fromSticker ? [trade.fromSticker] : []))
      : (trade.toStickers   || (trade.toSticker   ? [trade.toSticker]   : []));
    const receiveIds = isSent
      ? (trade.toStickers   || (trade.toSticker   ? [trade.toSticker]   : []))
      : (trade.fromStickers || (trade.fromSticker ? [trade.fromSticker] : []));
    const partnerName = isSent ? trade.toUsername : trade.fromUsername;
    if (!giveIds.length || !receiveIds.length) return;

    const renderThumbs = ids => ids.map(id => {
      const s = window.getStickerById(id);
      if (!s) return '';
      return `<div class="trade-thumb">
        <img src="${s.image}" alt="${s.id}" loading="lazy">
        <span>${s.id}</span>
      </div>`;
    }).join('');

    const card = document.createElement('div');
    card.className = 'trade-card';
    card.innerHTML = `
      <div class="trade-card-partner">${isSent ? '→ Para' : '← De'}: <strong>${partnerName}</strong></div>
      ${trade.message ? `<div class="trade-message-bubble ${isSent ? 'sent' : 'received'}">"💬 ${trade.message}"</div>` : ''}
      <div class="trade-multi-pair">
        <div class="trade-multi-side">
          <div class="trade-side-label">Você dá (${giveIds.length})</div>
          <div class="trade-thumbs-row">${renderThumbs(giveIds)}</div>
        </div>
        <div class="trade-pair-arrow">⇄</div>
        <div class="trade-multi-side">
          <div class="trade-side-label">Você recebe (${receiveIds.length})</div>
          <div class="trade-thumbs-row">${renderThumbs(receiveIds)}</div>
        </div>
      </div>
      <div class="trade-card-actions">
        ${isSent
          ? `<button class="btn btn-sm btn-danger" data-action="cancel"  data-trade-id="${trade.id}">🗑 Cancelar</button>`
          : `<button class="btn btn-sm btn-primary" data-action="accept"  data-trade-id="${trade.id}">✅ Aceitar</button>
             <button class="btn btn-sm btn-danger"  data-action="decline" data-trade-id="${trade.id}">❌ Recusar</button>`
        }
      </div>
    `;
    container.appendChild(card);
  }

  function _renderResolvedCard(container, trade) {
    const accepted = trade.status === 'accepted';
    const giveIds    = trade.fromStickers || (trade.fromSticker ? [trade.fromSticker] : []);
    const receiveIds = trade.toStickers   || (trade.toSticker   ? [trade.toSticker]   : []);

    const renderThumbs = ids => ids.map(id => {
      const s = window.getStickerById(id);
      if (!s) return '';
      return `<div class="trade-thumb">
        <img src="${s.image}" alt="${s.id}" loading="lazy">
        <span>${s.id}</span>
      </div>`;
    }).join('');

    const card = document.createElement('div');
    card.className = `trade-card trade-resolved-${accepted ? 'accepted' : 'declined'}`;
    card.innerHTML = `
      <div class="trade-resolved-header">
        ${accepted
          ? '✅ <strong>Aceita!</strong> — ' + trade.toUsername + ' aceitou sua proposta'
          : '❌ <strong>Recusada</strong> — ' + trade.toUsername + ' recusou sua proposta'
        }
      </div>
      ${trade.message ? `<div class="trade-message-bubble sent">"💬 ${trade.message}"</div>` : ''}
      <div class="trade-multi-pair">
        <div class="trade-multi-side">
          <div class="trade-side-label">Você deu (${giveIds.length})</div>
          <div class="trade-thumbs-row">${renderThumbs(giveIds)}</div>
        </div>
        <div class="trade-pair-arrow">⇄</div>
        <div class="trade-multi-side">
          <div class="trade-side-label">Você ${accepted ? 'recebeu' : 'pediria'} (${receiveIds.length})</div>
          <div class="trade-thumbs-row">${renderThumbs(receiveIds)}</div>
        </div>
      </div>
      <div class="trade-card-actions">
        <button class="btn btn-sm btn-secondary" data-action="seen" data-trade-id="${trade.id}">✓ Ciente</button>
      </div>
    `;
    container.appendChild(card);
  }

  // ── SEARCH TAB ───────────────────────────────────────────────

  async function _loadSearch() {
    _resetPropose();
    const listEl = document.getElementById('trades-user-list');
    listEl.innerHTML = '<p class="trades-loading">Buscando jogadores…</p>';

    try {
      const uid    = window.AppState.uid;
      const myCol  = (window.AppState.profile || {}).collection || {};
      const myAlb  = (window.AppState.profile || {}).album      || {};
      const users  = await DB.getAllUsers();
      const others = users.filter(u => u.uid !== uid);

      const myRepeated = Object.keys(myCol).filter(id => myCol[id] >= 2);
      const myNeeded   = window.STICKERS
        .filter(s => !s.exclusive && !myAlb[s.id])
        .map(s => s.id);

      listEl.innerHTML = '';

      if (others.length === 0) {
        listEl.innerHTML = '<p class="trades-empty">Nenhum outro jogador no sistema ainda!</p>';
        return;
      }

      // Sort: best mutual match first
      others.sort((a, b) =>
        _calcMatches(b, myRepeated, myNeeded) - _calcMatches(a, myRepeated, myNeeded)
      );

      others.forEach(user => {
        const theirCol      = user.collection || {};
        const theirRepeated = Object.keys(theirCol).filter(id => theirCol[id] >= 2);
        const matches       = _calcMatches(user, myRepeated, myNeeded);
        const noRepeats     = myRepeated.length === 0 || theirRepeated.length === 0;

        const item = document.createElement('div');
        item.className = 'trade-user-item';
        item.innerHTML = `
          <div class="trade-user-info">
            <div class="trade-user-name">👤 ${user.username}</div>
            <div class="trade-user-stats">
              ${theirRepeated.length} repetidas
              ${matches > 0 ? `• <span class="trade-match-count">🔥 ${matches} combinações</span>` : ''}
            </div>
          </div>
          <button class="btn btn-primary btn-sm trade-propose-btn"
                  data-uid="${user.uid}"
                  data-username="${user.username}"
                  ${noRepeats ? 'disabled title="Sem figurinhas repetidas para trocar"' : ''}>
            Trocar →
          </button>
        `;
        listEl.appendChild(item);
      });
    } catch (err) {
      listEl.innerHTML = `<p class="trades-error">Erro: ${err.message}</p>`;
    }
  }

  function _calcMatches(user, myRepeated, myNeeded) {
    const theirCol      = user.collection || {};
    const theirAlb      = user.album      || {};
    const theirRepeated = Object.keys(theirCol).filter(id => theirCol[id] >= 2);
    const theirNeeded   = window.STICKERS
      .filter(s => !s.exclusive && !theirAlb[s.id])
      .map(s => s.id);

    const iCanGiveThem = myRepeated.filter(id => theirNeeded.includes(id)).length;
    const theyCanGiveMe = theirRepeated.filter(id => myNeeded.includes(id)).length;
    return Math.min(iCanGiveThem, theyCanGiveMe);
  }

  // ── PROPOSE FORM ─────────────────────────────────────────────

  async function _showProposeForm(toUid, toUsername) {
    const formEl = document.getElementById('trades-propose-form');
    const listEl = document.getElementById('trades-user-list');
    listEl.classList.add('hidden');
    formEl.classList.remove('hidden');
    formEl.innerHTML = '<p class="trades-loading">Carregando figurinhas…</p>';

    selectedUser          = { uid: toUid, username: toUsername };
    selectedMyStickers    = [];
    selectedTheirStickers = [];

    try {
      const users        = await DB.getAllUsers();
      const theirProfile = users.find(u => u.uid === toUid);
      if (!theirProfile) throw new Error('Usuário não encontrado');

      const myCol     = (window.AppState.profile || {}).collection || {};
      const theirCol  = theirProfile.collection || {};

      const myRepeated    = Object.keys(myCol)
        .filter(id => myCol[id] >= 2)
        .map(id => window.getStickerById(id))
        .filter(Boolean);
      const theirRepeated = Object.keys(theirCol)
        .filter(id => theirCol[id] >= 2)
        .map(id => window.getStickerById(id))
        .filter(Boolean);

      formEl.innerHTML = `
        <button class="trade-back-btn" id="trade-back-btn">← Voltar</button>
        <div class="trades-propose-title">Trocar com <strong>${toUsername}</strong></div>
        <p class="trades-propose-hint">Selecione uma ou mais figurinhas de cada lado</p>
        <div class="trades-picker">
          <div class="trades-picker-col">
            <div class="trades-picker-label">Você dá<small>sua repetida</small></div>
            <div class="trades-picker-grid" id="my-sticker-picker">
              ${myRepeated.length === 0 ? '<p class="trades-empty" style="grid-column:1/-1">Você não tem repetidas</p>' : ''}
            </div>
          </div>
          <div class="trades-picker-divider">⇄</div>
          <div class="trades-picker-col">
            <div class="trades-picker-label">Você recebe<small>repetida deles</small></div>
            <div class="trades-picker-grid" id="their-sticker-picker">
              ${theirRepeated.length === 0 ? `<p class="trades-empty" style="grid-column:1/-1">${toUsername} não tem repetidas</p>` : ''}
            </div>
          </div>
        </div>
        <textarea
          id="trade-message"
          class="trade-message-input"
          placeholder="Mensagem para ${toUsername} (opcional)..."
          maxlength="200"
          rows="2"
        ></textarea>
        <button class="btn btn-primary btn-full" id="confirm-trade-btn" disabled>
          ✉️ Propor Troca
        </button>
      `;

      _buildPicker('my-sticker-picker',    myRepeated,    'my');
      _buildPicker('their-sticker-picker', theirRepeated, 'their');

      document.getElementById('trade-back-btn').addEventListener('click', () => {
        formEl.classList.add('hidden');
        listEl.classList.remove('hidden');
      });

      document.getElementById('confirm-trade-btn').addEventListener('click', _handlePropose);

    } catch (err) {
      formEl.innerHTML = `
        <button class="trade-back-btn" id="trade-back-btn-err">← Voltar</button>
        <p class="trades-error">Erro: ${err.message}</p>
      `;
      document.getElementById('trade-back-btn-err').addEventListener('click', () => {
        formEl.classList.add('hidden');
        listEl.classList.remove('hidden');
      });
    }
  }

  function _refreshConfirmBtn() {
    const btn = document.getElementById('confirm-trade-btn');
    if (!btn) return;
    const mc = selectedMyStickers.length;
    const tc = selectedTheirStickers.length;
    btn.disabled = !(mc > 0 && tc > 0);
    btn.textContent = (mc > 0 || tc > 0)
      ? `✉️ Propor Troca (${mc} ⇄ ${tc})`
      : '✉️ Propor Troca';
  }

  function _buildPicker(containerId, stickers, side) {
    const container = document.getElementById(containerId);
    if (!container) return;
    stickers.forEach(sticker => {
      const el = document.createElement('div');
      el.className = 'trade-pick-card';
      el.dataset.stickerId = sticker.id;
      el.innerHTML = `
        <img src="${sticker.image}" alt="${sticker.id}" loading="lazy">
        <span>${sticker.id}</span>
      `;
      el.addEventListener('click', () => {
        el.classList.toggle('selected');
        // Rebuild the selection array from all selected cards in this container
        const selected = [...container.querySelectorAll('.trade-pick-card.selected')]
          .map(c => c.dataset.stickerId);
        if (side === 'my') selectedMyStickers    = selected;
        else               selectedTheirStickers = selected;
        _refreshConfirmBtn();
      });
      container.appendChild(el);
    });
  }

  async function _handlePropose() {
    const uid      = window.AppState.uid;
    const username = (window.AppState.profile || {}).username || uid;
    const message  = (document.getElementById('trade-message')?.value || '').trim();
    const btn      = document.getElementById('confirm-trade-btn');
    if (btn) btn.disabled = true;

    try {
      await DB.proposeTrade(
        uid, username, selectedMyStickers,
        selectedUser.uid, selectedUser.username, selectedTheirStickers,
        message
      );
      showToast('✅ Proposta de troca enviada!');
      const formEl = document.getElementById('trades-propose-form');
      const listEl = document.getElementById('trades-user-list');
      formEl.classList.add('hidden');
      listEl.classList.remove('hidden');
      loadTab('pending');
    } catch (err) {
      showToast('Erro: ' + err.message);
      if (btn) btn.disabled = false;
    }
  }

  // ── BADGE ────────────────────────────────────────────────────

  function _updateBadge(count) {
    ['trades-pending-badge', 'trades-header-badge'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = count;
      el.classList.toggle('hidden', count === 0);
    });
  }

  async function refreshBadge() {
    try {
      const uid = window.AppState.uid;
      if (!uid) return;
      const { received } = await DB.getUserTrades(uid);
      _updateBadge(received.length);
    } catch (_) { /* silent */ }
  }

  // ── INIT ─────────────────────────────────────────────────────

  function init() {
    document.getElementById('trades-open-btn').addEventListener('click', open);
    document.getElementById('trades-close').addEventListener('click', close);

    // Close on backdrop click
    document.getElementById('trades-overlay').addEventListener('click', e => {
      if (e.target.id === 'trades-overlay') close();
    });

    // Tab switcher
    document.querySelectorAll('.trades-tab').forEach(btn =>
      btn.addEventListener('click', () => loadTab(btn.dataset.tab))
    );

    // Pending tab: accept / decline / cancel (event delegation)
    document.getElementById('trades-tab-pending').addEventListener('click', async e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, tradeId } = btn.dataset;
      btn.disabled = true;
      try {
        if (action === 'accept') {
          await DB.acceptTrade(tradeId);
          showToast('🎉 Troca realizada! Figurinhas trocadas com sucesso!');
          Collection.render();
        } else if (action === 'decline') {
          await DB.declineTrade(tradeId);
          showToast('❌ Proposta recusada.');
        } else if (action === 'cancel') {
          await DB.declineTrade(tradeId);
          showToast('🗑 Proposta cancelada.');
        } else if (action === 'seen') {
          await DB.markTradeSeen(tradeId);
        }
        _loadPending();
      } catch (err) {
        showToast('Erro: ' + err.message);
        btn.disabled = false;
      }
    });

    // Search tab: propose button (event delegation)
    document.getElementById('trades-tab-search').addEventListener('click', e => {
      const btn = e.target.closest('.trade-propose-btn');
      if (!btn || btn.disabled) return;
      _showProposeForm(btn.dataset.uid, btn.dataset.username);
    });
  }

  return { init, open, close, refreshBadge };

})();
