/**
 * API Client for Reels Recommender Backend
 */

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const fetchReels = async (limit = 20) => {
  try {
    const res = await fetch(`${API_BASE}/reels?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.warn('[API] Error fetching reels, falling back to sample catalog:', error);
    return getFallbackReels();
  }
};

export const syncCloudinaryReels = async () => {
  const res = await fetch(`${API_BASE}/reels/sync-cloudinary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('Please restart backend server (`npm start` or `npm run dev`) to load new Cloudinary route & credentials.');
  }
  if (!res.ok) throw new Error(data.error || 'Failed to sync with Cloudinary');
  return data;
};

export const logInteraction = async ({ userId, reelId, eventType, watchPercent, dwellMs, replayCount }) => {
  if (!reelId || reelId.length !== 24) return null; // Avoid logging invalid demo IDs
  try {
    const res = await fetch(`${API_BASE}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        reelId,
        eventType,
        watchPercent: Number(watchPercent) || 0,
        dwellMs: Number(dwellMs) || 0
      })
    });
    return await res.json();
  } catch (error) {
    console.warn('[API] Error logging interaction:', error.message);
    return null;
  }
};

export const fetchRecommendation = async (userId) => {
  const res = await fetch(`${API_BASE}/recommendations/${userId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
};

export const fetchInterestProfile = async (userId, forceRefresh = false) => {
  const url = `${API_BASE}/interest-profile/${userId}${forceRefresh ? '?refresh=true' : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data;
};

export const getFallbackReels = () => [
  {
    _id: 'mock_reel_1',
    title: 'Why Centering a Div with CSS Still Breaks Your Brain',
    topic: 'CSS Flexbox & Centering',
    caption: 'Flexbox vs CSS Grid in 45 seconds #webdev #frontend #css #javascript',
    category: 'JavaScript',
    difficulty: 'Beginner',
    hashtags: ['#webdev', '#frontend', '#css', '#flexbox'],
    isHypeBait: false,
    cloudinaryUrl: 'https://res.cloudinary.com/ya9jbo7f/video/upload/v1787035456/Video-87899.mp4'
  },
  {
    _id: 'mock_reel_2',
    title: '15‑Second Crash Course: What Is a DNS Query?',
    topic: 'Domain Name System (DNS) Basics',
    caption: 'How browser domain resolution works across authoritative nameservers #cloud #dns #networking',
    category: 'Cloud',
    difficulty: 'Beginner',
    hashtags: ['#DNS', '#Networking', '#CloudBasics'],
    isHypeBait: false,
    cloudinaryUrl: 'https://res.cloudinary.com/ya9jbo7f/video/upload/v1787035469/Video-43343.mp4'
  },
  {
    _id: 'mock_reel_3',
    title: '15‑Second Git Stash Cheat Sheet',
    topic: 'Git Stash & Workspace Management',
    caption: 'Save uncommitted work without creating dirty commits #git #devtips #coding',
    category: 'Career',
    difficulty: 'Beginner',
    hashtags: ['#Git', '#VersionControl', '#DevTips'],
    isHypeBait: false,
    cloudinaryUrl: 'https://res.cloudinary.com/ya9jbo7f/video/upload/v1787035460/Video-10581.mp4'
  },
  {
    _id: 'mock_reel_4',
    title: 'Quick Guide: Optimizing MP4 Videos with Cloudinary',
    topic: 'Cloud Video Optimization & Transcoding',
    caption: 'Adaptive bitrate streaming and WebM fallback compression #cloud #video #webperformance',
    category: 'Cloud',
    difficulty: 'Intermediate',
    hashtags: ['#Cloudinary', '#VideoOptimization', '#WebPerformance'],
    isHypeBait: false,
    cloudinaryUrl: 'https://res.cloudinary.com/ya9jbo7f/video/upload/v1787035462/Video-42124.mp4'
  },
  {
    _id: 'mock_reel_5',
    title: '15‑Second Quick Tip: HTTP Status Codes Explained',
    topic: 'REST APIs & HTTP Response Statuses',
    caption: 'Understanding 2xx, 3xx, 4xx, and 5xx response headers in modern APIs #http #webdev #apis',
    category: 'Other',
    difficulty: 'Beginner',
    hashtags: ['#HTTP', '#WebDev', '#StatusCodes'],
    isHypeBait: false,
    cloudinaryUrl: 'https://res.cloudinary.com/ya9jbo7f/video/upload/v1787035458/Video-47797.mp4'
  }
];
