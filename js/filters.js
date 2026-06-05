/**
 * ════════════════════════════════════════════
 *  MODULE : Filters
 *  Rôle   : Filtrage textuel et par priorité
 *            sans rechargement de page.
 *            Opère directement sur le DOM.
 * ════════════════════════════════════════════
 */

const Filters = (() => {

  const $searchInput   = document.getElementById('search-input');
  const $searchClear   = document.getElementById('search-clear');
  const $priorityBtns  = document.querySelectorAll('[data-filter-priority]');

  let _currentSearch   = '';
  let _currentPriority = 'all';
  let _debounceTimer   = null;

  /* ─── Init ─── */
  function init() {
    /* Recherche textuelle avec debounce */
    $searchInput.addEventListener('input', (e) => {
      _currentSearch = e.target.value;
      $searchClear.hidden = !_currentSearch;

      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(() => {
        DOM.filterTasksBySearch(_currentSearch);
        EventBus.emit('filter:searchChanged', { term: _currentSearch });
      }, 180);
    });

    /* Bouton clear */
    $searchClear.addEventListener('click', () => {
      $searchInput.value = '';
      _currentSearch = '';
      $searchClear.hidden = true;
      DOM.filterTasksBySearch('');
    });

    /* Priorité */
    $priorityBtns.forEach($btn => {
      $btn.addEventListener('click', () => {
        _currentPriority = $btn.dataset.filterPriority;

        /* Mise à jour visuelle des boutons */
        $priorityBtns.forEach(b => b.classList.remove('active'));
        $btn.classList.add('active');

        DOM.filterTasksByPriority(_currentPriority);
        EventBus.emit('filter:priorityChanged', { priority: _currentPriority });
      });
    });

    /* Ré-appliquer filtres après tout changement d'état */
    EventBus.on('state:changed', () => {
      if (_currentSearch)              DOM.filterTasksBySearch(_currentSearch);
      if (_currentPriority !== 'all')  DOM.filterTasksByPriority(_currentPriority);
    });
  }

  /** Réinitialiser tous les filtres (appelé au reset board) */
  function reset() {
    $searchInput.value = '';
    _currentSearch     = '';
    _currentPriority   = 'all';
    $searchClear.hidden = true;
    $priorityBtns.forEach(b => b.classList.remove('active'));
    document.querySelector('[data-filter-priority="all"]')?.classList.add('active');
  }

  return { init, reset };

})();
