# BallThrower — guide des paramètres

Script attaché à l'entité **`Ball`** dans la scène PlayCanvas.
Tous les réglages ci-dessous sont modifiables dans l'**Inspector** (entité `Ball` → script `ballThrower`) — aucune modification de code nécessaire.

Fichier source : `simplified/scripts/ballThrower.js` (asset PlayCanvas `312310011`).

---

## Références de scène

| Paramètre | Type | Valeur | Description |
|---|---|---|---|
| `hoop` | entity | `HoopZone` | L'entité placée au **centre de l'anneau** (hauteur du cercle). Toute la visée et la détection de panier se basent sur sa position. |
| `visual` | entity | `Ball_01` | L'enfant contenant le **mesh** de la balle. C'est lui qui tourne (effets) pour que les lumières accrochées à l'entité racine restent fixes. **Sa position locale doit rester `[0, 0, 0]`** : tout décalage fait afficher la balle à côté de sa position physique (elle semble alors traverser l'anneau ou passer devant le filet). Pour déplacer la balle, bouge l'entité `Ball`, jamais `Ball_01`. |

## Physique de base

| Paramètre | Défaut | Description |
|---|---|---|
| `gravity` | `9.8` | Gravité en m/s², utilisée pour le calcul de la parabole et pour tous les rebonds. Augmenter = balle plus "lourde" et arcs plus rapides. |
| `ballRadius` | `0.525` | Rayon de la balle en mètres, utilisé pour les collisions (anneau, panneau, sol). Doit correspondre à la taille visuelle réelle. |

## Tir (trajectoire en cloche)

Le tir est une **parabole en cloche** : la balle monte jusqu'à un sommet situé `arcHeight` au-dessus de l'anneau, puis retombe dedans. Ce n'est pas un tir tendu.

| Paramètre | Défaut | Description |
|---|---|---|
| `arcHeight` | `1.8` | **Hauteur du sommet de l'arc au-dessus de l'anneau** (m). Plus grand = tir plus clochant/lobé ; plus petit = tir plus tendu. C'est le réglage principal de la forme du tir. |
| `shotSpeed` | `1.15` | **Multiplicateur de vitesse** : accélère toute la trajectoire sans changer sa forme (`>1` = plus rapide, `<1` = plus lent). Augmenter `shotSpeed` est la bonne façon d'accélérer la balle sans aplatir l'arc. |
| `airDrag` | `1.5` | **Freinage en vol** (1/s) combiné à la gravité sur les 3 axes : la balle part très fort au début puis décélère progressivement pendant toute la montée jusqu'au sommet de la cloche. Plus grand = départ plus explosif et ralentissement plus marqué en haut ; `0` = vitesse horizontale constante. |
| `fullPowerSwipe` | `350` | Longueur de swipe en pixels correspondant à la puissance maximale. Un swipe de 350 px = puissance 1.0. |
| `lateralFactor` | `0.006` | Décalage latéral de la visée (en m) par pixel de glissé horizontal. Un swipe diagonal de ±100 px décale la cible de ±0,6 m. `0` = toujours viser le centre. |
| `perfectPower` | `0.7` | Puissance de swipe (0–1) qui tombe **exactement au centre** de l'anneau. Le "sweet spot" du geste. Avec `fullPowerSwipe` 350 → 245 px. |
| `depthFactor` | `1.6` | Erreur de profondeur (en m) par unité d'écart à `perfectPower`. Un swipe trop faible tombe court, trop fort tombe long. `0` = tous les tirs centrés en profondeur (trop facile). |

## Anneau (rim)

Collision réelle contre le **tore** de l'anneau : la balle rebondit au lieu de le traverser.

| Paramètre | Défaut | Description |
|---|---|---|
| `rimRadius` | `0.92` | Rayon de l'anneau (m), mesuré au centre du tube métallique. |
| `rimTube` | `0.05` | Épaisseur (rayon) du tube de l'anneau (m). `ballRadius + rimTube` = distance de contact. Réduire élargit la zone de passage propre → marquer devient plus facile. |
| `rimBounce` | `0.6` | Rebond sur l'anneau (0–1). `0` = la balle colle à l'anneau, `1` = rebond parfaitement élastique. |

## Panneau (backboard)

| Paramètre | Défaut | Description |
|---|---|---|
| `backboardZ` | `7.35` | Position Z de la face avant du panneau (m). |
| `boardHalfWidth` | `2.9` | Demi-largeur du panneau (m). Au-delà, pas de collision. |
| `boardBottom` | `3.4` | Bord bas du panneau (m, hauteur Y). |
| `boardTop` | `7.2` | Bord haut du panneau (m, hauteur Y). |
| `boardBounce` | `0.6` | Rebond sur le panneau (0–1). |

## Sol et roulement

