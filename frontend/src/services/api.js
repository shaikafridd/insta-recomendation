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
    caption: 'Flexbox vs CSS Grid in 45 seconds #webdev #frontend #css #javascript',
    category: 'JavaScript',
    difficulty: 'Beginner',
    isHypeBait: false,
    cloudinaryUrl: 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-42845-large.mp4'
  },
  {
    _id: 'mock_reel_2',
    title: 'Designing a Distributed Rate Limiter with Token Bucket & Redis',
    caption: 'System Design for high-throughput APIs handling 100k req/sec #hld #systemdesign #backend',
    category: 'HLD',
    difficulty: 'Advanced',
    isHypeBait: false,
    cloudinaryUrl: 'https://assets.mixkit.co/videos/preview/mixkit-programmer-working-on-his-laptop-in-an-office-42844-large.mp4'
  },
  {
    _id: 'mock_reel_3',
    title: 'Binary Search Edge Cases: Never Get Off-by-One Errors Again',
    caption: 'Mastering the low <= high invariant in interview coding rounds #dsa #algorithms #leetcode',
    category: 'DSA',
    difficulty: 'Intermediate',
    isHypeBait: false,
    cloudinaryUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-42840-large.mp4'
  },
  {
    _id: 'mock_reel_4',
    title: '10 AI Tools That Will Get You Hired Instantly in 2025!',
    caption: 'Top secret AI cheatsheets that software engineers don’t want you to know 🚀💸 #ai #aitools #clickbait',
    category: 'AI',
    difficulty: 'Beginner',
    isHypeBait: true,
    cloudinaryUrl: 'https://assets.mixkit.co/videos/preview/mixkit-man-working-with-a-computer-and-writing-notes-42842-large.mp4'
  },
  {
    _id: 'mock_reel_5',
    title: 'A Day in the Life of a Staff Backend Engineer at Scale',
    caption: 'Balancing architecture RFCs, distributed tracing, and code reviews #backend #career #lifestyle',
    category: 'Career',
    difficulty: 'Intermediate',
    isHypeBait: false,
    cloudinaryUrl: 'https://assets.mixkit.co/videos/preview/mixkit-close-up-of-a-circuit-board-with-neon-lights-42848-large.mp4'
  },
  {
    _id: 'mock_reel_6',
    title: 'Zero-Downtime Blue/Green Deployments with Kubernetes',
    caption: 'How production clusters deploy updates without dropping active requests #cloud #devops #kubernetes',
    category: 'Cloud',
    difficulty: 'Advanced',
    isHypeBait: false,
    cloudinaryUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-man-wearing-headphones-working-on-a-computer-42843-large.mp4'
  }
];
