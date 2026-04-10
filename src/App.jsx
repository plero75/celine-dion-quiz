import React, { useEffect, useState } from 'react';
import Welcome from './components/Welcome';
import Quiz from './components/Quiz';
import Result from './components/Result';
import { questions } from './questions';
import './App.css';

const USE_LOCAL_API = import.meta.env.DEV;
const LOCAL_SCORES_API_URL = 'http://localhost:3001/scores';
const LOCAL_ACTIVE_GAMES_API_URL = 'http://localhost:3001/activeGames';

const normalizeName = (value) => value.trim().toLocaleLowerCase('fr-FR');

const localSortScores = (entries) =>
  [...entries]
    .sort((a, b) => b.score - a.score || a.time - b.time || a.date.localeCompare(b.date))
    .slice(0, 20);

const localSortActiveGames = (entries) =>
  [...entries]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

async function parseJsonResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || fallbackMessage;
    throw new Error(message);
  }

  return data;
}

async function readLocalCollection(url, fallbackMessage) {
  const response = await fetch(url);
  return parseJsonResponse(response, fallbackMessage);
}

async function loadSharedDataRequest() {
  if (USE_LOCAL_API) {
    const [scores, activeGames] = await Promise.all([
      readLocalCollection(LOCAL_SCORES_API_URL, 'Impossible de charger le classement partagé.'),
      readLocalCollection(LOCAL_ACTIVE_GAMES_API_URL, 'Impossible de charger les parties en cours.'),
    ]);

    return {
      scores: localSortScores(scores),
      activeGames: localSortActiveGames(activeGames),
    };
  }

  const response = await fetch('/api/state');
  return parseJsonResponse(response, 'Impossible de charger le classement partagé.');
}

