import {
  CreateDependencies,
  CreateDependenciesContext,
  DependencyType,
  FileMap,
  RawProjectGraphDependency,
  validateDependency,
} from '@nx/devkit';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import {
  getGradleReport,
  invalidateGradleReportCache,
} from '../utils/get-gradle-report';
import { writeTargetsToCache } from './nodes';

export const createDependencies: CreateDependencies = async (
  _,
  context: CreateDependenciesContext
) => {
  const gradleFiles: string[] = findGradleFiles(context.filesToProcess);
  if (gradleFiles.length === 0) {
    return [];
  }

  const gradleDependenciesStart = performance.mark('gradleDependencies:start');
  const {
    gradleFileToGradleProjectMap,
    gradleProjectToProjectName,
    buildFileToDepsMap,
    projectNames,
  } = getGradleReport();
  const dependencies: Set<RawProjectGraphDependency> = new Set();

  for (const gradleFile of gradleFiles) {
    const gradleProject = gradleFileToGradleProjectMap.get(gradleFile);
    const projectName = gradleProjectToProjectName.get(gradleProject);
    const depsFile = buildFileToDepsMap.get(gradleFile);

    if (projectName && depsFile) {
      processGradleDependencies(
        depsFile,
        gradleProjectToProjectName,
        projectName,
        gradleFile,
        context,
        projectNames,
        dependencies
      );
    }
  }

  const gradleDependenciesEnd = performance.mark('gradleDependencies:end');
  performance.measure(
    'gradleDependencies',
    gradleDependenciesStart.name,
    gradleDependenciesEnd.name
  );

  writeTargetsToCache();
  if (dependencies.size > 0) {
    invalidateGradleReportCache();
  }
  return Array.from(dependencies);
};

const gradleConfigFileNames = new Set(['build.gradle', 'build.gradle.kts']);

function findGradleFiles(fileMap: FileMap): string[] {
  const gradleFiles: string[] = [];

  for (const [_, files] of Object.entries(fileMap.projectFileMap)) {
    for (const file of files) {
      if (gradleConfigFileNames.has(basename(file.file))) {
        gradleFiles.push(file.file);
      }
    }
  }

  return gradleFiles;
}

function processGradleDependencies(
  depsFile: string,
  gradleProjectToProjectName: Map<string, string>,
  sourceProjectName: string,
  gradleFile: string,
  context: CreateDependenciesContext,
  projectNames: Set<string>,
  dependencies: Set<RawProjectGraphDependency>
): Set<RawProjectGraphDependency> {
  const lines = readFileSync(depsFile).toString().split('\n');
  let inDeps = false;
  for (const line of lines) {
    if (
      line.startsWith('implementationDependenciesMetadata') ||
      line.startsWith('compileClasspath')
    ) {
      inDeps = true;
      continue;
    }

    if (inDeps) {
      if (line === '') {
        inDeps = false;
        continue;
      }
      const [indents, dep] = line.split('--- ');
      if (indents === '\\' || indents === '+') {
        if (dep.startsWith('project ')) {
          const gradleProjectName = dep
            .substring('project '.length)
            .replace(/ \(n\)$/, '')
            .trim();
          const target = gradleProjectToProjectName.get(
            gradleProjectName
          ) as string;
          const dependency: RawProjectGraphDependency = {
            source: sourceProjectName,
            target,
            type: DependencyType.static,
            sourceFile: gradleFile,
          };
          validateDependency(dependency, context);
          dependencies.add(dependency);
        } else if (dep.includes(':')) {
          const [_, projectName] = dep.split(':');
          if (projectNames.has(projectName)) {
            const dependency: RawProjectGraphDependency = {
              source: sourceProjectName,
              target: projectName,
              type: DependencyType.static,
              sourceFile: gradleFile,
            };
            validateDependency(dependency, context);
            dependencies.add(dependency);
          }
        }
      }
    }
  }
  return dependencies;
}
