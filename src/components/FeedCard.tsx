"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CommentThread } from "@/components/CommentItem";
import { SpeciesDetailModal } from "@/components/SpeciesDetailModal";
import { useAuth } from "@/context/AuthContext";
import { loadSettings } from "@/lib/auth";
import { NATURE_TAGS, REGIONS } from "@/lib/constants";
import { getRiskMeta, resolveSpeciesCard } from "@/lib/speciesCatalog";
import type { Comment, NaturePost } from "@/lib/types";
import { isVideoPost } from "@/lib/types";
import { resolveMediaUrl } from "@/lib/mediaStore";

interface FeedCardProps {
  post: NaturePost;
  isLiked: boolean;
  onLike: () => void;
  onVisible?: () => void;
  onCommentsOpenChange?: (open: boolean) => void;
  /** Show edit/delete controls for the reel owner (My Reels memory book). */
  ownerMode?: boolean;
  onDelete?: () => void;
  editHref?: string;
}

export function FeedCard({
  post,
  isLiked,
  onLike,
  onVisible,
  onCommentsOpenChange,
  ownerMode = false,
  onDelete,
  editHref,
}: FeedCardProps) {
  const { settings, user } = useAuth();
  const speciesHuntOn = settings.speciesStickersEnabled;
  // Respect the reel author's allow-comments setting (including other accounts).
  const commentsAllowed = !post.authorId
    ? true
    : user?.id === post.authorId
      ? settings.allowComments
      : post.commentsEnabled === false
        ? false
        : loadSettings(post.authorId).allowComments;
  const sectionRef = useRef<HTMLElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>(
    post.comments.map((c) => ({ ...c, likes: c.likes ?? 0 }))
  );
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [shareToast, setShareToast] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(post.muteVideoAudio ?? !!post.music);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wasVisibleRef = useRef(false);
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const [stickerRevealed, setStickerRevealed] = useState(false);
  const [stickerPos, setStickerPos] = useState<{ top: number; left: number } | null>(
    null
  );
  const speciesSticker = post.speciesSticker
    ? resolveSpeciesCard(post.speciesSticker)
    : null;
  const isVideo = isVideoPost(post);
  const hasMusic = !!post.music?.previewUrl;
  // When soundtrack music is audible, keep the clip quiet so they don't clash.
  const effectiveVideoMuted =
    videoMuted || (hasMusic && !musicMuted);

  const likeCount = post.likes + (isLiked ? 1 : 0);

  const tagLabels = post.tags
    .map((t) => NATURE_TAGS.find((nt) => nt.id === t)?.label ?? t)
    .join(" · ");
  const regionLabel = post.region
    ? REGIONS.find((r) => r.id === post.region)?.label ?? post.region
    : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setVideoMuted(post.muteVideoAudio ?? !!post.music);
  }, [post.id, post.muteVideoAudio, post.music]);

  useEffect(() => {
    if (!isVideo || !post.videoUrl) {
      setVideoSrc(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    void (async () => {
      try {
        const resolved = await resolveMediaUrl(post.videoUrl!);
        if (cancelled) return;
        setVideoSrc(resolved);
        if (resolved.startsWith("blob:") && resolved !== post.videoUrl) {
          objectUrl = resolved;
        }
      } catch {
        if (!cancelled) setVideoSrc(null);
      }
    })();
    return () => {
      cancelled = true;
      // Object URLs from resolveMediaUrl are cached globally — don't revoke here.
      void objectUrl;
    };
  }, [isVideo, post.videoUrl]);

  useEffect(() => {
    onCommentsOpenChange?.(showComments);
  }, [showComments, onCommentsOpenChange]);

  const handleShare = async () => {
    const text = post.caption
      ? `${post.caption} - shared from Floraly`
      : "Check out this nature moment on Floraly";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Floraly", text });
      } else {
        await navigator.clipboard.writeText(text);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2000);
      }
    } catch {
      /* user cancelled */
    }
  };

  const handleLike = () => {
    onLike();
  };

  const handleDoubleClick = () => {
    if (!isLiked) {
      onLike();
    }
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 900);
  };

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);
        if (visible) onVisible?.();
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible]);

  // Reveal flora/fauna sticker after a short pause, then hop to new spots often
  // so viewers hunt across the photo instead of camping one corner.
  // Skip entirely when pure nature mode is on (speciesStickersEnabled = false).
  useEffect(() => {
    if (!speciesSticker || !speciesHuntOn) {
      setStickerRevealed(false);
      setStickerPos(null);
      return;
    }
    if (!isVisible) {
      setStickerRevealed(false);
      setStickerPos(null);
      setSpeciesOpen(false);
      return;
    }

    const randomPos = () => ({
      top: 8 + Math.random() * 52, // 8%–60% from top
      left: 4 + Math.random() * 68, // 4%–72% from left
    });

    let moveTimer: number | undefined;
    const revealTimer = window.setTimeout(() => {
      setStickerPos(randomPos());
      setStickerRevealed(true);
      moveTimer = window.setInterval(() => {
        setStickerPos(randomPos());
      }, 2000);
    }, 1500);

    return () => {
      window.clearTimeout(revealTimer);
      if (moveTimer !== undefined) window.clearInterval(moveTimer);
    };
  }, [isVisible, speciesSticker, speciesHuntOn]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !post.music?.previewUrl) return;
    if (isVisible) {
      if (!wasVisibleRef.current) {
        audio.currentTime = 0;
        wasVisibleRef.current = true;
      }
      if (musicMuted) {
        audio.pause();
      } else {
        void audio.play().catch(() => {
          /* autoplay may be blocked until interaction */
        });
      }
    } else {
      audio.pause();
      wasVisibleRef.current = false;
    }
  }, [isVisible, musicMuted, post.music?.previewUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;
    video.muted = effectiveVideoMuted;
    if (isVisible) {
      void video.play().catch(() => {
        /* autoplay may require mute first */
      });
    } else {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, [isVisible, effectiveVideoMuted, isVideo, videoSrc]);

  const toggleVideoMute = () => {
    setVideoMuted((m) => {
      const next = !m;
      // Unmuting the clip while music is on — pause music so audio doesn't clash.
      if (!next && hasMusic && !musicMuted) {
        setMusicMuted(true);
      }
      return next;
    });
  };

  const toggleMusicMute = () => {
    setMusicMuted((m) => {
      const next = !m;
      // Turning music on — mute the video by default.
      if (!next && isVideo) {
        setVideoMuted(true);
      }
      return next;
    });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentsAllowed || !newComment.trim()) return;
    const comment: Comment = {
      id: `c_${Date.now()}`,
      author: "You",
      text: newComment.trim(),
      createdAt: new Date().toISOString().split("T")[0],
      likes: 0,
      parentId: replyingTo?.id,
    };
    setComments((prev) => [...prev, comment]);
    setNewComment("");
    setReplyingTo(null);
  };

  const handleToggleCommentLike = (commentId: string) => {
    setLikedCommentIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const handleReply = (comment: Comment) => {
    if (!commentsAllowed) return;
    setReplyingTo(comment);
    setNewComment(`@${comment.author} `);
    commentInputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment("");
  };

  const openComments = () => setShowComments(true);
  const closeComments = () => setShowComments(false);

  const commentsDrawer =
    showComments && mounted
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[55] bg-black/50"
              onClick={closeComments}
              aria-hidden
            />
            <div className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[70vh] flex-col rounded-t-3xl bg-cream-50 shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-5 py-4">
                <h3 className="font-display text-lg text-ink">
                  Comments ({comments.length})
                </h3>
                <button
                  type="button"
                  onClick={closeComments}
                  className="text-stone-400 hover:text-stone-600"
                  aria-label="Close comments"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
                <CommentThread
                  comments={comments}
                  likedCommentIds={likedCommentIds}
                  onToggleLike={handleToggleCommentLike}
                  onReply={commentsAllowed ? handleReply : undefined}
                />
              </div>
              {commentsAllowed ? (
                <form
                  onSubmit={handleAddComment}
                  className="shrink-0 border-t border-stone-200 px-5 py-3"
                >
                  {replyingTo && (
                    <div className="mb-2 flex items-center justify-between rounded-lg bg-moss-50 px-3 py-2">
                      <p className="text-xs text-ink-muted">
                        Replying to <span className="font-medium">{replyingTo.author}</span>
                      </p>
                      <button
                        type="button"
                        onClick={cancelReply}
                        className="text-xs text-stone-400 hover:text-stone-600"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      ref={commentInputRef}
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={replyingTo ? `Reply to ${replyingTo.author}...` : "Add a comment..."}
                      className="flex-1 rounded-xl border border-stone-200 bg-surface px-4 py-2.5 text-sm focus:border-forest-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="rounded-xl bg-forest-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                    >
                      Post
                    </button>
                  </div>
                </form>
              ) : (
                <div className="shrink-0 border-t border-stone-200 px-5 py-4">
                  <p className="text-center text-sm text-stone-500">
                    Comments are turned off for this reel.
                  </p>
                </div>
              )}
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <section
      ref={sectionRef}
      data-post-id={post.id}
      className="relative w-full snap-start snap-always"
      style={{ height: "calc(100dvh - var(--nav-height))" }}
      onDoubleClick={handleDoubleClick}
    >
      {isVideo ? (
        <video
          ref={videoRef}
          src={videoSrc ?? undefined}
          poster={post.imageUrl}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          loop
          muted={effectiveVideoMuted}
          preload="metadata"
          draggable={false}
        />
      ) : (
        <img
          src={post.imageUrl}
          alt={post.caption ?? "Nature photo"}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      )}
      {post.music?.previewUrl && (
        <audio ref={audioRef} src={post.music.previewUrl} loop preload="none" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

      {speciesHuntOn && speciesSticker && stickerRevealed && stickerPos && (
        <button
          key={`${stickerPos.top.toFixed(1)}-${stickerPos.left.toFixed(1)}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSpeciesOpen(true);
          }}
          className={`absolute z-20 flex h-12 w-12 animate-sticker-pop items-center justify-center overflow-hidden rounded-2xl bg-white/95 backdrop-blur-sm ring-1 ring-white/80 ${getRiskMeta(speciesSticker.riskLevel).glowClass}`}
          style={{ top: `${stickerPos.top}%`, left: `${stickerPos.left}%` }}
          aria-label={`${speciesSticker.name} sticker: find and tap to collect`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={speciesSticker.imageUrl} alt={speciesSticker.name} className="h-full w-full object-cover" />
        </button>
      )}

      {showHeartBurst && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <svg
            className="h-24 w-24 animate-heart-burst text-rose-500 drop-shadow-lg"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute bottom-6 right-4 z-10 flex flex-col items-center gap-5">
        <button
          type="button"
          onClick={handleLike}
          className="flex flex-col items-center gap-1 text-white transition-transform active:scale-90"
          aria-label={isLiked ? "Unlike" : "Like"}
        >
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-sm ${
              isLiked ? "bg-rose-500/80" : "bg-black/30"
            }`}
          >
            <svg
              className="h-6 w-6"
              fill={isLiked ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </span>
          <span className="text-xs font-medium">{likeCount}</span>
        </button>

        <button
          type="button"
          onClick={openComments}
          className="flex flex-col items-center gap-1 text-white transition-transform active:scale-90"
          aria-label="Comments"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </span>
          <span className="text-xs font-medium">{comments.length}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex flex-col items-center gap-1 text-white transition-transform active:scale-90"
          aria-label="Share"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </span>
          <span className="text-xs font-medium">Share</span>
        </button>

        {isVideo && (
          <button
            type="button"
            onClick={toggleVideoMute}
            className="flex flex-col items-center gap-1 text-white transition-transform active:scale-90"
            aria-label={effectiveVideoMuted ? "Unmute video" : "Mute video"}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
              {effectiveVideoMuted ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </span>
            <span className="text-xs font-medium">{effectiveVideoMuted ? "Muted" : "Sound"}</span>
          </button>
        )}

        {post.music?.previewUrl && (
          <button
            type="button"
            onClick={toggleMusicMute}
            className="flex flex-col items-center gap-1 text-white transition-transform active:scale-90"
            aria-label={musicMuted ? "Unmute music" : "Mute music"}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
              {musicMuted ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              )}
            </span>
            <span className="text-xs font-medium">Music</span>
          </button>
        )}

        {ownerMode && editHref && (
          <Link
            href={editHref}
            className="flex flex-col items-center gap-1 text-white transition-transform active:scale-90"
            aria-label="Edit reel"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </span>
            <span className="text-xs font-medium">Edit</span>
          </Link>
        )}

        {ownerMode && onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex flex-col items-center gap-1 text-white transition-transform active:scale-90"
            aria-label="Delete reel"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/70 backdrop-blur-sm">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </span>
            <span className="text-xs font-medium">Delete</span>
          </button>
        )}
      </div>

      {shareToast && (
        <div className="absolute right-4 top-1/2 z-20 rounded-lg bg-forest-600 px-4 py-2 text-sm text-white shadow-lg">
          Copied to clipboard!
        </div>
      )}

      {/* Post info */}
      <div className="pointer-events-none absolute bottom-4 left-0 right-16 z-10 px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-600 text-sm font-medium text-white">
            {post.authorInitial}
          </div>
          <span className="font-medium text-white">{post.author}</span>
        </div>
        {post.caption && (
          <p className="mt-2 line-clamp-2 text-sm text-white/90">{post.caption}</p>
        )}
        {post.music && (
          <div className="pointer-events-auto mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
            <span className="text-[10px] font-medium uppercase tracking-wide text-white/90">
              Music
            </span>
            <span className="truncate text-xs text-white">
              {post.music.title}
              <span className="text-white/70"> · {post.music.artist}</span>
            </span>
          </div>
        )}
        <p className="mt-2 text-xs text-white/60">
          {regionLabel ? `${tagLabels} · ${regionLabel}` : tagLabels}
        </p>
      </div>

      {commentsDrawer}

      {speciesHuntOn && speciesOpen && speciesSticker && (
        <SpeciesDetailModal
          species={speciesSticker}
          onClose={() => setSpeciesOpen(false)}
        />
      )}
    </section>
  );
}
