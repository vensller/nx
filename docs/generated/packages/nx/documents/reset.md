---
title: 'reset - CLI command'
description: 'Clears cached Nx artifacts and metadata about the workspace and shuts down the Nx Daemon.'
---

# reset

Clears cached Nx artifacts and metadata about the workspace and shuts down the Nx Daemon.

## Usage

```shell
nx reset
```

Install `nx` globally to invoke the command directly using `nx`, or use `npx nx`, `yarn nx`, or `pnpm nx`.

### Examples

Clears the internal state of the daemon and metadata that Nx is tracking. Helpful if you are getting strange errors and want to start fresh:

```shell
 nx reset
```

Clears all the cached Nx artifacts and metadata about the workspace and shuts down the Nx Daemon:

```shell
 nx reset --all
```

Clears the Nx Cache directory. This will remove all local cache entries for tasks, but will not affect the remote cache:

```shell
 nx reset --cache
```

Stops the Nx Daemon to reset its internal state:

```shell
 nx reset --daemon
```

Clears the workspace data directory. Used by Nx to store cached data about the current workspace (e.g. project graph construction, etc):

```shell
 nx reset --workspace-data
```

## Options

### all

Type: `boolean`

Clears all the cached Nx artifacts and metadata about the workspace and shuts down the Nx Daemon.

### cache

Type: `boolean`

Default: `false`

Clears the Nx Cache directory. This will remove all local cache entries for tasks, but will not affect the remote cache.

### daemon

Type: `boolean`

Default: `true`

Stops the Nx Daemon to reset its internal state.

### help

Type: `boolean`

Show help

### version

Type: `boolean`

Show version number

### workspaceData

Type: `boolean`

Default: `true`

Clears the workspace data directory. Used by Nx to store cached data about the current workspace (e.g. project graph construction, etc)
