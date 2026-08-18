import React from 'react';
import { useUser } from '../context/UserContext';
import { InstagramLogo } from './Icons';

/**
 * Sidebar Navigation Component
 * Provides student profile controls, AI recommendation triggers, and live telemetry.
 * Fully WCAG 2.1 accessible with ARIA landmarks and labels.
 */
export const Sidebar = ({ onOpenRecommendations, onOpenProfile }) => {
  const {
    userId,
    setUserId,
    interactionCount,
    sessionDwellSeconds,
    showToast,
    hasNewRecNotification
  } = useUser();

  return (
    <>
      {/* Mobile Top Navigation Header */}
      <header className="mobile-top-bar" role="banner">
        <div className="mobile-brand">
          <InstagramLogo className="mobile-ig-icon" aria-hidden="true" />
          <span>Reels</span>
        </div>
        <div className="mobile-actions" role="toolbar" aria-label="Quick Navigation">
          <button
            type="button"
            className="ai-pill-btn"
            onClick={onOpenRecommendations}
            aria-label="Open AI Recommendations"
          >
            <span className="ai-sparkle" aria-hidden="true">✨</span>
            <span>AI Rec</span>
            {hasNewRecNotification && <span className="pulse-dot-mini" aria-hidden="true"></span>}
          </button>
          <button
            type="button"
            className="profile-pill-btn"
            onClick={onOpenProfile}
            aria-label={`View interest profile for student ${userId}`}
          >
            <span>{userId}</span>
          </button>
        </div>
      </header>

      {/* Desktop Left Sidebar */}
      <aside className="desktop-sidebar" role="complementary" aria-label="Application Navigation">
        <div className="brand" role="heading" aria-level={1}>
          <InstagramLogo className="instagram-icon" aria-hidden="true" />
          <span>Reels</span>
        </div>

        <div className="user-session-card" role="region" aria-label="User Profile Configuration">
          <div className="user-avatar-badge" aria-hidden="true">
            {userId.slice(0, 2).toUpperCase()}
          </div>
          <div className="user-info">
            <label htmlFor="active-student-input" className="user-label">
              Active Student
            </label>
            <input
              id="active-student-input"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onBlur={() => showToast(`Active student: ${userId}`)}
              title="Change User ID to simulate multiple students"
              aria-label="Active Student User ID"
              spellCheck="false"
            />
          </div>
        </div>

        <nav className="sidebar-nav" role="navigation" aria-label="Main Menu">
          <button
            type="button"
            className="nav-item active"
            aria-current="page"
            aria-label="For You Reels Feed"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" />
            </svg>
            <span>For You Feed</span>
          </button>

          <button
            type="button"
            className="nav-item rec-highlight-btn"
            onClick={onOpenRecommendations}
            aria-label="Open AI Tech Recommendations"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm1 15h-2v-6h2zm0-8h-2V7h2z" />
            </svg>
            <span>AI Recommendations</span>
            <span className="pulse-dot" aria-hidden="true"></span>
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={onOpenProfile}
            aria-label="View Inferred Student Interest Profile"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span>Interest Profile</span>
          </button>
        </nav>

        <div className="session-stats-card" role="region" aria-label="Live Watch Telemetry" aria-live="polite">
          <h4>Live Watch Telemetry</h4>
          <div className="stat-row">
            <span>Interactions Logged:</span>
            <strong>{interactionCount}</strong>
          </div>
          <div className="stat-row">
            <span>Session Dwell:</span>
            <strong>{sessionDwellSeconds}s</strong>
          </div>
          <div className="stat-row">
            <span>Anti-Hype Filter:</span>
            <span className="badge-active">ACTIVE</span>
          </div>
        </div>
      </aside>
    </>
  );
};
