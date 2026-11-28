# GRAND THEFT AUTO VI — Fan Edition 3D 🌴

Un mini « GTA-like » 3D (WebGL / three.js) dans l'univers de **Vice City / Leonida** :
grande ville ouverte, voitures volables, police avec étoiles de recherche, missions,
vue 1ʳᵉ/3ᵉ personne, cycle jour/nuit rendus ACES + bloom, et sons 100 % procéduraux
(WebAudio).

> Projet fan hommage, **non affilié** à Rockstar Games.

## 🎮 Jouer

Ouvre simplement `index.html` dans un navigateur moderne (aucun build requis).
Ou active GitHub Pages (`Settings > Pages > branche main`) pour y jouer en ligne.

## Contrôles

| Touche | Action |
|---|---|
| `W A S D` / Flèches | Marcher · Conduire |
| Souris + Clic gauche | Viser et tirer |
| `F` / `Entrée` | Monter / descendre d'un véhicule · Entrer dans un bâtiment |
| `V` | Vue 1re / 3e personne |
| `Espace` | Frein à main (drift) |
| `H` | Klaxon |
| `1` / `2` / `3` / `4` / `5` | Pistolet / SMG / Fusil à pompe / Sniper / Mitrailleuse |
| `Espace` (à pied) | Sauter |
| `Maj` (à pied) | Sprinter (x1,9) |
| `Échap` / `P` | Pause |

## 🚗 Contenu

- **Grande ville de Leonida** (×2,4) : grille d'avenues, immeubles art-déco pastel
  avec rez-de-chaussée commerciaux, fenêtres éclairées la nuit, antennes et feux
  clignotants sur les tours, lampadaires, parc, plage et océan animé.
- **Rendu** : tone mapping ACES, bloom + antialiasing FXAA (désactivables en pause),
  ciel dégradé jour/nuit avec étoiles et soleil, ombres douces.
- **Textures refaites de A à Z** (512px, anisotropes) : asphalte fissuré avec
  nappes d'huile et bandes d'usure, trottoirs carrelés tachés, herbe touffue,
  sable ridé, eau avec caustiques, façades à 16 étages avec pilastres, corniches,
  rideaux, climatiseurs, enseignes de commerces et auvents rayés.
- **Détails urbains** : plaques d'égout, bornes incendie, poubelles, bancs dans
  les parcs, feux tricolores, voitures garées le long des trottoirs (toutes
  volables).
- **5 types de véhicules** (Cheetah GTS, Regalia, Taxi Vice, Bobcat, VCPD Cruiser)
  avec physique de drift, dégâts, fumée et explosions en chaîne — désormais très
  détaillés et reconnaissables : poignées de porte chromées, calandres avant,
  plaques, antennes (sans toit de pickup), pots d'échappement chromés avec
  embouts sombres, galeries de toit, siderails et roue de secours spécifiques
  à chaque type.
- **Trafic et piétons** avec IA (conduite à droite, intersections, panique),
  piétons animés (jambes/bras), rétroviseurs, jantes et plaques sur les véhicules.
- **Vue 1ʳᵉ / 3ᵉ personne** : touche `V` pour basculer (à pied et au volant).
- **Intérieurs visitables** : 8 lieux (Malibu Club, Café Néon, Hôtel Flamingo…) —
  portes orange sur les façades, **F pour entrer/sortir**, bar, barman, canapé,
  caisse d'argent à récolter — et une planque parfaite pour semer la police.
- **Mort** : le personnage s'effondre à plat au sol (animé) avant l'écran WASTED.
- **Police VCPD** : 5 étoiles de recherche, poursuites, gyrophare + sirène,
  tirs d'agents, **patrouilles ambiantes** — 2 voitures de police roulent
  normalement dans la ville même à 0 étoile et deviennent hostiles dès que tu
  commets un crime — **policiers à pied armés** dès 2 étoiles (ils te courent
  dessus et tirent, et peuvent aussi te placer une arrestation), BUSTED et WASTED.
- **Arsenal** : Pistolet, SMG, Fusil à pompe, Sniper, Mitrailleuse — touches
  `1`/`2`/`3`/`4`/`5` pour changer d'arme ; caisses d'armes dissimulées dans les
  bâtiments visitables (chaque intérieur contient un type d'arme, réapprovisionnable
  après cooldown).
