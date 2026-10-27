/**
 * The October 2026 token migration: every old name and what replaced it. The codemod
 * (scripts/codemod.ts) applied it once, the docs table (packages/ui/README.md) is generated from it,
 * and test/old-names.test.ts fails if any old name comes back.
 */

/** Old token name → new token id, CSS variable and Tailwind utilities. */
export interface Rename {
  old: string
  token: string
  cssVar: string
  /** Old class → new class, where the old token was used as a utility. */
  classes?: Record<string, string>
  note?: string
}

export const RENAMES: Rename[] = [
  // Colour
  {
    old: 'sala-0',
    token: 'semantic.color.background.canvas',
    cssVar: '--background-color-canvas',
    classes: {
      'bg-sala-0': 'bg-canvas',
      'from-sala-0': 'from-canvas',
      'fill-sala-0': 'fill-(--background-color-canvas)',
      'text-sala-0': 'text-on-inverse',
    },
    note: 'As text on an inverse fill: semantic.color.text.on-inverse.',
  },
  {
    old: 'sala-1',
    token: 'semantic.color.background.raised',
    cssVar: '--background-color-raised',
    classes: {
      'bg-sala-1/(--opacity-scrim)': 'bg-scrim/(--opacity-scrim)',
      'bg-sala-1': 'bg-raised',
    },
    note: 'Behind a dialog: semantic.color.scrim.',
  },
  {
    old: 'sala-2',
    token: 'semantic.color.background.muted',
    cssVar: '--background-color-muted',
    classes: { 'bg-sala-2': 'bg-muted', 'text-sala-2': 'text-(color:--background-color-muted)' },
  },
  {
    old: 'line',
    token: 'semantic.color.border.subtle',
    cssVar: '--border-color-subtle',
    classes: { 'border-line': 'border-subtle' },
  },
  {
    old: 'line-strong',
    token: 'semantic.color.border.strong',
    cssVar: '--border-color-strong',
    classes: {
      'border-line-strong': 'border-strong',
      'text-line-strong': 'text-(color:--border-color-strong)',
    },
  },
  {
    old: 'veil',
    token: 'semantic.color.background.translucent',
    cssVar: '--background-color-translucent',
    classes: { 'bg-veil': 'bg-translucent' },
  },
  { old: 'glow', token: 'semantic.color.glow', cssVar: '--color-glow' },
  {
    old: 'ink',
    token: 'semantic.color.text.primary',
    cssVar: '--text-color-primary',
    classes: { 'text-ink': 'text-primary', 'bg-ink': 'bg-inverse', 'border-ink': 'border-inverse' },
    note: 'As a fill: semantic.color.background.inverse; as an edge: semantic.color.border.inverse.',
  },
  {
    old: 'ink-inverse',
    token: 'semantic.color.text.inverse',
    cssVar: '--text-color-inverse',
    classes: { 'text-ink-inverse': 'text-inverse' },
  },
  {
    old: 'ink-muted',
    token: 'semantic.color.text.secondary',
    cssVar: '--text-color-secondary',
    classes: { 'text-ink-muted': 'text-secondary' },
  },
  {
    old: 'tungsteno',
    token: 'semantic.color.accent',
    cssVar: '--color-accent',
    classes: {
      'bg-tungsteno': 'bg-accent',
      'fill-tungsteno': 'fill-accent',
      'accent-tungsteno': 'accent-accent',
      'text-tungsteno': 'text-accent',
    },
  },
  {
    old: 'tungsteno-hover',
    token: 'semantic.color.accent.hover',
    cssVar: '--color-accent-hover',
    classes: { 'bg-tungsteno-hover': 'bg-accent-hover' },
  },
  {
    old: 'tungsteno-text',
    token: 'semantic.color.text.accent',
    cssVar: '--text-color-accent',
    classes: { 'text-tungsteno-text': 'text-accent' },
  },
  {
    old: 'on-tungsteno',
    token: 'semantic.color.text.on-accent',
    cssVar: '--text-color-on-accent',
    classes: { 'text-on-tungsteno': 'text-on-accent' },
  },
  {
    old: 'tungsteno-soft',
    token: 'semantic.color.accent.subtle',
    cssVar: '--color-accent-subtle',
    classes: { 'bg-tungsteno-soft': 'bg-accent-subtle' },
  },
  {
    old: 'telon',
    token: 'semantic.color.sponsored',
    cssVar: '--color-sponsored',
    classes: { 'bg-telon': 'bg-sponsored' },
  },
  {
    old: 'on-telon',
    token: 'semantic.color.text.on-sponsored',
    cssVar: '--text-color-on-sponsored',
    classes: { 'text-on-telon': 'text-on-sponsored', 'border-on-telon': 'border-on-sponsored' },
    note: 'As an edge: semantic.color.border.on-sponsored.',
  },
  {
    old: 'plata',
    token: 'semantic.color.info',
    cssVar: '--color-info',
    classes: { 'text-plata': 'text-info' },
  },
  {
    old: 'plata-soft',
    token: 'semantic.color.info.subtle',
    cssVar: '--color-info-subtle',
    classes: { 'bg-plata-soft': 'bg-info-subtle' },
  },
  { old: 'danger', token: 'semantic.color.danger', cssVar: '--color-danger' },

  // Type
  {
    old: 'poster',
    token: 'component.poster.title',
    cssVar: '--text-poster-title',
    classes: { 'text-poster': 'text-poster-title' },
  },
  {
    old: 'credit',
    token: 'component.poster.credit',
    cssVar: '--text-poster-credit',
    classes: { 'text-credit': 'text-poster-credit' },
  },
  {
    old: 'button',
    token: 'component.button.label-md',
    cssVar: '--text-button-md',
    classes: { 'text-button': 'text-button-md' },
  },
  { old: 'button-sm', token: 'component.button.label-sm', cssVar: '--text-button-sm' },
  { old: 'button-lg', token: 'component.button.label-lg', cssVar: '--text-button-lg' },
  { old: 'card-title', token: 'component.short-card.title', cssVar: '--text-card-title' },
  { old: 'nav', token: 'component.site-header.link', cssVar: '--text-nav' },
  { old: 'rank', token: 'component.rank-number.single', cssVar: '--text-rank' },
  {
    old: 'rank-two',
    token: 'component.rank-number.double',
    cssVar: '--text-rank-double',
    classes: { 'text-rank-two': 'text-rank-double' },
  },

  // Radius
  {
    old: 'radius-hero',
    token: 'semantic.radius.lg',
    cssVar: '--radius-lg',
    classes: { 'rounded-hero': 'rounded-lg' },
  },
  {
    old: 'radius-panel',
    token: 'semantic.radius.md',
    cssVar: '--radius-md',
    classes: { 'rounded-panel': 'rounded-md' },
  },
  { old: 'radius-control', token: 'component.control.radius', cssVar: '--radius-control' },

  // Shadow
  {
    old: 'shadow-card',
    token: 'semantic.shadow.sm',
    cssVar: '--shadow-sm',
    classes: { 'shadow-card': 'shadow-sm' },
  },
  {
    old: 'shadow-hero',
    token: 'semantic.shadow.md',
    cssVar: '--shadow-md',
    classes: { 'shadow-hero': 'shadow-md' },
  },
  {
    old: 'shadow-hover',
    token: 'semantic.shadow.lg',
    cssVar: '--shadow-lg',
    classes: { 'shadow-hover': 'shadow-lg' },
  },

  // Size
  { old: 'control-sm', token: 'component.control.height-sm', cssVar: '--control-height-sm' },
  { old: 'control-md', token: 'component.control.height-md', cssVar: '--control-height-md' },
  { old: 'control-lg', token: 'component.control.height-lg', cssVar: '--control-height-lg' },
  {
    old: 'control-search',
    token: 'component.search-field.height',
    cssVar: '--search-field-height',
  },
  { old: 'chip', token: 'component.chip.height', cssVar: '--chip-height' },
  { old: 'badge', token: 'component.badge.height', cssVar: '--badge-height' },
  { old: 'card', token: 'component.short-card.width', cssVar: '--short-card-width' },
  {
    old: 'perforation',
    token: 'component.poster.perforation-width',
    cssVar: '--poster-perforation-width',
  },
  {
    old: 'perforation-hole',
    token: 'component.poster.perforation-hole',
    cssVar: '--poster-perforation-hole',
  },
  { old: 'tooltip-arrow', token: 'component.tooltip.arrow-size', cssVar: '--tooltip-arrow-size' },
  { old: 'lift', token: 'component.poster.lift', cssVar: '--poster-lift' },
  { old: 'press', token: 'component.control.press-offset', cssVar: '--control-press-offset' },
  {
    old: 'progress',
    token: 'component.short-card.progress-height',
    cssVar: '--short-card-progress-height',
  },
  { old: 'hero', token: 'component.short-hero.min-height', cssVar: '--short-hero-min-height' },
  { old: 'page-glow', token: 'component.page-glow.height', cssVar: '--page-glow-height' },
  { old: 'header', token: 'component.site-header.height', cssVar: '--site-header-height' },
  { old: 'rank-overlap', token: 'component.ranked-rail.overlap', cssVar: '--ranked-rail-overlap' },

  // Container
  {
    old: 'note',
    token: 'semantic.container.narrow',
    cssVar: '--container-narrow',
    classes: { 'max-w-note': 'max-w-narrow' },
  },
  { old: 'email', token: 'component.email.max-width', cssVar: '--email-max-width' },
  { old: 'search', token: 'component.search-field.max-width', cssVar: '--container-search' },
  { old: 'dialog', token: 'component.dialog.max-width', cssVar: '--container-dialog' },
  { old: 'landing', token: 'component.landing.max-width', cssVar: '--container-landing' },
  {
    old: 'hero-poster',
    token: 'component.short-hero.poster-width',
    cssVar: '--container-hero-poster',
  },
  {
    old: 'player-text',
    token: 'component.player-gate.text-width',
    cssVar: '--container-player-text',
  },

  // Motion
  { old: 'duration-press', token: 'semantic.duration.fast', cssVar: '--duration-fast' },
  {
    old: 'duration-lift',
    token: 'component.poster.lift-duration',
    cssVar: '--poster-lift-duration',
  },
  {
    old: 'delay-preview',
    token: 'component.short-preview.delay-open',
    cssVar: '--short-preview-delay-open',
  },
  {
    old: 'delay-preview-close',
    token: 'component.short-preview.delay-close',
    cssVar: '--short-preview-delay-close',
  },
  {
    old: 'duration-preview',
    token: 'component.short-preview.duration',
    cssVar: '--short-preview-duration',
  },
  { old: 'layer-preview', token: 'component.short-preview.layer', cssVar: '--short-preview-layer' },
  {
    old: 'duration-header',
    token: 'component.site-header.duration',
    cssVar: '--site-header-duration',
  },
  {
    old: 'duration-pill',
    token: 'component.rating-pill.duration',
    cssVar: '--rating-pill-duration',
  },
  {
    old: 'scale-pill-folded',
    token: 'component.rating-pill.scale-folded',
    cssVar: '--rating-pill-scale-folded',
  },

  // Opacity and blur
  {
    old: 'opacity-perforation',
    token: 'component.poster.perforation-opacity',
    cssVar: '--opacity-perforation',
  },
  { old: 'opacity-pill', token: 'component.rating-pill.opacity', cssVar: '--rating-pill-opacity' },
  { old: 'opacity-veil', token: 'semantic.opacity.translucent', cssVar: '--opacity-translucent' },
  {
    old: 'opacity-veil-hover',
    token: 'semantic.opacity.translucent-hover',
    cssVar: '--opacity-translucent-hover',
  },
  {
    old: 'blur-veil',
    token: 'semantic.blur.translucent',
    cssVar: '--blur-translucent',
    classes: { 'backdrop-blur-veil': 'backdrop-blur-translucent' },
  },
]

