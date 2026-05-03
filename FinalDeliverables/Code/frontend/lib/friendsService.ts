import API_BASE_URL from './api';

// Types for the friends API
export interface PublicUser {
    id: number;
    username: string;
    name: string | null;
    profileImageUrl: string | null;
}

export interface FriendRequest {
    id: number;
    senderId: number;
    receiverId: number;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
    createdAt: string;
    sender: PublicUser;
}

// Helper to get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        throw new Error('No authentication token found');
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
};

// Search users by username
export const searchUsers = async (query: string): Promise<PublicUser[]> => {
    if (!query || query.length < 2) return [];

    const response = await fetch(`${API_BASE_URL}/friends/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to search users');
    }

    return response.json();
};

// Send a friend request
export const sendFriendRequest = async (receiverId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/friends/request`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ receiverId }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send friend request');
    }
};

// Get pending friend requests
export const getFriendRequests = async (): Promise<FriendRequest[]> => {
    const response = await fetch(`${API_BASE_URL}/friends/requests`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to fetch friend requests');
    }

    return response.json();
};

// Accept a friend request
export const acceptFriendRequest = async (requestId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/friends/request/${requestId}/accept`, {
        method: 'PUT',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to accept friend request');
    }
};

// Decline a friend request
export const declineFriendRequest = async (requestId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/friends/request/${requestId}/decline`, {
        method: 'PUT',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to decline friend request');
    }
};

// Get list of friends
export const getFriends = async (): Promise<PublicUser[]> => {
    const response = await fetch(`${API_BASE_URL}/friends`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to fetch friends');
    }

    return response.json();
};

// Remove a friend
export const removeFriend = async (friendId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/friends/${friendId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to remove friend');
    }
};

// Get public profile of a user
export const getPublicProfile = async (userId: number): Promise<PublicUser> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/public-profile`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('User not found');
        }
        throw new Error('Failed to fetch public profile');
    }

    return response.json();
};

// Check if users are friends
export const checkFriendshipStatus = async (userId: number): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/friends/check/${userId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to check friendship status');
    }

    const data = await response.json();
    return data.areFriends;
};

// Friend Portfolio Types
export interface FriendPortfolioItem {
    symbol: string;
    name: string | null;
    quantity: number;
    avgPrice: string;
    currentPrice: string;
    unrealizedPnl: string;
    pnlPercentage: string;
}

export interface FriendPortfolioStats {
    totalTrades: number;
    memberSince?: string;
    portfolioDiversity: number;
    topPerformer?: {
        symbol: string;
        pnlPercentage: string;
    } | null;
}

export interface FriendPortfolioData {
    totalPortfolioValue: string;
    totalUnrealizedPnl: string;
    totalPnlPercentage: string;
    portfolio: FriendPortfolioItem[];
    stats: FriendPortfolioStats;
}

// Get friend's portfolio
export const getFriendPortfolio = async (userId: number): Promise<FriendPortfolioData> => {
    const response = await fetch(`${API_BASE_URL}/trades/portfolio/${userId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        if (response.status === 403) {
            throw new Error('You are not allowed to view this portfolio');
        }
        throw new Error('Failed to fetch friend portfolio');
    }

    return response.json();
};
