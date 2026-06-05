/**
 * ════════════════════════════════════════════
 *  MODULE : DOM
 *  Rôle   : Génération dynamique de l'UI
 *            à partir de l'état (State).
 *            Utilise les balises <template> HTML5.
 *            Délégation d'événements centralisée.
 * ════════════════════════════════════════════
 */

const DOM = (() => {

  /* ─── Références DOM ─── */
  const $board       = document.getElementById('board');
  const $tplColumn   = document.getElementById('tpl-column');
  const $tplTask     = document.getElementById('tpl-task');
  const $statTotal   = document.getElementById('stat-total');
  const $statDone    = document.getElementById('stat-done');

  const PRIORITY_COLORS = {
    high:   'var(--priority-high)',
    medium: 'var(--priority-medium)',
    low:    'var(--priority-low)',
  };

  /* ════════════════ RENDER ════════════════ */

  /**
   * Rendu complet du board depuis l'état
   */
  function renderBoard(state) {
    $board.innerHTML = '';
    state.columns.forEach(col => {
      const $col = _renderColumn(col);
      $board.appendChild($col);
    });
    _bindBoardEvents();
    _updateStats();
  }

  /**
   * Construit un élément colonne depuis le <template>
   * @param {Object} col - données de colonne
   * @returns {HTMLElement}
   */
  function _renderColumn(col) {
    /* Clone du template HTML5 */
    const frag   = $tplColumn.content.cloneNode(true);
    const $col   = frag.querySelector('.column');
    const $title = frag.querySelector('.column-title');
    const $badge = frag.querySelector('.column-badge');
    const $list  = frag.querySelector('.task-list');
    const $dot   = frag.querySelector('.column-dot');

    /* Attribution données */
    $col.dataset.colId   = col.id;
    $title.textContent   = col.title;
    $badge.textContent   = col.tasks.length;
    const color = State.getColumnColor(col.colorIndex);
    $dot.style.background = color;
    $col.style.setProperty('--col-color', color);

    /* Rendu des tâches */
    col.tasks.forEach(task => {
      const $task = _renderTask(task);
      $list.appendChild($task);
    });

    /* Édition du titre en ligne */
    $title.addEventListener('blur', () => {
      const newTitle = $title.textContent.trim();
      if (newTitle !== col.title) {
        State.updateColumnTitle(col.id, newTitle);
      }
    });
    $title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $title.blur(); }
      if (e.key === 'Escape') { $title.textContent = col.title; $title.blur(); }
    });

    return frag;
  }

  /**
   * Construit un élément tâche depuis le <template>
   * @param {Object} task
   * @returns {HTMLElement}
   */
  function _renderTask(task) {
    const frag = $tplTask.content.cloneNode(true);
    const $li  = frag.querySelector('.task-card');

    $li.dataset.taskId = task.id;
    $li.style.setProperty('--priority-color', PRIORITY_COLORS[task.priority] || 'var(--text-muted)');

    frag.querySelector('.task-priority-dot').style.background =
      PRIORITY_COLORS[task.priority] || 'var(--text-muted)';

    frag.querySelector('.task-title').textContent = task.title;
    frag.querySelector('.task-desc').textContent  = task.desc || '';
    frag.querySelector('.task-tag').textContent   = task.tag  || '';

    return frag;
  }

  /* ════════════════ MISES À JOUR PARTIELLES ════════════════ */

  /**
   * Ajoute une tâche dans la colonne DOM sans re-render complet
   */
  function appendTask(task, colId) {
    const $list = _getTaskList(colId);
    if (!$list) return;
    const $task = _renderTask(task);
    $list.appendChild($task);
    _updateColumnBadge(colId);
    _updateStats();
  }

  /**
   * Retire une tâche du DOM
   */
  function removeTask(taskId) {
    const $task = document.querySelector(`.task-card[data-task-id="${taskId}"]`);
    if ($task) $task.remove();
    const colId = _findColIdForTask(taskId);
    if (colId) _updateColumnBadge(colId);
    _updateStats();
  }

  /**
   * Met à jour une tâche existante dans le DOM
   */
  function updateTaskDOM(task) {
    const $existing = document.querySelector(`.task-card[data-task-id="${task.id}"]`);
    if (!$existing) return;
    const newFrag = _renderTask(task);
    const $new = newFrag.querySelector('.task-card');
    $existing.replaceWith($new);
  }

  /**
   * Ajoute une colonne sans re-render complet
   */
  function appendColumn(col) {
    const $col = _renderColumn(col);
    $board.appendChild($col);
    _bindBoardEvents();
    _updateStats();
  }

  /**
   * Retire une colonne du DOM
   */
  function removeColumn(colId) {
    const $col = document.querySelector(`.column[data-col-id="${colId}"]`);
    if ($col) $col.remove();
    _updateStats();
  }

  /* ════════════════ STATS ════════════════ */

  function _updateStats() {
    const stats = State.getStats();
    $statTotal.textContent = `${stats.total} tâche${stats.total !== 1 ? 's' : ''}`;
    $statDone.textContent  = `${stats.done} terminée${stats.done !== 1 ? 's' : ''}`;
  }

  function _updateColumnBadge(colId) {
    const $col = document.querySelector(`.column[data-col-id="${colId}"]`);
    if (!$col) return;
    const count = $col.querySelectorAll('.task-card').length;
    const $badge = $col.querySelector('.column-badge');
    if ($badge) $badge.textContent = count;
  }

  /* ════════════════ EVENT DELEGATION ════════════════ */

  /**
   * Délégation d'événements sur le board :
   * UN SEUL listener sur #board pour tous les clics.
   * Interdit de poser des listeners sur chaque tâche.
   */
  function _bindBoardEvents() {
    /* On repose le listener une seule fois via un flag */
    if ($board._eventsbound) return;
    $board._eventsbound = true;

    $board.addEventListener('click', (e) => {
      const $btn = e.target.closest('[data-action]');
      if (!$btn) return;

      const action = $btn.dataset.action;
      const $col   = $btn.closest('.column');
      const $task  = $btn.closest('.task-card');
      const colId  = $col?.dataset.colId;
      const taskId = $task?.dataset.taskId;

      switch (action) {
        case 'add-task':
          EventBus.emit('ui:addTask', { colId });
          break;
        case 'delete-task':
          EventBus.emit('ui:deleteTask', { taskId, colId });
          break;
        case 'edit-task':
          EventBus.emit('ui:editTask', { taskId });
          break;
        case 'delete-column':
          EventBus.emit('ui:deleteColumn', { colId });
          break;
      }
    });
  }

  /* ════════════════ SEARCH HIGHLIGHT ════════════════ */

  /**
   * Filtre les tâches DOM selon un terme de recherche.
   * Pas de rechargement, manipulation directe du DOM.
   */
  function filterTasksBySearch(term) {
    const $tasks = document.querySelectorAll('.task-card');
    const query  = term.toLowerCase().trim();

    $tasks.forEach($task => {
      $task.classList.remove('search-hidden');
      const $title = $task.querySelector('.task-title');
      const $desc  = $task.querySelector('.task-desc');
      const $tag   = $task.querySelector('.task-tag');

      /* Retirer anciens highlights */
      _removeHighlights($title);
      _removeHighlights($desc);
      _removeHighlights($tag);

      if (!query) return;

      const titleText = _getRawText($task.querySelector('.task-title'));
      const descText  = _getRawText($task.querySelector('.task-desc'));
      const tagText   = _getRawText($task.querySelector('.task-tag'));

      const matches =
        titleText.toLowerCase().includes(query) ||
        descText.toLowerCase().includes(query)  ||
        tagText.toLowerCase().includes(query);

      if (!matches) {
        $task.classList.add('search-hidden');
      } else {
        /* Highlight des occurrences */
        _highlight($title, query);
        _highlight($desc,  query);
        _highlight($tag,   query);
      }
    });

    _updateAllBadges();
  }

  /**
   * Filtre les tâches par priorité
   */
  function filterTasksByPriority(priority) {
    const $tasks = document.querySelectorAll('.task-card');
    $tasks.forEach($task => {
      $task.classList.remove('filter-hidden');
      if (priority === 'all') return;

      const taskId = $task.dataset.taskId;
      const state  = State.getState();
      let found    = null;
      state.columns.forEach(col => {
        const t = col.tasks.find(t => t.id === taskId);
        if (t) found = t;
      });
      if (found && found.priority !== priority) {
        $task.classList.add('filter-hidden');
      }
    });
    _updateAllBadges();
  }

  function _updateAllBadges() {
    document.querySelectorAll('.column').forEach($col => {
      const colId  = $col.dataset.colId;
      const $badge = $col.querySelector('.column-badge');
      if (!$badge) return;
      const visible = $col.querySelectorAll(
        '.task-card:not(.search-hidden):not(.filter-hidden)'
      ).length;
      $badge.textContent = visible;
    });
  }

  function _getRawText(el) {
    return el ? el.textContent : '';
  }

  function _removeHighlights(el) {
    if (!el) return;
    const marks = el.querySelectorAll('mark.search-highlight');
    marks.forEach(m => {
      const text = document.createTextNode(m.textContent);
      m.replaceWith(text);
    });
    el.normalize();
  }

  function _highlight(el, query) {
    if (!el || !el.textContent.toLowerCase().includes(query)) return;
    const text = el.textContent;
    const idx  = text.toLowerCase().indexOf(query);
    if (idx === -1) return;
    const before = text.slice(0, idx);
    const match  = text.slice(idx, idx + query.length);
    const after  = text.slice(idx + query.length);
    el.innerHTML =
      _escapeHTML(before) +
      `<mark class="search-highlight">${_escapeHTML(match)}</mark>` +
      _escapeHTML(after);
  }

  function _escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ════════════════ HELPERS ════════════════ */

  function _getTaskList(colId) {
    const $col = document.querySelector(`.column[data-col-id="${colId}"]`);
    return $col ? $col.querySelector('.task-list') : null;
  }

  function _findColIdForTask(taskId) {
    const $task = document.querySelector(`.task-card[data-task-id="${taskId}"]`);
    if (!$task) return null;
    const $col = $task.closest('.column');
    return $col ? $col.dataset.colId : null;
  }

  return {
    renderBoard,
    appendTask,
    removeTask,
    updateTaskDOM,
    appendColumn,
    removeColumn,
    filterTasksBySearch,
    filterTasksByPriority,
  };

})();
