# Quiz Celine Dion

Une web-app quiz en React + Vite avec :
- classement partagé pour tous les participants via `json-server`
- une seule tentative par pseudo
- 20 questions QCM sur la vie et la carrière de Céline Dion
- chronomètre en temps réel
- affichage des parties en cours
- écran de résultats avec classement global

## Lancer le projet

```bash
npm install
npm run api
```

Dans un second terminal :

```bash
npm run dev
```

L'application web tourne sur [http://localhost:5173](http://localhost:5173) et l'API partagée sur [http://localhost:3001](http://localhost:3001).

## Structure

```text
src/
├── assets/             # Visuels de l'affiche et logos
├── components/
│   ├── Welcome.jsx     # Accueil, règles, classement et parties en cours
│   ├── Quiz.jsx        # Questions QCM + chrono + progression live
│   └── Result.jsx      # Résultat individuel + classement
├── questions.js        # Les 20 questions
├── App.jsx             # Logique API et navigation
└── App.css             # Direction artistique et styles
db.json                 # Données json-server (scores + parties en cours)
```
