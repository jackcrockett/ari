/**
 * overlayVariants.js -- style token presets for driver-row overlays.
 *
 * Three built-in variants:
 *   default   -- current dark style; row separators; player accent only
 *   compact   -- reduced padding and gap; fits ~30% more rows in same height
 *   broadcast -- taller rows; no separators; all-driver colour accents; TV tower feel
 *
 * Tokens consumed by DriverRow.jsx. Persisted in overlay settings as `variant` string.
 */

export const VARIANTS = {
  default: {
    id:               'default',
    label:            'Default',
    rowPaddingV:      4,       // top + bottom padding px
    rowPaddingH:      10,      // left + right padding px
    gap:              6,       // gap between cells px
    showRowBorder:    true,    // bottom border between rows
    leftAccentMode:   'player', // 'player' = amber for player only | 'all' = each driver's colour
    playerBgOpacity:  0.10,   // player row background amber opacity
  },

  compact: {
    id:               'compact',
    label:            'Compact',
    rowPaddingV:      2,
    rowPaddingH:      8,
    gap:              4,
    showRowBorder:    true,
    leftAccentMode:   'player',
    playerBgOpacity:  0.10,
  },

  broadcast: {
    id:               'broadcast',
    label:            'Broadcast',
    rowPaddingV:      7,
    rowPaddingH:      12,
    gap:              8,
    showRowBorder:    false,   // no separators; overlay handles alternating bg
    leftAccentMode:   'all',   // every driver's colour shows in left accent
    playerBgOpacity:  0.12,
  },
}

export const DEFAULT_VARIANT = 'default'
