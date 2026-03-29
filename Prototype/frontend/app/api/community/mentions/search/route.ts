import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a string' },
        { status: 400 },
      );
    }

    // Get the token from cookies or Authorization header
    const authHeader = request.headers.get('authorization');
    const token =
      request.cookies.get('token')?.value ||
      (authHeader ? authHeader.replace('Bearer ', '') : null);

    if (!token) {
      console.warn('No token found in request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(
      `${API_BASE_URL}/community/mentions/search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Backend error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Mention search error:', error);
    return NextResponse.json(
      { error: 'Failed to search mentions' },
      { status: 500 },
    );
  }
}
