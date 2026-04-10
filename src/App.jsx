import React, { useState, useEffect } from 'react';
import Welcome from './components/Welcome';
import Quiz from './components/Quiz';
import Result from './components/Result';
import { questions } from './questions';
import './App.css';

const STORAGE_KEY = 'celineDionQuizScores';

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
    setUsername(name);
    setPage('quiz');
  };

  const endQuiz = (res) => {
    const entry = { ...res, date: new Date().toISOString() };
    const updated = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    updated.push(entry);
    updated.sort((a, b) => b.score - a.score || a.time - b.time);
    updated.splice(20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setScores(updated);
    setResult(res);
    setPage('result');
  };

  const restart = () => {
    setPage('welcome');
    setResult(null);
  };

  return (
    <div className="App">
      {page === 'welcome' && <Welcome onStart={startQuiz} scores={scores} total={questions.length} />}
      {page === 'quiz' && <Quiz questions={questions} username={username} onFinish={endQuiz} />}
      {page === 'result' && <Result result={result} onRestart={restart} scores={scores} total={questions.length} />}
    </div>
  );
}
