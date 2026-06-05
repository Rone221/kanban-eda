/**
 * 
 *  MODULE : DragDrop
 *  Rôle   : Glisser-déposer natif (API HTML5)
 *            Les tâches sont déplaçables entre
 *            colonnes. Un CustomEvent 'taskMoved'
 *            est émis via State (découplé du DOM).
 * 
 */

const DragDrop = (() => {

  let _draggedTaskId  = null;
  let _sourceColId    = null;
  let _placeholder    = null;
  let _initialized    = false;

  /* ─── Initialisation ─── */
  function init() {
    /* Idempotent : les listeners sont délégués sur #board (qui persiste
       même après un re-render), inutile et dangereux de les reposer. */
    if (_initialized) return;
    _initialized = true;

    const $board = document.getElementById('board');

    /* ── DRAG START : délégué sur le board ── */
    $board.addEventListener('dragstart', (e) => {
      const $task = e.target.closest('.task-card');
      if (!$task) return;

      _draggedTaskId = $task.dataset.taskId;
      const $col     = $task.closest('.column');
      _sourceColId   = $col?.dataset.colId || null;

      /* Données transférées (compatibilité max) */
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', _draggedTaskId);

      /* Visuel : légère opacité sur la carte source */
      requestAnimationFrame(() => $task.classList.add('dragging'));

      /* Placeholder de drop */
      _placeholder = document.createElement('li');
      _placeholder.className = 'drop-placeholder';

      EventBus.emit('dnd:start', { taskId: _draggedTaskId, sourceColId: _sourceColId });
    });

    /* ── DRAG END ── */
    $board.addEventListener('dragend', (e) => {
      const $task = e.target.closest('.task-card');
      if ($task) $task.classList.remove('dragging');
      _cleanupDrag();
    });

    /* ── DRAG OVER : sur les task-list (zones de drop) ── */
    $board.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const $list = e.target.closest('.task-list');
      if (!$list) return;

      $list.classList.add('drag-active');
      $list.closest('.column').classList.add('drag-over');

      /* Position du placeholder */
      const afterEl = _getDragAfterElement($list, e.clientY);
      if (_placeholder.parentNode !== $list) {
        $list.appendChild(_placeholder);
      }
      if (afterEl) {
        $list.insertBefore(_placeholder, afterEl);
      }
    });

    /* ── DRAG LEAVE ── */
    $board.addEventListener('dragleave', (e) => {
      const $list = e.target.closest('.task-list');
      if ($list && !$list.contains(e.relatedTarget)) {
        $list.classList.remove('drag-active');
        $list.closest('.column').classList.remove('drag-over');
      }
    });

    /* ── DROP ── */
    $board.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!_draggedTaskId) return;

      const $list = e.target.closest('.task-list');
      if (!$list) return;

      const $targetCol  = $list.closest('.column');
      const targetColId = $targetCol?.dataset.colId;
      if (!targetColId) return;

      /* Index de drop basé sur la position du placeholder */
      const targetIndex = _getPlaceholderIndex($list);

      /* Nettoyage visuel immédiat */
      $list.classList.remove('drag-active');
      $targetCol.classList.remove('drag-over');

      /* ─── On délègue au State, PAS au DOM directement ───
         State émettra 'taskMoved' (CustomEvent natif + EventBus)
         qui déclenchera la mise à jour DOM via l'orchestrateur App.
      ─── */
      if (_draggedTaskId) {
        State.moveTask(_draggedTaskId, targetColId, targetIndex);
      }

      _cleanupDrag();
    });

    /* ─── Écoute du CustomEvent natif 'taskMoved' ─── */
    document.addEventListener('taskMoved', (e) => {
      const { sourceColId, targetColId } = e.detail;

      /* Mise à jour DOM : on resynchronise l'ordre des cartes des colonnes
         impactées à partir du State (source unique de vérité). Plus robuste
         qu'un calcul d'index, et impeccable pour le réordonnancement intra-colonne. */
      _syncColumnOrder(targetColId);
      if (sourceColId !== targetColId) _syncColumnOrder(sourceColId);

      /* Mise à jour badges */
      _updateBadge(sourceColId);
      _updateBadge(targetColId);
    });
  }

  /**
   * Réordonne (et rapatrie) les cartes DOM d'une colonne pour coller
   * exactement à l'ordre des tâches dans le State.
   * appendChild() déplace un nœud existant : itérer dans l'ordre du State
   * reconstruit donc l'ordre voulu sans recréer les cartes.
   */
  function _syncColumnOrder(colId) {
    const col   = State.getState().columns.find(c => c.id === colId);
    const $list = document.querySelector(`.column[data-col-id="${colId}"] .task-list`);
    if (!col || !$list) return;
    col.tasks.forEach(task => {
      const $card = document.querySelector(`.task-card[data-task-id="${task.id}"]`);
      if ($card) $list.appendChild($card);
    });
  }

  /* ─── Helpers ─── */

  /**
   * Détermine l'élément après lequel insérer le placeholder
   * en fonction de la position Y de la souris.
   */
  function _getDragAfterElement($list, y) {
    const draggables = Array.from(
      $list.querySelectorAll('.task-card:not(.dragging):not(.drop-placeholder)')
    );
    let closest = null;
    let closestOffset = Number.NEGATIVE_INFINITY;

    draggables.forEach(el => {
      const box    = el.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closestOffset) {
        closestOffset = offset;
        closest = el;
      }
    });
    return closest;
  }

  /**
   * Retourne l'index du placeholder dans la task-list
   */
  function _getPlaceholderIndex($list) {
    if (!_placeholder || _placeholder.parentNode !== $list) return null;
    /* On exclut la carte en cours de déplacement : l'index doit refléter
       la position d'insertion APRÈS retrait de la tâche de sa colonne source
       (cohérent avec State.moveTask qui retire puis insère). */
    const children = Array.from($list.children).filter(
      el => (el.classList.contains('task-card') && !el.classList.contains('dragging'))
            || el === _placeholder
    );
    const idx = children.indexOf(_placeholder);
    return idx === -1 ? null : idx;
  }

  function _cleanupDrag() {
    if (_placeholder && _placeholder.parentNode) {
      _placeholder.remove();
    }
    /* Retirer toutes les classes drag */
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    document.querySelectorAll('.drag-active').forEach(el => el.classList.remove('drag-active'));
    _draggedTaskId = null;
    _sourceColId   = null;
  }

  function _updateBadge(colId) {
    if (!colId) return;
    const $col = document.querySelector(`.column[data-col-id="${colId}"]`);
    if (!$col) return;
    const $badge   = $col.querySelector('.column-badge');
    const count    = $col.querySelectorAll('.task-card').length;
    if ($badge) $badge.textContent = count;
  }

  return { init };

})();
