/**
 * ════════════════════════════════════════════
 *  MODULE : EventBus  (Pattern Pub/Sub)
 *  Rôle   : Bus d'événements minimaliste
 *            permettant la communication
 *            découplée entre modules.
 * ════════════════════════════════════════════
 *
 *  USAGE :
 *    EventBus.on('taskMoved', handler)
 *    EventBus.emit('taskMoved', { taskId, targetColumnId })
 *    EventBus.off('taskMoved', handler)
 */

const EventBus = (() => {
  /** @type {Map<string, Set<Function>>} */
  const _listeners = new Map();

  /**
   * S'abonner à un événement
   * @param {string}   event   - Nom de l'événement
   * @param {Function} handler - Callback
   */
  function on(event, handler) {
    if (!_listeners.has(event)) {
      _listeners.set(event, new Set());
    }
    _listeners.get(event).add(handler);
  }

  /**
   * Se désabonner d'un événement
   * @param {string}   event
   * @param {Function} handler
   */
  function off(event, handler) {
    const set = _listeners.get(event);
    if (set) set.delete(handler);
  }

  /**
   * Émettre un événement avec une payload
   * @param {string} event
   * @param {*}      payload
   */
  function emit(event, payload) {
    const set = _listeners.get(event);
    if (!set) return;
    set.forEach(handler => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Erreur dans handler pour "${event}":`, err);
      }
    });
  }

  /**
   * S'abonner une seule fois
   * @param {string}   event
   * @param {Function} handler
   */
  function once(event, handler) {
    const wrapper = (payload) => {
      handler(payload);
      off(event, wrapper);
    };
    on(event, wrapper);
  }

  /** Vider tous les listeners (utile pour reset) */
  function clear() {
    _listeners.clear();
  }

  /** Debug: lister tous les événements actifs */
  function debug() {
    console.group('[EventBus] Listeners actifs');
    _listeners.forEach((handlers, event) => {
      console.log(`  ${event}: ${handlers.size} handler(s)`);
    });
    console.groupEnd();
  }

  return { on, off, emit, once, clear, debug };
})();
