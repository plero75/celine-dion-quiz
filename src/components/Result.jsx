import React from 'react';

export default function Result({ result, onRestart, scores, total }) {
  const { username, score, time } = result;
  const percent = Math.round((score / total) * 100);

  const getMessage = () => {
    if (percent === 100) return '🏆 Parfait ! Vous êtes un vrai fan !';
    if (percent >= 75) return '🌟 Très bien ! Vous la connaissez vraiment bien.';
    if (percent >= 50) return '👍 Pas mal ! Il y a encore des choses à découvrir.';
    return '🎵 Retournez écouter ses albums pour mieux la connaître !';
  };

  const myRank = scores.findIndex((s) => s.username === username && s.score === score && s.time === time) + 1;

  return (
    <div className="result">
      <span className="emoji">🎤</span>
      <h2>Bravo, {username} !</h2>
      <p className="message">{getMessage()}</p>

      <div className="stats">
        <div className="stat">
          <span className="stat-value">{score}/{total}</span>
          <span className="stat-label">Score</span>
        </div>
        <div className="stat">
          <span className="stat-value">{time}s</span>
          <span className="stat-label">Temps</span>
        </div>
        <div className="stat">
          <span className="stat-value">#{myRank || '?'}</span>
          <span className="stat-label">Classement</span>
        </div>
      </div>

      {scores.length > 0 && (
        <div className="highscores">
          <h3>🏆 Top 10</h3>
          <ul>
            {scores.slice(0, 10).map((h, i) => (
              <li key={i} className={h.username === username && h.score === score && h.time === time ? 'me' : ''}>
                <span className="rank">#{i + 1}</span>
                <span className="name">{h.username}</span>
                <span className="score">{h.score}/{total}</span>
                <span className="time">{h.time}s</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button className="restart-btn" onClick={onRestart}>🔄 Recommencer</button>
    </div>
  );
}
