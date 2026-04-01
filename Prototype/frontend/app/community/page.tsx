"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Trash2,
  ThumbsUp,
  Heart,
  Flame,
  TrendingDown,
  TrendingUp,
  Plus,
  Filter,
  MoreHorizontal,
  ShieldBan,
  Reply,
  ChevronDown,
  ChevronUp,
  Users,
  X,
  Bookmark,
  Image as ImageIcon,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { AppShell } from "@/components/layout";
import { PageHeader, PageState, usePageState } from "@/components/common";
import { MentionAutocomplete, MentionSuggestion } from "@/components/common/MentionAutocomplete";
import { useMentions } from "@/hooks/useMentions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  getPosts,
  createPost,
  deletePost,
  getComments,
  createComment,
  deleteComment,
  toggleReaction,
  blockUser,
  unblockUser,
  getBlockedUsers,
  savePost,
  getSavedPosts,
  isPostSaved,
  uploadCommunityImage,
} from "@/lib/communityService";
import type {
  CommunityPost,
  PostComment,
  PostTag,
  ReactionType,
  BlockedUserEntry,
} from "@/types/community";

// ─── Constants ────────────────────────────────────────────────────

const POST_TAGS: { value: PostTag; label: string }[] = [
  { value: "GENERAL", label: "General" },
  { value: "STOCKS", label: "Stocks" },
  { value: "CRYPTO", label: "Crypto" },
  { value: "NEWS", label: "News" },
  { value: "ANALYSIS", label: "Analysis" },
  { value: "QUESTION", label: "Question" },
];

const REACTION_CONFIG: {
  type: ReactionType;
  icon: React.ReactNode;
  label: string;
}[] = [
  { type: "LIKE", icon: <ThumbsUp className="h-4 w-4" />, label: "Like" },
  { type: "LOVE", icon: <Heart className="h-4 w-4" />, label: "Love" },
  { type: "FIRE", icon: <Flame className="h-4 w-4" />, label: "Fire" },
  { type: "BULLISH", icon: <TrendingUp className="h-4 w-4" />, label: "Bullish" },
  { type: "BEARISH", icon: <TrendingDown className="h-4 w-4" />, label: "Bearish" },
];

function getTagColor(tag: PostTag): string {
  const map: Record<PostTag, string> = {
    GENERAL: "bg-secondary text-secondary-foreground",
    STOCKS: "bg-chart-1/15 text-chart-1",
    CRYPTO: "bg-chart-5/15 text-chart-5",
    NEWS: "bg-chart-3/15 text-chart-3",
    ANALYSIS: "bg-chart-4/15 text-chart-4",
    QUESTION: "bg-chart-2/15 text-chart-2",
  };
  return map[tag];
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getInitials(name: string | null, username: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return username.slice(0, 2).toUpperCase();
}

// ─── Comment Component ───────────────────────────────────────────

interface CommentItemProps {
  comment: PostComment;
  currentUserId: number;
  onReply: (commentId: number) => void;
  onDelete: (commentId: number) => void;
  onBlock: (userId: number, username: string) => void;
  replyingTo: number | null;
  replyContent: string;
  onReplyContentChange: (value: string) => void;
  onSubmitReply: () => void;
  submittingReply: boolean;
  depth?: number;
  replyMentions?: any[];
  onReplyMention?: (user: MentionSuggestion) => void;
}

function CommentItem({
  comment,
  currentUserId,
  onReply,
  onDelete,
  onBlock,
  replyingTo,
  replyContent,
  onReplyContentChange,
  onSubmitReply,
  submittingReply,
  depth = 0,
  replyMentions,
  onReplyMention,
}: CommentItemProps) {
  const isOwn = comment.author.id === currentUserId;

  return (
    <div className={cn("space-y-2", depth > 0 && "ml-8 border-l-2 border-border pl-4")}>
      <div className="flex items-start gap-3 group">
        <Avatar className="h-7 w-7 mt-0.5">
          {comment.author.profileImageUrl ? (
            <AvatarImage src={comment.author.profileImageUrl} />
          ) : null}
          <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
            {getInitials(comment.author.name, comment.author.username)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {comment.author.name || comment.author.username}
            </span>
            <span className="text-xs text-muted-foreground">
              @{comment.author.username}
            </span>
            <span className="text-xs text-muted-foreground">
              · {timeAgo(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
          {comment.imageUrl && (
            <div className="mt-2 rounded-lg overflow-hidden border border-border">
              <img
                src={comment.imageUrl}
                alt="Comment image"
                className="max-w-xs max-h-64 object-cover"
              />
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            {depth === 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onReply(comment.id)}
              >
                <Reply className="h-3 w-3 mr-1" /> Reply
              </Button>
            )}
            {isOwn && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(comment.id)}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Delete
              </Button>
            )}
            {!isOwn && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onBlock(comment.author.id, comment.author.username)}
              >
                <ShieldBan className="h-3 w-3 mr-1" /> Block
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Reply input */}
      {replyingTo === comment.id && (
        <div className="ml-10 space-y-2">
          <MentionAutocomplete
            value={replyContent}
            onChange={onReplyContentChange}
            onMention={onReplyMention || (() => {})}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmitReply();
              }
            }}
            placeholder="Write a reply... Type @ to mention someone"
          >
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-8"
                onClick={onSubmitReply}
                disabled={!replyContent.trim() || submittingReply}
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </MentionAutocomplete>
          
          {/* Mentioned users display for reply */}
          {replyMentions && replyMentions.length > 0 && (
            <div className="mt-1">
              <p className="text-xs font-medium text-muted-foreground">
                Mentioned: {replyMentions.map((u) => `@${u.username}`).join(", ")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Nested replies */}
      {comment.replies &&
        comment.replies.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            currentUserId={currentUserId}
            onReply={onReply}
            onDelete={onDelete}
            onBlock={onBlock}
            replyingTo={replyingTo}
            replyContent={replyContent}
            onReplyContentChange={onReplyContentChange}
            onSubmitReply={onSubmitReply}
            submittingReply={submittingReply}
            depth={depth + 1}
            replyMentions={replyMentions}
            onReplyMention={onReplyMention}
          />
        ))}
    </div>
  );
}

