# FlowBoard — Kanban en Architecture Événementielle (EDA)

> **Projet 1** du sujet « Développement web 2.0 » — ESTM Master 1.
> Un tableau Kanban (style Trello) construit en **JavaScript vanilla**, sans aucun
> framework, suivant une **architecture pilotée par les événements** (Event-Driven
> Architecture) avec un bus d'événements central (pattern Publish/Subscribe).

## Fonctionnalités

- Colonnes et cartes : ajout, édition, suppression
- **Glisser-déposer** des cartes entre colonnes et réordonnancement
- **Filtres / recherche** en temps réel
- **Notifications** (toasts) sur les actions
- **Persistance** automatique dans le `localStorage`
- Modale d'édition réutilisable

## Architecture EDA

L'application est découpée en modules indépendants qui **ne se parlent jamais
directement** : ils communiquent uniquement via un **bus d'événements** (`EventBus`,
pattern Pub/Sub). Le flux unidirectionnel est :

```
UI (clic, drag…)  ──émet──►  EventBus  ──►  State (source de vérité)
                                                │
State (après mutation)  ──émet──►  EventBus  ──►  DOM (rendu)  +  localStorage
```

| Module | Rôle |
|---|---|
| `js/eventBus.js` | Bus d'événements central (`on` / `emit` / `off`) — Pub/Sub |
| `js/state.js` | Source de vérité unique + persistance localStorage |
| `js/dom.js` | Rendu du tableau à partir de l'état (template `<template>`, délégation d'événements) |
| `js/dragDrop.js` | Glisser-déposer (HTML5 Drag & Drop) |
| `js/modal.js` | Modale d'édition de carte |
| `js/filters.js` | Filtrage / recherche |
| `js/notifications.js` | Toasts |
| `js/app.js` | Orchestrateur : branche UI → State → DOM via l'EventBus |

Principes respectés : `<template>` pour le clonage, **délégation d'événements**,
`CustomEvent` / bus Pub/Sub, flux de données unidirectionnel, aucun couplage direct
entre modules.

## Lancer le projet

Aucune dépendance, aucun build. Ouvrez simplement `index.html` dans un navigateur,
ou servez le dossier :

```bash
# avec un petit serveur statique au choix
npx serve .
# ou
python -m http.server 8080
```

Puis ouvrez http://localhost:8080.
