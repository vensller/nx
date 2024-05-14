import { CommandModule } from 'yargs';

export type ResetCommandOptions = {
  all?: boolean;
  cache?: boolean;
  daemon?: boolean;
  workspaceData?: boolean;
};

export const yargsResetCommand: CommandModule<
  Record<string, unknown>,
  ResetCommandOptions
> = {
  command: 'reset',
  describe:
    'Clears cached Nx artifacts and metadata about the workspace and shuts down the Nx Daemon.',
  aliases: ['clear-cache'],
  builder: (yargs) =>
    yargs
      .option('all', {
        description:
          'Clears all the cached Nx artifacts and metadata about the workspace and shuts down the Nx Daemon.',
        type: 'boolean',
      })
      .option('cache', {
        description:
          'Clears the Nx Cache directory. This will remove all local cache entries for tasks, but will not affect the remote cache.',
        type: 'boolean',
        default: false,
      })
      .option('daemon', {
        description: 'Stops the Nx Daemon to reset its internal state.',
        type: 'boolean',
        default: true,
      })
      .option('workspaceData', {
        description:
          'Clears the workspace data directory. Used by Nx to store cached data about the current workspace (e.g. project graph construction, etc)',
        type: 'boolean',
        default: true,
      })
      .check((argv) => {
        if (argv.all) {
          argv.cache = true;
          argv.daemon = true;
          argv.workspaceData = true;
        }
        return true;
      }),
  handler: async (argv) => (await import('./reset')).resetHandler(argv),
};
