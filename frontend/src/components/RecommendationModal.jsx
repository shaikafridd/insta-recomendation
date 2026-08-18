import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { fetchRecommendation } from '../services/api';

const GOOGLE_CDN_STREAMS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4'
];

export const RecommendationModal = ({ isOpen, onClose, onJumpToReel }) => {
  const { userId, interactionCount, sessionDwellSeconds } = useUser();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewVideoSrc, setPreviewVideoSrc] = useState(GOOGLE_CDN_STREAMS[0]);
  const videoPreviewRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadRecommendation();
    } else {
      setIsPlayingPreview(false);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.pause();
      }
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (data?.recommendedReel?.cloudinaryUrl) {
      setPreviewVideoSrc(data.recommendedReel.cloudinaryUrl);
    } else {
      setPreviewVideoSrc(GOOGLE_CDN_STREAMS[0]);
    }
  }, [data]);

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
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal-sheet rec-sheet-expanded" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-badge-ai">⚡ GROQ AI RECOMMENDATION ENGINE</div>
            <h3>Suggested For You</h3>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-content">
          {loading && (
            <div className="modal-loading">
              <div className="spinner"></div>
              <p>Analyzing your likes, watch duration, and topics with Groq LLM...</p>
            </div>
          )}

          {error && !loading && (
            <div className="modal-loading">
              <p style={{ color: '#ff3b30' }}>Error: {error}</p>
              <button className="refresh-profile-btn" onClick={loadRecommendation}>
                Retry Analysis
              </button>
            </div>
          )}

          {data && !loading && (
            <div className="rec-result-view">
              {/* Engagement Signal Breakdown */}
              <div className="engagement-signal-banner">
                <div className="signal-pill">
                  <span className="signal-icon">🔥</span>
                  <span>Session Dwell: <strong>{sessionDwellSeconds}s</strong></span>
                </div>
                <div className="signal-pill">
                  <span className="signal-icon">❤️</span>
                  <span>Interactions: <strong>{interactionCount}</strong></span>
                </div>
                <div className="signal-pill active-cluster">
                  <span>Interest: <strong>{data.interestDetected || 'Software Engineering'}</strong></span>
                </div>
              </div>

              {/* Inferred Interest Reasoning */}
              <div className="interest-detected-card">
                <div className="meta-sub">Why this recommendation is suggested:</div>
                <p className="interest-why-text">{data.why}</p>
              </div>

              {/* Main Featured Video Reel Preview */}
              <div className="recommended-reel-player-card">
                <div className="player-preview-wrapper" onClick={togglePreviewPlay}>
                  <video
                    ref={videoPreviewRef}
                    className="rec-preview-video"
                    src={previewVideoSrc}
                    loop
                    playsInline
                    muted
                    onError={handlePreviewVideoError}
                  />
                  <div className={`preview-play-overlay ${isPlayingPreview ? 'playing' : ''}`}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      {isPlayingPreview ? (
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      ) : (
                        <path d="M8 5v14l11-7z" />
                      )}
                    </svg>
                  </div>
                  <span className="preview-badge">▶ Preview Video</span>
                </div>

                <div className="player-details-column">
                  <div className="card-top-row">
                    <span className="category-chip">{data.category || 'Tech'}</span>
                    {recReel?.topic && <span className="topic-chip">{recReel.topic}</span>}
                    <span className="difficulty-chip">{data.difficulty || 'Intermediate'}</span>
                    <span className="confidence-chip">{data.confidence || 'High'} Match</span>
                  </div>

                  <h3 className="rec-reel-title">{data.recommendedTechReel}</h3>
                  <p className="rec-reasoning-body">{data.whyThisRecommendation}</p>

                  {recReel?.hashtags && recReel.hashtags.length > 0 && (
                    <div className="rec-hashtags-list">
                      {recReel.hashtags.map((ht, idx) => (
                        <span key={idx} className="rec-hashtag-chip">
                          {ht.startsWith('#') ? ht : `#${ht}`}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    className="jump-to-reel-btn"
                    onClick={() => {
                      onClose();
                      onJumpToReel(data.recommendedTechReel);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span>Watch Full Reel in Feed</span>
                  </button>
                </div>
              </div>

              {/* Related Suggested Reels Section */}
              {data.suggestedReels && data.suggestedReels.length > 0 && (
                <div className="suggested-reels-section">
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
                        >
                          <div className="mini-video-thumb">
                            <video
                              src={itemVideo}
                              muted
                              playsInline
                              onError={(e) => {
                                e.currentTarget.src = GOOGLE_CDN_STREAMS[idx % GOOGLE_CDN_STREAMS.length];
                              }}
                            />
                            <div className="mini-play-icon">▶</div>
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
