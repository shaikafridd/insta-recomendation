import React, { useRef, useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import {
  HeartIcon,
  CommentIcon,
  ShareIcon,
  SoundMutedIcon,
  SoundUnmutedIcon,
  PlayIcon,
  PauseIcon
} from './Icons';

const SAMPLE_VIDEOS = [
  'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-42845-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-programmer-working-on-his-laptop-in-an-office-42844-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-42840-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-man-working-with-a-computer-and-writing-notes-42842-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-close-up-of-a-circuit-board-with-neon-lights-42848-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-young-man-wearing-headphones-working-on-a-computer-42843-large.mp4'
];

export const ReelCard = ({
  reel,
  index,
  isActive,
  onInteraction,
  onOpenRecommendations,
  onHeartPop
}) => {
  const { isMuted, toggleMute, showToast } = useUser();
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(() => Math.floor(Math.random() * 850 + 150));
  const [progress, setProgress] = useState(0);
  const [showPlayIndicator, setShowPlayIndicator] = useState(false);
  const [indicatorIcon, setIndicatorIcon] = useState('play');
  const tapTimeoutRef = useRef(null);

  // Pick video source (use sample MP4 if cloudinary is placeholder)
  const videoSrc =
    reel.cloudinaryUrl &&
    reel.cloudinaryUrl.startsWith('http') &&
    !reel.cloudinaryUrl.includes('demo/video')
      ? reel.cloudinaryUrl
      : SAMPLE_VIDEOS[index % SAMPLE_VIDEOS.length];

  const authorHandle = getHandleForCategory(reel.category);

  // Manage Autoplay when reel becomes active/inactive
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.currentTime = 0;
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  // Video progress updater
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.duration) {
      setProgress((video.currentTime / video.duration) * 100);
    }
  };

  // Replay event
  const handleEnded = () => {
    onInteraction({
      reelId: reel._id,
      eventType: 'replay',
      watchPercent: 100,
      dwellMs: Math.floor((videoRef.current?.duration || 10) * 1000)
    });
  };

  // Handle single tap (Play/Pause) vs double tap (Like)
  const handleContainerClick = (e) => {
    if (e.target.closest('.reel-actions-sidebar') || e.target.closest('.sound-toggle-btn')) {
      return;
    }

    if (tapTimeoutRef.current) {
      // Double tap detected
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
      handleDoubleTap(e);
    } else {
      tapTimeoutRef.current = setTimeout(() => {
        tapTimeoutRef.current = null;
        togglePlayPause();
      }, 250);
    }
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
      setIndicatorIcon('play');
    } else {
      video.pause();
      setIsPlaying(false);
      setIndicatorIcon('pause');
    }
    setShowPlayIndicator(true);
    setTimeout(() => setShowPlayIndicator(false), 500);
  };

  const handleDoubleTap = (e) => {
    if (!isLiked) {
      setIsLiked(true);
      setLikeCount((c) => c + 1);
    }
    onHeartPop(e.clientX, e.clientY);

    const video = videoRef.current;
    const currentPct = video && video.duration ? (video.currentTime / video.duration) * 100 : 50;

    onInteraction({
      reelId: reel._id,
      eventType: 'like',
      watchPercent: Math.round(currentPct),
      dwellMs: Math.floor((video?.currentTime || 1) * 1000)
    });
  };

  const handleLikeClick = (e) => {
    e.stopPropagation();
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikeCount((c) => (nextLiked ? c + 1 : Math.max(0, c - 1)));

    if (nextLiked) {
      onHeartPop(e.clientX, e.clientY);
      const video = videoRef.current;
      const currentPct = video && video.duration ? (video.currentTime / video.duration) * 100 : 50;

      onInteraction({
        reelId: reel._id,
        eventType: 'like',
        watchPercent: Math.round(currentPct),
        dwellMs: Math.floor((video?.currentTime || 1) * 1000)
      });
      showToast('Liked Reel ❤️');
    }
  };

  const handleShareClick = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    const currentPct = video && video.duration ? (video.currentTime / video.duration) * 100 : 50;

    onInteraction({
      reelId: reel._id,
      eventType: 'share',
      watchPercent: Math.round(currentPct),
      dwellMs: Math.floor((video?.currentTime || 1) * 1000)
    });

    navigator.clipboard?.writeText?.(window.location.href);
    showToast('Reel link copied to clipboard 🔗');
  };

  return (
    <div className="reel-card" data-index={index} data-title={reel.title}>
      <div className="reel-video-container" onClick={handleContainerClick}>
        <video
          ref={videoRef}
          className="reel-video"
          src={videoSrc}
          loop
          playsInline
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />

        {/* Play/Pause Center Indicator */}
        <div className={`play-pause-indicator ${showPlayIndicator ? 'visible' : ''}`}>
          {indicatorIcon === 'play' ? <PlayIcon /> : <PauseIcon />}
        </div>

        {/* Sound Toggle Button */}
        <button
          className="sound-toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <SoundMutedIcon /> : <SoundUnmutedIcon />}
        </button>

        {/* Right Floating Actions */}
        <div className="reel-actions-sidebar">
          <button className={`action-btn like-btn ${isLiked ? 'liked' : ''}`} onClick={handleLikeClick}>
            <div className="icon-wrap">
              <HeartIcon filled={isLiked} />
            </div>
            <span className="action-count">{likeCount}</span>
          </button>

          <button className="action-btn comment-btn" onClick={(e) => e.stopPropagation()}>
            <div className="icon-wrap">
              <CommentIcon />
            </div>
            <span className="action-count">48</span>
          </button>

          <button className="action-btn share-btn" onClick={handleShareClick}>
            <div className="icon-wrap">
              <ShareIcon />
            </div>
            <span className="action-count">Share</span>
          </button>

          <button
            className="action-btn ai-quick-rec-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenRecommendations();
            }}
            title="Open AI Recommendations"
          >
            <div className="icon-wrap" style={{ background: 'var(--ig-gradient)', border: 'none' }}>
              <span style={{ fontSize: '1.1rem' }}>✨</span>
            </div>
            <span className="action-count">AI Rec</span>
          </button>
        </div>

        {/* Bottom Information Overlay */}
        <div className="reel-overlay">
          <div className="reel-user-row">
            <div
              className="creator-avatar"
              style={{ background: getAvatarColor(index) }}
            />
            <span className="creator-name">{authorHandle}</span>
            <span className="follow-tag">Follow</span>
          </div>

          <div className="reel-badges-row">
            <span className="category-badge">{reel.category || 'Tech'}</span>
            {reel.topic && <span className="topic-badge">{reel.topic}</span>}
            <span className="difficulty-badge">{reel.difficulty || 'Beginner'}</span>
            {reel.isHypeBait && <span className="hype-warn-badge">⚠️ Hype-Bait</span>}
          </div>

          <h3 className="reel-title">{reel.title}</h3>
          {reel.caption && <p className="reel-caption">{reel.caption}</p>}

          {reel.hashtags && reel.hashtags.length > 0 && (
            <div className="hashtags-row">
              {reel.hashtags.map((ht, hIdx) => (
                <span key={hIdx} className="hashtag-tag">
                  {ht.startsWith('#') ? ht : `#${ht}`}
                </span>
              ))}
            </div>
          )}

          <div className="audio-track-row">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <span>Original Audio · {authorHandle}</span>
          </div>
        </div>

        {/* Bottom Progress Bar */}
        <div className="reel-progress-container">
          <div className="reel-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};

function getHandleForCategory(cat) {
  const handles = {
    AI: '@deeplearning_daily',
    DSA: '@leetcode_ninja',
    JavaScript: '@frontend_wizard',
    HLD: '@systemdesign_pro',
    Cybersecurity: '@infosec_ops',
    Cloud: '@devops_cloud',
    Hardware: '@rig_builder',
    Career: '@staff_eng_life',
    Entertainment: '@cs_jokes_memes',
    Other: '@tech_bytes'
  };
  return handles[cat] || '@tech_creator';
}

function getAvatarColor(index) {
  const colors = ['#e1306c', '#405de6', '#5851db', '#fd1d1d', '#f77737', '#0095f6', '#00ba7c'];
  return colors[index % colors.length];
}
