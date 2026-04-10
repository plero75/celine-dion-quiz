import React, { useState } from 'react';

export default function Welcome({ onStart, scores, total }) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) return alert('Veuillez entrer un pseudo');
    onStart(username.trim());
  };

  return (
    <div className="welcome">
      <div className="hero">
        <span className="emoji">🎤</span>
        <h1>Connaissez-vous vraiment<br /><span className="highlight">Céline Dion ?</span></h1>
        <p className="subtitle">{total} questions · Chronomètre · Classement</p>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Votre pseudo"
          maxLength={20}
        />
        <button type="submit">🚀 Commencer</button>
      </form>

      {scores.length > 0 && (
        <div className="highscores">
          <h2>🏆 Classement</h2>
          <ul>
            {scores.slice(0, 10).map((h, i) => (
              <li key={i}>
                <span className="rank">#{i + 1}</span>
                <span className="name">{h.username}</span>
                <span className="score">{h.score}/{total}</span>
                <span className="time">{h.time}s</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