async function startQuizRequest(username) {
  const cleanName = username.trim();
  const participantKey = normalizeName(cleanName);

  if (USE_LOCAL_API) {
    const [existingScores, existingActiveGames] = await Promise.all([
      readLocalCollection(
        `${LOCAL_SCORES_API_URL}?participantKey=${encodeURIComponent(participantKey)}`,
        'Impossible de vérifier ce participant dans le classement.',
      ),
      readLocalCollection(
        `${LOCAL_ACTIVE_GAMES_API_URL}?participantKey=${encodeURIComponent(participantKey)}`,
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

    const payload = {
      participantKey,
      username: cleanName,
      currentQuestion: 1,
      score: 0,
      elapsed: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(LOCAL_ACTIVE_GAMES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const activeGame = await parseJsonResponse(response, "Impossible d'ouvrir une partie partagée.");
    const state = await loadSharedDataRequest();

    return {
      ok: true,
      activeGameId: activeGame.id,
      ...state,
    };
  }

  const response = await fetch('/api/start-quiz', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username: cleanName }),
  });

  if (response.status === 409) {
    const data = await response.json();
    return {
      ok: false,
      message: data.message,
      scores: data.scores || [],
      activeGames: data.activeGames || [],
    };
  }

  const data = await parseJsonResponse(response, "Impossible d'ouvrir une partie partagée.");

  return {
    ok: true,
    activeGameId: data.activeGame.id,
    scores: data.scores,
    activeGames: data.activeGames,
  };
}

async function updateQuizProgressRequest(activeGameId, progress) {
  if (!activeGameId) return;

  if (USE_LOCAL_API) {
    await fetch(`${LOCAL_ACTIVE_GAMES_API_URL}/${activeGameId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...progress,
        updatedAt: new Date().toISOString(),
      }),
    });

    return;
  }

  await fetch(`/api/active-games/${activeGameId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(progress),
  });
}

async function finishQuizRequest(result, activeGameId) {
  const entry = {
    ...result,
    participantKey: normalizeName(result.username),
    date: new Date().toISOString(),
  };

  if (USE_LOCAL_API) {
    const existingScores = await readLocalCollection(
      `${LOCAL_SCORES_API_URL}?participantKey=${encodeURIComponent(entry.participantKey)}`,
      'Impossible de vérifier ce participant dans le classement.',
    );

    if (existingScores.length > 0) {
      if (activeGameId) {
        await fetch(`${LOCAL_ACTIVE_GAMES_API_URL}/${activeGameId}`, {
          method: 'DELETE',
        });
      }

      const state = await loadSharedDataRequest();

      return {
        ok: false,
        entry: {
          ...existingScores[0],
          saveError: 'Ce pseudo a déjà été enregistré dans le classement partagé.',
        },
        ...state,
      };
    }

    const response = await fetch(LOCAL_SCORES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });

    const createdEntry = await parseJsonResponse(response, "Impossible d'enregistrer ce score.");

    if (activeGameId) {
      await fetch(`${LOCAL_ACTIVE_GAMES_API_URL}/${activeGameId}`, {
        method: 'DELETE',
      });
    }

    const state = await loadSharedDataRequest();

    return {
      ok: true,
      entry: createdEntry,
      ...state,
    };
  }

  const response = await fetch('/api/finish-quiz', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: result.username,
      score: result.score,
      time: result.time,
      activeGameId,
    }),
  });

  if (response.status === 409) {
    const data = await response.json();

    return {
      ok: false,
      entry: {
        ...data.entry,
        saveError: data.message,
      },
      scores: data.scores || [],
      activeGames: data.activeGames || [],
    };
  }

  const data = await parseJsonResponse(response, "Impossible d'enregistrer ce score.");

  return {
    ok: true,
    entry: data.entry,
    scores: data.scores,
    activeGames: data.activeGames,
  };
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

  const unavailableMessage = USE_LOCAL_API
    ? "Le classement partagé est indisponible. Lancez `npm run api` pour ouvrir l'API des scores."
    : "Le classement partagé n'est pas configuré en production. Ajoutez une base Postgres/Neon à Vercel puis redéployez.";

  const loadSharedData = async () => {
    const data = await loadSharedDataRequest();
    setScores(data.scores);
    setActiveGames(data.activeGames);
    setScoresStatus('ready');
    setApiError('');
    return data;
  };

  useEffect(() => {
    let isActive = true;

    const sync = async () => {
      try {
        const data = await loadSharedDataRequest();
        if (!isActive) return;
        setScores(data.scores);
        setActiveGames(data.activeGames);
        setScoresStatus('ready');
        setApiError('');
      } catch (error) {
        if (!isActive) return;
        setScoresStatus('error');
        setApiError(error.message || unavailableMessage);
      }
    };

    sync();
    const intervalId = setInterval(sync, 5000);

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [unavailableMessage]);

  const startQuiz = async (name) => {
    try {
      const status = await startQuizRequest(name);

      if (!status.ok) {
        if (status.scores) setScores(status.scores);
        if (status.activeGames) setActiveGames(status.activeGames);
        return status;
      }

      setCurrentActiveGameId(status.activeGameId);
      setScores(status.scores);
      setActiveGames(status.activeGames);
      setUsername(name.trim());
      setApiError('');
      setPage('quiz');

      return { ok: true };
    } catch (error) {
      setApiError(error.message || unavailableMessage);

      return {
        ok: false,
        message: error.message || unavailableMessage,
      };
    }
  };

  const updateQuizProgress = async (progress) => {
    if (!currentActiveGameId) return;

    try {
      await updateQuizProgressRequest(currentActiveGameId, progress);
    } catch (error) {
      // Le quiz continue même si la mise à jour live échoue.
    }
  };

  const endQuiz = async (res) => {
    try {
      const status = await finishQuizRequest(res, currentActiveGameId);

      setCurrentActiveGameId(null);
      setScores(status.scores || []);
      setActiveGames(status.activeGames || []);
      setResult(status.entry);
      setPage('result');

      return { ok: status.ok };
    } catch (error) {
      setCurrentActiveGameId(null);
      setResult({
        ...res,
        date: new Date().toISOString(),
        saveError: error.message || "La participation n'a pas pu être enregistrée dans le classement partagé.",
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
      setApiError(error.message || unavailableMessage);
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
