import API_BASE_URL from './api';
import { uploadFile, ApiException } from '@/lib/http';
import type {
  CommunityPost,
  PostsResponse,
  PostComment,
  ReactionResult,
  ReactionType,
  PostTag,
  BlockedUserEntry,
} from '@/types/community';

// ─── Auth headers helper (matches friendsService pattern) ────────
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// ─── IMAGE UPLOAD ────────────────────────────────────────────────

export const uploadCommunityImage = async (file: File): Promise<string> => {
  const response = await uploadFile<{ imageUrl: string }>(
    '/community/upload-image',
    file,
    'file'
  );
  return response.imageUrl;
};

// ─── POSTS ────────────────────────────────────────────────────────

export const createPost = async (
  title: string,
  content: string,
  tag?: PostTag,
  imageUrl?: string,
): Promise<CommunityPost> => {
  const response = await fetch(`${API_BASE_URL}/community/posts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title, content, tag, imageUrl }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message || 'Failed to create post',
    );
  }
  return response.json() as Promise<CommunityPost>;
};

export const getPosts = async (
  page: number = 1,
  limit: number = 20,
  tag?: PostTag,
): Promise<PostsResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (tag) params.set('tag', tag);

  const response = await fetch(
    `${API_BASE_URL}/community/posts?${params.toString()}`,
    { method: 'GET', headers: getAuthHeaders() },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch posts');
  }
  return response.json() as Promise<PostsResponse>;
};

export const getPost = async (postId: number): Promise<CommunityPost> => {
  const response = await fetch(`${API_BASE_URL}/community/posts/${postId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch post');
  }
  return response.json() as Promise<CommunityPost>;
};

export const deletePost = async (postId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/community/posts/${postId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message || 'Failed to delete post',
    );
  }
};

// ─── COMMENTS & REPLIES ──────────────────────────────────────────

export const getComments = async (
  postId: number,
): Promise<PostComment[]> => {
  const response = await fetch(
    `${API_BASE_URL}/community/posts/${postId}/comments`,
    { method: 'GET', headers: getAuthHeaders() },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch comments');
  }
  return response.json() as Promise<PostComment[]>;
};

export const createComment = async (
  postId: number,
  content: string,
  parentId?: number,
  imageUrl?: string,
): Promise<PostComment> => {
  const response = await fetch(`${API_BASE_URL}/community/comments`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ postId, content, parentId, imageUrl }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message || 'Failed to create comment',
    );
  }
  return response.json() as Promise<PostComment>;
};

export const deleteComment = async (commentId: number): Promise<void> => {
  const response = await fetch(
    `${API_BASE_URL}/community/comments/${commentId}`,
    { method: 'DELETE', headers: getAuthHeaders() },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message || 'Failed to delete comment',
    );
  }
};

// ─── REACTIONS ───────────────────────────────────────────────────

export const toggleReaction = async (
  postId: number,
  type: ReactionType,
): Promise<ReactionResult> => {
  const response = await fetch(`${API_BASE_URL}/community/reactions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ postId, type }),
  });

  if (!response.ok) {
    throw new Error('Failed to toggle reaction');
  }
  return response.json() as Promise<ReactionResult>;
};

// ─── BLOCK / MUTE ────────────────────────────────────────────────

export const blockUser = async (blockedId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/community/block`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ blockedId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message || 'Failed to block user',
    );
  }
};

export const unblockUser = async (blockedId: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/community/block/${blockedId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to unblock user');
  }
};

export const getBlockedUsers = async (): Promise<BlockedUserEntry[]> => {
  const response = await fetch(`${API_BASE_URL}/community/blocked`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch blocked users');
  }
  return response.json() as Promise<BlockedUserEntry[]>;
};

// ─── SAVED POSTS ─────────────────────────────────────────────────

export const savePost = async (postId: number): Promise<void> => {
  const response = await fetch(
    `${API_BASE_URL}/community/posts/${postId}/save`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message || 'Failed to save post',
    );
  }
};

export const getSavedPosts = async (
  page: number = 1,
  limit: number = 20,
): Promise<PostsResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(
    `${API_BASE_URL}/community/saved-posts?${params.toString()}`,
    { method: 'GET', headers: getAuthHeaders() },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch saved posts');
  }
  return response.json() as Promise<PostsResponse>;
};

export const isPostSaved = async (postId: number): Promise<boolean> => {
  const response = await fetch(
    `${API_BASE_URL}/community/posts/${postId}/is-saved`,
    { method: 'GET', headers: getAuthHeaders() },
  );

  if (!response.ok) {
    throw new Error('Failed to check if post is saved');
  }
  const result = await response.json() as { isSaved: boolean };
  return result.isSaved;
};