/** Old CSS variable → new CSS variable (only the ones that changed). */
export const VARIABLES: Record<string, string> = {
  '--color-sala-0': '--background-color-canvas',
  '--color-sala-1': '--background-color-raised',
  '--color-sala-2': '--background-color-muted',
  '--color-line': '--border-color-subtle',
  '--color-line-strong': '--border-color-strong',
  '--color-veil': '--background-color-translucent',
  '--color-ink': '--text-color-primary',
  '--color-ink-inverse': '--text-color-inverse',
  '--color-ink-muted': '--text-color-secondary',
  '--color-tungsteno': '--color-accent',
  '--color-tungsteno-hover': '--color-accent-hover',
  '--color-tungsteno-text': '--text-color-accent',
  '--color-on-tungsteno': '--text-color-on-accent',
  '--color-tungsteno-soft': '--color-accent-subtle',
  '--color-telon': '--color-sponsored',
  '--color-on-telon': '--text-color-on-sponsored',
  '--color-plata': '--color-info',
  '--color-plata-soft': '--color-info-subtle',
  '--text-poster': '--text-poster-title',
  '--text-credit': '--text-poster-credit',
  '--text-button': '--text-button-md',
  '--text-rank-two': '--text-rank-double',
  '--radius-hero': '--radius-lg',
  '--radius-panel': '--radius-md',
  '--shadow-card': '--shadow-sm',
  '--shadow-hero': '--shadow-md',
  '--shadow-hover': '--shadow-lg',
  '--size-control-sm': '--control-height-sm',
  '--size-control-md': '--control-height-md',
  '--size-control-lg': '--control-height-lg',
  '--size-control-search': '--search-field-height',
  '--size-chip': '--chip-height',
  '--size-badge': '--badge-height',
  '--size-card': '--short-card-width',
  '--size-perforation': '--poster-perforation-width',
  '--size-perforation-hole': '--poster-perforation-hole',
  '--size-tooltip-arrow': '--tooltip-arrow-size',
  '--size-lift': '--poster-lift',
  '--size-press': '--control-press-offset',
  '--size-progress': '--short-card-progress-height',
  '--size-hero': '--short-hero-min-height',
  '--size-page-glow': '--page-glow-height',
  '--size-header': '--site-header-height',
  '--size-rank-overlap': '--ranked-rail-overlap',
  '--container-note': '--container-narrow',
  '--container-email': '--email-max-width',
  '--duration-press': '--duration-fast',
  '--duration-lift': '--poster-lift-duration',
  '--delay-preview': '--short-preview-delay-open',
  '--delay-preview-close': '--short-preview-delay-close',
  '--duration-preview': '--short-preview-duration',
  '--layer-preview': '--short-preview-layer',
  '--duration-header': '--site-header-duration',
  '--duration-pill': '--rating-pill-duration',
  '--scale-pill-folded': '--rating-pill-scale-folded',
  '--opacity-pill': '--rating-pill-opacity',
  '--opacity-veil': '--opacity-translucent',
  '--opacity-veil-hover': '--opacity-translucent-hover',
  '--blur-veil': '--blur-translucent',
}

