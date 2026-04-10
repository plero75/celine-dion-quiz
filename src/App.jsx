import React, { useEffect, useState } from 'react';
import Welcome from './components/Welcome';
import Quiz from './components/Quiz';
import Result from './components/Result';
import { questions } from './questions';
import './App.css';

const SCORES_API_URL = 'http://localhost:3001/scores';
const ACTIVE_GAMES_API_URL = 'http://localhost:3001/activeGames';

const normalizeName = (value) => value.trim().toLocaleLowerCase('fr-FR');

const sortScores = (entries) =>
  [...entries]
    .sort((a, b) => b.score - a.score || a.time - b.time || a.date.localeCompare(b.date))
    .slice(0, 20);

const sortActiveGames = (entries) =>
  [...entries]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

async function readCollection(url, errorMessage) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return response.json();
}

async function readScores() {
  const data = await readCollection(SCORES_API_URL, 'Impossible de charger le classement partagé.');
  return sortScores(data);
}

async function readActiveGames() {
  const data = await readCollection(ACTIVE_GAMES_API_URL, 'Impossible de charger les parties en cours.');
  return sortActiveGames(data);
}

async function readParticipantEntries(participantKey, apiUrl, errorMessage) {
  return readCollection(
    `${apiUrl}?participantKey=${encodeURIComponent(participantKey)}`,
    errorMessage,
  );
}

async function deleteActiveGame(activeGameId) {
  if (!activeGameId) return;

  await fetch(`${ACTIVE_GAMES_API_URL}/${activeGameId}`, {
    method: 'DELETE',
  });
}

export default function App() {
  const [page, setPage] = useState('welcome');
  const [username, setUsername] = useState('');
  const [result, setResult] = useState(null);
  const [scores, setScores] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [scoresStatus, setScoresStatus] = useState('loading');
  const [apiError, setApiError] = useState('');
  const [currentActiveGameId, setCurrentActiveGameId] = useState(null);

  const loadSharedData = async () => {
    const [scoresData, activeGamesData] = await Promise.all([readScores(), readActiveGames()]);

    setScores(scoresData);
    setActiveGames(activeGamesData);
    setScoresStatus('ready');
    setApiError('');

    return {
      scores: scoresData,
      activeGames: activeGamesData,
    };
  };

  useEffect(() => {
    let isActive = true;

    const sync = async () => {
      try {
        const [scoresData, activeGamesData] = await Promise.all([readScores(), readActiveGames()]);
        if (!isActive) return;
        setScores(scoresData);
        setActiveGames(activeGamesData);
        setScoresStatus('ready');
        setApiError('');
      } catch (error) {
        if (!isActive) return;
        setScoresStatus('error');
        setApiError("Le classement partagé est indisponible. Lancez `npm run api` pour ouvrir l'API des scores.");
      }
    };

    sync();
    const intervalId = setInterval(sync, 5000);

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, []);

  const startQuiz = async (name) => {
    const cleanName = name.trim();
    const participantKey = normalizeName(cleanName);

    try {
      const [existingScores, existingActiveGames] = await Promise.all([
        readParticipantEntries(
          participantKey,
          SCORES_API_URL,
          'Impossible de vérifier ce participant dans le classement.',
        ),
        readParticipantEntries(
          participantKey,
          ACTIVE_GAMES_API_URL,
          'Impossible de vérifier les parties en cours pour ce participant.',
        ),
      ]);

      if (existingScores.length > 0) {
        return {
          ok: false,
          message: 'Ce pseudo a déjà participé au classement partagé. Une seule tentative est autorisée.',
        };
      }

      if (existingActiveGames.length > 0) {
        return {
          ok: false,
          message: 'Une partie est déjà en cours avec ce pseudo. Terminez-la avant de recommencer.',
        };
      }

      const activeGamePayload = {
        participantKey,
        username: cleanName,
        currentQuestion: 1,
        score: 0,
        elapsed: 0,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch(ACTIVE_GAMES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activeGamePayload),
      });

      if (!response.ok) {
        throw new Error("Impossible d'ouvrir une partie partagée.");
      }

      const createdActiveGame = await response.json();
      await loadSharedData();

      setCurrentActiveGameId(createdActiveGame.id);
      setUsername(cleanName);
      setApiError('');
      setPage('quiz');

      return { ok: true };
    } catch (error) {
      setApiError("Le classement partagé est indisponible. Lancez `npm run api` pour ouvrir l'API des scores.");

      return {
        ok: false,
        message: "Impossible de vérifier le classement partagé pour l'instant. Lancez `npm run api` puis réessayez.",
      };
    }
  };

  const updateQuizProgress = async (progress) => {
    if (!currentActiveGameId) return;

    try {
      await fetch(`${ACTIVE_GAMES_API_URL}/${currentActiveGameId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...progress,
          updatedAt: new Date().toISOString(),
        }),
      });
    } catch (error) {
      // Le quiz continue même si la mise à jour live échoue.
    }
  };

  const endQuiz = async (res) => {
    const entry = {
      ...res,
      participantKey: normalizeName(res.username),
      date: new Date().toISOString(),
    };

    try {
      const existingEntries = await readParticipantEntries(
        entry.participantKey,
        SCORES_API_URL,
        'Impossible de vérifier ce participant dans le classement.',
      );

      if (existingEntries.length > 0) {
        await deleteActiveGame(currentActiveGameId);
        setCurrentActiveGameId(null);

        const updated = await loadSharedData();
        setResult({
          ...existingEntries[0],
          saveError: 'Ce pseudo a déjà été enregistré dans le classement partagé.',
        });
        setScores(updated.scores);
        setPage('result');
        return { ok: false };
      }

      const response = await fetch(SCORES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        throw new Error("Impossible d'enregistrer ce score.");
      }

      const createdEntry = await response.json();
      await deleteActiveGame(currentActiveGameId);
      setCurrentActiveGameId(null);

      const updated = await loadSharedData();
      setScores(updated.scores);
      setActiveGames(updated.activeGames);
      setResult(createdEntry);
      setPage('result');

      return { ok: true };
    } catch (error) {
      await deleteActiveGame(currentActiveGameId);
      setCurrentActiveGameId(null);

      try {
        await loadSharedData();
      } catch (loadError) {
        setScoresStatus('error');
      }

      setResult({
        ...entry,
        saveError: "La participation n'a pas pu être enregistrée dans le classement partagé.",
      });
      setPage('result');
      return { ok: false };
    }
  };

  const restart = async () => {
    setPage('welcome');
    setResult(null);
    setUsername('');

    try {
      await loadSharedData();
    } catch (error) {
      setScoresStatus('error');
      setApiError("Le classement partagé est indisponible. Lancez `npm run api` pour ouvrir l'API des scores.");
    }
  };

  return (
    <div className={`app-shell page-${page}`}>
      <div className="app-backdrop" aria-hidden="true" />
      <div className="app-glow app-glow-left" aria-hidden="true" />
      <div className="app-glow app-glow-right" aria-hidden="true" />
      <div className="app-grid" aria-hidden="true" />

      <main className="app-stage">
        {page === 'welcome' && (
          <Welcome
            onStart={startQuiz}
            scores={scores}
            activeGames={activeGames}
            total={questions.length}
            scoresStatus={scoresStatus}
            apiError={apiError}
          />
        )}

        {page === 'quiz' && (
          <Quiz
            questions={questions}
            username={username}
            onFinish={endQuiz}
            onProgress={updateQuizProgress}
          />
        )}

        {page === 'result' && (
          <Result
            result={result}
            onRestart={restart}
            scores={scores}
            total={questions.length}
          />
        )}
      </main>
    </div>
  );
}
