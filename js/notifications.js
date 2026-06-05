/**
 * ════════════════════════════════════════════
 *  MODULE : Notifications
 *  Rôle   : Système de toasts (notifications)
 *            branché sur l'EventBus (Pub/Sub).
 *            Utilise le template HTML5 #tpl-toast.
 * ════════════════════════════════════════════
 */

const Notifications = (() => {

  const $container = document.getElementById('toast-container');
  const $tpl       = document.getElementById('tpl-toast');

  /* Icônes SVG (Heroicons) injectées dans le badge coloré du toast */
  const _svg = (inner) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" width="13" height="13" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const ICONS = {
    success: _svg('<polyline points="20 6 9 17 4 12"/>'),
    error:   _svg('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
    info:    _svg('<line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="11" x2="12" y2="16"/>'),
    warning: _svg('<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'),
  };

  const DURATION = {
    success: 3000,
    error:   5000,
    info:    3000,
    warning: 4000,
  };

  /* ─── Init : abonnement EventBus ─── */
  function init() {
    EventBus.on('notify:success', (msg) => show(msg, 'success'));
    EventBus.on('notify:error',   (msg) => show(msg, 'error'));
    EventBus.on('notify:info',    (msg) => show(msg, 'info'));
    EventBus.on('notify:warning', (msg) => show(msg, 'warning'));

    /* Écoute aussi les événements state pour les toasts automatiques */
    EventBus.on('state:taskDeleted', ({ task }) => {
      show(`Tâche « ${task.title} » supprimée.`, 'warning');
    });

    EventBus.on('state:columnDeleted', ({ column }) => {
      show(`Colonne « ${column.title} » supprimée (${column.tasks.length} tâche(s) retirée(s)).`, 'warning');
    });

    EventBus.on('state:taskMoved', ({ task, sourceColId, targetColId }) => {
      if (sourceColId !== targetColId) {
        const state = State.getState();
        const targetCol = state.columns.find(c => c.id === targetColId);
        show(`Tâche déplacée vers « ${targetCol?.title || '…'} »`, 'info');
      }
    });

    EventBus.on('state:reset', () => {
      show('Board réinitialisé.', 'info');
    });

    EventBus.on('state:columnAdded', ({ column }) => {
      show(`Colonne « ${column.title} » ajoutée.`, 'success');
    });
  }

  /* ─── Afficher un toast ─── */
  function show(message, type = 'info') {
    const frag  = $tpl.content.cloneNode(true);
    const $toast = frag.querySelector('.toast');

    $toast.classList.add(`toast-${type}`);
    $toast.querySelector('.toast-icon').innerHTML = ICONS[type] || ICONS.info;
    $toast.querySelector('.toast-msg').textContent  = message;

    $container.appendChild($toast);

    /* Auto-dismiss */
    const duration = DURATION[type] || 3000;
    const timer = setTimeout(() => _dismiss($toast), duration);

    /* Clic pour dismisser manuellement */
    $toast.addEventListener('click', () => {
      clearTimeout(timer);
      _dismiss($toast);
    });
  }

  function _dismiss($toast) {
    $toast.classList.add('toast-out');
    $toast.addEventListener('animationend', () => $toast.remove(), { once: true });
  }

  return { init, show };

})();
