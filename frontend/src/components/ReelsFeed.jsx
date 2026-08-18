import React, { useState, useEffect, useRef } from 'react';
import { ReelCard } from './ReelCard';
import { useUser } from '../context/UserContext';
import { logInteraction } from '../services/api';

export const ReelsFeed = ({
  reels,
  loading,
  onOpenRecommendations,
  onHeartPop,
  feedRef
}) => {
  const { userId, incrementInteractions } = useUser();
  const [activeIndex, setActiveIndex] = useState(0);
  const dwellStartRef = useRef(Date.now());
  const activeReelIdRef = useRef(null);

  // Set up IntersectionObserver to detect currently visible reel and log telemetry
  useEffect(() => {
    const container = feedRef.current;
    if (!container) return;

    const cards = container.querySelectorAll('.reel-card');
    if (!cards || cards.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute('data-index'));
          const currentReel = reels[index];

          if (entry.isIntersecting) {
            setActiveIndex(index);
            dwellStartRef.current = Date.now();
            activeReelIdRef.current = currentReel?._id;
          } else {
            // Scrolled out of view -> calculate dwell & log watch or skip
            const dwellMs = Date.now() - dwellStartRef.current;
            const previousReelId = currentReel?._id;

            if (dwellMs > 400 && previousReelId) {
              const eventType = dwellMs < 2500 ? 'skip' : 'watch';
              const watchPercent = Math.min(100, Math.round((dwellMs / 12000) * 100));

              handleInteractionLog({
                reelId: previousReelId,
                eventType,
                watchPercent,
                dwellMs
              });
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.65
      }
    );

    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [reels, feedRef]);

  const handleInteractionLog = async (eventData) => {
    incrementInteractions();
    await logInteraction({
      userId,
      ...eventData
    });
  };

  if (loading) {
    return (
      <div className="reels-feed-container">
        <div className="loading-spinner-container">
          <div className="spinner"></div>
          <p>Loading curated reels catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reels-feed-container" ref={feedRef} id="reelsFeed">
      {reels.map((reel, index) => (
        <ReelCard
          key={reel._id || `reel_${index}`}
          reel={reel}
          index={index}
          isActive={activeIndex === index}
          onInteraction={handleInteractionLog}
          onOpenRecommendations={onOpenRecommendations}
          onHeartPop={onHeartPop}
        />
      ))}
    </div>
  );
};
