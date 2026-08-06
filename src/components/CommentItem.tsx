"use client";

import type { Comment } from "@/lib/types";

interface CommentItemProps {
  comment: Comment;
  isLiked: boolean;
  likeCount: number;
  onLike: () => void;
  onReply?: () => void;
  isReply?: boolean;
}

export function CommentItem({
  comment,
  isLiked,
  likeCount,
  onLike,
  onReply,
  isReply = false,
}: CommentItemProps) {
  return (
    <div className={`${isReply ? "ml-8 border-l-2 border-moss-200 pl-3" : ""} mb-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-forest-700">{comment.author}</span>
          <p className="mt-0.5 text-sm text-stone-600">{comment.text}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-4">
        <button
          type="button"
          onClick={onLike}
          className={`flex items-center gap-1 text-xs font-medium transition-colors ${
            isLiked ? "text-rose-500" : "text-stone-400 hover:text-rose-400"
          }`}
        >
          <svg
            className="h-3.5 w-3.5"
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
          {likeCount > 0 ? likeCount : "Like"}
        </button>
        {onReply && (
          <button
            type="button"
            onClick={onReply}
            className="text-xs font-medium text-stone-400 transition-colors hover:text-forest-600"
          >
            Reply
          </button>
        )}
        <span className="text-xs text-stone-300">{comment.createdAt}</span>
      </div>
    </div>
  );
}

interface CommentThreadProps {
  comments: Comment[];
  likedCommentIds: Set<string>;
  onToggleLike: (commentId: string) => void;
  onReply?: (comment: Comment) => void;
}

export function CommentThread({
  comments,
  likedCommentIds,
  onToggleLike,
  onReply,
}: CommentThreadProps) {
  const topLevel = comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parentId === parentId);

  const getLikeCount = (comment: Comment) =>
    comment.likes + (likedCommentIds.has(comment.id) ? 1 : 0);

  if (topLevel.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-stone-400">
        {onReply
          ? "No comments yet. Share the love for nature."
          : "No comments yet."}
      </p>
    );
  }

  return (
    <>
      {topLevel.map((comment) => (
        <div key={comment.id}>
          <CommentItem
            comment={comment}
            isLiked={likedCommentIds.has(comment.id)}
            likeCount={getLikeCount(comment)}
            onLike={() => onToggleLike(comment.id)}
            onReply={onReply ? () => onReply(comment) : undefined}
          />
          {getReplies(comment.id).map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isLiked={likedCommentIds.has(reply.id)}
              likeCount={getLikeCount(reply)}
              onLike={() => onToggleLike(reply.id)}
              onReply={onReply ? () => onReply(reply) : undefined}
              isReply
            />
          ))}
        </div>
      ))}
    </>
  );
}
