/**
 * Notion color names → Tailwind CSS variable class mapping for tailwind-variants.
 *
 * Uses Tailwind arbitrary CSS variable syntax so no extra global CSS utilities
 * are needed — the CSS variables (--notro-*) defined in global.css are sufficient.
 */

export const notroColorVariants = {
  default:           '',
  gray:              'text-[var(--notro-gray)]',
  brown:             'text-[var(--notro-brown)]',
  orange:            'text-[var(--notro-orange)]',
  yellow:            'text-[var(--notro-yellow)]',
  green:             'text-[var(--notro-green)]',
  blue:              'text-[var(--notro-blue)]',
  purple:            'text-[var(--notro-purple)]',
  pink:              'text-[var(--notro-pink)]',
  red:               'text-[var(--notro-red)]',
  // Notion API v2026: background colors use "_bg" suffix (e.g. "gray_bg")
  gray_bg:           'bg-[var(--notro-gray-bg)]',
  brown_bg:          'bg-[var(--notro-brown-bg)]',
  orange_bg:         'bg-[var(--notro-orange-bg)]',
  yellow_bg:         'bg-[var(--notro-yellow-bg)]',
  green_bg:          'bg-[var(--notro-green-bg)]',
  blue_bg:           'bg-[var(--notro-blue-bg)]',
  purple_bg:         'bg-[var(--notro-purple-bg)]',
  pink_bg:           'bg-[var(--notro-pink-bg)]',
  red_bg:            'bg-[var(--notro-red-bg)]',
  // Legacy aliases (kept for backward compatibility)
  gray_background:   'bg-[var(--notro-gray-bg)]',
  brown_background:  'bg-[var(--notro-brown-bg)]',
  orange_background: 'bg-[var(--notro-orange-bg)]',
  yellow_background: 'bg-[var(--notro-yellow-bg)]',
  green_background:  'bg-[var(--notro-green-bg)]',
  blue_background:   'bg-[var(--notro-blue-bg)]',
  purple_background: 'bg-[var(--notro-purple-bg)]',
  pink_background:   'bg-[var(--notro-pink-bg)]',
  red_background:    'bg-[var(--notro-red-bg)]',
} as const;

export type NotroColor = keyof typeof notroColorVariants;
