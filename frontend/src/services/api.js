/**
 * API Client for Reels Recommender Backend
 */

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const fetchReels = async (limit = 30, userId = null) => {
  try {
    const userQuery = userId ? `&userId=${encodeURIComponent(userId)}` : '';
    const res = await fetch(`${API_BASE}/reels?limit=${limit}&shuffle=true&_t=${Date.now()}${userQuery}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.warn('[API] Error fetching reels, falling back to dynamic sample catalog:', error);
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
  } catch {
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
        dwellMs: Number(dwellMs) || 0,
        replayCount: Number(replayCount) || 0
      })
    });
    return await res.json();
  } catch (error) {
    console.warn('[API] Error logging interaction:', error.message);
    return null;
  }
};

export const getRecommendationStreamUrl = (userId) => {
  return `${API_BASE}/recommendations/stream/${encodeURIComponent(userId)}`;
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

const BASE_FALLBACK_CATALOG = [
  {
    _id: '65b9f71c4f1c2b001a1e8001',
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
    _id: '65b9f71c4f1c2b001a1e8002',
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
    _id: '65b9f71c4f1c2b001a1e8003',
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
    _id: '65b9f71c4f1c2b001a1e8004',
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
    _id: '65b9f71c4f1c2b001a1e8005',
    title: '15‑Second Quick Tip: HTTP Status Codes Explained',
    topic: 'REST APIs & HTTP Response Statuses',
    caption: 'Understanding 2xx, 3xx, 4xx, and 5xx response headers in modern APIs #http #webdev #apis',
    category: 'Other',
    difficulty: 'Beginner',
    hashtags: ['#HTTP', '#WebDev', '#StatusCodes'],
    isHypeBait: false,
    cloudinaryUrl: 'https://res.cloudinary.com/ya9jbo7f/video/upload/v1787035458/Video-47797.mp4'
  },
  {
    _id: '65b9f71c4f1c2b001a1e8006',
    title: 'Designing High-Throughput Distributed Caches (Redis)',
    topic: 'Distributed Systems & LRU Caching',
    caption: 'Cache invalidation strategies, write-through vs write-back caching #hld #systemdesign #redis',
    category: 'HLD',
    difficulty: 'Advanced',
    hashtags: ['#SystemDesign', '#Redis', '#Architecture'],
    isHypeBait: false,
    cloudinaryUrl: 'https://res.cloudinary.com/ya9jbo7f/video/upload/v1787035465/Video-87899.mp4'
  },
  {
    _id: '65b9f71c4f1c2b001a1e8007',
    title: 'Binary Search Trees vs Hash Tables: When to Use What?',
    topic: 'Data Structures & Algorithmic Complexity',
    caption: 'O(log N) ordered traversal vs O(1) average lookup #dsa #algorithms #cs',
    category: 'DSA',
    difficulty: 'Intermediate',
    hashtags: ['#DSA', '#Algorithms', '#LeetCode'],
    isHypeBait: false,
    cloudinaryUrl: 'https://res.cloudinary.com/ya9jbo7f/video/upload/v1787035467/Video-43343.mp4'
  },
  {
    _id: '65b9f71c4f1c2b001a1e8008',
    title: 'Transformer Attention Mechanism Explained in 60s',
    topic: 'Deep Learning & Self-Attention',
    caption: 'Query, Key, Value matrices and Scaled Dot-Product computation #ai #machinelearning #llm',
    category: 'AI',
    difficulty: 'Advanced',
    hashtags: ['#AI', '#MachineLearning', '#Transformers'],
    isHypeBait: false,
    cloudinaryUrl: 'https://res.cloudinary.com/ya9jbo7f/video/upload/v1787035468/Video-10581.mp4'
  },
  {
    _id: '65b9f71c4f1c2b001a1e8009',
    title: 'When the Senior Dev Says "It Works on My Machine" 😂',
    topic: 'CS Humor & Dev Memes',
    caption: 'Dockerizing everything just to prove a point #humor #memes #codingjokes',
    category: 'Entertainment',
    difficulty: 'Beginner',
    hashtags: ['#DevMemes', '#CodingJokes', '#CSHumor'],
    isHypeBait: false,
    cloudinaryUrl: 'https://res.cloudinary.com/ya9jbo7f/video/upload/v1787035462/Video-42124.mp4'
  }
];

export const getFallbackReels = () => {
  const shuffled = [...BASE_FALLBACK_CATALOG];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