- **Saut** : `Espace` à pied pour sauter.
- **Sprint** : `Maj` à pied pour courir presque deux fois plus vite.
- **Anti-scintillement en altitude** : les couches du sol (trottoirs, routes,
  marquages, passages piétons, plaques d'égout) sont désormais clairement
  séparées en profondeur — plus de clignotement blanc quand tu regardes la
  ville depuis un avion.
- **Aéroport international** sur une île au coin sud-est de la carte (pont d'accès
  depuis la plage, à pied ou en voiture) : piste diagonale avec seuils, numéros
  et feux de bord, terminal, tour de contrôle, hangar.
- **3 avions de ligne** (livrées rouge/bleu/jaune) : décollage, montée,
  **traversée en diagonale de toute la ville** jusqu'au coin opposé, demi-tour,
  retour et atterrissage sur l'île — en boucle continue, phare clignotant et
  train rentrant. **Monte dessus avec `F`** quand il est au sol : tu restes
  accroché (tu ne tombes **jamais** — les bords te retiennent, tu n'es forcé
  de descendre que si tu sautes) et tu peux marcher sur tout le fuselage et
  les ailes pendant le vol.
- **Pilotage d'avion** : une fois à bord, appuie sur **`R`** pour prendre les
  commandes — `W`/`S` : gaz, `A`/`D` : virage (avec inclinaison), `Espace` :
  monter, `Maj` : descendre. Rappuie sur `R` (ou saute) pour rendre le contrôle :
  le pilote automatique reprend et ramène l'avion à l'aéroport tout seul.
  Tu peux aussi rester simplement passager pendant que l'IA vole.
- **Entrées de bâtiments** balisées : colonne de lumière orange pulsante + cadre
  doré + blip orange sur la minimap.
- **Trafic pacifié** : les IA ralentissent bien avant le véhicule devant elles et
  ne s'entre-détruisent plus (ni collisions, ni explosions en chaîne) ; les poteaux
  de feux tricolores ont été retirés des carrefours.
- **4 missions** : Livraison Express, Vice Rush (course à checkpoints),
  Chasseur de primes, Contrebande.
- **Chasseur de primes amélioré** : le fugitif est plus lent, **fuit le long des
  routes** (il ne se coince plus entre les immeubles) et tu peux l'**abattre à
  l'arme à feu** en plus de le percuter en voiture — les deux valident la mission.
- **Navigation de mission impossible à rater** : chaque marqueur (départ,
  destination, checkpoints, colis) est surmonté d'une **colonne de lumière
  géante pulsante** visible de très loin ; une **flèche de direction + distance
  en mètres** s'affiche en haut de l'écran et tourne vers l'objectif ; blip
  blanc pulsant sur la minimap ; distance affichée en direct dans l'objectif.
  La destination de livraison est choisie à distance raisonnable (< 170 m) et
  la zone d'arrivée a été élargie.
- **Pay'n'Spray** ($300) pour effacer le wanted, hôpital pour respawn.
- **Pickups** : santé, armure, cash, munitions SMG.
- **Tchat + commandes** : `T` ouvre le tchat (solo et multi) — `/time set day`,
  `/time set night` ou `/time set 14` pour régler l'heure.
- **Cycle jour/nuit** complet (phares, fenêtres, éclairage ambiant).
- **Minimap** avec blips (missions, police, hôpital, spray, pickups).
- **Sons procéduraux** : moteur dépendant de la vitesse, klaxon, sirène,
  tirs, crashes, explosions.

## 🌐 Multijoueur (nouveau !)

Mode **pair-à-pair via WebRTC** (PeerJS) — hébergé directement dans les navigateurs,
aucun serveur de jeu à déployer :

1. Menu → **MULTIJOUEUR** → **HÉBERGER** : un code à 5 lettres est généré (ex. `KLMXP`).
2. Envoie le code à tes amis → ils cliquent **REJOINDRE** avec le code.
3. Monde partagé : positions, véhicules volés, police, pickups et **chat** (touche `T`).

Détails techniques (`js/net.js`) :
- Topologie étoile : l'hôte fait tourner la simulation (trafic, piétons, police,
  dégâts) et diffuse 15 snapshots/s ; les clients prédisent localement
  leur propre voiture.
- **Chat relayé par l'hôte**, messages système (arrivées/départs).
- Nomme-tags au-dessus des autres joueurs, blips violets sur la minimap.
- **Missions pour tous** : chaque joueur (hôte ou client) lance et termine
  ses propres missions localement.
- **PvP** : les joueurs peuvent se tirer dessus — les impacts entre joueurs sont
  détectés par l'hôte et synchronisés à tous (dégâts + toast « Touché par un
  joueur ! »).

## 🧱 Stack

- HTML5 + CSS
- [three.js r128](https://threejs.org/) + [PeerJS 1.5](https://peerjs.com/) (vendorisés dans `js/vendor/`)
- JavaScript vanilla, aucun build, signalling P2P gratuit PeerJS Cloud

## Structure

```
index.html          Page + HUD + menus
css/style.css       Style HUD néon Vice City
js/vendor/three.min.js
js/audio.js         Moteur WebAudio procédural
js/input.js         Clavier / souris
js/world3d.js       Génération de la ville + collisions
js/entities3d.js    Voitures, piétons, joueur
js/police.js        Système de recherche + IA police
js/missions.js      Système de missions
js/net.js           Multijoueur P2P (PeerJS) + chat
js/main.js          Boucle de jeu, caméra, HUD, minimap
```
