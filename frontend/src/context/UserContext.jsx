import React, { createContext, useContext, useState, useEffect } from 'react';
import { getRecommendationStreamUrl } from '../services/api';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userId, setUserIdState] = useState(() => {
    return localStorage.getItem('reels_user_id') || 'student_101';
  });
  const [interactionCount, setInteractionCount] = useState(0);
  const [sessionStartTime] = useState(Date.now());
  const [sessionDwellSeconds, setSessionDwellSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [latestRecommendation, setLatestRecommendation] = useState(null);
  const [hasNewRecNotification, setHasNewRecNotification] = useState(false);

  // Sync userId to localStorage
  const setUserId = (newId) => {
    const clean = newId.trim() || 'student_101';
    setUserIdState(clean);
    localStorage.setItem('reels_user_id', clean);
    setLatestRecommendation(null);
    setHasNewRecNotification(false);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  const incrementInteractions = () => {
    setInteractionCount((prev) => prev + 1);
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      showToast(next ? 'Muted' : 'Sound On 🔊');
      return next;
    });
  };

  // Dwell timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionDwellSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  // Real-time Server-Sent Events (SSE) Stream Listener for Live AI Recommendations
  useEffect(() => {
    if (!userId) return;

    const streamUrl = getRecommendationStreamUrl(userId);
    let eventSource = null;

    try {
      eventSource = new EventSource(streamUrl);

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'recommendation_update' && parsed.data) {
            setLatestRecommendation(parsed.data);
            setHasNewRecNotification(true);
            showToast(`💡 Live AI Recommendation: "${parsed.data.recommendedTechReel}"`);
          }
        } catch (err) {
          // Heartbeat comment frame
        }
      };

      eventSource.onerror = () => {
        // Handled silently by browser auto-reconnect
      };
    } catch (e) {
      console.warn('[SSE] EventSource connection skipped:', e.message);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [userId]);

  return (
    <UserContext.Provider
      value={{
        userId,
        setUserId,
        interactionCount,
        incrementInteractions,
        sessionDwellSeconds,
        isMuted,
        toggleMute,
        toastMessage,
        setToastMessage,
        showToast,
        latestRecommendation,
        setLatestRecommendation,
        hasNewRecNotification,
        setHasNewRecNotification
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};
