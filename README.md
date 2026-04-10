# Quiz Celine Dion

Une web-app quiz en React + Vite avec :
- classement partagé en production via fonctions Vercel + Postgres compatible Neon
- une seule tentative par pseudo
- 20 questions QCM sur la vie et la carrière de Céline Dion
- chronomètre en temps réel
- affichage des parties en cours
- écran de résultats avec classement global

## Développement local

Le front Vite continue à utiliser `json-server` en local.

```bash
npm install
npm run api
```

Dans un second terminal :

```bash
npm run dev
```

Le site tourne sur [http://localhost:5173](http://localhost:5173) et l'API locale sur [http://localhost:3001](http://localhost:3001).

## Production sur Vercel

En production, le front appelle les routes :
- `/api/state`
- `/api/start-quiz`
- `/api/finish-quiz`
- `/api/active-games/[id]`

Pour que le classement partagé fonctionne sur Vercel, il faut connecter une base Postgres/Neon au projet et exposer `DATABASE_URL`.

Une fois la base connectée :
1. redéployer le projet sur Vercel
2. ouvrir le site déployé
3. les scores et parties en cours seront alors persistés côté serveur

Sans `DATABASE_URL`, les routes `/api` répondent avec un message de configuration manquante.

## Structure

```text
api/                     # Fonctions Vercel pour la prod
server/                  # Helpers serveur + accès stockage
src/
├── assets/             # Visuels de l'affiche et logos
├── components/
│   ├── Welcome.jsx     # Accueil, règles, classement et parties en cours
│   ├── Quiz.jsx        # Questions QCM + chrono + progression live
│   └── Result.jsx      # Résultat individuel + classement
├── questions.js        # Les 20 questions
├── App.jsx             # Client front (mode local + mode Vercel)
└── App.css             # Direction artistique et styles
db.json                 # Données locales pour json-server
```
