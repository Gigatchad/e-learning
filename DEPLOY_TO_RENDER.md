# 🚀 Guide de Déploiement sur Render

Ce projet est configuré pour être déployé facilement sur [Render.com](https://render.com).

## Prérequis

1. Avoir un compte sur [Render](https://dashboard.render.com/).
2. Avoir le code du projet sur un dépôt GitHub ou GitLab.

## Étape 1 : Base de Données (MySQL)

Render ne propose pas de MySQL gratuit (seulement PostgreSQL). Pour une base MySQL, vous avez deux choix :

### Option A : Render Managed MySQL (Payant - Recommandé pour la simplicité)
Si vous choisissez cette option, vous pouvez configurer la base directement dans le fichier `render.yaml` (en décommentant la section `databases`) ou via le tableau de bord Render.

### Option B : Base de données externe (Gratuit ou moins cher)
Vous pouvez utiliser un fournisseur externe qui offre une base MySQL gratuite ou à bas coût :
*   **Aiven** (Offre gratuite disponible)
*   **Clever Cloud** (Offre gratuite disponible pour testing)
*   **PlanetScale** (Payant mais performant)

**Notez bien les informations de connexion** fournis par votre hébergeur de base de données :
*   Host (Hôte)
*   Port (souvent 3306)
*   User
*   Password
*   Database Name

---

## Étape 2 : Déployer l'application

### Méthode Automatique (Blueprint)

1. Allez dans le Dashboard Render > **Blueprints**.
2. Cliquez sur **New Blueprint Instance**.
3. Connectez votre dépôt GitHub/GitLab.
4. Render va détecter le fichier `render.yaml`.
5. Il vous demandera de remplir les variables d'environnement manquantes (celles de la base de données) :
    *   `DB_HOST`
    *   `DB_USER`
    *   `DB_PASSWORD`
6. Cliquez sur **Apply**. 

**Note :** Render va automatiquement :
1. Construire le **Frontend** (React/Vite).
2. Installer les dépendances du **Backend**.
3. Créer une image Docker unique contenant les deux.
4. Déployer l'ensemble.

### Méthode Manuelle

1. Allez dans le Dashboard Render > **New +** > **Web Service**.
2. Connectez votre dépôt.
3. Choisissez **Docker** comme "Runtime".
4. Dans la section **Environment Variables**, ajoutez :
    *   `NODE_ENV` = `production`
    *   `CORS_ORIGIN` = (URL de votre futur service Render, ou `*`)
    *   `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
    *   `JWT_SECRET`, `JWT_REFRESH_SECRET`
5. Lancez le déploiement.

## Vérification

Une fois déployé :
1. Render vous donnera une URL (ex: `https://mon-projet.onrender.com`).
2. Ouvrez cette URL. Votre application **Frontend (React)** s'affichera directement.
3. Le **Backend (API)** est accessible sur la même URL via `/api/...`.
4. La documentation API reste disponible sur `/api-docs`.
