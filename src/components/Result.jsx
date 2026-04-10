import React from 'react';
import heroPoster from '../assets/celine-paris-2026-hero.jpg';

export default function Result({ result, onRestart, scores, total }) {
  const { username, score, time, date } = result;
  const percentage = Math.round((score / total) * 100);

  const rank = scores.findIndex(
    (entry) =>
      entry.username === username &&
      entry.score === score &&
      entry.time === time &&
      entry.date === date,
  ) + 1;

  const getHeadline = () => {
    if (rank === 1) return 'Vous prenez la tête du classement.';
    if (rank > 0 && rank <= 3) return 'Très grosse performance, vous êtes parmi les premiers.';
    if (percentage >= 70) return 'Belle participation, le score est solide.';
    return 'Participation enregistrée, mais il faudra viser plus haut pour remonter.';
  };

  return (
    <section className="experience result-experience">
      <div className="result-panel">
        <div className="result-hero">
          <span className="section-tag">Résultat validé</span>
          <h1>{getHeadline()}</h1>
          <p>
            Votre participation est enregistrée. Le classement final retient d&apos;abord
            le nombre de bonnes réponses, puis le temps total pour départager les ex aequo.
          </p>
        </div>

        <div className="result-stats">
          <div className="result-stat">
            <span>Participant</span>
            <strong>{username}</strong>
          </div>
          <div className="result-stat">
            <span>Score</span>
            <strong>{score}/{total}</strong>
          </div>
          <div className="result-stat">
            <span>Temps</span>
            <strong>{time}s</strong>
          </div>
          <div className="result-stat">
            <span>Classement</span>
            <strong>{rank > 0 ? `#${rank}` : 'En attente'}</strong>
          </div>
        </div>

        <div className="result-callout">
          <p>
            Les premiers du classement sont les gagnants potentiels des places de Chris.
            À score égal, le chrono le plus court passe devant.
          </p>
        </div>

        <div className="leaderboard-panel result-board">
          <div className="leaderboard-heading">
            <div>
              <span className="section-tag">Top participants</span>
              <h2>Le classement actuel</h2>
            </div>
            <p>Une seule participation par personne.</p>
          </div>

          <ul className="scoreboard">
            {scores.slice(0, 10).map((entry, index) => {
              const isCurrent =
                entry.username === username &&
                entry.score === score &&
                entry.time === time &&
                entry.date === date;

              return (
                <li
                  key={`${entry.username}-${entry.time}-${entry.date}`}
                  className={isCurrent ? 'current-entry' : ''}
                >
                  <span className="rank">#{index + 1}</span>
                  <span className="name">{entry.username}</span>
                  <span className="score">{entry.score}/{total}</span>
                  <span className="time">{entry.time}s</span>
                </li>
              );
            })}
          </ul>
        </div>

        <button className="restart-btn" onClick={onRestart}>
          Revenir à l&apos;accueil
        </button>
      </div>

      <div className="result-visual">
        <div className="result-visual-card">
          <img src={heroPoster} alt="Affiche Celine Dion Paris 2026" />
        </div>
      </div>
    </section>
  );
}
