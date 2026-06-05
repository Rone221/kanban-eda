
const App = (() => {

  /* Boutons header*/
  const $btnAddColumn = document.getElementById('btn-add-column');
  const $btnReset     = document.getElementById('btn-reset');

  /*INIT*/
  function init() {
    /* 1. Rendu initial depuis l'état chargé (localStorage ou défaut) */
    DOM.renderBoard(State.getState());

    /* 2. Initialiser les modules */
    DragDrop.init();
    Modal.init();
    Filters.init();
    Notifications.init();

    /* 3. Abonnements EventBus : UI → State */
    _bindUIEvents();

    /* 4. Abonnements EventBus : State → DOM */
    _bindStateEvents();

    /* 5. Listeners boutons header */
    _bindHeaderButtons();

    console.info('%c[FlowBoard] Application démarrée.', 'color: #4f8ef7; font-weight: 600');
    EventBus.debug();
  }

  /* UI STATE  */
  function _bindUIEvents() {

    /* Supprimer une tâche */
    EventBus.on('ui:deleteTask', ({ taskId }) => {
      if (!taskId) return;
      const state = State.getState();
      let task = null;
      state.columns.forEach(col => {
        const t = col.tasks.find(t => t.id === taskId);
        if (t) task = t;
      });
      if (!task) return;

      /* Confirmation légère sans alert bloquant */
      _confirmAction(
        `Supprimer la tâche « ${task.title} » ?`,
        () => State.deleteTask(taskId)
      );
    });

    /* Supprimer une colonne */
    EventBus.on('ui:deleteColumn', ({ colId }) => {
      if (!colId) return;
      const col = State.getState().columns.find(c => c.id === colId);
      if (!col) return;
      const msg = col.tasks.length > 0
        ? `Supprimer la colonne « ${col.title} » et ses ${col.tasks.length} tâche(s) ?`
        : `Supprimer la colonne « ${col.title} » ?`;
      _confirmAction(msg, () => State.deleteColumn(colId));
    });
  }

  /* ════════════════ STATE → DOM ════════════════ */
  function _bindStateEvents() {

    /* Tâche ajoutée */
    EventBus.on('state:taskAdded', ({ task, colId }) => {
      DOM.appendTask(task, colId);
    });

    /* Tâche mise à jour */
    EventBus.on('state:taskUpdated', ({ task }) => {
      DOM.updateTaskDOM(task);
    });

    /* Tâche supprimée */
    EventBus.on('state:taskDeleted', ({ task }) => {
      DOM.removeTask(task.id);
    });

    /* Colonne ajoutée */
    EventBus.on('state:columnAdded', ({ column }) => {
      DOM.appendColumn(column);
      /* DragDrop doit réécouter les nouveaux éléments — il est délégué, rien à faire */
    });

    /* Colonne supprimée */
    EventBus.on('state:columnDeleted', ({ colId }) => {
      DOM.removeColumn(colId);
    });

    /* Reset complet — DragDrop n'a PAS besoin d'être ré-initialisé :
       ses listeners sont délégués sur #board, qui persiste au re-render. */
    EventBus.on('state:reset', (state) => {
      Filters.reset();
      DOM.renderBoard(state);
    });
  }

  /* ════════════════ HEADER BUTTONS ════════════════ */
  function _bindHeaderButtons() {

    /* Ajouter une colonne */
    $btnAddColumn.addEventListener('click', () => {
      const title = 'Nouvelle colonne';
      State.addColumn(title);
    });

    /* Reset board */
    $btnReset.addEventListener('click', () => {
      _confirmAction(
        'Réinitialiser le board avec les données de démo ?',
        () => State.resetToDefault()
      );
    });
  }

  /* ════════════════ CONFIRM HELPER ════════════════ */

  /**
   * Remplace window.confirm() par un toast interactif
   * (pas d'alerte bloquante)
   */
  function _confirmAction(message, onConfirm) {
    /* Toast de confirmation custom */
    const $container = document.getElementById('toast-container');
    const $toast     = document.createElement('div');
    $toast.className = 'toast toast-warning';
    $toast.style.flexDirection = 'column';
    $toast.style.alignItems    = 'flex-start';
    $toast.style.gap           = '8px';
    $toast.innerHTML = `
      <span class="toast-msg" style="font-size:0.8rem;">${_escapeHTML(message)}</span>
      <div style="display:flex;gap:8px;width:100%">
        <button id="confirm-yes" style="flex:1;padding:5px 0;border-radius:6px;border:1px solid var(--priority-high);background:rgba(247,96,79,0.12);color:var(--priority-high);cursor:pointer;font-size:0.78rem;font-weight:500;">Confirmer</button>
        <button id="confirm-no"  style="flex:1;padding:5px 0;border-radius:6px;border:1px solid var(--border);background:var(--bg-hover);color:var(--text-secondary);cursor:pointer;font-size:0.78rem;">Annuler</button>
      </div>`;
    $container.appendChild($toast);

    function dismiss() { $toast.remove(); }

    $toast.querySelector('#confirm-yes').addEventListener('click', () => {
      onConfirm();
      dismiss();
    });
    $toast.querySelector('#confirm-no').addEventListener('click', dismiss);

    /* Auto-dismiss après 10s */
    setTimeout(dismiss, 10000);
  }

  function _escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { init };

})();

/* ═══ Démarrage ═══ */
document.addEventListener('DOMContentLoaded', App.init);