// ─── Post Card Component ─────────────────────────────────────────

interface PostCardProps {
  post: CommunityPost;
  currentUserId: number;
  onDelete: (postId: number) => void;
  onReaction: (postId: number, type: ReactionType) => void;
  onBlock: (userId: number, username: string) => void;
  onSave?: (postId: number, isSaved: boolean) => void;
}

function PostCard({ post, currentUserId, onDelete, onReaction, onBlock, onSave }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [commentImageUrl, setCommentImageUrl] = useState("");
  const [commentImageFile, setCommentImageFile] = useState<File | null>(null);
  const [uploadingCommentImage, setUploadingCommentImage] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isSaved, setIsSaved] = useState(post.isSaved ?? false);
  const [savingPost, setSavingPost] = useState(false);

  // Mention state for comments
  const { mentions: commentMentions, addMention: addCommentMention, clearMentions: clearCommentMentions } = useMentions();
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const commentImageInputRef = useRef<HTMLInputElement>(null);

  // Mention state for replies
  const { mentions: replyMentions, addMention: addReplyMention, clearMentions: clearReplyMentions } = useMentions();
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const isOwn = post.author.id === currentUserId;

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const data = await getComments(post.id);
      setComments(data);
    } catch {
      toast.error("Failed to load comments");
    } finally {
      setLoadingComments(false);
    }
  }, [post.id]);

  const handleToggleComments = () => {
    if (!showComments) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    if (!commentContent.trim()) return;
    setSubmittingComment(true);
    try {
      await createComment(post.id, commentContent.trim(), undefined, commentImageUrl || undefined);
      setCommentContent("");
      setCommentImageUrl("");
      setCommentImageFile(null);
      clearCommentMentions();
      toast.success("Comment added");
      loadComments();
    } catch (e) {
      toast.error((e as Error).message || "Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || replyingTo === null) return;
    setSubmittingReply(true);
    try {
      await createComment(post.id, replyContent.trim(), replyingTo);
      setReplyContent("");
      clearReplyMentions();
      setReplyingTo(null);
      toast.success("Reply added");
      loadComments();
    } catch (e) {
      toast.error((e as Error).message || "Failed to add reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteComment(commentId);
      toast.success("Comment deleted");
      loadComments();
    } catch (e) {
      toast.error((e as Error).message || "Failed to delete comment");
    }
  };

  const handleSavePost = async () => {
    setSavingPost(true);
    try {
      await savePost(post.id);
      const newIsSaved = !isSaved;
      setIsSaved(newIsSaved);
      onSave?.(post.id, newIsSaved);
      toast.success(newIsSaved ? "Post saved" : "Post removed from saved");
    } catch (e) {
      toast.error((e as Error).message || "Failed to save post");
    } finally {
      setSavingPost(false);
    }
  };

  const handleCommentImageUpload = async (file: File) => {
    setUploadingCommentImage(true);
    try {
      const uploadedUrl = await uploadCommunityImage(file);
      setCommentImageUrl(uploadedUrl);
      setCommentImageFile(file);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error((e as Error).message || "Failed to upload image");
    } finally {
      setUploadingCommentImage(false);
    }
  };

  const handleCommentImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCommentImageUpload(file);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-5 pb-3 space-y-3">
        {/* Author row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              {post.author.profileImageUrl ? (
                <AvatarImage src={post.author.profileImageUrl} />
              ) : null}
              <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                {getInitials(post.author.name, post.author.username)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {post.author.name || post.author.username}
                </span>
                <span className="text-xs text-muted-foreground">
                  @{post.author.username}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {timeAgo(post.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs font-normal", getTagColor(post.tag))}>
              {post.tag.charAt(0) + post.tag.slice(1).toLowerCase()}
            </Badge>
            {/* Dropdown: delete own / block others */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwn ? (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(post.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete post
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onBlock(post.author.id, post.author.username)}
                  >
                    <ShieldBan className="h-4 w-4 mr-2" /> Block @{post.author.username}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title + content */}
        <div>
          <h3 className="text-base font-semibold text-foreground">{post.title}</h3>
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
            {post.content}
          </p>
          {post.imageUrl && (
            <div className="mt-3 rounded-lg overflow-hidden border border-border">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full max-h-96 object-cover"
              />
            </div>
          )}
        </div>

        {/* Reactions bar */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* Quick-react buttons */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2 text-xs gap-1",
                post.myReaction === "LIKE"
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
              onClick={() => onReaction(post.id, "LIKE")}
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}
            >
              <ThumbsUp className="h-4 w-4" />
              {post.totalReactions > 0 && (
                <span className="tabular-nums">{post.totalReactions}</span>
              )}
            </Button>

            {/* Reaction picker on hover */}
            {showReactions && (
              <div
                className="absolute bottom-full left-0 mb-1 flex items-center gap-0.5 bg-card border border-border rounded-full px-2 py-1 shadow-lg z-10"
                onMouseEnter={() => setShowReactions(true)}
                onMouseLeave={() => setShowReactions(false)}
              >
                {REACTION_CONFIG.map((r) => (
                  <Button
                    key={r.type}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 w-7 p-0 rounded-full",
                      post.myReaction === r.type && "bg-primary/10 text-primary",
                    )}
                    onClick={() => {
                      onReaction(post.id, r.type);
                      setShowReactions(false);
                    }}
                    title={r.label}
                  >
                    {r.icon}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Reaction summary pills */}
          {Object.entries(post.reactionCounts).map(([type, count]) => {
            const config = REACTION_CONFIG.find((r) => r.type === type);
            if (!config || count === 0) return null;
            return (
              <span
                key={type}
                className={cn(
                  "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                  post.myReaction === type
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {config.icon}
                <span className="tabular-nums">{count}</span>
              </span>
            );
          })}

          {/* Comments toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground gap-1 ml-auto"
            onClick={handleToggleComments}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="tabular-nums">{post.commentCount}</span>
            {showComments ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>

          {/* Save post button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 text-xs gap-1",
              isSaved
                ? "text-primary"
                : "text-muted-foreground"
            )}
            onClick={handleSavePost}
            disabled={savingPost}
          >
            <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
            {post.saveCount > 0 && (
              <span className="tabular-nums">{post.saveCount}</span>
            )}
          </Button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="border-t border-border pt-3 space-y-3">
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <>
                {comments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No comments yet. Be the first!
                  </p>
                )}
                {comments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    currentUserId={currentUserId}
                    onReply={(id) => {
                      setReplyingTo(replyingTo === id ? null : id);
                      setReplyContent("");
                      clearReplyMentions();
                    }}
                    onDelete={handleDeleteComment}
                    onBlock={onBlock}
                    replyingTo={replyingTo}
                    replyContent={replyContent}
                    onReplyContentChange={setReplyContent}
                    onSubmitReply={handleSubmitReply}
                    submittingReply={submittingReply}
                    replyMentions={replyMentions}
                    onReplyMention={addReplyMention}
                  />
                ))}
              </>
            )}

            {/* New comment input */}
            <div className="space-y-2">
              <MentionAutocomplete
                ref={commentTextareaRef}
                value={commentContent}
                onChange={setCommentContent}
                onMention={addCommentMention}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder="Write a comment... Type @ to mention someone"
              >
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!commentContent.trim() || submittingComment}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => commentImageInputRef.current?.click()}
                    disabled={uploadingCommentImage}
                  >
                    <ImageIcon className="h-4 w-4 mr-1" />
                    {uploadingCommentImage ? "Uploading..." : "Image"}
                  </Button>
                  <input
                    ref={commentImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCommentImageFileChange}
                  />
                </div>
              </MentionAutocomplete>
              
              {/* Image preview */}
              {commentImageUrl && (
                <div className="rounded-lg overflow-hidden border border-border relative">
                  <img
                    src={commentImageUrl}
                    alt="Comment image preview"
                    className="max-h-40 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCommentImageUrl("");
                      setCommentImageFile(null);
                    }}
                    className="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              
              {/* Mentioned users display */}
              {commentMentions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Mentioned: {commentMentions.map((u) => `@${u.username}`).join(", ")}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function CommunityPage() {
  const { user } = useUser();

  // Active tab
  const [activeTab, setActiveTab] = useState("feed");

  // Posts state
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterTag, setFilterTag] = useState<PostTag | undefined>(undefined);

  // Saved posts state
  const [savedPosts, setSavedPosts] = useState<CommunityPost[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savedPage, setSavedPage] = useState(1);
  const [savedTotal, setSavedTotal] = useState(0);

  // New post state
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTag, setNewTag] = useState<PostTag>("GENERAL");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Mention state
  const { mentions, mentionedUserIds, addMention, clearMentions } = useMentions();
  const newPostTextareaRef = useRef<HTMLTextAreaElement>(null);
  const postImageInputRef = useRef<HTMLInputElement>(null);

  // Block state
  const [blockDialog, setBlockDialog] = useState<{
    open: boolean;
    userId: number;
    username: string;
  }>({ open: false, userId: 0, username: "" });
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserEntry[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  const pageState = usePageState({
    isLoading: loading,
    error,
    isEmpty: posts.length === 0,
  });

  // ─── Data fetching ─────────────────────────────────────────────

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPosts(page, 20, filterTag);
      setPosts(data.posts);
      setTotal(data.total);
    } catch (e) {
      setError((e as Error).message || "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [page, filterTag]);

  const fetchBlocked = useCallback(async () => {
    setLoadingBlocked(true);
    try {
      const data = await getBlockedUsers();
      setBlockedUsers(data);
    } catch {
      toast.error("Failed to load blocked users");
    } finally {
      setLoadingBlocked(false);
    }
  }, []);

  const fetchSavedPosts = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const data = await getSavedPosts(savedPage, 20);
      setSavedPosts(data.posts);
      setSavedTotal(data.total);
    } catch (e) {
      toast.error((e as Error).message || "Failed to load saved posts");
    } finally {
      setLoadingSaved(false);
    }
  }, [savedPage]);

  useEffect(() => {
    if (activeTab === "feed") fetchPosts();
    if (activeTab === "blocked") fetchBlocked();
    if (activeTab === "saved") fetchSavedPosts();
  }, [activeTab, fetchPosts, fetchBlocked, fetchSavedPosts]);

  // ─── Handlers ──────────────────────────────────────────────────

  const handlePostImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const uploadedUrl = await uploadCommunityImage(file);
      setNewImageUrl(uploadedUrl);
      setNewImageFile(file);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error((e as Error).message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePostImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePostImageUpload(file);
    }
  };

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSubmitting(true);
    try {
      await createPost(newTitle.trim(), newContent.trim(), newTag, newImageUrl || undefined);
      toast.success("Post created!");
      setNewTitle("");
      setNewContent("");
      setNewTag("GENERAL");
      setNewImageUrl("");
      setNewImageFile(null);
      clearMentions();
      setShowNewPost(false);
      if (newPostTextareaRef.current) {
        newPostTextareaRef.current.value = "";
      }
      fetchPosts();
    } catch (e) {
      toast.error((e as Error).message || "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      await deletePost(postId);
      toast.success("Post deleted");
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      toast.error((e as Error).message || "Failed to delete post");
    }
  };

  const handleReaction = async (postId: number, type: ReactionType) => {
    try {
      const result = await toggleReaction(postId, type);

      // Optimistically update the post in state
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;

          const updatedCounts = { ...p.reactionCounts };
          const previousReaction = p.myReaction;

          if (result.action === "removed") {
            // Removed old reaction
            if (previousReaction) {
              updatedCounts[previousReaction] = Math.max(
                0,
                (updatedCounts[previousReaction] ?? 0) - 1,
              );
              if (updatedCounts[previousReaction] === 0) {
                delete updatedCounts[previousReaction];
              }
            }
            return {
              ...p,
              myReaction: null,
              reactionCounts: updatedCounts,
              totalReactions: p.totalReactions - 1,
            };
          }

          if (result.action === "updated") {
            // Swapped reaction
            if (previousReaction) {
              updatedCounts[previousReaction] = Math.max(
                0,
                (updatedCounts[previousReaction] ?? 0) - 1,
              );
              if (updatedCounts[previousReaction] === 0) {
                delete updatedCounts[previousReaction];
              }
            }
            updatedCounts[result.type] = (updatedCounts[result.type] ?? 0) + 1;
            return {
              ...p,
              myReaction: result.type,
              reactionCounts: updatedCounts,
            };
          }

          // added
          updatedCounts[result.type] = (updatedCounts[result.type] ?? 0) + 1;
          return {
            ...p,
            myReaction: result.type,
            reactionCounts: updatedCounts,
            totalReactions: p.totalReactions + 1,
          };
        }),
      );
    } catch {
      toast.error("Failed to update reaction");
    }
  };

  const handleBlockUser = (userId: number, username: string) => {
    setBlockDialog({ open: true, userId, username });
  };

  const handleSavePostUpdate = (postId: number, isSaved: boolean) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              isSaved,
              saveCount: isSaved ? p.saveCount + 1 : Math.max(0, p.saveCount - 1),
            }
          : p,
      ),
    );
    setSavedPosts((prev) =>
      isSaved
        ? prev
        : prev.filter((p) => p.id !== postId),
    );
  };

  const confirmBlock = async () => {
    try {
      await blockUser(blockDialog.userId);
      toast.success(`Blocked @${blockDialog.username}`);
      setBlockDialog({ open: false, userId: 0, username: "" });
      // Re-fetch posts to hide blocked user's content
      fetchPosts();
    } catch (e) {
      toast.error((e as Error).message || "Failed to block user");
    }
  };

  const handleUnblock = async (blockedId: number) => {
    try {
      await unblockUser(blockedId);
      toast.success("User unblocked");
      fetchBlocked();
    } catch (e) {
      toast.error((e as Error).message || "Failed to unblock user");
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <AppShell>
      <PageHeader
        title="Community"
        description="Share ideas, discuss markets, and connect with fellow traders"
        actions={
          <Button onClick={() => setShowNewPost(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Post
          </Button>
        }
      />

      <Tabs
        tabs={[
          { id: "feed", label: "Feed" },
          { id: "saved", label: "Saved Posts" },
          { id: "blocked", label: "Blocked Users" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* ─── Feed Tab ──────────────────────────────────────────── */}
      {activeTab === "feed" && (
        <div className="mt-4 space-y-4">
          {/* Tag filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Button
              variant={filterTag === undefined ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setFilterTag(undefined);
                setPage(1);
              }}
            >
              All
            </Button>
            {POST_TAGS.map((t) => (
              <Button
                key={t.value}
                variant={filterTag === t.value ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setFilterTag(t.value);
                  setPage(1);
                }}
              >
                {t.label}
              </Button>
            ))}
          </div>

          <PageState
            state={pageState}
            error={error}
            onRetry={fetchPosts}
            emptyComponent={
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  No posts yet
                </h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm text-center">
                  Be the first to start a conversation!
                </p>
                <Button className="mt-6" onClick={() => setShowNewPost(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Post
                </Button>
              </div>
            }
          >
            {/* Posts list */}
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id ?? 0}
                  onDelete={handleDeletePost}
                  onReaction={handleReaction}
                  onBlock={handleBlockUser}
                  onSave={handleSavePostUpdate}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </PageState>
        </div>
      )}

      {/* ─── Saved Posts Tab ────────────────────────────────────── */}
      {activeTab === "saved" && (
        <div className="mt-4 space-y-4">
          <PageState state={loadingSaved ? "loading" : savedPosts.length === 0 ? "empty" : "ready"}>
            <div className="space-y-4">
              {savedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={{ ...post, isSaved: true }}
                  currentUserId={user!.id}
                  onDelete={handleDeletePost}
                  onReaction={handleReaction}
                  onBlock={handleBlockUser}
                  onSave={handleSavePostUpdate}
                />
              ))}
            </div>

            {/* Pagination */}
            {savedTotal > 20 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={savedPage === 1}
                  onClick={() => setSavedPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground flex items-center px-4">
                  Page {savedPage} of {Math.ceil(savedTotal / 20)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={savedPage >= Math.ceil(savedTotal / 20)}
                  onClick={() => setSavedPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </PageState>
        </div>
      )}

      {/* ─── Blocked Users Tab ─────────────────────────────────── */}
      {activeTab === "blocked" && (
        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldBan className="h-5 w-5" />
                Blocked Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBlocked ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : blockedUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  You haven&apos;t blocked anyone.
                </p>
              ) : (
                <div className="space-y-2">
                  {blockedUsers.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {entry.user.profileImageUrl ? (
                            <AvatarImage src={entry.user.profileImageUrl} />
                          ) : null}
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                            {getInitials(entry.user.name, entry.user.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {entry.user.name || entry.user.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{entry.user.username} · Blocked{" "}
                            {timeAgo(entry.blockedAt)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnblock(entry.user.id)}
                      >
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── New Post Dialog ───────────────────────────────────── */}
      <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
            <DialogDescription>
              Share your thoughts with the TradeUp community
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Input
                placeholder="Post title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={200}
              />
            </div>
            <div>
              <MentionAutocomplete
                ref={newPostTextareaRef}
                value={newContent}
                onChange={setNewContent}
                onMention={addMention}
                placeholder="What's on your mind? Type @ to mention someone..."
                value={newContent}
                onChange={setNewContent}
              />
              
              {/* Mentioned users display */}
              {mentions.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Mentioned users ({mentions.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {mentions.map((user) => (
                      <div
                        key={user.id}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full"
                      >
                        <span className="text-sm font-medium text-primary">
                          @{user.username}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const textArea = newPostTextareaRef.current;
                            if (textArea) {
                              const text = textArea.value;
                              const mention = `@${user.username}`;
                              const index = text.lastIndexOf(mention);
                              if (index !== -1) {
                                const newText =
                                  text.slice(0, index) + text.slice(index + mention.length);
                                setNewContent(newText);
                              }
                            }
                          }}
                          className="text-primary/60 hover:text-primary"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Tag:</span>
              {POST_TAGS.map((t) => (
                <Button
                  key={t.value}
                  variant={newTag === t.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setNewTag(t.value)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                <ImageIcon className="h-4 w-4 inline mr-2" />
                Image (optional)
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/image.png"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    type="url"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => postImageInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? "Uploading..." : "Upload"}
                  </Button>
                  <input
                    ref={postImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePostImageFileChange}
                  />
                </div>
              </div>
              {newImageUrl && (
                <div className="mt-3 rounded-lg overflow-hidden border border-border relative">
                  <img
                    src={newImageUrl}
                    alt="Preview"
                    className="max-h-48 w-full object-cover"
                    onError={() => {
                      toast.error("Invalid image URL");
                      setNewImageUrl("");
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNewImageUrl("");
                      setNewImageFile(null);
                    }}
                    className="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPost(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePost}
              disabled={!newTitle.trim() || !newContent.trim() || submitting}
            >
              {submitting ? "Posting..." : "Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Block Confirm Dialog ──────────────────────────────── */}
      <Dialog
        open={blockDialog.open}
        onOpenChange={(open) =>
          !open && setBlockDialog({ open: false, userId: 0, username: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block User</DialogTitle>
            <DialogDescription>
              Are you sure you want to block @{blockDialog.username}? Their posts
              and comments will be hidden from your feed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setBlockDialog({ open: false, userId: 0, username: "" })
              }
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmBlock}>
              Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
