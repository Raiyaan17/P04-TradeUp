import API_BASE_URL from './api';
// User API service for handling user-related requests

export interface User {
  id: number;
  email: string;
  username: string;
  name: string | null;
  role: string;
  gender?: 'MALE' | 'FEMALE' | null;
  /** Balance as string or number (Prisma returns Decimal as string) */
  balance: string | number;
  tournamentScore: number;
  profileImageUrl?: string | null;
}

/**
 * Check if user balance is unset (new user who hasn't funded wallet yet)
 * Handles both string and number types from Prisma Decimal
 */
export function isBalanceUnset(balance: string | number | null | undefined): boolean {
  if (balance === null || balance === undefined) return false;
  return Number(balance) === -1;
}

/**
 * Get balance as a number (handles Prisma Decimal string conversion)
 */
export function getBalanceNumber(balance: string | number | null | undefined): number {
  if (balance === null || balance === undefined) return 0;
  return Number(balance);
}

// Upload profile image for current user
export const uploadProfileImage = async (file: File): Promise<string> => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  console.log('Uploading profile image');
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/users/profile-picture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload profile image');
  }
  const data = await response.json();
  return data.imageUrl;
};

export const getUserProfile = async (): Promise<User> => {
  const token = localStorage.getItem('access_token');

  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/users/profile`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token');
      throw new Error('Authentication expired');
    }
    throw new Error(`Failed to fetch profile: ${response.statusText}`);
  }

  return response.json();
};

export const updateUserEmail = async (newEmail: string, currentPassword: string) => {
  const token = localStorage.getItem('access_token');

  if (!token) {
    throw new Error('No authentication token found');
  }

  console.log('Updating user email');
  const response = await fetch(`${API_BASE_URL}/users/email`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ newEmail, currentPassword }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update email');
  }

  return response.json();
};

export const updateUserPassword = async (currentPassword: string, newPassword: string) => {
  const token = localStorage.getItem('access_token');

  if (!token) {
    throw new Error('No authentication token found');
  }

  console.log('Updating user password');
  const response = await fetch(`${API_BASE_URL}/users/password`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update password');
  }

  return response.json();
};

export const updateUserName = async (newName: string, currentPassword: string) => {
  const token = localStorage.getItem('access_token');

  if (!token) {
    throw new Error('No authentication token found');
  }

  console.log('Updating user name');
  const response = await fetch(`${API_BASE_URL}/users/name`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ newName, currentPassword }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update name');
  }

  return response.json();
};
