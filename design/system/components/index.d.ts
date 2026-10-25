import type * as React from 'react';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'ghost'; size?: 'md' | 'lg'; icon?: 'play' | 'plus' | 'search' | 'arrow'; href?: string; children: React.ReactNode }
export declare function Button(props: ButtonProps): React.ReactElement;
export interface BadgeProps { tone?: 'neutral' | 'accent' | 'info'; children: React.ReactNode }
export declare function Badge(props: BadgeProps): React.ReactElement;
export interface DurationProps { seconds: number; locale?: string }
export declare function Duration(props: DurationProps): React.ReactElement;
export interface PosterProps { title: string; director?: string; year?: number; tone?: 'sala' | 'telon' | 'tungsteno' | 'plata' }
export declare function Poster(props: PosterProps): React.ReactElement;
export interface ShortCardProps { title: string; director?: string; year?: number; seconds?: number; locale?: string; tone?: PosterProps['tone']; href?: string; badges?: { label: string; tone?: BadgeProps['tone'] }[] }
export declare function ShortCard(props: ShortCardProps): React.ReactElement;
export interface RailProps { title: string; actionLabel?: string; actionHref?: string; children: React.ReactNode }
export declare function Rail(props: RailProps): React.ReactElement;
export interface FilterChipsProps { label: string; options: { value: string; label: string }[]; value?: string | null; defaultValue?: string | null; onChange?: (value: string | null) => void }
export declare function FilterChips(props: FilterChipsProps): React.ReactElement;
export interface SearchFieldProps { label: string; placeholder?: string; id?: string; defaultValue?: string }
export declare function SearchField(props: SearchFieldProps): React.ReactElement;
export interface SponsorCreditProps { label: string; name: string }
export declare function SponsorCredit(props: SponsorCreditProps): React.ReactElement;
export interface CollectionHeroProps { eyebrow: string; title: string; description: string; ctaLabel: string; ctaHref?: string; secondaryLabel?: string; sponsor?: SponsorCreditProps; posters?: PosterProps[] }
export declare function CollectionHero(props: CollectionHeroProps): React.ReactElement;
export interface LicenseNoteProps { route: 'embed' | 'open' | 'direct'; routeLabel: string; children: React.ReactNode }
export declare function LicenseNote(props: LicenseNoteProps): React.ReactElement;
export interface PlayerGateProps { title: string; message: string; playLabel: string; moreLabel?: string; moreHref?: string; loadedLabel: string }
export declare function PlayerGate(props: PlayerGateProps): React.ReactElement;
declare global { interface Window { Fenaki: { Button: typeof Button; Badge: typeof Badge; Duration: typeof Duration; Poster: typeof Poster; ShortCard: typeof ShortCard; Rail: typeof Rail; FilterChips: typeof FilterChips; SearchField: typeof SearchField; SponsorCredit: typeof SponsorCredit; CollectionHero: typeof CollectionHero; LicenseNote: typeof LicenseNote; PlayerGate: typeof PlayerGate } } }
