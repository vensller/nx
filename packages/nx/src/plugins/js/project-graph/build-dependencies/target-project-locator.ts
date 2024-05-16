import { readFileSync } from 'fs-extra';
import { builtinModules } from 'module';
import { dirname, join, posix, relative } from 'path';
import {
  ProjectGraphExternalNode,
  ProjectGraphProjectNode,
} from '../../../../config/project-graph';
import { parseJson } from '../../../../devkit-exports';
import {
  createProjectRootMappings,
  findProjectForPath,
} from '../../../../project-graph/utils/find-project-for-path';
import { isRelativePath, readJsonFile } from '../../../../utils/fileutils';
import { workspaceRoot } from '../../../../utils/workspace-root';
import { findExternalPackageJsonPath } from '../../utils/find-external-package-json-path';
import {
  getRootTsConfigFileName,
  resolveModuleByImport,
} from '../../utils/typescript';

const builtInModuleSet = new Set<string>([
  ...builtinModules,
  ...builtinModules.map((x) => `node:${x}`),
]);

export class TargetProjectLocator {
  private projectRootMappings = createProjectRootMappings(this.nodes);
  private npmProjects = Object.keys(this.externalNodes)
    .filter((k) => k.startsWith('npm:'))
    .map((k) => this.externalNodes[k]);
  private tsConfig = this.getRootTsConfig();
  private paths = this.tsConfig.config?.compilerOptions?.paths;
  private typescriptResolutionCache = new Map<string, string | null>();
  /**
   * The key is a combination of the package name and the project root importing it,
   * the value is the resolved external node name from the project graph.
   */
  private npmResolutionCache = new Map<string, string>();

  constructor(
    private readonly nodes: Record<string, ProjectGraphProjectNode>,
    private readonly externalNodes: Record<string, ProjectGraphExternalNode>
  ) {}

  /**
   * Find a project based on its import
   *
   * @param importExpr
   * @param projectRoot
   * @param filePath
   */
  findProjectWithImport(
    importExpr: string,
    projectRoot: string,
    filePath: string
  ): string {
    if (isRelativePath(importExpr)) {
      const resolvedModule = posix.join(dirname(filePath), importExpr);
      return this.findProjectOfResolvedModule(resolvedModule);
    }

    // find project using tsconfig paths
    const results = this.findPaths(importExpr);
    if (results) {
      const [path, paths] = results;
      for (let p of paths) {
        const r = p.endsWith('/*')
          ? join(dirname(p), relative(path.replace(/\*$/, ''), importExpr))
          : p;
        const maybeResolvedProject = this.findProjectOfResolvedModule(r);
        if (maybeResolvedProject) {
          return maybeResolvedProject;
        }
      }
    }

    if (builtInModuleSet.has(importExpr)) {
      this.npmResolutionCache.set(importExpr, null);
      return null;
    }

    // try to find npm package before using expensive typescript resolution
    const npmProject = this.findNpmPackage(importExpr, projectRoot);
    if (npmProject) {
      return npmProject;
    }

    if (this.tsConfig.config) {
      // TODO(meeroslav): this block is probably obsolete
      // and existed only because of the incomplete `paths` matching
      // if import cannot be matched using tsconfig `paths` the compilation would fail anyway
      const resolvedProject = this.resolveImportWithTypescript(
        importExpr,
        filePath
      );
      if (resolvedProject) {
        return resolvedProject;
      }
    }

    try {
      const resolvedModule = this.resolveImportWithRequire(
        importExpr,
        filePath
      );

      return this.findProjectOfResolvedModule(resolvedModule);
    } catch {}

    // nothing found, cache for later
    this.npmResolutionCache.set(importExpr, null);
    return null;
  }

  /**
   * Return file paths matching the import relative to the repo root
   * @param normalizedImportExpr
   * @returns
   */
  findPaths(normalizedImportExpr: string): string[] | undefined {
    if (!this.paths) {
      return undefined;
    }
    if (this.paths[normalizedImportExpr]) {
      return [normalizedImportExpr, this.paths[normalizedImportExpr]];
    }
    const wildcardPath = Object.keys(this.paths).find(
      (path) =>
        path.endsWith('/*') &&
        (normalizedImportExpr.startsWith(path.replace(/\*$/, '')) ||
          normalizedImportExpr === path.replace(/\/\*$/, ''))
    );
    if (wildcardPath) {
      return [wildcardPath, this.paths[wildcardPath]];
    }
    return undefined;
  }

