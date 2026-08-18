const Groq = require('groq-sdk');
const { CATEGORIES, DIFFICULTIES } = require('../constants');

const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const FALLBACK_MODEL = 'qwen/qwen3.6-27b';
const REQUEST_TIMEOUT_MS = 12000;
const MAX_RETRIES = 2;

let groqClient = null;

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
};

const callWithRetry = async (fn, retries = MAX_RETRIES, delayMs = 1000) => {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Groq API request timed out')), REQUEST_TIMEOUT_MS)
    );
    return await Promise.race([fn(), timeoutPromise]);
  } catch (error) {
    if (retries > 0) {
      console.warn(`[Groq] Request failed (${error.message}). Retrying in ${delayMs}ms... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return callWithRetry(fn, retries - 1, delayMs * 1.5);
    }
    throw error;
  }
};

const safeParseJSON = (text) => {
  if (!text || typeof text !== 'string') return null;
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (err2) {
        return null;
      }
    }
    return null;
  }
};

/**
 * Generate intelligent title, topic, category, caption, and hashtags for a Cloudinary video
 * @param {Object} videoInfo - { publicId, url, tags, format, duration }
 * @returns {Promise<Object>}
 */
const generateReelMetadata = async (videoInfo) => {
  const client = getGroqClient();
  const cleanId = (videoInfo.publicId || 'tech_video')
    .replace(/^reels\//, '')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ');

  if (!client) {
    // Fallback heuristic metadata if Groq is not configured
    const inferredCategory = videoInfo.tags?.length > 0 ? 'AI' : 'JavaScript';
    return {
      title: cleanId.replace(/\b\w/g, (c) => c.toUpperCase()),
      topic: `${inferredCategory} Fundamentals`,
      category: inferredCategory,
      caption: `Educational breakdown on ${cleanId} #${inferredCategory.toLowerCase()} #coding #tech`,
      hashtags: [`#${inferredCategory.toLowerCase()}`, '#coding', '#tech', '#education'],
      difficulty: 'Intermediate',
      isHypeBait: false
    };
  }

  const systemPrompt = `You are an expert technical content curator and educator.
Given raw video file metadata from Cloudinary (publicId, duration, existing tags), deduce an educational, high-substance reel title, primary topic, category, caption, hashtags, and difficulty level.

CRITICAL INSTRUCTIONS:
- Generate a clean, descriptive title suitable for tech students.
- Identify the core technical topic (e.g. "Distributed Caching", "Binary Search Trees", "CSS Flexbox", "Kubernetes Ingress").
- Choose the most fitting category from: ["AI", "DSA", "JavaScript", "HLD", "Cybersecurity", "Cloud", "Hardware", "Career", "Entertainment", "Other"].
- Generate 3-5 relevant tech hashtags (with # prefix).
- Set isHypeBait to true ONLY if it looks like shallow clickbait (e.g. "make $10k in 5 minutes with AI"), otherwise false.

Return strict JSON:
{
  "title": "Clear educational title",
  "topic": "Core technical topic",
  "category": "AI" | "DSA" | "JavaScript" | "HLD" | "Cybersecurity" | "Cloud" | "Hardware" | "Career" | "Entertainment" | "Other",
  "caption": "Concise educational caption explaining what this reel teaches",
  "hashtags": ["#topic1", "#topic2", "#topic3"],
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "isHypeBait": boolean
}`;

  const userPrompt = `Video Metadata from Cloudinary:
- Public ID / Filename: "${videoInfo.publicId}"
- Inferred Name: "${cleanId}"
- Duration: ${videoInfo.duration || 15}s
- Existing Tags: ${(videoInfo.tags || []).join(', ') || 'None'}
- Format: ${videoInfo.format || 'mp4'}

Generate high-quality educational metadata for this reel. Respond ONLY with the JSON object.`;

  try {
    const result = await callWithRetry(async () => {
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      });
      return response.choices[0]?.message?.content;
    });

    const parsed = safeParseJSON(result);
    if (parsed && parsed.title) {
      return {
        title: parsed.title,
        topic: parsed.topic || 'General Tech',
        category: CATEGORIES.includes(parsed.category) ? parsed.category : 'Other',
        caption: parsed.caption || '',
        hashtags: Array.isArray(parsed.hashtags)
          ? parsed.hashtags
          : [`#${(parsed.category || 'tech').toLowerCase()}`, '#coding', '#learn'],
        difficulty: DIFFICULTIES.includes(parsed.difficulty) ? parsed.difficulty : 'Intermediate',
        isHypeBait: Boolean(parsed.isHypeBait)
      };
    }
  } catch (error) {
    console.error(`[Groq] Metadata generation error: ${error.message}`);
  }

  // Safe fallback
  return {
    title: cleanId.replace(/\b\w/g, (c) => c.toUpperCase()),
    topic: 'Software Development',
    category: 'Other',
    caption: `Educational breakdown on ${cleanId} #tech #education`,
    hashtags: ['#tech', '#programming', '#software'],
    difficulty: 'Intermediate',
    isHypeBait: false
  };
};

