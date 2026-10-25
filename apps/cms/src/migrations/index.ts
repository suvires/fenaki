import * as migration_20261025_113022_initial from './20261025_113022_initial';
import * as migration_20261025_115917_waitlist_purge_task from './20261025_115917_waitlist_purge_task';

export const migrations = [
  {
    up: migration_20261025_113022_initial.up,
    down: migration_20261025_113022_initial.down,
    name: '20261025_113022_initial',
  },
  {
    up: migration_20261025_115917_waitlist_purge_task.up,
    down: migration_20261025_115917_waitlist_purge_task.down,
    name: '20261025_115917_waitlist_purge_task'
  },
];
