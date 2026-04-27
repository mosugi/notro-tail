/**
 * Notion color names → CSS class mapping for tailwind-variants.
 *
 * These classes are defined in global.css (notro color utilities section).
 * Edit the --notro-* CSS variables there to retheme all Notion colors at once.
 */

export const notroColorVariants = {
  default:           '',
  gray:              'notro-text-gray',
  brown:             'notro-text-brown',
  orange:            'notro-text-orange',
  yellow:            'notro-text-yellow',
  green:             'notro-text-green',
  blue:              'notro-text-blue',
  purple:            'notro-text-purple',
  pink:              'notro-text-pink',
  red:               'notro-text-red',
  // Notion API v2026: background colors use "_bg" suffix (e.g. "gray_bg")
  gray_bg:           'notro-bg-gray',
  brown_bg:          'notro-bg-brown',
  orange_bg:         'notro-bg-orange',
  yellow_bg:         'notro-bg-yellow',
  green_bg:          'notro-bg-green',
  blue_bg:           'notro-bg-blue',
  purple_bg:         'notro-bg-purple',
  pink_bg:           'notro-bg-pink',
  red_bg:            'notro-bg-red',
  // Legacy aliases (kept for backward compatibility)
  gray_background:   'notro-bg-gray',
  brown_background:  'notro-bg-brown',
  orange_background: 'notro-bg-orange',
  yellow_background: 'notro-bg-yellow',
  green_background:  'notro-bg-green',
  blue_background:   'notro-bg-blue',
  purple_background: 'notro-bg-purple',
  pink_background:   'notro-bg-pink',
  red_background:    'notro-bg-red',
} as const;

export type NotroColor = keyof typeof notroColorVariants;
