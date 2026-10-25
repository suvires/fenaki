import * as migration_20261025_113022_initial from './20261025_113022_initial';
import * as migration_20261025_115917_waitlist_purge_task from './20261025_115917_waitlist_purge_task';
import * as migration_20261025_123044_official_channel_and_review from './20261025_123044_official_channel_and_review';
import * as migration_20261025_123953_embed_check_task from './20261025_123953_embed_check_task';
import * as migration_20261025_124459_showcases from './20261025_124459_showcases';
import * as migration_20261025_175727_crm from './20261025_175727_crm';
import * as migration_20261025_183142_distributor_type from './20261025_183142_distributor_type';
import * as migration_20261025_223519_stills from './20261025_223519_stills';
import * as migration_20261025_231009_still_card_size from './20261025_231009_still_card_size';

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
    name: '20261025_231009_still_card_size'
  },
];
