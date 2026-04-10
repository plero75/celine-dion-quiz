import React, { useState } from 'react';
import heroPoster from '../assets/celine-paris-2026-hero.jpg';
import verticalLogo from '../assets/celine-paris-2026-logo-vertical.png';
import visaLogo from '../assets/visa-logo.png';
import arenaLogo from '../assets/paris-la-defense-arena-logo.png';

export default function Welcome({ onStart, scores, activeGames, total, scoresStatus, apiError }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmed = username.trim();
    if (!trimmed) {
      setError('Entrez votre prénom ou votre pseudo pour lancer votre participation.');
      return;
    }

    setIsSubmitting(true);
    const status = await onStart(trimmed);
    setIsSubmitting(false);

    if (!status.ok) {
      setError(status.message);
      return;
    }

    setError('');
  };

  return (
    <section className="experience welcome-experience">
      <div className="poster-column">
        <div className="poster-frame">
          <img className="poster-logo-vertical" src={verticalLogo} alt="" />
          <img
            className="poster-hero"
            src={heroPoster}
            alt="Affiche Celine Dion Paris 2026"
          />

          <div className="poster-footer">
            <span>Septembre - Octobre 2026</span>
            <img className="partner-logo arena-logo" src={arenaLogo} alt="Paris La Defense Arena" />
          </div>
        </div>

        <div className="partner-strip">
          <span className="partner-kicker">Inspiration prévente</span>
          <img className="partner-logo visa-partner" src={visaLogo} alt="Visa" />
        </div>
      </div>

      <div className="content-column">
        <div className="welcome-copy">
          <span className="eyebrow">Quiz de sélection</span>
          <h1>Qui mérite les places de Chris pour le concert de Céline Dion ?</h1>
          <p className="lead">
            Une participation par personne, {total} questions, un chrono qui tourne
            jusqu&apos;à la dernière réponse. Les meilleurs scores, puis les temps les plus
            rapides, prennent la tête.
          </p>
        </div>

        <div className="rule-band">
          <div className="rule-item">
            <span className="rule-label">1 quiz</span>
            <strong>Une seule tentative par personne</strong>
          </div>
          <div className="rule-item">
            <span className="rule-label">Score</span>
            <strong>Les bonnes réponses comptent d&apos;abord</strong>
          </div>
          <div className="rule-item">
            <span className="rule-label">Temps</span>
            <strong>Le chrono départage les égalités</strong>
          </div>
          <div className="rule-item">
            <span className="rule-label">Gagnants</span>
            <strong>Les premiers du classement remportent les places</strong>
          </div>
        </div>

        <div className="game-explainer">
          <div className="explainer-card">
            <span className="section-tag">Comment ça marche</span>
            <p>
              Répondez aux questions sur Céline Dion le plus justement possible.
              Chaque bonne réponse améliore votre score final.
            </p>
          </div>
          <div className="explainer-card">
            <span className="section-tag">Ce qui décide</span>
            <p>
              Le classement est trié par nombre de bonnes réponses, puis par temps
              total. À score égal, la personne la plus rapide passe devant.
            </p>
          </div>
          <div className="explainer-card">
            <span className="section-tag">Règle clé</span>
            <p>
              Un seul passage par pseudo. Si un pseudo a déjà joué, il ne peut pas
              relancer une nouvelle tentative depuis ce navigateur.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="entry-form">
          <label className="input-label" htmlFor="username">
            Entrer dans la prévente privée
          </label>
          <div className="entry-row">
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                if (error) setError('');
              }}
              placeholder="Votre prénom ou pseudo"
              maxLength={24}
              disabled={isSubmitting}
            />
            <button type="submit" disabled={isSubmitting || scoresStatus === 'loading'}>
              {isSubmitting ? 'Vérification...' : 'Commencer le quiz'}
            </button>
          </div>
          <p className="form-note">
            En lançant le quiz, vous confirmez une seule participation et un classement
            partagé basé sur le score puis le chrono.
          </p>
          {error && <p className="form-error">{error}</p>}
        </form>

        <div className="leaderboard-panel">
          <div className="leaderboard-heading">
            <div>
              <span className="section-tag">Classement en direct</span>
              <h2>Les mieux placés pour les billets</h2>
            </div>
            <p>Score décroissant, puis temps croissant.</p>
          </div>

          {scoresStatus === 'loading' ? (
            <p className="empty-state">
              Chargement du classement partagé...
            </p>
          ) : apiError ? (
            <p className="form-error panel-error">{apiError}</p>
          ) : scores.length === 0 ? (
            <p className="empty-state">
              Le classement partagé est vide pour l&apos;instant. Le premier participant donne le ton.
            </p>
          ) : (
            <ul className="scoreboard">
              {scores.slice(0, 8).map((entry, index) => (
                <li key={`${entry.username}-${entry.time}-${entry.date}`}>
                  <span className="rank">#{index + 1}</span>
                  <span className="name">{entry.username}</span>
                  <span className="score">{entry.score}/{total}</span>
                  <span className="time">{entry.time}s</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="leaderboard-panel live-games-panel">
          <div className="leaderboard-heading">
            <div>
              <span className="section-tag">Parties en cours</span>
              <h2>Qui joue en ce moment</h2>
            </div>
            <p>Suivi partagé des quiz démarrés.</p>
          </div>

          {scoresStatus === 'loading' ? (
            <p className="empty-state">
              Chargement des parties en cours...
            </p>
          ) : apiError ? (
            <p className="form-error panel-error">{apiError}</p>
          ) : activeGames.length === 0 ? (
            <p className="empty-state">
              Aucune partie en cours pour l&apos;instant.
            </p>
          ) : (
            <ul className="scoreboard live-games-list">
              {activeGames.map((entry) => (
                <li key={entry.id}>
                  <span className="rank live-badge">Live</span>
                  <span className="name">{entry.username}</span>
                  <span className="score">Q{entry.currentQuestion}/{total}</span>
                  <span className="time">{entry.elapsed}s</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
