import { BookMarked, Compass, Heart, LayoutDashboard, LayoutGrid, Settings, Sparkles, Star, Tags, User, Home, Library } from 'lucide-react';

export const SIDEBAR_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/recommended', label: 'Recommended', icon: Sparkles },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/categories', label: 'Categories', icon: LayoutGrid },
  { to: '/library', label: 'My Library', icon: BookMarked },
  { to: '/favorites', label: 'Favorites', icon: Heart },
  { to: '/ratings', label: 'My Ratings', icon: Star },
  { to: '/interests', label: 'Interests', icon: Tags },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const MOBILE_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/favorites', label: 'Favorites', icon: Heart },
  { to: '/profile', label: 'Profile', icon: User },
];
