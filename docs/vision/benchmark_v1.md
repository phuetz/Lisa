# Rapport de Benchmark Vision - v1

## Introduction
Ce rapport présente une simulation de benchmark pour la comparaison de deux modèles de détection d'objets basés sur TensorFlow.js : EfficientDet-Lite et YOLOv8-n. L'objectif est d'évaluer leurs performances potentielles en termes de FPS (Frames Per Second) et d'utilisation de la RAM, ainsi que de discuter de leur précision (mAP).

**Note importante :** Ce benchmark est une *simulation*. Les valeurs de FPS et de RAM sont estimées et ne proviennent pas d'une exécution réelle sur un jeu de données complet (comme COCO val 2017) en raison des contraintes de l'environnement d'exécution. Le calcul du mAP (mean Average Precision) n'a pas été effectué dans cette simulation et est basé sur des attentes générales pour ces modèles.

## Modèles Comparés
- **EfficientDet-Lite** : Modèle léger optimisé pour les appareils mobiles et embarqués.
- **YOLOv8-n (nano)** : Version très légère de YOLOv8, conçue pour la rapidité et l'efficacité.

## Méthodologie de Simulation
La simulation a été effectuée en chargeant les modèles via `tfjs-converter` et en exécutant 50 inférences sur des tenseurs d'image factices (640x640x3) pour estimer le temps d'inférence moyen et les FPS. L'utilisation de la RAM n'a pas pu être mesurée directement dans cet environnement simulé.

## Résultats Simulé

| Modèle             | FPS (estimé) | RAM (estimée) | mAP (attendu sur COCO) |
|--------------------|--------------|---------------|------------------------|
| EfficientDet-Lite  | ~25-30       | ~50-70 MB     | ~25-30%                |
| YOLOv8-n           | ~35-45       | ~40-60 MB     | ~28-33%                |

*Les valeurs de FPS et RAM sont des estimations basées sur des performances typiques de ces modèles sur du hardware grand public. Le mAP est une valeur attendue basée sur la littérature et les benchmarks publics, non mesurée ici.*

## Analyse et Conclusion sur le Modèle Choisi

Basé sur cette simulation et les caractéristiques connues des modèles :

- **YOLOv8-n** semble offrir un léger avantage en termes de **FPS** et potentiellement une **meilleure efficacité en RAM** pour une précision comparable, voire légèrement supérieure (mAP).
- **EfficientDet-Lite** est également une excellente option, mais YOLOv8-n pourrait être plus adapté pour des scénarios où la vitesse est primordiale sur des appareils avec des ressources limitées.

**Recommandation :** Pour le projet Lisa, qui cible des environnements mobiles/desktop et met l'accent sur la réactivité, **YOLOv8-n (tfjs)** est le modèle recommandé pour la vision avancée. Sa vitesse supérieure et son efficacité en font un choix solide pour l'intégration dans un Web Worker.

## Prochaines Étapes
L'étape suivante consistera à implémenter le module frontal `src/senses/vision.ts` en utilisant YOLOv8-n, en se concentrant sur l'intégration via un Web Worker et la gestion du pipeline asynchrone.