import { rmSync } from 'fs-extra';
import { daemonClient } from '../../daemon/client/client';
import { cacheDir, workspaceDataDirectory } from '../../utils/cache-directory';
import { output } from '../../utils/output';
import { getNativeFileCacheLocation } from '../../native/native-file-cache-location';
import { ResetCommandOptions } from './command-object';

// Wait at max 5 seconds before giving up on a failing operation.
const INCREMENTAL_BACKOFF_MAX_DURATION = 5000;

// If an operation fails, wait 100ms before first retry.
const INCREMENTAL_BACKOFF_FIRST_DELAY = 100;

export async function resetHandler(args: ResetCommandOptions) {
  let errors = [];

  if (args.cache) {
    try {
      await cleanupCacheEntries();
    } catch {
      errors.push('Failed to clean up the cache directory.');
    }
  }
  if (args.daemon) {
    try {
      await killDaemon();
    } catch {
      errors.push('Failed to stop the Nx Daemon.');
    }
  }
  if (args.workspaceData) {
    try {
      await cleanupNativeFileCache();
      await cleanupWorkspaceData();
    } catch {
      errors.push('Failed to clean up the workspace data directory.');
    }
  }
  if (errors.length > 0) {
    output.error({
      title: 'Failed to reset the Nx workspace.',
      bodyLines: errors,
    });
    throw new Error();
  } else {
    output.success({
      title: 'Successfully reset the Nx workspace.',
    });
  }
}

async function killDaemon() {
  output.note({
    title: 'Stopping the Nx Daemon.',
  });
  try {
    await daemonClient.stop();
    output.success({
      title: 'Daemon Server - Stopped',
    });
  } catch (e) {
    output.error({
      title: 'Failed to stop the Nx Daemon.',
      bodyLines: e instanceof Error ? [e.message, e.stack] : [e],
    });
    throw e;
  }
}

async function cleanupCacheEntries() {
  output.note({
    title: 'Cleaning up the cache directory.',
    bodyLines: [`This might take a few minutes.`],
  });
  try {
    await incrementalBackoff(
      INCREMENTAL_BACKOFF_FIRST_DELAY,
      INCREMENTAL_BACKOFF_MAX_DURATION,
      () => {
        rmSync(cacheDir, { recursive: true, force: true });
      }
    );
    output.success({
      title: 'Successfully cleaned up the cache directory.',
    });
  } catch (e) {
    output.error({
      title: 'Failed to clean up the cache directory.',
      bodyLines: e instanceof Error ? [e.message, e.stack] : [e],
    });
    throw e;
  }
}

async function cleanupNativeFileCache() {
  try {
    await incrementalBackoff(
      INCREMENTAL_BACKOFF_FIRST_DELAY,
      INCREMENTAL_BACKOFF_MAX_DURATION,
      () => {
        rmSync(getNativeFileCacheLocation(), { recursive: true, force: true });
      }
    );
  } catch (e) {
    output.warn({
      title: 'Failed to remove the native file cache.',
      bodyLines: [
        'This is likely fine and can fail if another process is locking the file.',
      ],
    });
  }
}

async function cleanupWorkspaceData() {
  output.note({
    title: 'Cleaning up the workspace data directory.',
  });
  try {
    await incrementalBackoff(
      INCREMENTAL_BACKOFF_FIRST_DELAY,
      INCREMENTAL_BACKOFF_MAX_DURATION,
      () => {
        rmSync(workspaceDataDirectory, { recursive: true, force: true });
      }
    );
    output.success({
      title: 'Successfully cleaned up the workspace data directory.',
    });
  } catch (e) {
    output.error({
      title: 'Failed to clean up the workspace data directory.',
      bodyLines: e instanceof Error ? [e.message, e.stack] : [e],
    });
    throw e;
  }
}

async function incrementalBackoff(
  ms: number,
  maxDuration: number,
  callback: () => void
) {
  try {
    callback();
  } catch (e) {
    if (ms < maxDuration) {
      await sleep(ms);
      await incrementalBackoff(ms * 2, maxDuration, callback);
    } else {
      throw e;
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
