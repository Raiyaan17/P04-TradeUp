'use client';

import { useState, useCallback } from 'react';
import { MentionSuggestion } from '@/components/common/MentionAutocomplete';

export interface MentionedUser {
  id: number;
  username: string;
  name: string | null;
}

export const useMentions = () => {
  const [mentions, setMentions] = useState<MentionedUser[]>([]);
  const [mentionedUserIds, setMentionedUserIds] = useState<Set<number>>(
    new Set(),
  );

  const addMention = useCallback((user: MentionSuggestion) => {
    setMentions((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.id === user.id)) {
        return prev;
      }
      return [...prev, { id: user.id, username: user.username, name: user.name }];
    });

    setMentionedUserIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(user.id);
      return newSet;
    });
  }, []);

  const removeMention = useCallback((userId: number) => {
    setMentions((prev) => prev.filter((m) => m.id !== userId));
    setMentionedUserIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  }, []);

  const clearMentions = useCallback(() => {
    setMentions([]);
    setMentionedUserIds(new Set());
  }, []);

  return {
    mentions,
    mentionedUserIds,
    addMention,
    removeMention,
    clearMentions,
  };
};
