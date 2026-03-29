import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostTag, ReactionType } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { LocalStorageService } from '../storage/local-storage.service';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── Author select reusable fragment ──────────────────────────────
const AUTHOR_SELECT = {
  id: true,
  username: true,
  name: true,
  profileImageUrl: true,
} as const;

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly localStorage: LocalStorageService,
  ) {}

  // ─── Helper: get IDs of users the caller blocked or who blocked them ──
  private async getBlockedIdPair(userId: number): Promise<number[]> {
    const blocks = await this.prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
    });

    const ids = new Set<number>();
    for (const b of blocks) {
      if (b.blockerId === userId) ids.add(b.blockedId);
      if (b.blockedId === userId) ids.add(b.blockerId);
    }
    return Array.from(ids);
  }

  // ─── POSTS ──────────────────────────────────────────────────────────

  async createPost(
    authorId: number,
    title: string,
    content: string,
    tag: PostTag = 'GENERAL',
    imageUrl?: string,
  ) {
    return this.prisma.post.create({
      data: { authorId, title, content, tag, imageUrl },
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: { comments: true, reactions: true } },
      },
    });
  }

  async getPosts(
    userId: number,
    page: number = 1,
    limit: number = 20,
    tag?: PostTag,
  ) {
    const blockedIds = await this.getBlockedIdPair(userId);
    const skip = (page - 1) * limit;

    const where = {
      ...(blockedIds.length > 0 ? { authorId: { notIn: blockedIds } } : {}),
      ...(tag ? { tag } : {}),
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          author: { select: AUTHOR_SELECT },
          reactions: { select: { id: true, userId: true, type: true } },
          savedBy: { where: { userId }, select: { id: true } },
          _count: { select: { comments: true, savedBy: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    // Enrich each post with the caller's own reaction (if any) and saved status
    const enriched = posts.map((post) => {
      const myReaction =
        post.reactions.find((r) => r.userId === userId)?.type ?? null;

      // Group reactions by type with count
      const reactionCounts: Record<string, number> = {};
      for (const r of post.reactions) {
        reactionCounts[r.type] = (reactionCounts[r.type] ?? 0) + 1;
      }

      return {
        id: post.id,
        title: post.title,
        content: post.content,
        imageUrl: post.imageUrl,
        tag: post.tag,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: post.author,
        commentCount: post._count.comments,
        reactionCounts,
        totalReactions: post.reactions.length,
        myReaction,
        isSaved: post.savedBy.length > 0,
        saveCount: post._count.savedBy,
      };
    });

    return { posts: enriched, total, page, limit };
  }

  async getPostById(postId: number, userId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: { select: AUTHOR_SELECT },
        reactions: { select: { id: true, userId: true, type: true } },
        savedBy: { where: { userId }, select: { id: true } },
        _count: { select: { comments: true, savedBy: true } },
      },
    });

    if (!post) throw new NotFoundException('Post not found');

    // Check block
    const blockedIds = await this.getBlockedIdPair(userId);
    if (blockedIds.includes(post.authorId)) {
      throw new ForbiddenException('This content is not available');
    }

    const myReaction =
      post.reactions.find((r) => r.userId === userId)?.type ?? null;

    const reactionCounts: Record<string, number> = {};
    for (const r of post.reactions) {
      reactionCounts[r.type] = (reactionCounts[r.type] ?? 0) + 1;
    }

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl,
      tag: post.tag,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author,
      commentCount: post._count.comments,
      reactionCounts,
      totalReactions: post.reactions.length,
      myReaction,
      isSaved: post.savedBy.length > 0,
      saveCount: post._count.savedBy,
    };
  }

  async deletePost(postId: number, userId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.prisma.post.delete({ where: { id: postId } });
    return { ok: true };
  }

  // ─── COMMENTS & REPLIES ─────────────────────────────────────────────

  async createComment(
    authorId: number,
    postId: number,
    content: string,
    parentId?: number,
    imageUrl?: string,
  ) {
    // Verify post exists
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    // If replying, verify parent comment exists and belongs to the same post
    if (parentId !== undefined) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (!parent) throw new NotFoundException('Parent comment not found');
      if (parent.postId !== postId) {
        throw new BadRequestException(
          'Parent comment does not belong to this post',
        );
      }
    }

    return this.prisma.comment.create({
      data: { postId, authorId, content, parentId, imageUrl },
      include: {
        author: { select: AUTHOR_SELECT },
      },
    });
  }

  async getComments(postId: number, userId: number) {
    const blockedIds = await this.getBlockedIdPair(userId);

    // Fetch top-level comments (parentId === null)
    const comments = await this.prisma.comment.findMany({
      where: {
        postId,
        parentId: null,
        ...(blockedIds.length > 0 ? { authorId: { notIn: blockedIds } } : {}),
      },
      include: {
        author: { select: AUTHOR_SELECT },
        replies: {
          where:
            blockedIds.length > 0 ? { authorId: { notIn: blockedIds } } : {},
          include: {
            author: { select: AUTHOR_SELECT },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments;
  }

  async deleteComment(commentId: number, userId: number) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });
    return { ok: true };
  }

  // ─── REACTIONS ──────────────────────────────────────────────────────

  async toggleReaction(userId: number, postId: number, type: ReactionType) {
    // Verify post exists
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.reaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      if (existing.type === type) {
        // Same type → remove (un-react)
        await this.prisma.reaction.delete({ where: { id: existing.id } });
        return { action: 'removed' as const, type };
      }
      // Different type → update
      await this.prisma.reaction.update({
        where: { id: existing.id },
        data: { type },
      });
      return { action: 'updated' as const, type };
    }

    // New reaction
    await this.prisma.reaction.create({
      data: { postId, userId, type },
    });
    return { action: 'added' as const, type };
  }

  // ─── BLOCK / MUTE ──────────────────────────────────────────────────

  async blockUser(blockerId: number, blockedId: number) {
    if (blockerId === blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const blocked = await this.prisma.user.findUnique({
      where: { id: blockedId },
    });
    if (!blocked) throw new NotFoundException('User not found');

    const existing = await this.prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (existing) {
      throw new BadRequestException('User already blocked');
    }

    await this.prisma.userBlock.create({
      data: { blockerId, blockedId },
    });
    return { ok: true };
  }

  async unblockUser(blockerId: number, blockedId: number) {
    const existing = await this.prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (!existing) {
      throw new NotFoundException('Block not found');
    }

    await this.prisma.userBlock.delete({ where: { id: existing.id } });
    return { ok: true };
  }

  async getBlockedUsers(userId: number) {
    const blocks = await this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      include: {
        blocked: { select: AUTHOR_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });

    return blocks.map((b) => ({
      id: b.id,
      blockedAt: b.createdAt,
      user: b.blocked,
    }));
  }

  async isBlocked(blockerId: number, blockedId: number): Promise<boolean> {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId, blockedId },
          { blockedId: blockerId, blockerId: blockedId },
        ],
      },
    });
    return !!block;
  }

  // ─── USER MENTIONS & SEARCH ──────────────────────────────────────────

  async searchMentions(
    userId: number,
    query: string,
    limit: number = 10,
  ) {
    const searchTerm = query.toLowerCase().trim();
    
    // Get list of blocked users
    const blockedIds = await this.getBlockedIdPair(userId);

    // Get user's accepted friendships
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      select: {
        senderId: true,
        receiverId: true,
      },
    });

    // Extract friend IDs
    const friendIds = new Set<number>();
    friendships.forEach((f) => {
      if (f.senderId === userId) friendIds.add(f.receiverId);
      if (f.receiverId === userId) friendIds.add(f.senderId);
    });

    // Build the search filter
    const searchFilter = {
      AND: [
        ...(searchTerm.length > 0
          ? [
              {
                OR: [
                  { username: { contains: searchTerm, mode: 'insensitive' as const } },
                  { name: { contains: searchTerm, mode: 'insensitive' as const } },
                ],
              },
            ]
          : []),
        { id: { notIn: [userId, ...blockedIds] } },
      ],
    };

    // Fetch users matching the search query
    const users = await this.prisma.user.findMany({
      where: searchFilter,
      select: {
        id: true,
        username: true,
        name: true,
        profileImageUrl: true,
      },
      take: limit * 2, // Fetch extra to have room for sorting
    });

    // Sort with friends first, then by username/name match relevance
    const sorted = users.sort((a, b): number => {
      const aIsFriend = friendIds.has(a.id);
      const bIsFriend = friendIds.has(b.id);

      // Friends come first
      if (aIsFriend && !bIsFriend) return -1;
      if (!aIsFriend && bIsFriend) return 1;

      // Otherwise sort by match relevance (prefix match > substring match)
      const aUsernamePrefix = a.username.toLowerCase().startsWith(searchTerm);
      const bUsernamePrefix = b.username.toLowerCase().startsWith(searchTerm);
      if (aUsernamePrefix && !bUsernamePrefix) return -1;
      if (!aUsernamePrefix && bUsernamePrefix) return 1;

      return 0;
    });

    return sorted.slice(0, limit);
  }

  // ─── SAVED POSTS ────────────────────────────────────────────────────

  async savePost(userId: number, postId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.savedPost.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      // Already saved, unsave it
      await this.prisma.savedPost.delete({ where: { id: existing.id } });
      return { ok: true, saved: false };
    }

    // Save the post
    await this.prisma.savedPost.create({
      data: { userId, postId },
    });
    return { ok: true, saved: true };
  }

  async getSavedPosts(userId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [savedPosts, total] = await Promise.all([
      this.prisma.savedPost.findMany({
        where: { userId },
        include: {
          post: {
            include: {
              author: { select: AUTHOR_SELECT },
              reactions: { select: { id: true, userId: true, type: true } },
              _count: { select: { comments: true, savedBy: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.savedPost.count({ where: { userId } }),
    ]);

    const posts = savedPosts.map((sp) => {
      const post = sp.post;
      const myReaction =
        post.reactions.find((r) => r.userId === userId)?.type ?? null;

      const reactionCounts: Record<string, number> = {};
      for (const r of post.reactions) {
        reactionCounts[r.type] = (reactionCounts[r.type] ?? 0) + 1;
      }

      return {
        id: post.id,
        title: post.title,
        content: post.content,
        imageUrl: post.imageUrl,
        tag: post.tag,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: post.author,
        commentCount: post._count.comments,
        reactionCounts,
        totalReactions: post.reactions.length,
        myReaction,
        isSaved: true,
        saveCount: post._count.savedBy,
      };
    });

    return { posts, total, page, limit };
  }

  async isPostSaved(userId: number, postId: number): Promise<boolean> {
    const saved = await this.prisma.savedPost.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    return !!saved;
  }

  // ─── IMAGE UPLOAD ──────────────────────────────────────────────────

  async uploadImage(
    userId: number,
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string,
  ): Promise<string> {
    try {
      console.log('Starting image upload for user:', userId);
      console.log('File size:', fileBuffer.length, 'bytes');
      
      // Try Supabase first (if configured)
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          console.log('Attempting Supabase upload...');
          const fileName = `community/${Date.now()}-${Math.random().toString(36).substring(7)}-${originalFileName}`;

          const { data, error } = await supabase.storage
            .from('tradeup-images')
            .upload(fileName, fileBuffer, {
              contentType: mimeType,
            });

          if (error) {
            console.warn('Supabase upload error, falling back to local storage:', error);
          } else {
            console.log('Supabase upload successful');
            const { data: urlData } = supabase.storage
              .from('tradeup-images')
              .getPublicUrl(data.path);
            
            console.log('Public URL:', urlData.publicUrl);
            return urlData.publicUrl;
          }
        } catch (supabaseError) {
          console.warn('Supabase error, falling back to local storage:', supabaseError);
        }
      }

      // Fallback to local storage
      console.log('Using local storage for image upload');
      const localUrl = await this.localStorage.uploadImage(
        userId,
        fileBuffer,
        originalFileName,
        mimeType,
      );
      console.log('Local storage URL:', localUrl);
      return localUrl;
    } catch (error) {
      console.error('Image upload exception:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Image upload failed: ${errorMsg}`,
      );
    }
  }
}