/**
 * Infer the user's broader underlying interest from recent interactions
 * Analyzes Titles, Topics, Hashtags, Categories, and Watch Signals
 */
const inferInterest = async (recentInteractions) => {
  if (!recentInteractions || recentInteractions.length === 0) {
    return {
      primaryInterest: 'General Computer Science & Software Development',
      evidence: ['No recent interaction history available; default baseline applied.'],
      confidence: 'Low'
    };
  }

  const client = getGroqClient();
  if (!client) {
    console.warn('[Groq] GROQ_API_KEY missing. Using fallback heuristic interest inference.');
    const categories = recentInteractions.map((i) => i.reelId?.category || 'Tech').filter(Boolean);
    const topCategory = categories[0] || 'Software Engineering';
    return {
      primaryInterest: `${topCategory} and Practical Programming Concepts`,
      evidence: recentInteractions.slice(0, 3).map(
        (i) => `Watched "${i.reelId?.title || 'Unknown'}" (${i.watchPercent || 0}% completion)`
      ),
      confidence: 'Low'
    };
  }

  const interactionsSummary = recentInteractions
    .map((item, idx) => {
      const reel = item.reelId || {};
      const hashtagsStr = (reel.hashtags || []).join(' ') || (reel.tags || []).join(', ') || 'None';
      return `${idx + 1}. Title: "${reel.title || 'Untitled'}"
   Topic: "${reel.topic || 'General'}"
   Category: ${reel.category || 'Unknown'}
   Hashtags: ${hashtagsStr}
   Event: ${item.eventType} (Watch Completion: ${item.watchPercent || 0}%, Dwell: ${item.dwellMs || 0}ms, Replays: ${item.replayCount || 0})
   Caption: "${reel.caption || 'N/A'}"`;
    })
    .join('\n\n');

  const systemPrompt = `You are an interest-inference engine.
Given a sequence of short-video interactions (Title, Topic, Category, Hashtags, Watch%, Event Type), infer the user's BROADER underlying technical/career interest — not just shallow keyword matching.
Cross-reference the topics and hashtags to identify their technical cluster (e.g. Distributed Systems, Frontend UI Architecture, Algorithmic Problem Solving, Cloud DevOps).

Return strict JSON:
{
  "primaryInterest": "Broader descriptive interest domain",
  "evidence": ["Point 1 explaining why based on specific titles, topics and hashtags watched", "Point 2"],
  "confidence": "High" | "Medium" | "Low"
}`;

  const userPrompt = `Analyze this user's recent video interaction session:\n\n${interactionsSummary}\n\nInfer their underlying technical/career interest cluster using topics, hashtags, and titles. Respond ONLY with the requested JSON object.`;

  try {
    const result = await callWithRetry(async () => {
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      });
      return response.choices[0]?.message?.content;
    });

    const parsed = safeParseJSON(result);
    if (parsed && parsed.primaryInterest) {
      return {
        primaryInterest: parsed.primaryInterest,
        evidence: Array.isArray(parsed.evidence)
          ? parsed.evidence
          : [String(parsed.evidence || 'Evidence deduced from recent watch patterns.')],
        confidence: ['High', 'Medium', 'Low'].includes(parsed.confidence) ? parsed.confidence : 'Medium'
      };
    }
  } catch (error) {
    console.error(`[Groq] Interest inference error: ${error.message}`);
  }

  return {
    primaryInterest: 'Software Development & Technical Problem Solving',
    evidence: ['Fallback profile generated from recent session watch logs.'],
    confidence: 'Low'
  };
};

/**
 * Rank candidate tech reels from the same category as a liked reel using titles, topics, and hashtags
 */
