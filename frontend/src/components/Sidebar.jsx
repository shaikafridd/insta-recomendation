import React from 'react';
import { useUser } from '../context/UserContext';
import { InstagramLogo } from './Icons';

export const Sidebar = ({ onOpenRecommendations, onOpenProfile }) => {
  const { userId, setUserId, interactionCount, sessionDwellSeconds, showToast } = useUser();

  return (
    <>
      {/* Mobile Top Navigation Header */}
      <header className="mobile-top-bar">
        <div className="mobile-brand">
          <InstagramLogo className="mobile-ig-icon" />
          <span>Reels</span>
        </div>
        <div className="mobile-actions">
          <button className="ai-pill-btn" onClick={onOpenRecommendations}>
            <span className="ai-sparkle">✨</span>
            <span>AI Rec</span>
          </button>
          <button className="profile-pill-btn" onClick={onOpenProfile}>
            <span>{userId}</span>
          </button>
        </div>
      </header>

      {/* Desktop Left Sidebar */}
      <aside className="desktop-sidebar">
        <div className="brand">
          <InstagramLogo className="instagram-icon" />
          <span>Reels</span>
        </div>

        <div className="user-session-card">
          <div className="user-avatar-badge">
            {userId.slice(0, 2).toUpperCase()}
          </div>
          <div className="user-info">
            <div className="user-label">Active Student</div>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onBlur={() => showToast(`Active student: ${userId}`)}
              title="Change User ID to simulate multiple students"
              spellCheck="false"
            />
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item active">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" />
            </svg>
            <span>For You Feed</span>
          </button>

          <button className="nav-item rec-highlight-btn" onClick={onOpenRecommendations}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm1 15h-2v-6h2zm0-8h-2V7h2z" />
            </svg>
            <span>AI Recommendations</span>
            <span className="pulse-dot"></span>
          </button>

          <button className="nav-item" onClick={onOpenProfile}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span>Interest Profile</span>
          </button>
        </nav>

        <div className="session-stats-card">
          <h4>Live Watch Telemetry</h4>
          <div class="stat-row">
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
