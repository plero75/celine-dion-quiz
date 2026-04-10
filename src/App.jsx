import React, { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Welcome from './components/Welcome';
import Quiz from './components/Quiz';
import Result from './components/Result';
import { questions } from './questions';
import './App.css';

const STORAGE_KEY = 'celineDionQuizScores';

const normalizeName = (value) => value.trim().toLocaleLowerCase('fr-FR');

export default function App() {
  const [page, setPage] = useState('welcome');
  const [username, setUsername] = useState('');
  const [result, setResult] = useState(null);
  const [scores, setScores] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    setScores(saved);
  }, []);

  const startQuiz = (name) => {
    const cleanName = name.trim();
    const normalized = normalizeName(cleanName);
    const alreadyPlayed = scores.some((entry) => normalizeName(entry.username) === normalized);

    if (alreadyPlayed) {
      return {
        ok: false,
        message: 'Ce pseudo a déjà participé. Une seule tentative est autorisée par personne.',
      };
    }

    setUsername(cleanName);
    setPage('quiz');

    return { ok: true };
  };

  const endQuiz = (res) => {
    const entry = {
      ...res,
      participantKey: normalizeName(res.username),
      date: new Date().toISOString(),
    };

    const updated = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    updated.push(entry);
    updated.sort((a, b) => b.score - a.score || a.time - b.time);
    updated.splice(20);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setScores(updated);
    setResult(entry);
    setPage('result');
  };

  const restart = () => {
    setPage('welcome');
    setResult(null);
    setUsername('');
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
            total={questions.length}
          />
        )}

        {page === 'quiz' && (
          <Quiz
            questions={questions}
            username={username}
            onFinish={endQuiz}
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
      <Analytics />
    </div>
  );
}
