import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { fetchRecommendation } from '../services/api';

export const RecommendationModal = ({ isOpen, onClose, onJumpToReel }) => {
  const { userId } = useUser();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadRecommendation();
    }
  }, [isOpen, userId]);

  const loadRecommendation = async () => {
    setLoading(true);
    setError(null);
    try {
      const rec = await fetchRecommendation(userId);
      setData(rec);
    } catch (err) {
      setError(err.message || 'Could not fetch recommendation');
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
            <div className="modal-badge-ai">GROQ LLAMA 3.3 REASONER</div>
            <h3>AI Tech Recommendation</h3>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-content">
          {loading && (
            <div className="modal-loading">
              <div className="spinner"></div>
              <p>Analyzing recent watch sessions & inferring deep interest clusters...</p>
            </div>
          )}

          {error && !loading && (
            <div className="modal-loading">
              <p style={{ color: '#ff5252' }}>Error: {error}</p>
              <button className="refresh-profile-btn" onClick={loadRecommendation}>
                Retry Recommendation
              </button>
            </div>
          )}

          {data && !loading && (
            <div className="rec-result-view">
              {/* Inferred Interest Banner */}
              <div className="interest-detected-card">
                <div className="meta-sub">Inferred Primary Interest:</div>
                <h4>{data.interestDetected || 'Software Engineering & Tech'}</h4>
                <div className="evidence-box">
                  <span className="evidence-tag">Session Reasoning:</span>
                  <p>{data.why}</p>
                </div>
              </div>

              {/* Spotlight Recommended Reel Card */}
              <div className="recommended-card-spotlight">
                <div className="card-top-row">
                  <span className="category-chip">{data.category || 'Tech'}</span>
                  <span className="difficulty-chip">{data.difficulty || 'Intermediate'}</span>
                  <span className="confidence-chip">{data.confidence || 'High'} Confidence</span>
                </div>

                <h3 className="rec-reel-title">{data.recommendedTechReel}</h3>
                <p className="rec-reasoning-body">{data.whyThisRecommendation}</p>

                <button
                  className="jump-to-reel-btn"
                  onClick={() => {
                    onClose();
                    onJumpToReel(data.recommendedTechReel);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Watch This Reel Now</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
