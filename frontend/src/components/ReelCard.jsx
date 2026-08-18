import React, { useRef, useState, useEffect, useCallback } from 'react';
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

/**
 * Universal high-availability Google Cloud CDN video streams for zero-fail fallback
 */
const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4'
];

/**
 * ReelCard Component
 * Displays a single short-form tech video with interactive telemetry logging,
 * like/share/sound controls, and WCAG 2.1 accessibility.
 */
export const ReelCard = ({
  reel,
  index,
  activeIndex,
  isActive,
  onInteraction,
  onOpenRecommendations,
  onHeartPop
}) => {
  const { isMuted, toggleMute, showToast } = useUser();
  const videoRef = useRef(null);
  const isMounted = activeIndex === undefined || Math.abs(index - activeIndex) <= 1;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(() => Math.floor(Math.random() * 850 + 150));
  const [progress, setProgress] = useState(0);
  const [showPlayIndicator, setShowPlayIndicator] = useState(false);
  const [indicatorIcon, setIndicatorIcon] = useState('play');
  const tapTimeoutRef = useRef(null);
  const [errorCount, setErrorCount] = useState(0);

  // Pick video source
  const initialVideoSrc =
    reel.cloudinaryUrl &&
    reel.cloudinaryUrl.startsWith('http') &&
    !reel.cloudinaryUrl.includes('demo/video')
      ? reel.cloudinaryUrl
      : SAMPLE_VIDEOS[index % SAMPLE_VIDEOS.length];

  const [videoSrc, setVideoSrc] = useState(initialVideoSrc);

  useEffect(() => {
    if (reel.cloudinaryUrl && reel.cloudinaryUrl.startsWith('http') && !reel.cloudinaryUrl.includes('demo/video')) {
      setVideoSrc(reel.cloudinaryUrl);
      setErrorCount(0);
    } else {
      setVideoSrc(SAMPLE_VIDEOS[index % SAMPLE_VIDEOS.length]);
    }
  }, [reel.cloudinaryUrl, index]);

  const handleVideoError = useCallback(() => {
    if (errorCount >= 2) return;
    setErrorCount((prev) => prev + 1);

    const googleCdnFallback = SAMPLE_VIDEOS[index % SAMPLE_VIDEOS.length];
    console.warn(`[Video Player] Network stream error. Switching to high-speed CDN stream.`);
    setVideoSrc(googleCdnFallback);
  }, [errorCount, index]);

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
      video.play().then(() => {
        setIsPlaying(true);
        setIndicatorIcon('play');
      }).catch(() => {});
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

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      handleLikeClick(e);
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      toggleMute();
    }
  };

  return (
    <article
      className="reel-card"
      data-index={index}
      data-title={reel.title}
      role="article"
      aria-roledescription="Short-form tech reel"
      aria-label={`Reel: ${reel.title} by ${authorHandle}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        className="reel-video-container"
        onClick={handleContainerClick}
        role="region"
        aria-label="Video Player Area. Click to Play/Pause, Double Click to Like."
      >
        {isMounted ? (
          <video
            ref={videoRef}
            className="reel-video"
            src={videoSrc}
            loop
            playsInline
            muted={isMuted}
            onError={handleVideoError}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            aria-label={reel.title}
          >
            <track kind="captions" srcLang="en" label="English" default />
          </video>
        ) : (
          <div className="reel-video-placeholder" aria-hidden="true">
            <div className="placeholder-center">
              <span className="placeholder-tag">{reel.category}</span>
              <p className="placeholder-title-preview">{reel.title}</p>
            </div>
          </div>
        )}

        {/* Play/Pause Center Indicator */}
        <div
          className={`play-pause-indicator ${showPlayIndicator ? 'visible' : ''}`}
          aria-hidden="true"
        >
          {indicatorIcon === 'play' ? <PlayIcon /> : <PauseIcon />}
        </div>

        {/* Sound Toggle Button */}
        <button
          type="button"
          className="sound-toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          aria-label={isMuted ? 'Unmute Audio (or press M)' : 'Mute Audio (or press M)'}
          aria-pressed={!isMuted}
          title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
        >
          {isMuted ? <SoundMutedIcon /> : <SoundUnmutedIcon />}
        </button>

        {/* Right Floating Actions */}
        <div className="reel-actions-sidebar" role="toolbar" aria-label="Reel Actions">
          <button
            type="button"
            className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
            onClick={handleLikeClick}
            aria-label={`Like this reel. Current likes: ${likeCount}`}
            aria-pressed={isLiked}
          >
            <div className="icon-wrap" aria-hidden="true">
              <HeartIcon filled={isLiked} />
            </div>
            <span className="action-count">{likeCount}</span>
          </button>

          <button
            type="button"
            className="action-btn comment-btn"
            onClick={(e) => e.stopPropagation()}
            aria-label="View Comments. 48 comments."
          >
            <div className="icon-wrap" aria-hidden="true">
              <CommentIcon />
            </div>
            <span className="action-count">48</span>
          </button>

          <button
            type="button"
            className="action-btn share-btn"
            onClick={handleShareClick}
            aria-label="Share reel link to clipboard"
          >
            <div className="icon-wrap" aria-hidden="true">
              <ShareIcon />
            </div>
            <span className="action-count">Share</span>
          </button>

          <button
            type="button"
            className="action-btn ai-quick-rec-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenRecommendations();
            }}
            aria-label="Open AI Recommendations tailored to your interests"
            title="Open AI Recommendations"
          >
            <div className="icon-wrap" style={{ background: 'var(--orange-gradient)', border: 'none' }} aria-hidden="true">
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
              aria-hidden="true"
            />
            <span className="creator-name">{authorHandle}</span>
            <span className="follow-tag" role="button" tabIndex={0}>Follow</span>
          </div>

          <div className="reel-badges-row" aria-label="Tags and classifications">
            <span className="category-badge">{reel.category || 'Tech'}</span>
            {reel.topic && <span className="topic-badge">{reel.topic}</span>}
            <span className="difficulty-badge">{reel.difficulty || 'Beginner'}</span>
            {reel.isHypeBait && <span className="hype-warn-badge">⚠️ Hype-Bait</span>}
          </div>

          <h2 className="reel-title">{reel.title}</h2>
          {reel.caption && <p className="reel-caption">{reel.caption}</p>}

          {reel.hashtags && reel.hashtags.length > 0 && (
            <div className="hashtags-row" aria-label="Hashtags">
              {reel.hashtags.map((ht, hIdx) => (
                <span key={hIdx} className="hashtag-tag">
                  {ht.startsWith('#') ? ht : `#${ht}`}
                </span>
              ))}
            </div>
          )}

          <div className="audio-track-row" aria-label={`Original audio track by ${authorHandle}`}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <span>Original Audio · {authorHandle}</span>
          </div>
        </div>

        {/* Bottom Progress Bar */}
        <div
          className="reel-progress-container"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label="Reel playback progress"
        >
          <div className="reel-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </article>
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
  const colors = ['#d95700', '#0369a1', '#6d28d9', '#dc2626', '#b84900', '#0284c7', '#047857'];
  return colors[index % colors.length];
}
