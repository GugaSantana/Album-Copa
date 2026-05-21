// ============================================================
//  DATABASE — Firestore operations
//  All functions are async and return the requested data.
// ============================================================

window.DB = (() => {

  // ── USER PROFILE ────────────────────────────────────────────

  /** Create initial user document after registration */
  async function createUserProfile(uid, username) {
    await window.db.collection('users').doc(uid).set({
      username,
      balance:      0,
      packsOpened:  0,
      pendingPacks: 0,
      totalSpent:   0,
      collection:   {},
      album:        {},
      createdAt:    firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  /** Fetch full user profile document */
  async function getUserProfile(uid) {
    const snap = await window.db.collection('users').doc(uid).get();
    if (!snap.exists) return null;
    return snap.data();
  }

  /** Listen to profile changes in real-time */
  function onProfileChange(uid, callback) {
    return window.db.collection('users').doc(uid).onSnapshot(snap => {
      if (snap.exists) callback(snap.data());
    });
  }

  // ── WALLET ──────────────────────────────────────────────────

  /** Add virtual money to user balance */
  async function deposit(uid, amount) {
    await window.db.collection('users').doc(uid).update({
      balance: firebase.firestore.FieldValue.increment(amount)
    });
  }

  // ── SHOP ────────────────────────────────────────────────────

  /**
   * Buy N packs — deducts balance, increments pendingPacks and totalSpent.
   * Throws if insufficient balance.
   */
  async function buyPacks(uid, quantity, priceEach) {
    const total = quantity * priceEach;
    const ref   = window.db.collection('users').doc(uid);

    await window.db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const data = snap.data();
      if (data.balance < total) throw new Error('Saldo insuficiente');
      tx.update(ref, {
        balance:      firebase.firestore.FieldValue.increment(-total),
        pendingPacks: firebase.firestore.FieldValue.increment(quantity),
        totalSpent:   firebase.firestore.FieldValue.increment(total)
      });
    });
  }

  // ── PACK OPENING ────────────────────────────────────────────

  /**
   * Consume one pending pack and add the sticker IDs to the collection.
   * Returns the prior collection so the caller knows which are "new".
   */
  async function openPack(uid, stickerIds) {
    const ref  = window.db.collection('users').doc(uid);
    let priorCollection = {};

    await window.db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const data = snap.data();
      if (data.pendingPacks < 1) throw new Error('Nenhum pacote pendente');

      priorCollection = { ...(data.collection || {}) };

      // Build collection delta
      const delta = {};
      for (const id of stickerIds) {
        delta[`collection.${id}`] = firebase.firestore.FieldValue.increment(1);
      }

      tx.update(ref, {
        ...delta,
        pendingPacks: firebase.firestore.FieldValue.increment(-1),
        packsOpened:  firebase.firestore.FieldValue.increment(1)
      });
    });

    return priorCollection;
  }

  // ── ALBUM ───────────────────────────────────────────────────

  /**
   * Paste a sticker into the album.
   * The user must own at least 1 copy (collection[id] > 0).
   */
  async function pasteSticker(uid, stickerId) {
    const ref = window.db.collection('users').doc(uid);

    await window.db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const data = snap.data();
      const qty  = (data.collection || {})[stickerId] || 0;
      if (qty < 1) throw new Error('Você não tem essa figurinha');
      if ((data.album || {})[stickerId]) throw new Error('Já colada no álbum');

      tx.update(ref, {
        [`album.${stickerId}`]: true
      });
    });
  }

  /**
   * Auto-paste all stickers the user owns that are not yet in the album.
   */
  async function autoPaste(uid) {
    const ref  = window.db.collection('users').doc(uid);
    const snap = await ref.get();
    const data = snap.data();
    const col  = data.collection || {};
    const alb  = data.album || {};

    const updates = {};
    let count = 0;
    for (const [id, qty] of Object.entries(col)) {
      if (qty > 0 && !alb[id]) {
        updates[`album.${id}`] = true;
        count++;
      }
    }

    if (count > 0) await ref.update(updates);
    return count;
  }

  // ── PUBLIC API ───────────────────────────────────────────────
  return {
    createUserProfile,
    getUserProfile,
    onProfileChange,
    deposit,
    buyPacks,
    openPack,
    pasteSticker,
    autoPaste,
    getAllUsers,
    resetUserAccount,
    fillUserAlbum,
    buyCocaBottle,
    openCocaBottle
  };

  // ── ADMIN ────────────────────────────────────────────────────

  /** Fetch all user documents (admin only) */
  async function getAllUsers() {
    const snap = await window.db.collection('users').get();
    return snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
  }

  /** Reset a user's collection, album and pending packs (keeps balance) */
  async function resetUserAccount(uid) {
    await window.db.collection('users').doc(uid).update({
      collection:   {},
      album:        {},
      pendingPacks: 0,
      packsOpened:  0,
      totalSpent: 0,
      balance: 0,
    });
  }

  /** Fill all stickers into a user's collection and album (admin preview) */
  async function fillUserAlbum(uid) {
    const collection = {};
    const album = {};
    window.STICKERS.forEach(s => {
      collection[s.id] = 1;
      album[s.id] = true;
    });
    await window.db.collection('users').doc(uid).update({ collection, album });
  }

  // ── COCA-COLA BOTTLE ────────────────────────────────────────

  /** Buy N coca-cola bottles — R$6 each, 1 exclusive sticker per bottle */
  async function buyCocaBottle(uid, qty) {
    const total = qty * 6;
    const ref   = window.db.collection('users').doc(uid);
    await window.db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const data = snap.data();
      if ((data.balance || 0) < total) throw new Error('Saldo insuficiente');
      tx.update(ref, {
        balance:     firebase.firestore.FieldValue.increment(-total),
        pendingCoca: firebase.firestore.FieldValue.increment(qty),
        totalSpent:  firebase.firestore.FieldValue.increment(total)
      });
    });
  }

  /** Open 1 coca bottle — consumes pendingCoca, adds sticker to collection */
  async function openCocaBottle(uid, stickerId) {
    const ref = window.db.collection('users').doc(uid);
    let priorCollection = {};
    await window.db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const data = snap.data();
      if ((data.pendingCoca || 0) < 1) throw new Error('Nenhuma garrafinha pendente');
      priorCollection = { ...(data.collection || {}) };
      tx.update(ref, {
        [`collection.${stickerId}`]: firebase.firestore.FieldValue.increment(1),
        pendingCoca: firebase.firestore.FieldValue.increment(-1)
      });
    });
    return priorCollection;
  }
})();
