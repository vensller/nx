import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import * as glob from 'glob';

import { normalizePath, workspaceRoot } from '@nx/devkit';

import { execGradle } from './exec-gradle';

export const fileSeparator = process.platform.startsWith('win')
  ? 'file:///'
  : 'file://';

const newLineSeparator = process.platform.startsWith('win') ? '\r\n' : '\n';

export interface GradleReport {
  gradleFileToGradleProjectMap: Map<string, string>;
  buildFileToDepsMap: Map<string, string>;
  gradleFileToOutputDirsMap: Map<string, Map<string, string>>;
  gradleProjectToTasksTypeMap: Map<string, Map<string, string>>;
  gradleProjectToProjectName: Map<string, string>;
  settingsFileToProjectNameMap?: Map<string, string>;
  projectNames?: Set<string>;
}

let gradleReportCache: GradleReport;

export function invalidateGradleReportCache() {
  gradleReportCache = undefined;
}

export function getGradleReport(): GradleReport {
  if (gradleReportCache) {
    return gradleReportCache;
  }

  const gradleProjectReportStart = performance.mark(
    'gradleProjectReport:start'
  );

  const { projectReportLines, settingsFileToProjectNameMap, projectNames } =
    runProjectsForSettingsFiles();
  gradleReportCache = processProjectReports(projectReportLines);
  gradleReportCache = {
    ...gradleReportCache,
    settingsFileToProjectNameMap,
    projectNames,
  };

  const gradleProjectReportEnd = performance.mark('gradleProjectReport:end');
  performance.measure(
    'gradleProjectReport',
    gradleProjectReportStart.name,
    gradleProjectReportEnd.name
  );
  return gradleReportCache;
}

function runProjectsForSettingsFiles(): {
  projectReportLines: string[];
  settingsFileToProjectNameMap: Map<string, string>;
  projectNames: Set<string>;
} {
  const settingFiles: string[] = glob.sync('**/settings.{gradle.kts,gradle}');
  let projectReportLines = [];
  const settingsFileToProjectNameMap = new Map<string, string>();
  const projectNames = new Set<string>();
  settingFiles.forEach((settingFile) => {
    const settingDir = dirname(settingFile);
    try {
      projectReportLines = projectReportLines.concat(
        execGradle(['projectReport'], {
          cwd: settingDir,
        })
          .toString()
          .split(newLineSeparator)
      );
    } catch (e) {
      console.error(
        `Error running projectReport for ${settingDir}. Please make sure the projectReport task is available in your build script.`,
        e
      );
    }

    let projectsLines;
    try {
      projectsLines = execGradle(['projects'], {
        cwd: settingDir,
      })
        .toString()
        .split(newLineSeparator);
    } catch (e) {
      console.error(
        `Error running projects for ${settingDir}. Please make sure the projects task is available in your build script.`,
        e
      );
    }
    if (!projectsLines) {
      return;
    }
    const { projectName, compositeProjects } = processProjects(projectsLines);

    projectNames.add(projectName);
    compositeProjects.forEach((compositeProject) =>
      projectNames.add(compositeProject)
    );

    settingsFileToProjectNameMap.set(settingFile, projectName);
  });

  return {
    projectReportLines,
    settingsFileToProjectNameMap,
    projectNames,
  };
}

