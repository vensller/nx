import { Tree } from '../../generators/tree';

export default async function moveGraphCacheDirectory(tree: Tree) {
  const gitignore = tree.read('.gitignore', 'utf-8');
  if (!gitignore) {
    return;
  }

  const includesNxWorkspaceData = gitignore.includes('.nx/workspace-data');
  if (includesNxWorkspaceData) {
    return;
  }

  const includesNxCache = gitignore.includes('.nx/cache');
  if (!includesNxCache) {
    return;
  }

  const updatedGitignore = gitignore.replace(
    '.nx/cache',
    ['.nx/cache', '.nx/workspace-data'].join('\n')
  );
  tree.write('.gitignore', updatedGitignore);
}
