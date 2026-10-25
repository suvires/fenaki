import * as migration_20261025_113022_initial from './20261025_113022_initial';
import * as migration_20261025_115917_waitlist_purge_task from './20261025_115917_waitlist_purge_task';
import * as migration_20261025_123044_official_channel_and_review from './20261025_123044_official_channel_and_review';

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
    name: '20261025_123044_official_channel_and_review'
  },
];