/** Old key of `palettes.dark` / `palettes.light` → new key. */
export const PALETTE_KEYS: Record<string, string> = {
  'sala-0': 'background-canvas',
  'sala-1': 'background-raised',
  'sala-2': 'background-muted',
  line: 'border-subtle',
  'line-strong': 'border-strong',
  veil: 'background-translucent',
  ink: 'text-primary',
  'ink-inverse': 'text-inverse',
  'ink-muted': 'text-secondary',
  tungsteno: 'accent',
  'tungsteno-hover': 'accent-hover',
  'tungsteno-text': 'text-accent',
  'on-tungsteno': 'text-on-accent',
  'tungsteno-soft': 'accent-subtle',
  telon: 'sponsored',
  'on-telon': 'text-on-sponsored',
  plata: 'info',
  'plata-soft': 'info-subtle',
  'shadow-card': 'shadow-sm',
  'shadow-hero': 'shadow-md',
  'shadow-hover': 'shadow-lg',
  'focus-ring': 'shadow-focus-ring',
}

const RADIUS_SIDES = ['t', 'b', 'l', 'r', 's', 'e', 'tl', 'tr', 'bl', 'br', 'ss', 'se', 'es', 'ee']
const BORDER_SIDES = ['t', 'b', 'l', 'r', 'x', 'y', 's', 'e']

/** The same rename for one side or corner: `rounded-t-panel`, `border-b-line`. */
function sides(from: string, to: string): [string, string][] {
  const [utility, sideList] = from.startsWith('rounded-')
    ? ['rounded', RADIUS_SIDES]
    : from.startsWith('border-')
      ? ['border', BORDER_SIDES]
      : ['', []]
  if (!utility || to.includes('(')) return []
  const strip = (name: string) => name.slice(utility.length + 1)
  return sideList.map((side): [string, string] => [
    `${utility}-${side}-${strip(from)}`,
    `${utility}-${side}-${strip(to)}`,
  ])
}

/** Old class → new class, longest first so `border-line-strong` is replaced before `border-line`. */
export const CLASSES: [string, string][] = RENAMES.flatMap((r) => Object.entries(r.classes ?? {}))
  .flatMap(([from, to]): [string, string][] => [[from, to], ...sides(from, to)])
  .sort((a, b) => b[0].length - a[0].length)
