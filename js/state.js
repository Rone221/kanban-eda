/**
 * ════════════════════════════════════════════
 *  MODULE : State
 *  Rôle   : Gestionnaire d'état centralisé
 *            (source unique de vérité).
 *            Persiste dans localStorage.
 *            Émet des événements sur chaque mutation.
 * ════════════════════════════════════════════
 */

const State = (() => {

  const STORAGE_KEY = 'flowboard_v1';

  /* ─── Couleurs cycliques des colonnes (palette claire, lisible sur blanc) ─── */
  const COLUMN_COLORS = [
    '#f05537', '#7c3aed', '#2563eb',
    '#0ea5e9', '#10b981', '#f59e0b',
    '#ec4899', '#6366f1', '#14b8a6',
  ];

  /* ─── État initial par défaut ─── */
  const DEFAULT_STATE = {
    columns: [
      {
        id: 'col_1',
        title: 'À faire',
        colorIndex: 0,
        tasks: [
          { id: 'task_1', title: 'Concevoir la maquette UI', desc: 'Créer les wireframes dans Figma', priority: 'high',   tag: 'Design',   createdAt: Date.now() - 5000 },
          { id: 'task_2', title: 'Configurer le pipeline CI/CD', desc: '',                                priority: 'medium', tag: 'DevOps',   createdAt: Date.now() - 4000 },
          { id: 'task_3', title: 'Rédiger la documentation API', desc: 'OpenAPI 3.0 spec complète',         priority: 'low',    tag: 'Docs',     createdAt: Date.now() - 3000 },
        ]
      },
      {
        id: 'col_2',
        title: 'En cours',
        colorIndex: 1,
        tasks: [
          { id: 'task_4', title: 'Implémenter le module Auth', desc: 'JWT + refresh token strategy',        priority: 'high',   tag: 'Backend',  createdAt: Date.now() - 2000 },
          { id: 'task_5', title: 'Optimiser les requêtes SQL', desc: '',                                    priority: 'medium', tag: 'Database', createdAt: Date.now() - 1000 },
        ]
      },
      {
        id: 'col_3',
        title: 'Terminé',
        colorIndex: 2,
        tasks: [
          { id: 'task_6', title: 'Initialiser le dépôt Git',    desc: 'Branches main / develop / staging',  priority: 'low',    tag: 'Setup',    createdAt: Date.now() },
          { id: 'task_7', title: 'Réunion kick-off',            desc: '',                                    priority: 'low',    tag: 'Meeting',  createdAt: Date.now() },
        ]
      }
    ]
  };

  /* ─── Chargement depuis localStorage ─── */
  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('[State] Échec du chargement localStorage, état par défaut utilisé.', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  /* ─── Sauvegarde dans localStorage ─── */
  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    } catch (e) {
      console.error('[State] Impossible de sauvegarder:', e);
    }
  }

  let _state = _load();

  /* ════════════════ HELPERS ════════════════ */

  function _genId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function _getColumn(colId) {
    return _state.columns.find(c => c.id === colId) || null;
  }

  function _getColumnOfTask(taskId) {
    return _state.columns.find(c => c.tasks.some(t => t.id === taskId)) || null;
  }

  function _getTask(taskId) {
    for (const col of _state.columns) {
      const t = col.tasks.find(t => t.id === taskId);
      if (t) return t;
    }
    return null;
  }

  /* ════════════════ ACTIONS ════════════════ */

  /** Récupérer une copie de l'état complet */
  function getState() {
    return _state;
  }

  /** Récupérer la couleur d'une colonne */
  function getColumnColor(colorIndex) {
    return COLUMN_COLORS[colorIndex % COLUMN_COLORS.length];
  }

  /* ── Colonnes ── */

  function addColumn(title = 'Nouvelle colonne') {
    const colorIndex = _state.columns.length % COLUMN_COLORS.length;
    const column = {
      id: _genId('col'),
      title,
      colorIndex,
      tasks: []
    };
    _state.columns.push(column);
    _save();
    EventBus.emit('state:columnAdded', { column });
    EventBus.emit('state:changed', _state);
    return column;
  }

  function updateColumnTitle(colId, newTitle) {
    const col = _getColumn(colId);
    if (!col) return;
    const oldTitle = col.title;
    col.title = newTitle.trim() || oldTitle;
    _save();
    EventBus.emit('state:columnUpdated', { colId, title: col.title });
    EventBus.emit('state:changed', _state);
  }

  function deleteColumn(colId) {
    const idx = _state.columns.findIndex(c => c.id === colId);
    if (idx === -1) return;
    const [removed] = _state.columns.splice(idx, 1);
    _save();
    EventBus.emit('state:columnDeleted', { colId, column: removed });
    EventBus.emit('state:changed', _state);
  }

  /* ── Tâches ── */

  function addTask(colId, { title, desc = '', priority = 'medium', tag = '' }) {
    const col = _getColumn(colId);
    if (!col) return null;

    const task = {
      id: _genId('task'),
      title: title.trim(),
      desc: desc.trim(),
      priority,
      tag: tag.trim(),
      createdAt: Date.now()
    };
    col.tasks.push(task);
    _save();
    EventBus.emit('state:taskAdded', { task, colId });
    EventBus.emit('state:changed', _state);
    return task;
  }

  function updateTask(taskId, updates) {
    const task = _getTask(taskId);
    if (!task) return;
    Object.assign(task, {
      title:    (updates.title    !== undefined ? updates.title.trim()    : task.title),
      desc:     (updates.desc     !== undefined ? updates.desc.trim()     : task.desc),
      priority: (updates.priority !== undefined ? updates.priority        : task.priority),
      tag:      (updates.tag      !== undefined ? updates.tag.trim()      : task.tag),
    });
    _save();
    EventBus.emit('state:taskUpdated', { task, taskId });
    EventBus.emit('state:changed', _state);
  }

  function deleteTask(taskId) {
    const col = _getColumnOfTask(taskId);
    if (!col) return;
    const idx = col.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const [removed] = col.tasks.splice(idx, 1);
    _save();
    EventBus.emit('state:taskDeleted', { task: removed, colId: col.id });
    EventBus.emit('state:changed', _state);
  }

  /**
   * Déplacer une tâche entre colonnes / positions
   * Émet un CustomEvent natif 'taskMoved' sur document
   */
  function moveTask(taskId, targetColId, targetIndex = null) {
    const sourceCol = _getColumnOfTask(taskId);
    if (!sourceCol) return;
    const targetCol = _getColumn(targetColId);
    if (!targetCol) return;

    const taskIdx = sourceCol.tasks.findIndex(t => t.id === taskId);
    if (taskIdx === -1) return;

    const [task] = sourceCol.tasks.splice(taskIdx, 1);

    if (targetIndex !== null && targetIndex >= 0 && targetIndex <= targetCol.tasks.length) {
      targetCol.tasks.splice(targetIndex, 0, task);
    } else {
      targetCol.tasks.push(task);
    }

    _save();

    /* ── Custom Event natif ── */
    const nativeEvent = new CustomEvent('taskMoved', {
      bubbles: true,
      detail: {
        taskId,
        sourceColId: sourceCol.id,
        targetColId,
        targetIndex
      }
    });
    document.dispatchEvent(nativeEvent);

    EventBus.emit('state:taskMoved', {
      task,
      sourceColId: sourceCol.id,
      targetColId,
      targetIndex
    });
    EventBus.emit('state:changed', _state);
  }

  /** Réinitialiser au board de démo */
  function resetToDefault() {
    _state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    _save();
    EventBus.emit('state:reset', _state);
    EventBus.emit('state:changed', _state);
  }

  /** Statistiques globales */
  function getStats() {
    let total = 0;
    let done  = 0;
    _state.columns.forEach(col => {
      total += col.tasks.length;
      // Convention : dernière colonne = "Terminé"
      if (col.id === _state.columns[_state.columns.length - 1]?.id) {
        done += col.tasks.length;
      }
    });
    return { total, done };
  }

  return {
    getState,
    getColumnColor,
    getStats,
    addColumn,
    updateColumnTitle,
    deleteColumn,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    resetToDefault,
  };

})();
