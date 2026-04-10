import React, { useState, useEffect, useRef } from 'react';

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

  const handleSelect = (idx) => {
    if (selected !== null) return;
    setSelected(idx);

    const isCorrect = idx === questions[current].correct;
    const newScore = score + (isCorrect ? 1 : 0);

    setTimeout(() => {
      if (current < questions.length - 1) {
        setCurrent((prev) => prev + 1);
        setScore(newScore);
        setSelected(null);
      } else {
        clearInterval(timerRef.current);
        const totalTime = Math.round((Date.now() - startTime.current) / 1000);
        onFinish({ username, score: newScore, time: totalTime });
      }
    }, 600);
  };

  const q = questions[current];
  const percent = Math.round(((current + 1) / questions.length) * 100);

  return (
    <div className="quiz">
      <div className="quiz-header">
        <span className="counter">{current + 1} / {questions.length}</span>
        <span className="timer">⏱ {elapsed}s</span>
      </div>

      <div className="progress">
        <div className="bar" style={{ width: `${percent}%` }}></div>
      </div>

      <h2 className="question">{q.question}</h2>

      <div className="answers">
        {q.answers.map((ans, idx) => {
          let cls = 'answer-btn';
          if (selected !== null) {
            if (idx === q.correct) cls += ' correct';
            else if (idx === selected) cls += ' wrong';
          }
          return (
            <button key={idx} className={cls} onClick={() => handleSelect(idx)} disabled={selected !== null}>
              <span className="letter">{String.fromCharCode(65 + idx)}</span> {ans}
            </button>
          );
        })}
      </div>
    </div>
  );
}
