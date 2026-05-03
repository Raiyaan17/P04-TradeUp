const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://tradeup-syai.onrender.com/api'
    : 'http://localhost:3001/api');

export default API_BASE_URL;