  private resolveImportWithTypescript(
    normalizedImportExpr: string,
    filePath: string
  ): string | undefined {
    let resolvedModule: string;
    if (this.typescriptResolutionCache.has(normalizedImportExpr)) {
      resolvedModule = this.typescriptResolutionCache.get(normalizedImportExpr);
    } else {
      resolvedModule = resolveModuleByImport(
        normalizedImportExpr,
        filePath,
        this.tsConfig.absolutePath
      );
      this.typescriptResolutionCache.set(
        normalizedImportExpr,
        resolvedModule ? resolvedModule : null
      );
    }

    // TODO: vsavkin temporary workaround. Remove it once we reworking handling of npm packages.
    if (resolvedModule && resolvedModule.indexOf('node_modules/') === -1) {
      const resolvedProject = this.findProjectOfResolvedModule(resolvedModule);
      if (resolvedProject) {
        return resolvedProject;
      }
    }
    return;
  }

  private resolveImportWithRequire(
    normalizedImportExpr: string,
    filePath: string
  ) {
    return posix.relative(
      workspaceRoot,
      require.resolve(normalizedImportExpr, {
        paths: [dirname(filePath)],
      })
    );
  }

  private findNpmPackage(
    importExpr: string,
    projectRoot: string
  ): string | undefined {
    const packageName = this.parsePackageNameFromImportExpression(importExpr);

    const npmImportForProject = `${packageName}__${projectRoot}`;
    if (this.npmResolutionCache.has(npmImportForProject)) {
      return this.npmResolutionCache.get(npmImportForProject);
    }

    try {
      const fullProjectRootPath = join(workspaceRoot, projectRoot);
      // package.json refers to an external package, we do not match against the version found in there, we instead try and resolve the relevant package how node would
      const externalPackageJsonPath = findExternalPackageJsonPath(
        packageName,
        fullProjectRootPath
      );
      // The package.json path might be not be resolvable, e.g. if a reference has been added to the package.json, but the install command has not been run yet.
      if (!externalPackageJsonPath) {
        return undefined;
      }

      const externalPackageJson = parseJson(
        readFileSync(externalPackageJsonPath, 'utf-8')
      );

      // Find the matching external node based on the name and version
      const matchingExternalNode = this.npmProjects.find((pkg) => {
        return (
          pkg.data.packageName === externalPackageJson.name &&
          pkg.data.version === externalPackageJson.version
        );
      });
      if (!matchingExternalNode) {
        return undefined;
      }
      this.npmResolutionCache.set(
        npmImportForProject,
        matchingExternalNode.name
      );
      return matchingExternalNode.name;
    } catch (e) {
      if (process.env.NX_VERBOSE_LOGGING === 'true') {
        console.error(e);
      }
      return undefined;
    }
  }

  private findProjectOfResolvedModule(
    resolvedModule: string
  ): string | undefined {
    if (
      resolvedModule.startsWith('node_modules/') ||
      resolvedModule.includes('/node_modules/')
    ) {
      return undefined;
    }
    const normalizedResolvedModule = resolvedModule.startsWith('./')
      ? resolvedModule.substring(2)
      : resolvedModule;
    const importedProject = this.findMatchingProjectFiles(
      normalizedResolvedModule
    );
    return importedProject ? importedProject.name : void 0;
  }

  private getAbsolutePath(path: string) {
    return join(workspaceRoot, path);
  }

  private getRootTsConfig() {
    const path = getRootTsConfigFileName();
    if (!path) {
      return {
        path: null,
        absolutePath: null,
        config: null,
      };
    }

    const absolutePath = this.getAbsolutePath(path);
    return {
      absolutePath,
      path,
      config: readJsonFile(absolutePath),
    };
  }

  private findMatchingProjectFiles(file: string) {
    const project = findProjectForPath(file, this.projectRootMappings);
    return this.nodes[project];
  }

  private parsePackageNameFromImportExpression(
    importExpression: string
  ): string {
    // Check if the package is scoped
    if (importExpression.startsWith('@')) {
      // For scoped packages, the package name is up to the second '/'
      return importExpression.split('/').slice(0, 2).join('/');
    }
    // For unscoped packages, the package name is up to the first '/'
    return importExpression.split('/')[0];
  }
}
