// ============================================================
//  AUTHENTICATION
//  Username-only UI — internally stored as username@albumcopa.com
// ============================================================

window.Auth = (() => {

  const DOMAIN = '@albumcopa.com';

  function toEmail(username) {
    return username.trim().toLowerCase() + DOMAIN;
  }

  function validateUsername(username) {
    if (!username || username.trim().length < 3) return 'Usuário deve ter ao menos 3 caracteres';
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) return 'Use apenas letras, números e _';
    return null;
  }

  // ── REGISTER ─────────────────────────────────────────────────
  async function register(username, password) {
    const err = validateUsername(username);
    if (err) throw new Error(err);
    if (password.length < 6) throw new Error('Senha deve ter ao menos 6 caracteres');

    const email    = toEmail(username);
    const cred     = await window.auth.createUserWithEmailAndPassword(email, password);
    const uid      = cred.user.uid;

    await DB.createUserProfile(uid, username.trim().toLowerCase());
    return cred.user;
  }

  // ── LOGIN ────────────────────────────────────────────────────
  async function login(username, password) {
    const email = toEmail(username);
    const cred  = await window.auth.signInWithEmailAndPassword(email, password);
    return cred.user;
  }

  // ── LOGOUT ──────────────────────────────────────────────────
  async function logout() {
    await window.auth.signOut();
  }

  // ── AUTH STATE LISTENER ──────────────────────────────────────
  function onAuthChange(callback) {
    return window.auth.onAuthStateChanged(callback);
  }

  // ── FRIENDLY ERROR MESSAGES ──────────────────────────────────
  function friendlyError(error) {
    const map = {
      'auth/user-not-found':      'Usuário não encontrado',
      'auth/wrong-password':      'Senha incorreta',
      'auth/email-already-in-use':'Esse usuário já existe',
      'auth/invalid-email':       'Usuário inválido',
      'auth/too-many-requests':   'Muitas tentativas. Tente novamente mais tarde',
      'auth/network-request-failed': 'Erro de conexão. Verifique sua internet',
    };
    return map[error.code] || error.message;
  }

  return { register, login, logout, onAuthChange, friendlyError };
})();


// ── DOM BINDINGS ──────────────────────────────────────────────
(function bindAuthUI() {
  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const which = tab.dataset.tab;
      document.getElementById('login-form').classList.toggle('hidden', which !== 'login');
      document.getElementById('register-form').classList.toggle('hidden', which !== 'register');
      document.getElementById('login-error').textContent    = '';
      document.getElementById('register-error').textContent = '';
    });
  });

  // Login form
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn   = e.target.querySelector('button[type=submit]');
    const errEl = document.getElementById('login-error');
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Entrando…';
    try {
      await Auth.login(
        document.getElementById('login-username').value,
        document.getElementById('login-password').value
      );
      // onAuthChange in app.js will handle the transition
    } catch (err) {
      errEl.textContent = Auth.friendlyError(err);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });

  // Register form
  document.getElementById('register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn   = e.target.querySelector('button[type=submit]');
    const errEl = document.getElementById('register-error');
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Criando conta…';
    try {
      await Auth.register(
        document.getElementById('register-username').value,
        document.getElementById('register-password').value
      );
    } catch (err) {
      errEl.textContent = Auth.friendlyError(err);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Criar Conta';
    }
  });

  // Logout button
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await Auth.logout();
  });
})();
