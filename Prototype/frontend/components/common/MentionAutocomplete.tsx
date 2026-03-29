'use client';

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { debounce } from '@/lib/utils';
import { User, X } from 'lucide-react';

export interface MentionSuggestion {
  id: number;
  username: string;
  name: string | null;
  profileImageUrl: string | null;
  isFriend: boolean;
}

interface MentionAutocompleteProps {
  onMention: (user: MentionSuggestion) => void;
  placeholder?: string;
  maxMentions?: number;
  children?: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const MentionAutocomplete = React.forwardRef<
  HTMLTextAreaElement,
  MentionAutocompleteProps
>(
  (
    {
      onMention,
      placeholder = 'Write something...',
      maxMentions = 10,
      children,
      value: externalValue,
      onChange: onExternalChange,
      onKeyDown: onExternalKeyDown,
    },
    ref,
  ) => {
    const [internalContent, setInternalContent] = useState('');
    // Use external value if provided, otherwise use internal state
    const content = externalValue !== undefined ? externalValue : internalContent;
    
    const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Get the current mention query from the content
    const getCurrentMentionQuery = useCallback((text: string): string | null => {
      const lastAtIndex = text.lastIndexOf('@');
      if (lastAtIndex === -1) return null;

      const afterAt = text.substring(lastAtIndex + 1);

      // Stop if there's a space after @
      if (afterAt.includes(' ')) return null;

      // Only return if @ was preceded by space or start of text
      if (lastAtIndex > 0 && text[lastAtIndex - 1] !== ' ') return null;

      return afterAt;
    }, []);

    // Debounced search function
    const searchMentions = useCallback(
      debounce(async (query: string) => {
        // Get token from localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

        // Show all users when query is empty (just typed @)
        if (query.length === 0) {
          // Fetch all users by sending empty query
          setIsLoading(true);
          try {
            const response = await fetch('/api/community/mentions/search', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ query: '' }),
            });

            if (response.ok) {
              const data = await response.json();
              setSuggestions(data);
              setSelectedIndex(0);
            } else {
              console.error('Mention search error - Status:', response.status);
              setSuggestions([]);
            }
          } catch (error) {
            console.error('Failed to search mentions:', error);
            setSuggestions([]);
          } finally {
            setIsLoading(false);
          }
          return;
        }

        setIsLoading(true);
        try {
          const response = await fetch('/api/community/mentions/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ query }),
          });

          if (response.ok) {
            const data = await response.json();
            setSuggestions(data);
            setSelectedIndex(0);
          } else {
            console.error('Mention search error - Status:', response.status);
            const error = await response.json().catch(() => ({}));
            console.error('Mention search error - Body:', error);
            setSuggestions([]);
          }
        } catch (error) {
          console.error('Failed to search mentions:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 300),
      [],
    );

    // Handle content change
    const handleContentChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        
        // Update internal state if not controlled
        if (externalValue === undefined) {
          setInternalContent(text);
        }
        
        // Call external onChange if provided
        if (onExternalChange) {
          onExternalChange(text);
        }

        const query = getCurrentMentionQuery(text);
        if (query !== null) {
          setMentionQuery(query);
          setShowSuggestions(true);
          searchMentions(query);
        } else {
          setShowSuggestions(false);
          setSuggestions([]);
        }
      },
      [getCurrentMentionQuery, searchMentions, externalValue, onExternalChange],
    );

    // Handle mention selection
    const handleSelectMention = useCallback(
      (user: MentionSuggestion) => {
        const lastAtIndex = content.lastIndexOf('@');
        const beforeMention = content.substring(0, lastAtIndex);
        const afterMention = content.substring(lastAtIndex + mentionQuery.length + 1);

        const newContent = `${beforeMention}@${user.username} ${afterMention}`;
        
        // Update internal state if not controlled
        if (externalValue === undefined) {
          setInternalContent(newContent);
        }
        
        // Call external onChange if provided
        if (onExternalChange) {
          onExternalChange(newContent);
        }
        
        setShowSuggestions(false);
        setSuggestions([]);

        onMention(user);

        // Reset the textarea focus
        if (ref && typeof ref !== 'function') {
          setTimeout(() => ref.current?.focus(), 0);
        }
      },
      [content, mentionQuery, onMention, ref, externalValue, onExternalChange],
    );

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showSuggestions || suggestions.length === 0) {
          // Call external handler if no suggestions are showing
          if (onExternalKeyDown) {
            onExternalKeyDown(e);
          }
          return;
        }

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % suggestions.length);
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev === 0 ? suggestions.length - 1 : prev - 1,
            );
            break;
          case 'Enter':
            e.preventDefault();
            handleSelectMention(suggestions[selectedIndex]);
            break;
          case 'Escape':
            e.preventDefault();
            setShowSuggestions(false);
            break;
          default:
            break;
        }
      },
      [showSuggestions, suggestions, selectedIndex, handleSelectMention, onExternalKeyDown],
    );

    // Handle click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setShowSuggestions(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll selected item into view
    useEffect(() => {
      if (suggestionsRef.current && selectedIndex >= 0) {
        const selectedItem = suggestionsRef.current.children[selectedIndex];
        if (selectedItem instanceof HTMLElement) {
          selectedItem.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [selectedIndex]);

    return (
      <div ref={containerRef} className="relative w-full">
        <textarea
          ref={ref}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full min-h-[120px] p-3 border border-gray-200 dark:border-gray-700 rounded-lg 
                     bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     resize-none"
        />

        {/* Mention suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-900 
                       border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg 
                       max-h-[300px] overflow-y-auto z-50"
          >
            {isLoading && (
              <div className="p-3 text-center text-sm text-gray-500">
                Searching...
              </div>
            )}

            {suggestions.map((user, index) => (
              <button
                key={user.id}
                onClick={() => handleSelectMention(user)}
                className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors
                  ${
                    index === selectedIndex
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                {/* User avatar */}
                <div className="flex-shrink-0 w-8 h-8">
                  {user.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt={user.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-blue-600 
                                    flex items-center justify-center text-white text-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {user.name || user.username}
                    </span>
                    {user.isFriend && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 
                                      px-2 py-0.5 rounded">
                        Friend
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    @{user.username}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results state */}
        {showSuggestions && !isLoading && suggestions.length === 0 && mentionQuery && (
          <div
            className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-900 
                       border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-50"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              No users found for "{mentionQuery}"
            </p>
          </div>
        )}

        {children}
      </div>
    );
  },
);

MentionAutocomplete.displayName = 'MentionAutocomplete';
