/**
 * The public API of @fenaki/ui, by atomic level (packages/ui/README.md explains the levels).
 * Every component keeps its name here wherever its file lives.
 */

// Foundations: icons, brand marks and helpers.
export { Icon, type IconName, type IconProps } from './foundations/Icon.tsx'
export { Monogram, type MonogramProps } from './foundations/Monogram.tsx'
export { TmdbLogo, type TmdbLogoProps } from './foundations/TmdbLogo.tsx'
export { Wordmark, type WordmarkProps } from './foundations/Wordmark.tsx'
export { stillTextClass, type StillTextColor } from './foundations/stillText.ts'

// Atoms: the smallest working parts.
export { Badge, type BadgeProps, type BadgeTone } from './atoms/Badge.tsx'
export { Button, type ButtonProps } from './atoms/Button.tsx'
export { Duration, type DurationProps } from './atoms/Duration.tsx'
export { IconButton, type IconButtonProps } from './atoms/IconButton.tsx'
export { Poster, type PosterProps, type PosterTone } from './atoms/Poster.tsx'
export { Prose, type ProseProps } from './atoms/Prose.tsx'
export { RankNumber, type RankNumberProps } from './atoms/RankNumber.tsx'
export { SearchField, type SearchFieldProps } from './atoms/SearchField.tsx'
export { Tooltip, type TooltipProps } from './atoms/Tooltip.tsx'

// Molecules: a few atoms working as one unit.
export { Checkbox, type CheckboxProps } from './molecules/Checkbox.tsx'
export { FacetGroup, type FacetGroupProps, type FacetOption } from './molecules/FacetGroup.tsx'
export { FilterChips, type FilterChipsProps } from './molecules/FilterChips.tsx'
export { TopicCard, type TopicCardProps } from './molecules/TopicCard.tsx'
export { SelectField, type SelectFieldProps } from './molecules/SelectField.tsx'
export { SubmissionItem, type SubmissionItemProps } from './molecules/SubmissionItem.tsx'
export {
  FilterMenu,
  FilterOptions,
  type FilterMenuProps,
  type FilterOptionsProps,
} from './molecules/FilterMenu.tsx'
export {
  ActiveFilters,
  type ActiveFilter,
  type ActiveFiltersProps,
} from './molecules/ActiveFilters.tsx'
export { LicenseNote, type LicenseNoteProps, type LicenseRoute } from './molecules/LicenseNote.tsx'
export { Notice, type NoticeProps, type NoticeTone } from './molecules/Notice.tsx'
export { OfferCard, type OfferCardProps } from './molecules/OfferCard.tsx'
export { LabelledIconButton } from './molecules/LabelledIconButton.tsx'
export { PageHeader, type PageHeaderProps } from './molecules/PageHeader.tsx'
export { Pagination, type PaginationProps } from './molecules/Pagination.tsx'
export { RatingButtons, type Rating, type RatingButtonsProps } from './molecules/RatingButtons.tsx'
export { ShortCard, type ShortCardProps } from './molecules/ShortCard.tsx'
export { SponsorCredit, type SponsorCreditProps } from './molecules/SponsorCredit.tsx'
export { TextField, type TextFieldProps } from './molecules/TextField.tsx'

// Organisms: whole sections of a page.
export { CollectionHero, type CollectionHeroProps } from './organisms/CollectionHero.tsx'
export { Dialog, type DialogProps } from './organisms/Dialog.tsx'
export { PlayerGate, type PlayerGateProps } from './organisms/PlayerGate.tsx'
export { Rail, type RailProps } from './organisms/Rail.tsx'
export { RankedItem, RankedRail, type RankedItemProps } from './organisms/RankedRail.tsx'
export { ShareButton, type ShareButtonProps, type ShareTarget } from './organisms/ShareButton.tsx'
export { ShortGrid, type ShortGridProps } from './organisms/ShortGrid.tsx'
export { FilterBar, type FilterBarGroup, type FilterBarProps } from './organisms/FilterBar.tsx'
export { ShortHero, type ShortHeroProps } from './organisms/ShortHero.tsx'
export { ShortPreview, type ShortPreviewProps } from './organisms/ShortPreview.tsx'
export { ShowcaseHero, type ShowcaseHeroProps } from './organisms/ShowcaseHero.tsx'
export { SiteFooter, type SiteFooterProps } from './organisms/SiteFooter.tsx'
export {
  SiteHeader,
  type SiteHeaderAccount,
  type SiteHeaderProps,
} from './organisms/SiteHeader.tsx'