const rankSameCategory = async (likedReel, candidateReels) => {
  const fallbackReel = candidateReels.find((r) => !r.isHypeBait) || candidateReels[0] || likedReel;

  const client = getGroqClient();
  if (!client || !candidateReels || candidateReels.length === 0) {
    return {
      recommendedReelTitle: fallbackReel.title,
      category: fallbackReel.category || likedReel.category,
      difficulty: fallbackReel.difficulty || 'Intermediate',
      confidence: client ? 'Medium' : 'Low',
      whyThisRecommendation: `Recommended directly from ${likedReel.category} (${fallbackReel.topic || 'Tech'}) following your like on "${likedReel.title}".`
    };
  }

  const candidatesFormatted = candidateReels
    .map((reel, idx) => {
      return `[Candidate ${idx + 1}]
ID: ${reel._id}
Title: "${reel.title}"
Topic: "${reel.topic || 'General'}"
Category: ${reel.category}
Difficulty: ${reel.difficulty}
Hashtags: ${(reel.hashtags || reel.tags || []).join(' ')}
IsHypeBait: ${reel.isHypeBait ? 'TRUE (Shallow/Clickbait)' : 'FALSE (High Substance)'}
Caption: "${reel.caption || ''}"`;
    })
    .join('\n\n');

  const systemPrompt = `You are a recommendation reasoner.
Given a liked reel (Title, Topic, Hashtags) and candidate reels from the same category, pick the single most educationally substantive match.
AVOID shallow hype content unless it is the only option.
Analyze the hashtags and topics to find the best conceptual continuation.

Return strict JSON:
{
  "recommendedReelTitle": "Exact title of selected candidate reel",
  "category": "AI" | "DSA" | "JavaScript" | "HLD" | "Cybersecurity" | "Cloud" | "Hardware" | "Career" | "Other",
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "confidence": "High" | "Medium" | "Low",
  "whyThisRecommendation": "Detailed reasoning explaining how this reel provides high educational value directly continuing the topic and hashtags of the liked reel"
}`;

  const userPrompt = `Liked Reel Context:
- Title: "${likedReel.title}"
- Topic: "${likedReel.topic || 'Tech'}"
- Category: ${likedReel.category}
- Hashtags: ${(likedReel.hashtags || likedReel.tags || []).join(' ')}
- Difficulty: ${likedReel.difficulty || 'Beginner'}

Candidate Reels from same category:
${candidatesFormatted}

Pick the single best candidate reel. Respond ONLY with the JSON object.`;

  try {
    const result = await callWithRetry(async () => {
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      });
      return response.choices[0]?.message?.content;
    });

    const parsed = safeParseJSON(result);
    if (parsed && parsed.recommendedReelTitle) {
      return {
        recommendedReelTitle: parsed.recommendedReelTitle,
        category: parsed.category || likedReel.category,
        difficulty: parsed.difficulty || 'Intermediate',
        confidence: ['High', 'Medium', 'Low'].includes(parsed.confidence) ? parsed.confidence : 'High',
        whyThisRecommendation:
          parsed.whyThisRecommendation ||
          `Recommended following your like on "${likedReel.title}" to deepen your knowledge in ${likedReel.category}.`
      };
    }
  } catch (error) {
    console.error(`[Groq] rankSameCategory error: ${error.message}`);
  }

  return {
    recommendedReelTitle: fallbackReel.title,
    category: fallbackReel.category || likedReel.category,
    difficulty: fallbackReel.difficulty || 'Intermediate',
    confidence: 'Low',
    whyThisRecommendation: `Selected from ${likedReel.category} category based on high relevance to "${likedReel.title}".`
  };
};

/**
 * Rank candidate tech reels against user interest profile using titles, topics, and hashtags
 */
