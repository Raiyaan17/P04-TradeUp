"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getUserProfile, User } from "@/lib/userService";

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  refreshUser: () => Promise<User | null>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  refreshUser: async () => null,
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    // Early exit if no token - avoids throwing error during signout
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    try {
      const profile = await getUserProfile();
      
      // Fetch signed profile image URL
      let signedUrl: string | null = null;
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || (isLocalhost ? 'http://localhost:3001/api' : '/api');
          const res = await fetch(`${API_BASE_URL}/users/profile-picture`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (res.ok) {
            const data = await res.json();
            signedUrl = data.imageUrl || null;
          }
        }
      } catch (e) {
        console.error('Error fetching profile picture:', e);
      }
      
      const updatedUser = { ...profile, profileImageUrl: signedUrl || profile.profileImageUrl };
      setUser(updatedUser);
      return updatedUser;
    } catch (e) {
      console.error('Error in refreshUser:', e);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only refresh if there's a token
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
    
    // Set up periodic refresh every 55 minutes (3300000 ms)
    const interval = setInterval(() => {
      const currentToken = localStorage.getItem("access_token");
      if (currentToken) {
        refreshUser();
      }
    }, 3300000);
    
    return () => {
      clearInterval(interval);
    };
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{ user, isLoading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};
