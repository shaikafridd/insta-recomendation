import React, { createContext, useContext, useState, useEffect } from 'react';

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

  // Sync userId to localStorage
  const setUserId = (newId) => {
    const clean = newId.trim() || 'student_101';
    setUserIdState(clean);
    localStorage.setItem('reels_user_id', clean);
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
        showToast
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