export function processProjectReports(
  projectReportLines: string[]
): GradleReport {
  /**
   * Map of Gradle File path to Gradle Project Name
   */
  const gradleFileToGradleProjectMap = new Map<string, string>();
  /**
   * Map of Gradle Project Name to Gradle File
   */
  const gradleProjectToGradleFileMap = new Map<string, string>();
  const dependenciesMap = new Map<string, string>();
  /**
   * Map of Gradle Build File to tasks type map
   */
  const gradleProjectToTasksTypeMap = new Map<string, Map<string, string>>();
  const gradleProjectToProjectName = new Map<string, string>();
  /**
   * Map of buildFile to dependencies report path
   */
  const buildFileToDepsMap = new Map<string, string>();
  /**
   * Map fo possible output files of each gradle file
   * e.g. {build.gradle.kts: { projectReportDir: '' testReportDir: '' }}
   */
  const gradleFileToOutputDirsMap = new Map<string, Map<string, string>>();

  let index = 0;
  while (index < projectReportLines.length) {
    const line = projectReportLines[index].trim();
    if (line.startsWith('> Task ')) {
      if (line.endsWith(':dependencyReport')) {
        const gradleProject = line.substring(
          '> Task '.length,
          line.length - ':dependencyReport'.length
        );
        while (
          index < projectReportLines.length &&
          !projectReportLines[index].includes(fileSeparator)
        ) {
          index++;
        }
        const [_, file] = projectReportLines[index].split(fileSeparator);
        dependenciesMap.set(gradleProject, file);
      }
      if (line.endsWith('propertyReport')) {
        const gradleProject = line.substring(
          '> Task '.length,
          line.length - ':propertyReport'.length
        );
        while (
          index < projectReportLines.length &&
          !projectReportLines[index].includes(fileSeparator)
        ) {
          index++;
        }
        const [_, file] = projectReportLines[index].split(fileSeparator);
        const propertyReportLines = existsSync(file)
          ? readFileSync(file).toString().split(newLineSeparator)
          : [];

        let projectName: string,
          absBuildFilePath: string,
          absBuildDirPath: string;
        const outputDirMap = new Map<string, string>();
        for (const line of propertyReportLines) {
          if (line.startsWith('name: ')) {
            projectName = line.substring('name: '.length);
          }
          if (line.startsWith('buildFile: ')) {
            absBuildFilePath = line.substring('buildFile: '.length);
          }
          if (line.startsWith('buildDir: ')) {
            absBuildDirPath = line.substring('buildDir: '.length);
          }
          if (line.includes('Dir: ')) {
            const [dirName, dirPath] = line.split(': ');
            const taskName = dirName.replace('Dir', '');
            outputDirMap.set(
              taskName,
              `{workspaceRoot}/${relative(workspaceRoot, dirPath)}`
            );
          }
        }

        if (!projectName || !absBuildFilePath || !absBuildDirPath) {
          continue;
        }
        const buildFile = normalizePath(
          relative(workspaceRoot, absBuildFilePath)
        );
        const buildDir = relative(workspaceRoot, absBuildDirPath);
        buildFileToDepsMap.set(
          buildFile,
          dependenciesMap.get(gradleProject) as string
        );

        outputDirMap.set('build', `{workspaceRoot}/${buildDir}`);
        outputDirMap.set(
          'classes',
          `{workspaceRoot}/${join(buildDir, 'classes')}`
        );

        gradleFileToOutputDirsMap.set(buildFile, outputDirMap);
        gradleFileToGradleProjectMap.set(buildFile, gradleProject);
        gradleProjectToGradleFileMap.set(gradleProject, buildFile);
        gradleProjectToProjectName.set(gradleProject, projectName);
      }
      if (line.endsWith('taskReport')) {
        const gradleProject = line.substring(
          '> Task '.length,
          line.length - ':taskReport'.length
        );
        while (
          index < projectReportLines.length &&
          !projectReportLines[index].includes(fileSeparator)
        ) {
          index++;
        }
        const [_, file] = projectReportLines[index].split(fileSeparator);
        const taskTypeMap = new Map<string, string>();
        const tasksFileLines = existsSync(file)
          ? readFileSync(file).toString().split(newLineSeparator)
          : [];

        let i = 0;
        while (i < tasksFileLines.length) {
          const line = tasksFileLines[i];

          if (line.endsWith('tasks')) {
            const dashes = new Array(line.length + 1).join('-');
            if (tasksFileLines[i + 1] === dashes) {
              const type = line.substring(0, line.length - ' tasks'.length);
              i++;
              while (tasksFileLines[++i] !== '') {
                const [taskName] = tasksFileLines[i].split(' - ');
                taskTypeMap.set(taskName, type);
              }
            }
          }
          i++;
        }
        gradleProjectToTasksTypeMap.set(gradleProject, taskTypeMap);
      }
    }
    index++;
  }

  return {
    gradleFileToGradleProjectMap,
    buildFileToDepsMap,
    gradleFileToOutputDirsMap,
    gradleProjectToTasksTypeMap,
    gradleProjectToProjectName,
  };
}

export function processProjects(projectsLines: string[]): {
  projectName: string;
  compositeProjects: string[];
} {
  let compositeProjects: string[] = [];
  let projectName: string;
  for (const line of projectsLines) {
    if (line.startsWith('Root project')) {
      projectName = line
        .substring('Root project '.length)
        .replaceAll("'", '')
        .trim();
      continue;
    }
    if (projectName) {
      const [indents, dep] = line.split('--- ');
      if (indents === '\\' || indents === '+') {
        let includedBuild;
        if (dep.startsWith('Included build ')) {
          includedBuild = dep.substring('Included build '.length);
        } else if (dep.startsWith('Project ')) {
          includedBuild = dep.substring('Project '.length);
        }
        includedBuild = includedBuild
          .replace(/ \(n\)$/, '')
          .replaceAll("'", '')
          .trim();
        includedBuild = includedBuild.startsWith(':')
          ? includedBuild.substring(1)
          : includedBuild;
        if (includedBuild) {
          compositeProjects.push(includedBuild);
        }
      }
    }
  }
  return {
    projectName,
    compositeProjects,
  };
}
