import React, { useEffect, useRef, useState } from 'react';
import heroPoster from '../assets/celine-paris-2026-hero.jpg';

export default function Quiz({ questions, username, onFinish }) {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.round((Date.now() - startTime.current) / 1000));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  const handleSelect = (index) => {
    if (selected !== null) return;

    setSelected(index);

    const isCorrect = index === questions[current].correct;
    const nextScore = score + (isCorrect ? 1 : 0);

    setTimeout(() => {
      if (current < questions.length - 1) {
        setCurrent((previous) => previous + 1);
        setScore(nextScore);
        setSelected(null);
      } else {
        clearInterval(timerRef.current);
        const totalTime = Math.round((Date.now() - startTime.current) / 1000);
        onFinish({ username, score: nextScore, time: totalTime });
      }
    }, 700);
  };

  const question = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  return (
    <section className="experience quiz-experience">
      <aside className="quiz-sidebar">
        <div className="quiz-poster-card">
          <img src={heroPoster} alt="Affiche Celine Dion Paris 2026" />
        </div>

        <div className="quiz-brief">
          <span className="section-tag">Participation active</span>
          <h2>{username}</h2>
          <p>
            Une seule chance. Répondez vite et juste: le nombre de bonnes réponses
            décide du classement, puis le chrono départage.
          </p>
        </div>

        <div className="quiz-summary">
          <div>
            <span>Bonnes réponses</span>
            <strong>{score}</strong>
          </div>
          <div>
            <span>Temps écoulé</span>
            <strong>{elapsed}s</strong>
          </div>
          <div>
            <span>Priorité</span>
            <strong>Score puis chrono</strong>
          </div>
        </div>
      </aside>

      <div className="quiz-panel">
        <div className="quiz-panel-header">
          <span className="eyebrow">Accès prioritaire</span>
          <div className="quiz-meta">
            <span>Question {current + 1} / {questions.length}</span>
            <span>Chrono {elapsed}s</span>
          </div>
        </div>

        <div className="progress-shell" aria-hidden="true">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="question-block">
          <p className="question-kicker">Sélection quiz</p>
          <h1>{question.question}</h1>
          <p className="question-note">
            Chaque bonne réponse vous rapproche du haut du classement. En cas d&apos;égalité,
            le temps total le plus court gagne.
          </p>
        </div>

        <div className="answers">
          {question.answers.map((answer, index) => {
            let className = 'answer-btn';

            if (selected !== null) {
              if (index === question.correct) className += ' correct';
              else if (index === selected) className += ' wrong';
            }

            return (
              <button
                key={answer}
                type="button"
                className={className}
                onClick={() => handleSelect(index)}
                disabled={selected !== null}
              >
                <span className="letter">{String.fromCharCode(65 + index)}</span>
                <span className="answer-text">{answer}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
