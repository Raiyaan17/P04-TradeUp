'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, UserPlus, UserCheck, UserX, Users, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    searchUsers,
    sendFriendRequest,
    getFriendRequests,
    acceptFriendRequest,
    declineFriendRequest,
    getFriends,
    removeFriend,
    PublicUser,
    FriendRequest,
} from '@/lib/friendsService';
import Link from 'next/link';

export function FriendsSection() {
    const [activeTab, setActiveTab] = useState('friends');
    const [friends, setFriends] = useState<PublicUser[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<PublicUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [friendToRemove, setFriendToRemove] = useState<PublicUser | null>(null);

    // Load friends and requests on mount
    useEffect(() => {
        loadFriends();
        loadRequests();
    }, []);

    const loadFriends = async () => {
        try {
            const data = await getFriends();
            setFriends(data);
        } catch {
            console.error('Failed to load friends');
        }
    };

    const loadRequests = async () => {
        try {
            const data = await getFriendRequests();
            setRequests(data);
        } catch {
            console.error('Failed to load requests');
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchUsers(query);
            setSearchResults(results);
        } catch {
            console.error('Search failed');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSendRequest = async (userId: number) => {
        setIsLoading(true);
        try {
            await sendFriendRequest(userId);
            toast.success('Friend request sent!');
            // Remove from search results to indicate action taken
            setSearchResults((prev) => prev.filter((u) => u.id !== userId));
        } catch (error) {
            toast.error((error as Error).message || 'Failed to send request');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async (requestId: number) => {
        try {
            await acceptFriendRequest(requestId);
            toast.success('Friend request accepted!');
            loadFriends();
            loadRequests();
        } catch {
            toast.error('Failed to accept request');
        }
    };

    const handleDecline = async (requestId: number) => {
        try {
            await declineFriendRequest(requestId);
            toast.success('Friend request declined');
            loadRequests();
        } catch {
            toast.error('Failed to decline request');
        }
    };

    const handleRemoveFriend = async (friendId: number) => {
        try {
            await removeFriend(friendId);
            toast.success('Friend removed');
            loadFriends();
        } catch {
            toast.error('Failed to remove friend');
        }
    };

    const getInitials = (name?: string | null, username?: string) => {
        if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
        if (username) return username.slice(0, 2).toUpperCase();
        return 'U';
    };

    return (
        <div className="w-full bg-card rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] border border-transparent hover:border-primary/20 transition-colors overflow-hidden">
            <div className="p-6 border-b border-border/50">
                <h2 className="text-label-caps flex items-center gap-2 text-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    FRIENDS
                </h2>
            </div>
            <div className="p-6 space-y-6">
                <Tabs
                    tabs={[
                        { id: 'friends', label: 'Friends' },
                        { id: 'requests', label: 'Requests', badge: requests.length },
                        { id: 'search', label: 'Search' },
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                {/* Friends Tab */}
                {activeTab === 'friends' && (
                    <div className="space-y-2">
                        {friends.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No friends yet. Search to add some!
                            </p>
                        ) : (
                            friends.map((friend) => (
                                <div
                                    key={friend.id}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                                >
                                    <Link
                                        href={`/profile/${friend.id}`}
                                        className="flex items-center gap-3 flex-1"
                                    >
                                        <Avatar className="h-10 w-10">
                                            {friend.profileImageUrl && (
                                                <AvatarImage src={friend.profileImageUrl} />
                                            )}
                                            <AvatarFallback>
                                                {getInitials(friend.name, friend.username)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm">{friend.name || friend.username}</p>
                                            <p className="text-xs text-muted-foreground">@{friend.username}</p>
                                        </div>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => setFriendToRemove(friend)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}

                        <Dialog open={!!friendToRemove} onOpenChange={(open) => !open && setFriendToRemove(null)}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Remove Friend</DialogTitle>
                                    <DialogDescription>
                                        Are you sure you want to remove {friendToRemove?.name || friendToRemove?.username} from your friends list? This action cannot be undone.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setFriendToRemove(null)}>Cancel</Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            if (friendToRemove) {
                                                handleRemoveFriend(friendToRemove.id);
                                                setFriendToRemove(null);
                                            }
                                        }}
                                    >
                                        Remove
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}

                {/* Requests Tab */}
                {activeTab === 'requests' && (
                    <div className="space-y-2">
                        {requests.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No pending friend requests
                            </p>
                        ) : (
                            requests.map((request) => (
                                <div
                                    key={request.id}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            {request.sender.profileImageUrl && (
                                                <AvatarImage src={request.sender.profileImageUrl} />
                                            )}
                                            <AvatarFallback>
                                                {getInitials(request.sender.name, request.sender.username)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm">
                                                {request.sender.name || request.sender.username}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                @{request.sender.username}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                                            onClick={() => handleAccept(request.id)}
                                        >
                                            <UserCheck className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                                            onClick={() => handleDecline(request.id)}
                                        >
                                            <UserX className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Search Tab */}
                {activeTab === 'search' && (
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by username..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="pl-9 bg-muted border-b-2 border-border border-x-0 border-t-0 focus:ring-0 focus:border-primary outline-none font-mono text-base rounded-t-md rounded-b-none"
                            />
                        </div>
                        <div className="space-y-2">
                            {isSearching && (
                                <p className="text-sm text-muted-foreground text-center">Searching...</p>
                            )}
                            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No users found
                                </p>
                            )}
                            {searchResults.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            {user.profileImageUrl && (
                                                <AvatarImage src={user.profileImageUrl} />
                                            )}
                                            <AvatarFallback>
                                                {getInitials(user.name, user.username)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm">{user.name || user.username}</p>
                                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isLoading}
                                        onClick={() => handleSendRequest(user.id)}
                                        className="flex items-center gap-1"
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        Add
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
