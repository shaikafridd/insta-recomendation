import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { fetchInterestProfile } from '../services/api';

/**
 * ProfileModal Component
 * Accessible dialog displaying cached student interest profile telemetry.
 */
export const ProfileModal = ({ isOpen, onClose }) => {
  const { userId } = useUser();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchInterestProfile(userId, forceRefresh);
        setProfile(data);
      } catch (err) {
        setError(err.message || 'Could not fetch interest profile');
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (isOpen) {
      loadProfile(false);
    }
  }, [isOpen, loadProfile]);

  // Accessibility: Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop open"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-badge-ai" aria-label="Cache Engine">
              REDIS PROFILE CACHE (1h TTL)
            </div>
            <h2 id="profile-modal-title">Student Interest Profile</h2>
          </div>
          <button
            type="button"
            className="close-modal-btn"
            onClick={onClose}
            aria-label="Close Profile Dialog (Escape)"
          >
            &times;
          </button>
        </div>

        <div className="modal-content">
          {loading && (
            <div className="modal-loading" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true"></div>
              <p>Fetching profile from Redis / LLM inference...</p>
            </div>
          )}

          {error && !loading && (
            <div className="modal-loading" role="alert">
              <p style={{ color: 'var(--accent-red)' }}>Error: {error}</p>
              <button
                type="button"
                className="refresh-profile-btn"
                onClick={() => loadProfile(false)}
              >
                Retry Profile
              </button>
            </div>
          )}

          {profile && !loading && (
            <div className="profile-result-view" role="region" aria-label="Profile Details">
              <div className="profile-field">
                <label id="lbl-uid">User ID</label>
                <div className="val-mono" aria-labelledby="lbl-uid">{profile.userId}</div>
              </div>

              <div className="profile-field">
                <label id="lbl-interest">Inferred Domain Cluster</label>
                <div className="val-bold" aria-labelledby="lbl-interest">{profile.primaryInterest}</div>
              </div>

              <div className="profile-field">
                <label id="lbl-confidence">Confidence Level</label>
                <div className="val-badge" aria-labelledby="lbl-confidence">{profile.confidence} Confidence</div>
              </div>

              <div className="profile-field">
                <label id="lbl-evidence">Supporting Evidence Points</label>
                <ul className="evidence-list" aria-labelledby="lbl-evidence">
                  {(profile.evidence || []).map((ev, idx) => (
                    <li key={idx}>{ev}</li>
                  ))}
                </ul>
              </div>

              <div className="profile-field">
                <label id="lbl-updated">Last Cache Update</label>
                <div className="val-mono" aria-labelledby="lbl-updated">
                  {new Date(profile.updatedAt).toLocaleString()}
                </div>
              </div>

              <button
                type="button"
                className="refresh-profile-btn"
                onClick={() => loadProfile(true)}
                aria-label="Force Re-Infer Interest Profile with Groq LLM"
              >
                🔄 Force Re-Infer Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
