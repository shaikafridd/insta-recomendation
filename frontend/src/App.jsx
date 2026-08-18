import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ReelsFeed } from './components/ReelsFeed';
import { RecommendationModal } from './components/RecommendationModal';
import { ProfileModal } from './components/ProfileModal';
import { Toast } from './components/Toast';
import { fetchReels } from './services/api';
import { useUser } from './context/UserContext';
import './styles/index.css';
import './styles/sidebar.css';
import './styles/reels.css';
import './styles/modals.css';

export const App = () => {
  const { showToast } = useUser();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [heartPopPosition, setHeartPopPosition] = useState(null);
  const feedRef = useRef(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const data = await fetchReels();
      setReels(data);
    } catch (err) {
      console.error('Failed to load reels catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHeartPop = (x, y) => {
    setHeartPopPosition({ x: x || window.innerWidth / 2, y: y || window.innerHeight / 2 });
    setTimeout(() => setHeartPopPosition(null), 500);
  };

  const handleJumpToReel = (targetTitle) => {
    if (!feedRef.current || !targetTitle) return;
    const cards = feedRef.current.querySelectorAll('.reel-card');
    let matchedCard = null;

    cards.forEach((card) => {
      const title = card.getAttribute('data-title') || '';
      if (title.toLowerCase().includes(targetTitle.toLowerCase())) {
        matchedCard = card;
      }
    });

    if (matchedCard) {
      matchedCard.scrollIntoView({ behavior: 'smooth' });
      showToast(`Jumped to: "${targetTitle}" 🚀`);
    } else {
      showToast(`Recommended: "${targetTitle}"`);
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar & Mobile Navigation */}
      <Sidebar
        onOpenRecommendations={() => setIsRecModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* Main Reels Feed Area */}
      <main className="reels-main-wrapper">
        <ReelsFeed
          reels={reels}
          loading={loading}
          feedRef={feedRef}
          onOpenRecommendations={() => setIsRecModalOpen(true)}
          onHeartPop={handleHeartPop}
        />
      </main>

      {/* Modals & Drawers */}
      <RecommendationModal
        isOpen={isRecModalOpen}
        onClose={() => setIsRecModalOpen(false)}
        onJumpToReel={handleJumpToReel}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Heart Pop Animation Overlay */}
      {heartPopPosition && (
        <div
          className="heart-pop active"
          style={{
            left: `${heartPopPosition.x}px`,
            top: `${heartPopPosition.y}px`
          }}
        >
          ❤️
        </div>
      )}

      {/* Micro-interaction Toasts */}
      <Toast />
    </div>
  );
};

export default App;
