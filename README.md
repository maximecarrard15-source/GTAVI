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
| `F` / `Entrée` | Monter / descendre d'un véhicule |
| `Espace` | Frein à main (drift) |
| `H` | Klaxon |
| `Échap` / `P` | Pause |

## 🚗 Contenu

- **Ville de Leonida** : grille d'avenues, immeubles art-déco pastel avec fenêtres
  éclairées la nuit, parc, plage et océan animés.
- **5 types de véhicules** (Cheetah GTS, Regalia, Taxi Vice, Bobcat, VCPD Cruiser)
  avec physique de drift, dégâts, fumée et explosions en chaîne.
- **Trafic et piétons** avec IA (conduite à droite, intersections, panique).
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

## 🧱 Stack

- HTML5 + CSS
- [three.js r128](https://threejs.org/) (vendorisé dans `js/vendor/`)
- JavaScript vanilla, aucun build, aucune dépendance runtime externe

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
js/main.js          Boucle de jeu, caméra, HUD, minimap
```
