import * as migration_20261025_113022_initial from './20261025_113022_initial';
import * as migration_20261025_115917_waitlist_purge_task from './20261025_115917_waitlist_purge_task';
import * as migration_20261025_123044_official_channel_and_review from './20261025_123044_official_channel_and_review';
import * as migration_20261025_123953_embed_check_task from './20261025_123953_embed_check_task';
import * as migration_20261025_124459_showcases from './20261025_124459_showcases';
import * as migration_20261025_175727_crm from './20261025_175727_crm';
import * as migration_20261025_183142_distributor_type from './20261025_183142_distributor_type';
import * as migration_20261025_223519_stills from './20261025_223519_stills';
import * as migration_20261025_231009_still_card_size from './20261025_231009_still_card_size';
import * as migration_20261025_233011_ranking_global from './20261025_233011_ranking_global';
import * as migration_20261026_002047_still_text_presentation from './20261026_002047_still_text_presentation';
import * as migration_20261026_003244_home_page from './20261026_003244_home_page';
import * as migration_20261026_012129_short_awards from './20261026_012129_short_awards';
import * as migration_20261026_015039_accounts from './20261026_015039_accounts';
import * as migration_20261027_081705_channels from './20261027_081705_channels';
import * as migration_20261027_095840_crm_rights from './20261027_095840_crm_rights';
import * as migration_20261027_111231_ledger_and_languages from './20261027_111231_ledger_and_languages';
import * as migration_20261027_112208_ai_review from './20261027_112208_ai_review';
import * as migration_20261027_174600_channel_min_duration from './20261027_174600_channel_min_duration';
import * as migration_20261027_183754_license_platform_terms_nc from './20261027_183754_license_platform_terms_nc';

export const migrations = [
  {
    up: migration_20261025_113022_initial.up,
    down: migration_20261025_113022_initial.down,
    name: '20261025_113022_initial',
  },
  {
    up: migration_20261025_115917_waitlist_purge_task.up,
    down: migration_20261025_115917_waitlist_purge_task.down,
    name: '20261025_115917_waitlist_purge_task',
  },
  {
    up: migration_20261025_123044_official_channel_and_review.up,
    down: migration_20261025_123044_official_channel_and_review.down,
    name: '20261025_123044_official_channel_and_review',
  },
  {
    up: migration_20261025_123953_embed_check_task.up,
    down: migration_20261025_123953_embed_check_task.down,
    name: '20261025_123953_embed_check_task',
  },
  {
    up: migration_20261025_124459_showcases.up,
    down: migration_20261025_124459_showcases.down,
    name: '20261025_124459_showcases',
  },
  {
    up: migration_20261025_175727_crm.up,
    down: migration_20261025_175727_crm.down,
    name: '20261025_175727_crm',
  },
  {
    up: migration_20261025_183142_distributor_type.up,
    down: migration_20261025_183142_distributor_type.down,
    name: '20261025_183142_distributor_type',
  },
  {
    up: migration_20261025_223519_stills.up,
    down: migration_20261025_223519_stills.down,
    name: '20261025_223519_stills',
  },
  {
    up: migration_20261025_231009_still_card_size.up,
    down: migration_20261025_231009_still_card_size.down,
    name: '20261025_231009_still_card_size',
  },
  {
    up: migration_20261025_233011_ranking_global.up,
    down: migration_20261025_233011_ranking_global.down,
    name: '20261025_233011_ranking_global',
  },
  {
    up: migration_20261026_002047_still_text_presentation.up,
    down: migration_20261026_002047_still_text_presentation.down,
    name: '20261026_002047_still_text_presentation',
  },
  {
    up: migration_20261026_003244_home_page.up,
    down: migration_20261026_003244_home_page.down,
    name: '20261026_003244_home_page',
  },
  {
    up: migration_20261026_012129_short_awards.up,
    down: migration_20261026_012129_short_awards.down,
    name: '20261026_012129_short_awards',
  },
  {
    up: migration_20261026_015039_accounts.up,
    down: migration_20261026_015039_accounts.down,
    name: '20261026_015039_accounts',
  },
  {
    up: migration_20261027_081705_channels.up,
    down: migration_20261027_081705_channels.down,
    name: '20261027_081705_channels',
  },
  {
    up: migration_20261027_095840_crm_rights.up,
    down: migration_20261027_095840_crm_rights.down,
    name: '20261027_095840_crm_rights',
  },
  {
    up: migration_20261027_111231_ledger_and_languages.up,
    down: migration_20261027_111231_ledger_and_languages.down,
    name: '20261027_111231_ledger_and_languages',
  },
  {
    up: migration_20261027_112208_ai_review.up,
    down: migration_20261027_112208_ai_review.down,
    name: '20261027_112208_ai_review',
  },
  {
    up: migration_20261027_174600_channel_min_duration.up,
    down: migration_20261027_174600_channel_min_duration.down,
    name: '20261027_174600_channel_min_duration',
  },
  {
    up: migration_20261027_183754_license_platform_terms_nc.up,
    down: migration_20261027_183754_license_platform_terms_nc.down,
    name: '20261027_183754_license_platform_terms_nc'
  },
];
