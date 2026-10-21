# Mon Campus Compta Cuisine
Campus indépendant en français. Site statique compatible GitHub Pages, non certifiant.

## Module 01
Six séquences développées, dix TD avec tentatives et retour formatif, quiz de douze questions (seuil 70 %, soit 9/12), PEC écrite avec barème distinct sur 20. Guide et manuel intégralement accessibles sur le site. Un seul cas cumulatif : Auberge des Cimes SAS, fictive. TVA, amortissements, intérêts et impôt neutralisés.

## Sources et génération
- module-content.js : contenu commun des séquences, TD, quiz et opérations.
- module-app.js : progression, brouillons, contrôles, export/import.
- build-pages.cjs : génération des pages HTML, lancer node build-pages.cjs.
- node tests/module.test.cjs : vérifications du cas, des liens et des parcours.

## Sauvegarde et limites
Notes, TD et PEC sont conservés dans le navigateur ; export/import JSON pour transférer le travail et export TXT pour la PEC. Les anciens brouillons campus_pec01_v1 sont conservés. La progression v2 n’attribue pas de réussite aux anciennes leçons sur la seule base d’un clic. Le quiz ne note pas la PEC ; pas de remise serveur ni de correction authentifiée. Le module 02 reste en préparation. Les réponses formatives sont publiques dans ce site statique ; aucun corrigé privé de PEC n’est ajouté.

## Publication
Les pages se servent sans compilation serveur. La publication dépend de la configuration GitHub Pages du dépôt.
