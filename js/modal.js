/**
 * ════════════════════════════════════════════
 *  MODULE : Modal
 *  Rôle   : Gestion du formulaire de création
 *            et d'édition des tâches.
 *            Communique via EventBus.
 * ════════════════════════════════════════════
 */

const Modal = (() => {

  const $overlay    = document.getElementById('modal-overlay');
  const $title      = document.getElementById('modal-title');
  const $titleInput = document.getElementById('task-title-input');
  const $descInput  = document.getElementById('task-desc-input');
  const $priorityInput = document.getElementById('task-priority-input');
  const $tagInput   = document.getElementById('task-tag-input');
  const $saveBtn    = document.getElementById('modal-save');
  const $cancelBtn  = document.getElementById('modal-cancel');
  const $closeBtn   = document.getElementById('modal-close');
  const $titleCount = document.getElementById('title-count');

  let _mode   = 'create'; // 'create' | 'edit'
  let _colId  = null;
  let _taskId = null;

  /* ─── Init ─── */
  function init() {
    $closeBtn.addEventListener('click',  close);
    $cancelBtn.addEventListener('click', close);
    $saveBtn.addEventListener('click',   _save);
    $overlay.addEventListener('click', (e) => {
      if (e.target === $overlay) close();
    });

    /* Compteur de caractères */
    $titleInput.addEventListener('input', () => {
      const len = $titleInput.value.length;
      $titleCount.textContent = `${len}/80`;
      $titleCount.style.color = len > 70
        ? 'var(--priority-high)'
        : 'var(--text-muted)';
    });

    /* Validation à la saisie */
    $titleInput.addEventListener('input', _validateTitle);

    /* Touche Entrée pour sauvegarder */
    $titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _save(); }
    });

    /* Escape pour fermer */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$overlay.classList.contains('hidden')) close();
    });

    /* Écoute EventBus */
    EventBus.on('ui:addTask',  ({ colId })  => openCreate(colId));
    EventBus.on('ui:editTask', ({ taskId }) => openEdit(taskId));
  }

  /* ─── Ouvrir en mode création ─── */
  function openCreate(colId) {
    _mode  = 'create';
    _colId = colId;
    _taskId = null;

    $title.textContent = 'Nouvelle tâche';
    $saveBtn.textContent = 'Créer';
    _reset();
    _show();
  }

  /* ─── Ouvrir en mode édition ─── */
  function openEdit(taskId) {
    _mode   = 'edit';
    _taskId = taskId;
    _colId  = null;

    /* Récupérer les données depuis l'état */
    const state = State.getState();
    let task = null;
    state.columns.forEach(col => {
      const t = col.tasks.find(t => t.id === taskId);
      if (t) task = t;
    });
    if (!task) return;

    $title.textContent = 'Modifier la tâche';
    $saveBtn.textContent = 'Mettre à jour';

    $titleInput.value    = task.title;
    $descInput.value     = task.desc;
    $priorityInput.value = task.priority;
    $tagInput.value      = task.tag;
    $titleCount.textContent = `${task.title.length}/80`;

    _show();
  }

  /* ─── Fermer ─── */
  function close() {
    $overlay.classList.add('hidden');
    _reset();
  }

  /* ─── Sauvegarder ─── */
  function _save() {
    const title = $titleInput.value.trim();
    if (!title) {
      _validateTitle();
      $titleInput.focus();
      return;
    }

    const data = {
      title,
      desc:     $descInput.value.trim(),
      priority: $priorityInput.value,
      tag:      $tagInput.value.trim(),
    };

    if (_mode === 'create') {
      const task = State.addTask(_colId, data);
      if (task) {
        EventBus.emit('notify:success', `Tâche « ${title} » créée !`);
      }
    } else {
      State.updateTask(_taskId, data);
      EventBus.emit('notify:info', `Tâche « ${title} » mise à jour.`);
    }

    close();
  }

  /* ─── Helpers ─── */
  function _show() {
    $overlay.classList.remove('hidden');
    requestAnimationFrame(() => $titleInput.focus());
  }

  function _reset() {
    $titleInput.value    = '';
    $descInput.value     = '';
    $priorityInput.value = 'medium';
    $tagInput.value      = '';
    $titleCount.textContent = '0/80';
    $titleInput.style.borderColor = '';
    $titleInput.style.boxShadow   = '';
  }

  function _validateTitle() {
    const empty = !$titleInput.value.trim();
    $titleInput.style.borderColor = empty ? 'var(--priority-high)' : '';
    $titleInput.style.boxShadow   = empty
      ? '0 0 0 3px rgba(247,96,79,0.18)'
      : '';
  }

  return { init, openCreate, openEdit, close };

})();