| Paramètre | Défaut | Description |
|---|---|---|
| `floorY` | `-2.63` | Hauteur Y du centre de la balle quand elle repose au sol (= vrai sol de l'arène + rayon). Si la balle semble flotter ou s'enfoncer, ajuster ici. |
| `bounce` | `0.55` | Rebond au sol (0–1). `0` = la balle s'écrase, `1` = rebond infini. |
| `minBounceSpeed` | `0.8` | Vitesse verticale (m/s) en dessous de laquelle la balle arrête de rebondir et se met à **rouler**. |
| `floorFriction` | `0.85` | Fraction de la vitesse horizontale conservée à chaque rebond au sol (plus proche de 1 = glisse plus). |
| `rollFriction` | `1.5` | Freinage du roulement par seconde (plus grand = la balle s'arrête plus vite). |
| `netDrag` | `0.35` | Fraction de la vitesse horizontale conservée quand la balle **traverse le filet** après un panier (le filet "attrape" la balle). |
| `netDepth` | `1.3` | Longueur du filet sous l'anneau (m) : zone dans laquelle le filet guide la balle. |
| `netPull` | `15` | Force avec laquelle le filet recentre la balle sur son axe pendant qu'elle le traverse (1/s). Plus grand = la balle tombe bien droit au centre du filet ; `0` = aucun guidage (la balle peut sortir par le côté du filet). |

## Position de départ (demi-arc)

À chaque nouveau tir, la balle réapparaît à un angle légèrement différent sur un **arc de cercle autour du panier** (la caméra suit la même rotation, donc le panier reste cadré).

| Paramètre | Défaut | Description |
|---|---|---|
| `spawnArc` | `40` | Demi-amplitude de l'arc en degrés : le spawn peut aller de -40° à +40° autour du panier. `0` = position de départ fixe. |
| `arcStepMin` | `6` | Rotation minimale du spawn entre deux tirs (degrés). |
| `arcStepMax` | `14` | Rotation maximale du spawn entre deux tirs (degrés). La valeur réelle est aléatoire entre min et max, direction alternée aux limites. |

## Reset et limites

| Paramètre | Défaut | Description |
|---|---|---|
| `resetDelay` | `2.2` | Secondes après le **premier contact avec le sol** avant la réapparition de la balle (laisse le temps de la voir rouler). |
| `maxFlightDuration` | `6` | Durée maximale d'un tir en secondes — sécurité si la balle reste coincée quelque part. |
| `boundsZ` | `14` | Limite en profondeur (m). Si la balle dépasse, réapparition immédiate. |
| `boundsX` | `10` | Limite latérale (m). Idem. |

## Mouvement visuel

| Paramètre | Défaut | Description |
|---|---|---|
| `backSpin` | `240` | Vitesse de l'**effet rétro** en vol (deg/s) — la balle tourne vers l'arrière comme un vrai tir. `0` = pas d'effet. |
| `sideSpinFactor` | `1.5` | Effet latéral (deg/s) par pixel de glissé horizontal — un swipe de travers fait tourner la balle de côté. |
| `floatAmplitude` | `0` | Amplitude du flottement vertical au repos (m). `0` = balle parfaitement immobile (actuel). Remettre ~`0.1` pour un léger lévitation. |
| `floatSpeed` | `2.4` | Vitesse du flottement au repos (rad/s). Sans effet si `floatAmplitude` = 0. |
| `idleSpin` | `[0,0,0]` | Rotation au repos en deg/s sur les axes X, Y, Z. `[0,0,0]` = aucune rotation. Remettre ex. `[0,15,0]` pour une lente rotation de présentation. |

## Traînée (trail)

Ruban semi-transparent dessiné derrière le ballon pendant le vol pour visualiser la trajectoire.

| Paramètre | Défaut | Description |
|---|---|---|
| `trailOpacity` | `0.42` | Opacité maximale de la traînée juste derrière le ballon (0–1). `0` = désactive complètement la traînée. |
| `trailDuration` | `0.42` | Durée de vie des points de la traînée en secondes (plus grand = traînée plus longue). |
| `trailWidth` | `0.65` | Largeur initiale de la traînée derrière le ballon (m), qui s'affine progressivement vers la pointe. |
| `trailColor` | `[1,1,1]` | Couleur RVB de la traînée (blanc par défaut). |

---

## Logique de score (rappel)

- **+2 (swish)** : la balle traverse l'anneau sans jamais toucher le tube.
- **+1** : la balle a touché l'anneau puis est rentrée.
- **0** : la balle rebondit sur l'anneau ou le panneau sans rentrer — pas de point, rebond réaliste.

## Recettes rapides

| Je veux… | Modifier |
|---|---|
| Tir plus rapide sans changer l'arc | `shotSpeed` ↑ (ex. 1.5) |
| Arc plus lobé / plus tendu | `arcHeight` ↑ / ↓ |
| Marquer plus facilement | `rimTube` ↓ (ex. 0.03) ou `depthFactor` ↓ |
| Swipe moins sensible latéralement | `lateralFactor` ↓ |
| Balle qui rebondit plus haut | `bounce` ↑ et/ou `rimBounce` ↑ |
| Zone de départ fixe | `spawnArc` = 0 |
| Balle qui lévite au repos | `floatAmplitude` ≈ 0.1 |
