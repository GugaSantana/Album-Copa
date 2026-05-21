// ============================================================
//  SHOP — deposit & pack purchase logic
// ============================================================

window.Shop = (() => {

  const PACK_PRICE = 7;
  const COCA_PRICE = 6;
  let   quantity   = 1;
  let   cocaQty    = 1;

  // ── RENDER ──────────────────────────────────────────────────

  function render() {
    const profile = window.AppState.profile;
    if (!profile) return;

    const fmt = n => n.toFixed(2).replace('.', ',');

    document.getElementById('shop-balance').textContent = fmt(profile.balance || 0);
    document.getElementById('shop-spent').textContent   = fmt(profile.totalSpent || 0);
    document.getElementById('shop-pending').textContent = profile.pendingPacks || 0;

    updateQuantityUI();
    updateCocaQtyUI();
    toggleGoOpenBtn();
  }

  function updateQuantityUI() {
    document.getElementById('qty-value').textContent  = quantity;
    document.getElementById('buy-qty').textContent    = quantity;
    document.getElementById('buy-total').textContent  = (quantity * PACK_PRICE).toFixed(2).replace('.', ',');
  }

  function updateCocaQtyUI() {
    document.getElementById('coca-qty-value').textContent    = cocaQty;
    document.getElementById('coca-buy-qty').textContent      = cocaQty;
    document.getElementById('coca-buy-total').textContent    = (cocaQty * COCA_PRICE).toFixed(2).replace('.', ',');
  }

  function toggleGoOpenBtn() {
    const pending = (window.AppState.profile || {}).pendingPacks || 0;
    document.getElementById('go-open-btn').style.display = pending > 0 ? '' : 'none';
  }

  // ── DEPOSIT ─────────────────────────────────────────────────

  async function handleDeposit(amount) {
    const uid = window.AppState.uid;
    if (!uid) return;
    try {
      await DB.deposit(uid, amount);
      showToast(`💰 R$${amount},00 adicionado!`);
    } catch (err) {
      showToast('Erro ao depositar: ' + err.message);
    }
  }
  async function handleBuyCoca() {
    const uid     = window.AppState.uid;
    const profile = window.AppState.profile;
    if (!uid || !profile) return;

    const total  = cocaQty * COCA_PRICE;
    const noteEl = document.getElementById('coca-buy-note');

    if (profile.balance < total) {
      noteEl.textContent = `Saldo insuficiente! Você tem R$${(profile.balance).toFixed(2).replace('.', ',')} e precisa de R$${total.toFixed(2).replace('.', ',')}.`;
      return;
    }
    noteEl.textContent = '';

    const btn = document.getElementById('buy-coca-btn');
    btn.disabled = true;
    try {
      await DB.buyCocaBottle(uid, cocaQty);
      showToast(`🥤 ${cocaQty} garrafinha(s) comprada(s)!`);
      toggleGoOpenBtn();
    } catch (err) {
      noteEl.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  }
  // ── BUY PACKS ───────────────────────────────────────────────

  async function handleBuyPacks() {
    const uid     = window.AppState.uid;
    const profile = window.AppState.profile;
    if (!uid || !profile) return;

    const total  = quantity * PACK_PRICE;
    const noteEl = document.getElementById('buy-note');

    if (profile.balance < total) {
      noteEl.textContent = `Saldo insuficiente! Você tem R$${(profile.balance).toFixed(2).replace('.', ',')} e precisa de R$${total.toFixed(2).replace('.', ',')}.`;
      return;
    }
    noteEl.textContent = '';

    const btn = document.getElementById('buy-pack-btn');
    btn.disabled = true;

    try {
      await DB.buyPacks(uid, quantity, PACK_PRICE);
      showToast(`🎉 ${quantity} pacote(s) comprado(s)!`);
      toggleGoOpenBtn();
    } catch (err) {
      noteEl.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  }

  // ── BIND DOM ────────────────────────────────────────────────

  function init() {
    // Deposit buttons
    document.querySelectorAll('.deposit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const amount = parseInt(btn.dataset.amount, 10);
        btn.classList.add('clicked');
        btn.addEventListener('animationend', () => btn.classList.remove('clicked'), { once: true });
        handleDeposit(amount);
      });
    });

    // Quantity controls
    document.getElementById('qty-minus').addEventListener('click', () => {
      if (quantity > 1) { quantity--; updateQuantityUI(); }
    });
    document.getElementById('qty-plus').addEventListener('click', () => {
      quantity++;
      updateQuantityUI();
    });

    // Buy button
    document.getElementById('buy-pack-btn').addEventListener('click', handleBuyPacks);

    // Coca-Cola quantity controls
    document.getElementById('coca-qty-minus').addEventListener('click', () => {
      if (cocaQty > 1) { cocaQty--; updateCocaQtyUI(); }
    });
    document.getElementById('coca-qty-plus').addEventListener('click', () => {
      cocaQty++; updateCocaQtyUI();
    });
    document.getElementById('buy-coca-btn').addEventListener('click', handleBuyCoca);

    // Register view hook
    registerViewHook('shop', render);
  }

  return { init, render };
})();
