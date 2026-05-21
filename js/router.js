// ============================================================
//  ROUTER — simple hash-less view switcher
//  Usage: navigate('home') | navigate('shop') | navigate('pack')
//         navigate('collection') | navigate('album')
// ============================================================

window.navigate = function(viewId) {
  // Hide all app views
  document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));

  // Show target
  const target = document.getElementById(viewId + '-view');
  if (target) target.classList.add('active');

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewId);
  });

  // Trigger view-specific refresh hooks
  if (typeof window._viewHooks === 'object' && typeof window._viewHooks[viewId] === 'function') {
    window._viewHooks[viewId]();
  }
};

// Views can register a hook to run when they become active
window._viewHooks = {};

window.registerViewHook = function(viewId, fn) {
  window._viewHooks[viewId] = fn;
};
