import * as migration_20261025_113022_initial from './20261025_113022_initial';

export const migrations = [
  {
    up: migration_20261025_113022_initial.up,
    down: migration_20261025_113022_initial.down,
    name: '20261025_113022_initial'
  },
];
