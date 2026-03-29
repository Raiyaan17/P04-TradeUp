// ─── Post Tag Enum ────────────────────────────────────────────────
export type PostTag =
  | 'GENERAL'
  | 'STOCKS'
  | 'CRYPTO'
  | 'NEWS'
  | 'ANALYSIS'
  | 'QUESTION';

// ─── Reaction Type Enum ──────────────────────────────────────────
export type ReactionType = 'LIKE' | 'LOVE' | 'FIRE' | 'BEARISH' | 'BULLISH';

// ─── Author (public user subset) ────────────────────────────────
export interface PostAuthor {
  id: number;
  username: string;
  name: string | null;
  profileImageUrl: string | null;
}

// ─── Post ────────────────────────────────────────────────────────
export interface CommunityPost {
  id: number;
  title: string;
  content: string;
  imageUrl?: string | null;
  tag: PostTag;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  commentCount: number;
  reactionCounts: Record<string, number>;
  totalReactions: number;
  myReaction: ReactionType | null;
  isSaved: boolean;
  saveCount: number;
}

export interface PostsResponse {
  posts: CommunityPost[];
  total: number;
  page: number;
  limit: number;
}

// ─── Comment ─────────────────────────────────────────────────────
export interface PostComment {
  id: number;
  postId: number;
  authorId: number;
  parentId: number | null;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  replies: PostComment[];
}

// ─── Reaction Toggle Result ──────────────────────────────────────
export interface ReactionResult {
  action: 'added' | 'removed' | 'updated';
  type: ReactionType;
}

// ─── Blocked User Entry ──────────────────────────────────────────
export interface BlockedUserEntry {
  id: number;
  blockedAt: string;
  user: PostAuthor;
}
