# 🎤 Connaissez-vous vraiment Céline Dion ?

Une web-appli quiz en **React + Vite** avec :
- Saisie d'un **pseudo** avant de jouer
- **20 questions** QCM sur la vie et la carrière de Céline Dion
- **Chronomètre** en temps réel
- **Enregistrement des scores** dans localStorage (pseudo + score + temps)
- Écran de **résultats** avec classement top 10

## 🚀 Lancer le projet

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173)

## 📁 Structure

```
src/
├── components/
│   ├── Welcome.jsx     # Écran d'accueil + pseudo + classement
│   ├── Quiz.jsx        # Questions QCM + chrono
│   └── Result.jsx      # Résultats + top 10
├── questions.js        # Les 20 questions
├── App.jsx             # Routage entre les écrans
└── App.css             # Styles dark mode
```
