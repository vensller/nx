import { createTree } from '../../generators/testing-utils/create-tree';
import moveGraphCacheDirectory from './move-graph-cache-directory';

describe('moveGraphCacheDirectory', () => {
  it("should not throw if .gitignore does't exist", () => {
    const tree = createTree();
    expect(() => moveGraphCacheDirectory(tree)).not.toThrow();
  });

  it("shouldn't change anything if gitignore doesn't include .nx/cache", () => {
    const tree = createTree();
    tree.write('.gitignore', 'dist');
    moveGraphCacheDirectory(tree);
    expect(tree.read('.gitignore', 'utf-8')).toBe('dist');
  });

  it('should add .nx/workspace-data to .gitignore if it includes .nx/cache', () => {
    const tree = createTree();
    tree.write(
      '.gitignore',
      ['# temporary files from Nx', '.nx/cache', '', 'dist'].join('\n')
    );
    moveGraphCacheDirectory(tree);
    expect(tree.read('.gitignore', 'utf-8')).toMatchInlineSnapshot(`
      "# temporary files from Nx
      .nx/cache
      .nx/workspace-data

      dist"
    `);
  });
});
