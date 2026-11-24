# GRAND THEFT AUTO VI — Fan Edition 3D 🌴

Un mini « GTA-like » 3D (WebGL / three.js) dans l'univers de **Vice City / Leonida** :
ville ouverte, voitures volables, police avec étoiles de recherche, missions, cycle
jour/nuit et sons 100 % procéduraux (WebAudio).

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
| `Espace` | Frein à main (drift) |
| `H` | Klaxon |
| `Échap` / `P` | Pause |

## 🚗 Contenu

- **Ville de Leonida** : grille d'avenues, immeubles art-déco pastel avec fenêtres
  éclairées la nuit, parc, plage et océan animés.
- **5 types de véhicules** (Cheetah GTS, Regalia, Taxi Vice, Bobcat, VCPD Cruiser)
  avec physique de drift, dégâts, fumée et explosions en chaîne.
- **Trafic et piétons** avec IA (conduite à droite, intersections, panique).
- **Intérieurs visitables** : 8 lieux (Malibu Club, Café Néon, Hôtel Flamingo…) —
  portes orange sur les façades, **F pour entrer/sortir**, bar, barman, canapé,
  caisse d'argent à récolter — et une planque parfaite pour semer la police.
- **Police VCPD** : 5 étoiles de recherche, poursuites, gyrophare + sirène,
  tirs d'agents, arrestation (BUSTED) et mort (WASTED).
- **4 missions** : Livraison Express, Vice Rush (course à checkpoints),
  Chasseur de primes, Contrebande.
- **Pay'n'Spray** ($300) pour effacer le wanted, hôpital pour respawn.
- **Pickups** : santé, armure, cash, munitions SMG.
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
  missions, dégâts) et diffuse 15 snapshots/s ; les clients prédisent localement
  leur propre voiture.
- Chat relayé par l'hôte, messages système (arrivées/départs).
- Nomme-tags au-dessus des autres joueurs, blips violets sur la minimap.
- Seul l'hôte termine les missions pour le moment.

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
