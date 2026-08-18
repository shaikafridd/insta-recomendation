/**
 * Type Definitions for Reels Interest-Recommender System
 */

export type TechnicalCategory =
  | 'AI'
  | 'DSA'
  | 'JavaScript'
  | 'HLD'
  | 'Cybersecurity'
  | 'Cloud'
  | 'Hardware'
  | 'Career'
  | 'Entertainment'
  | 'Other';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export type InteractionEventType = 'watch' | 'skip' | 'like' | 'share' | 'replay';

export interface ReelItem {
  _id: string;
  title: string;
  topic?: string;
  caption?: string;
  transcript?: string;
  cloudinaryUrl: string;
  cloudinaryPublicId?: string;
  category: TechnicalCategory;
  difficulty: DifficultyLevel;
  tags?: string[];
  hashtags?: string[];
  isHypeBait: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface InteractionPayload {
  userId: string;
  reelId: string;
  eventType: InteractionEventType;
  watchPercent: number;
  dwellMs: number;
  replayCount?: number;
}

export interface StructuredRecommendation {
  currentReel: string;
  interestDetected: string;
  why: string;
  recommendedTechReel: string;
  category: TechnicalCategory;
  whyThisRecommendation: string;
  difficulty: DifficultyLevel;
  confidence: ConfidenceLevel;
  recommendedReel?: ReelItem | null;
  suggestedReels?: ReelItem[];
}

export interface UserInterestProfile {
  userId: string;
  primaryInterest: string;
  confidence: ConfidenceLevel;
  evidence: string[];
  updatedAt: string;
}

export interface UserContextType {
  userId: string;
  setUserId: (id: string) => void;
  isMuted: boolean;
  toggleMute: () => void;
  interactionCount: number;
  sessionDwellSeconds: number;
  incrementInteractions: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}
