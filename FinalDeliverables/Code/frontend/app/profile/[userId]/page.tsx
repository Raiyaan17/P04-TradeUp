'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { UserPlus, UserCheck, ArrowLeft, Lock } from 'lucide-react';
import { AppShell } from '@/components/layout';
import { PageHeader } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { getPublicProfile, sendFriendRequest, checkFriendshipStatus, PublicUser } from '@/lib/friendsService';
import { useUser } from '@/context/UserContext';
import { FriendPortfolio } from '@/components/profile/FriendPortfolio';
import Link from 'next/link';

export default function PublicProfile() {
    const params = useParams();
    const userId = Number(params.userId);
    const { user: currentUser } = useUser();

    const [profile, setProfile] = useState<PublicUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requestSent, setRequestSent] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [areFriends, setAreFriends] = useState(false);
    const [activeTab, setActiveTab] = useState('portfolio');

    useEffect(() => {
        if (!userId || isNaN(userId)) {
            setError('Invalid user ID');
            setIsLoading(false);
            return;
        }

        const loadProfile = async () => {
            try {
                const data = await getPublicProfile(userId);
                setProfile(data);

                // Check friendship status if not own profile
                if (currentUser?.id && currentUser.id !== userId) {
                    const friendshipStatus = await checkFriendshipStatus(userId);
                    setAreFriends(friendshipStatus);
                }
            } catch (err) {
                setError((err as Error).message || 'Failed to load profile');
            } finally {
                setIsLoading(false);
            }
        };

        if (currentUser) {
            loadProfile();
        }
    }, [userId, currentUser]);

    const handleSendRequest = async () => {
        setIsSending(true);
        try {
            await sendFriendRequest(userId);
            setRequestSent(true);
            toast.success('Friend request sent!');
            // Recheck friendship status
            const friendshipStatus = await checkFriendshipStatus(userId);
            setAreFriends(friendshipStatus);
        } catch (error) {
            toast.error((error as Error).message || 'Failed to send request');
        } finally {
            setIsSending(false);
        }
    };

    const getInitials = (name?: string | null, username?: string) => {
        if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
        if (username) return username.slice(0, 2).toUpperCase();
        return 'U';
    };

    const isOwnProfile = currentUser?.id === userId;

    if (isLoading) {
        return (
            <AppShell>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            </AppShell>
        );
    }

    if (error || !profile) {
        return (
            <AppShell>
                <div className="flex flex-col justify-center items-center min-h-[400px] gap-4">
                    <p className="text-muted-foreground">{error || 'Profile not found'}</p>
                    <Link href="/profile">
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Profile
                        </Button>
                    </Link>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <PageHeader
                title={profile.name || profile.username}
                description={`@${profile.username}`}
            />

            <div className="max-w-4xl mx-auto space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Profile</CardTitle>
                        {isOwnProfile && (
                            <Badge variant="secondary">You</Badge>
                        )}
                    </CardHeader>
                    <CardContent className="flex flex-row items-center gap-6">
                        <Avatar className="h-24 w-24">
                            {profile.profileImageUrl && (
                                <AvatarImage src={profile.profileImageUrl} alt={profile.name || profile.username} />
                            )}
                            <AvatarFallback className="text-2xl">
                                {getInitials(profile.name, profile.username)}
                            </AvatarFallback>
                        </Avatar>

                        <div className="space-y-2 flex-1">
                            <div>
                                <h3 className="text-xl font-semibold">{profile.name || profile.username}</h3>
                                <p className="text-sm text-muted-foreground">@{profile.username}</p>
                            </div>

                            {!isOwnProfile && !areFriends && (
                                <div>
                                    {requestSent ? (
                                        <Button variant="outline" disabled size="sm">
                                            <UserCheck className="h-4 w-4 mr-2" />
                                            Request Sent
                                        </Button>
                                    ) : (
                                        <Button onClick={handleSendRequest} disabled={isSending} size="sm">
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Add Friend
                                        </Button>
                                    )}
                                </div>
                            )}

                            {areFriends && (
                                <Badge variant="outline" className="text-emerald-500 border-emerald-500 bg-emerald-50">
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Friends
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Tabs
                    tabs={[
                        { id: 'portfolio', label: 'Portfolio' },
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                {activeTab === 'portfolio' && (
                    <>
                        {isOwnProfile || areFriends ? (
                            <FriendPortfolio userId={userId} />
                        ) : (
                            <Card>
                                <CardContent className="flex flex-col items-center py-16 gap-4 text-center">
                                    <div className="bg-muted p-4 rounded-full">
                                        <Lock className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-semibold">Portfolio is Private</h3>
                                        <p className="text-muted-foreground max-w-sm">
                                            Add <span className="font-medium text-foreground">{profile.name || profile.username}</span> as a friend to view their portfolio and trading stats.
                                        </p>
                                    </div>
                                    {!requestSent && (
                                        <Button onClick={handleSendRequest} disabled={isSending} variant="secondary">
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Send Friend Request
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </AppShell>
    );
}
