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

  const ICONS = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
    warning: '⚠',
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
    $toast.querySelector('.toast-icon').textContent = ICONS[type] || 'ℹ';
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
