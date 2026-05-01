export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PRODUCTS: '/products',
  AVAILABILITY: '/availability',
  CHAT: '/chat',
  PROFILE: '/profile',
  INSIGHTS: '/insights',
  TRENDING: '/trending'
};

export const NAV_ITEMS = [
  { path: ROUTES.TRENDING, label: 'Trending' },
  { path: ROUTES.PRODUCTS, label: 'Products' },
  { path: ROUTES.AVAILABILITY, label: 'Availability' },
  { path: ROUTES.CHAT, label: 'Chat' },
  { path: ROUTES.PROFILE, label: 'Profile' },
  { path: ROUTES.INSIGHTS, label: 'Insights' }
];

export const CATEGORIES = [
  '',
  'ELECTRONICS',
  'FURNITURE', 
  'VEHICLES',
  'TOOLS',
  'OUTDOOR',
  'SPORTS',
  'MUSIC',
  'OFFICE',
  'CAMERAS'
];

export const STORAGE_KEYS = {
  TOKEN: 'rentpi_token'
};
