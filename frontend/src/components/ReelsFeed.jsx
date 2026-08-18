import React, { useState, useEffect, useRef, useCallback } from 'react';
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

  const handleInteractionLog = useCallback(
    async (eventData) => {
      incrementInteractions();
      await logInteraction({
        userId,
        ...eventData
      });
    },
    [userId, incrementInteractions]
  );

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
  }, [reels, feedRef, handleInteractionLog]);

  // Keyboard navigation support for accessibility (Arrow Up/Down, J/K, Space)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!feedRef.current) return;
      if (['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase())) return;

      const container = feedRef.current;
      const cards = container.querySelectorAll('.reel-card');

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const nextIndex = Math.min(cards.length - 1, activeIndex + 1);
        cards[nextIndex]?.scrollIntoView({ behavior: 'smooth' });
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prevIndex = Math.max(0, activeIndex - 1);
        cards[prevIndex]?.scrollIntoView({ behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, feedRef]);

  if (loading) {
    return (
      <section
        className="reels-feed-container"
        role="feed"
        aria-busy="true"
        aria-label="Loading reels feed"
      >
        <div className="loading-spinner-container" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true"></div>
          <p>Loading curated reels catalog...</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="reels-feed-container"
      ref={feedRef}
      id="reelsFeed"
      role="feed"
      aria-label="Instagram Tech Reels Video Feed"
      aria-busy="false"
      tabIndex={0}
    >
      {reels.map((reel, index) => (
        <ReelCard
          key={reel._id || `reel_${index}`}
          reel={reel}
          index={index}
          activeIndex={activeIndex}
          isActive={activeIndex === index}
          onInteraction={handleInteractionLog}
          onOpenRecommendations={onOpenRecommendations}
          onHeartPop={onHeartPop}
        />
      ))}
    </section>
  );
};
