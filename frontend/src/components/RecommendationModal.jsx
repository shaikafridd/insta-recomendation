import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { fetchRecommendation } from '../services/api';

const GOOGLE_CDN_STREAMS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4'
];

/**
 * RecommendationModal Component
 * Accessible dialog displaying personalized AI suggestions with interactive video player.
 */
export const RecommendationModal = ({ isOpen, onClose, onJumpToReel }) => {
  const { userId, interactionCount, sessionDwellSeconds } = useUser();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewVideoSrc, setPreviewVideoSrc] = useState(GOOGLE_CDN_STREAMS[0]);
  const videoPreviewRef = useRef(null);

  const loadRecommendation = useCallback(async () => {
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
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      loadRecommendation();
    } else {
      setIsPlayingPreview(false);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.pause();
      }
    }
  }, [isOpen, loadRecommendation]);

  useEffect(() => {
    if (data?.recommendedReel?.cloudinaryUrl) {
      setPreviewVideoSrc(data.recommendedReel.cloudinaryUrl);
    } else {
      setPreviewVideoSrc(GOOGLE_CDN_STREAMS[0]);
    }
  }, [data]);

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

  const togglePreviewPlay = () => {
    const video = videoPreviewRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlayingPreview(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlayingPreview(false);
    }
  };

  const handlePreviewVideoError = () => {
    console.warn('[Rec Preview] Switching to Google CDN video fallback stream');
    setPreviewVideoSrc(GOOGLE_CDN_STREAMS[0]);
  };

  if (!isOpen) return null;

  const recReel = data?.recommendedReel;

  return (
    <div
      className="modal-backdrop open"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal-sheet rec-sheet-expanded"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rec-modal-title"
        aria-describedby="rec-modal-desc"
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-badge-ai" aria-label="AI Engine Engine">
              ⚡ GROQ AI RECOMMENDATION ENGINE
            </div>
            <h2 id="rec-modal-title">Suggested For You</h2>
          </div>
          <button
            type="button"
            className="close-modal-btn"
            onClick={onClose}
            aria-label="Close AI Recommendation Dialog (Escape)"
          >
            &times;
          </button>
        </div>

        <div className="modal-content" id="rec-modal-desc">
          {loading && (
            <div className="modal-loading" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true"></div>
              <p>Analyzing your likes, watch duration, and topics with Groq LLM...</p>
            </div>
          )}

          {error && !loading && (
            <div className="modal-loading" role="alert">
              <p style={{ color: 'var(--accent-red)' }}>Error: {error}</p>
              <button
                type="button"
                className="refresh-profile-btn"
                onClick={loadRecommendation}
              >
                Retry Analysis
              </button>
            </div>
          )}

          {data && !loading && (
            <div className="rec-result-view">
              {/* Engagement Signal Breakdown */}
              <div className="engagement-signal-banner" role="region" aria-label="Engagement Signal Analysis">
                <div className="signal-pill">
                  <span className="signal-icon" aria-hidden="true">🔥</span>
                  <span>Session Dwell: <strong>{sessionDwellSeconds}s</strong></span>
                </div>
                <div className="signal-pill">
                  <span className="signal-icon" aria-hidden="true">❤️</span>
                  <span>Interactions: <strong>{interactionCount}</strong></span>
                </div>
                <div className="signal-pill active-cluster">
                  <span>Interest: <strong>{data.interestDetected || 'Software Engineering'}</strong></span>
                </div>
              </div>

              {/* Inferred Interest Reasoning */}
              <div className="interest-detected-card" role="region" aria-label="Reason for Recommendation">
                <div className="meta-sub">Why this recommendation is suggested:</div>
                <p className="interest-why-text">{data.why}</p>
              </div>

              {/* Main Featured Video Reel Preview */}
              <div className="recommended-reel-player-card">
                <div
                  className="player-preview-wrapper"
                  onClick={togglePreviewPlay}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && togglePreviewPlay()}
                  aria-label="Toggle preview video playback"
                >
                  <video
                    ref={videoPreviewRef}
                    className="rec-preview-video"
                    src={previewVideoSrc}
                    loop
                    playsInline
                    muted
                    onError={handlePreviewVideoError}
                    aria-label={`Preview video for ${data.recommendedTechReel}`}
                  >
                    <track kind="captions" srcLang="en" label="English" default />
                  </video>
                  <div className={`preview-play-overlay ${isPlayingPreview ? 'playing' : ''}`} aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      {isPlayingPreview ? (
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      ) : (
                        <path d="M8 5v14l11-7z" />
                      )}
                    </svg>
                  </div>
                  <span className="preview-badge" aria-hidden="true">▶ Preview Video</span>
                </div>

                <div className="player-details-column">
                  <div className="card-top-row" aria-label="Reel Metadata">
                    <span className="category-chip">{data.category || 'Tech'}</span>
                    {recReel?.topic && <span className="topic-chip">{recReel.topic}</span>}
                    <span className="difficulty-chip">{data.difficulty || 'Intermediate'}</span>
                    <span className="confidence-chip">{data.confidence || 'High'} Match</span>
                  </div>

                  <h3 className="rec-reel-title">{data.recommendedTechReel}</h3>
                  <p className="rec-reasoning-body">{data.whyThisRecommendation}</p>

                  {recReel?.hashtags && recReel.hashtags.length > 0 && (
                    <div className="rec-hashtags-list" aria-label="Recommended Hashtags">
                      {recReel.hashtags.map((ht, idx) => (
                        <span key={idx} className="rec-hashtag-chip">
                          {ht.startsWith('#') ? ht : `#${ht}`}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className="jump-to-reel-btn"
                    onClick={() => {
                      onClose();
                      onJumpToReel(data.recommendedTechReel);
                    }}
                    aria-label={`Watch full reel "${data.recommendedTechReel}" in feed`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span>Watch Full Reel in Feed</span>
                  </button>
                </div>
              </div>

              {/* Related Suggested Reels Section */}
              {data.suggestedReels && data.suggestedReels.length > 0 && (
                <div className="suggested-reels-section" role="region" aria-label="More Related Tech Reels">
                  <div className="section-heading">
                    <h4>More Related Tech Reels</h4>
                    <span>Curated based on your interests</span>
                  </div>

                  <div className="suggested-reels-grid">
                    {data.suggestedReels.map((item, idx) => {
                      const itemVideo = item.cloudinaryUrl || GOOGLE_CDN_STREAMS[idx % GOOGLE_CDN_STREAMS.length];
                      return (
                        <div
                          key={item._id || idx}
                          className="suggested-reel-mini-card"
                          onClick={() => {
                            onClose();
                            onJumpToReel(item.title);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              onClose();
                              onJumpToReel(item.title);
                            }
                          }}
                          aria-label={`Watch ${item.title}`}
                        >
                          <div className="mini-video-thumb">
                            <video
                              src={itemVideo}
                              muted
                              playsInline
                              onError={(e) => {
                                e.currentTarget.src = GOOGLE_CDN_STREAMS[idx % GOOGLE_CDN_STREAMS.length];
                              }}
                              aria-hidden="true"
                            />
                            <div className="mini-play-icon" aria-hidden="true">▶</div>
                          </div>
                          <div className="mini-info">
                            <div className="mini-badges">
                              <span className="mini-category">{item.category}</span>
                              <span className="mini-topic">{item.topic || 'Tech'}</span>
                            </div>
                            <h5 className="mini-title">{item.title}</h5>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