const rankRecommendation = async (interestProfile, candidateReels, currentReel = null) => {
  if (!candidateReels || candidateReels.length === 0) {
    return {
      currentReel: currentReel?.title || 'None',
      interestDetected: interestProfile.primaryInterest || 'General Tech',
      why: 'No candidate reels matched the filter criteria in the catalog.',
      recommendedTechReel: 'No recommendations available',
      category: 'Other',
      whyThisRecommendation: 'Please populate the catalog with technical reels.',
      difficulty: 'Beginner',
      confidence: 'Low'
    };
  }

  const client = getGroqClient();
  const currentTitle = currentReel?.title || candidateReels[0]?.title || 'General Tech Session';

  if (!client) {
    console.warn('[Groq] GROQ_API_KEY missing. Using catalog ranking fallback.');
    const selected = candidateReels.find((r) => !r.isHypeBait) || candidateReels[0];
    return {
      currentReel: currentTitle,
      interestDetected: interestProfile.primaryInterest || 'Software Engineering',
      why: `Based on your recent watch history indicating interest in ${interestProfile.primaryInterest || 'technology'}.`,
      recommendedTechReel: selected.title,
      category: selected.category || 'DSA',
      whyThisRecommendation: `Selected based on high educational substance in topic "${selected.topic || selected.category}".`,
      difficulty: selected.difficulty || 'Intermediate',
      confidence: 'Low'
    };
  }

  const candidatesFormatted = candidateReels
    .map((reel, idx) => {
      return `[Candidate ${idx + 1}]
ID: ${reel._id}
Title: "${reel.title}"
Topic: "${reel.topic || 'General'}"
Category: ${reel.category}
Difficulty: ${reel.difficulty}
Hashtags: ${(reel.hashtags || reel.tags || []).join(' ')}
IsHypeBait: ${reel.isHypeBait ? 'TRUE (Shallow/Clickbait)' : 'FALSE (High Substance)'}
Caption: "${reel.caption || ''}"`;
    })
    .join('\n\n');

  const systemPrompt = `You are a recommendation reasoner.
Given a user's inferred interest (derived from topics and hashtags) and a list of candidate tech reels, pick the single most educationally valuable match.
CRITICAL INSTRUCTION: AVOID shallow hype content unless it is the only relevant option, and say so if you had to.
Match against the candidate's topic, title, and hashtags to deliver deep educational value.

Return strict JSON matching EXACTLY this shape:
{
  "currentReel": "Title of the current or most recent reel from context",
  "interestDetected": "The inferred primary interest of the user",
  "why": "Detailed reasoning explaining evidence from the user's watch history, topics, and hashtags",
  "recommendedTechReel": "Exact title of the selected candidate reel",
  "category": "AI" | "DSA" | "JavaScript" | "HLD" | "Cybersecurity" | "Cloud" | "Hardware" | "Career" | "Other",
  "whyThisRecommendation": "Detailed reasoning explaining why this specific reel was chosen and how its topic and hashtags connect to the user's broader interest",
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "confidence": "High" | "Medium" | "Low"
}`;

  const userPrompt = `User Inferred Interest Profile:
- Primary Interest: ${interestProfile.primaryInterest}
- Evidence: ${(interestProfile.evidence || []).join('; ')}
- Inferred Confidence: ${interestProfile.confidence}

Current/Recent Reel Context: "${currentTitle}" ${currentReel?.topic ? `(Topic: ${currentReel.topic})` : ''}

Candidate Tech Reels Available:
${candidatesFormatted}

Select the single best candidate reel. Return ONLY the JSON object.`;

  try {
    const result = await callWithRetry(async () => {
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });
      return response.choices[0]?.message?.content;
    });

    const parsed = safeParseJSON(result);
    if (parsed && parsed.recommendedTechReel) {
      const validCategories = [
        'AI',
        'DSA',
        'JavaScript',
        'HLD',
        'Cybersecurity',
        'Cloud',
        'Hardware',
        'Career',
        'Other'
      ];
      const validDifficulties = ['Beginner', 'Intermediate', 'Advanced'];
      const validConfidences = ['High', 'Medium', 'Low'];

      return {
        currentReel: parsed.currentReel || currentTitle,
        interestDetected: parsed.interestDetected || interestProfile.primaryInterest,
        why: parsed.why || `Drawn from engagement with topics and hashtags in ${interestProfile.primaryInterest}.`,
        recommendedTechReel: parsed.recommendedTechReel,
        category: validCategories.includes(parsed.category) ? parsed.category : 'Other',
        whyThisRecommendation: parsed.whyThisRecommendation || 'Selected for depth and practical technical relevance.',
        difficulty: validDifficulties.includes(parsed.difficulty) ? parsed.difficulty : 'Intermediate',
        confidence: validConfidences.includes(parsed.confidence) ? parsed.confidence : 'Medium'
      };
    }
  } catch (error) {
    console.error(`[Groq] Recommendation ranking error: ${error.message}`);
  }

  const nonHypeCandidate = candidateReels.find((r) => !r.isHypeBait) || candidateReels[0];
  return {
    currentReel: currentTitle,
    interestDetected: interestProfile.primaryInterest || 'Software Engineering',
    why: `Synthesized from recent viewing history related to ${interestProfile.primaryInterest}.`,
    recommendedTechReel: nonHypeCandidate.title,
    category: nonHypeCandidate.category || 'Other',
    whyThisRecommendation: `Recommended for solid foundational relevance in topic "${nonHypeCandidate.topic || nonHypeCandidate.category}".`,
    difficulty: nonHypeCandidate.difficulty || 'Intermediate',
    confidence: 'Low'
  };
};

module.exports = {
  generateReelMetadata,
  inferInterest,
  rankSameCategory,
  rankRecommendation
};
