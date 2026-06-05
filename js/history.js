/**
 * ════════════════════════════════════════════
 *  MODULE : History (Undo / Redo)
 *  Rôle   : Historique des actions via le PATTERN COMMANDE.
 *
 *  - Chaque mutation du State émet 'state:changed' (EDA).
 *    History écoute cet événement et fabrique, à la volée,
 *    une COMMANDE encapsulant l'action sous forme de paire
 *    d'instantanés (Memento) : { undo() -> état AVANT,
 *                                redo() -> état APRÈS }.
 *  - L'invocateur (ce module) empile ces commandes et sait
 *    les rejouer/annuler. 100 % découplé : il ne connaît PAS
 *    le détail des actions, seulement leur capacité à s'annuler.
 * ════════════════════════════════════════════
 */

const History = (() => {

  const MAX = 50;          // profondeur max de l'historique

  let _undoStack = [];     // commandes annulables
  let _redoStack = [];     // commandes rétablissables
  let _last      = null;   // instantané du dernier état "committé"
  let _applying  = false;  // garde : true pendant un undo/redo

  /* ─── Init : branchement sur l'EventBus ─── */
  function init() {
    _last = _clone(State.getState());

    /* Capture générique : toute mutation devient une commande. */
    EventBus.on('state:changed', (state) => {
      if (_applying) {
        // Mutation provoquée par un undo/redo : on resynchronise la
        // référence mais on N'ENREGISTRE PAS de nouvelle commande.
        _last = _clone(state);
        return;
      }
      const before = _last;
      const after  = _clone(state);
      _record(_makeCommand(before, after));
      _last = after;
    });

    _emitState();
  }

  /* ─── Fabrique de commande (Command pattern) ─── */
  function _makeCommand(before, after) {
    return {
      undo() { _apply(before); },
      redo() { _apply(after); },
    };
  }

  /* Applique un instantané sans ré-enregistrer de commande */
  function _apply(snapshot) {
    _applying = true;
    State.applySnapshot(snapshot);
    _applying = false;
    // Le board est ré-affiché par l'orchestrateur (App) sur cet événement.
    EventBus.emit('history:applied', State.getState());
  }

  /* ─── Empilement ─── */
  function _record(command) {
    _undoStack.push(command);
    if (_undoStack.length > MAX) _undoStack.shift();
    _redoStack = [];               // toute nouvelle action invalide le redo
    _emitState();
  }

  /* ─── Annuler ─── */
  function undo() {
    if (!_undoStack.length) return;
    const command = _undoStack.pop();
    command.undo();
    _redoStack.push(command);
    _emitState();
    EventBus.emit('notify:info', 'Action annulée.');
  }

  /* ─── Rétablir ─── */
  function redo() {
    if (!_redoStack.length) return;
    const command = _redoStack.pop();
    command.redo();
    _undoStack.push(command);
    _emitState();
    EventBus.emit('notify:info', 'Action rétablie.');
  }

  /* ─── Notifie l'état des piles (pour activer/désactiver les boutons) ─── */
  function _emitState() {
    EventBus.emit('history:changed', {
      canUndo: _undoStack.length > 0,
      canRedo: _redoStack.length > 0,
    });
  }

  function _clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  return { init, undo, redo };

})();
