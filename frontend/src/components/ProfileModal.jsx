import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { fetchInterestProfile } from '../services/api';

export const ProfileModal = ({ isOpen, onClose }) => {
  const { userId } = useUser();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadProfile(false);
    }
  }, [isOpen, userId]);

  const loadProfile = async (forceRefresh = false) => {
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
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-badge-ai">REDIS PROFILE CACHE (1h TTL)</div>
            <h3>User Interest Profile</h3>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-content">
          {loading && (
            <div className="modal-loading">
              <div className="spinner"></div>
              <p>Fetching profile from Redis / LLM inference...</p>
            </div>
          )}

          {error && !loading && (
            <div className="modal-loading">
              <p style={{ color: '#ff5252' }}>Error: {error}</p>
              <button className="refresh-profile-btn" onClick={() => loadProfile(false)}>
                Retry Profile
              </button>
            </div>
          )}

          {profile && !loading && (
            <div className="profile-result-view">
              <div className="profile-field">
                <label>User ID</label>
                <div className="val-mono">{profile.userId}</div>
              </div>

              <div className="profile-field">
                <label>Inferred Domain Cluster</label>
                <div className="val-bold">{profile.primaryInterest}</div>
              </div>

              <div className="profile-field">
                <label>Confidence Level</label>
                <div className="val-badge">{profile.confidence} Confidence</div>
              </div>

              <div className="profile-field">
                <label>Supporting Evidence Points</label>
                <ul className="evidence-list">
                  {(profile.evidence || []).map((ev, idx) => (
                    <li key={idx}>{ev}</li>
                  ))}
                </ul>
              </div>

              <div className="profile-field">
                <label>Last Cache Update</label>
                <div className="val-mono">{new Date(profile.updatedAt).toLocaleString()}</div>
              </div>

              <button className="refresh-profile-btn" onClick={() => loadProfile(true)}>
                🔄 Force Re-Infer Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
