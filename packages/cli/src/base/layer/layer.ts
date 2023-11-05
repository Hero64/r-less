import { fromFile } from 'hasha';
import { readFile, writeFile, mkdir, rename, rm, stat, readdir } from 'node:fs/promises';
import { spawn } from 'child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { WriteCacheProps } from './types';

const RESOURCE_FOLDER = '.resources';
const CACHE_FILE_PATH = `${RESOURCE_FOLDER}/cache/index.json`;

const writeCacheFile = async (
  current: WriteCacheProps,
  previous: WriteCacheProps = {}
) => {
  await writeFile(
    CACHE_FILE_PATH,
    JSON.stringify({
      ...previous,
      ...current,
    })
  );
};

const evaluateLocalDependencies = (dependencies: Record<string, string> = {}) => {
  const localDependencies: Record<string, string> = {};

  for (const name in dependencies) {
    const version = dependencies[name];

    if (version !== '*') {
      continue;
    }
    const { 1: monorepoDependency } = name.split('/');
    const packageFolder = join(process.cwd(), '../../', 'packages', monorepoDependency);
    localDependencies[name] = packageFolder;
    dependencies[name] = `file:${packageFolder}`;
  }

  return {
    dependencies,
    localDependencies,
  };
};

const getLastUpdatedFromFolder = async (folder: string) => {
  const files = await readdir(folder);
  let lastedUpdatedFile: Date = new Date('2000-01-01');
  for (const file of files) {
    const path = join(folder, file);
    const statFile = await stat(path);
    let time = statFile.mtime;
    if (statFile.isDirectory()) {
      time = await getLastUpdatedFromFolder(path);
    }

    if (time.getTime() > lastedUpdatedFile.getTime()) {
      lastedUpdatedFile = time;
    }
  }

  return lastedUpdatedFile;
};

const getLastUpdatedFormDependencies = async (
  localDependencies: Record<string, string>
) => {
  const dependenciesDate: Record<string, string> = {};

  for (const name in localDependencies) {
    dependenciesDate[name] = (
      await getLastUpdatedFromFolder(localDependencies[name])
    ).toString();
  }

  return dependenciesDate;
};

const preparePackageJson = async () => {
  const packageJson = JSON.parse(await readFile('./package.json', 'utf-8'));
  const dependencies = Object.keys(packageJson.dependencies || {});

  if (dependencies.length === 0) {
    return {
      hasDependencies: false,
      localDependencies: {},
    };
  }

  delete packageJson.devDependencies;

  const { dependencies: parsedDependencies, localDependencies } =
    evaluateLocalDependencies(packageJson.dependencies);

  await writeFile(
    '.resources/package.json',
    JSON.stringify({
      ...packageJson,
      dependencies: parsedDependencies,
      workspaces: {
        nohoist: dependencies,
      },
    })
  );

  return {
    hasDependencies: true,
    localDependencies: localDependencies,
  };
};

const installPackages = async () => {
  const command = spawn('yarn', ['--cwd', '.resources', '--prod', 'install']);
  return new Promise((resolve, reject) => {
    command.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
      reject(data);
    });
    command.stdout.on('close', () => {
      resolve(true);
    });
  });
};

const removeResourceFolder = async () => {
  if (existsSync(RESOURCE_FOLDER)) {
    rm(RESOURCE_FOLDER, {
      recursive: true,
      force: true,
    });
  }
};

const buildLayer = async (packageJsonSha1: string, cached: WriteCacheProps = {}) => {
  try {
    await rm('.resources/layers/nodejs', {
      recursive: true,
      force: true,
    });
    await Promise.all([
      mkdir('.resources/layers/nodejs', {
        recursive: true,
      }),
      mkdir('.resources/cache', { recursive: true }),
    ]);

    const { hasDependencies, localDependencies } = await preparePackageJson();
    await writeCacheFile(
      {
        package: packageJsonSha1,
        dependencies: await getLastUpdatedFormDependencies(localDependencies),
      },
      cached
    );

    if (!hasDependencies) {
      return;
    }

    await installPackages();
    await rename('.resources/node_modules', '.resources/layers/nodejs');
  } catch (err) {
    console.error(err);
    await removeResourceFolder();
    console.warn('Process aborted, please check your dependencies and try again');
  }
};

export const generateLayer = async () => {
  const existFile = existsSync(CACHE_FILE_PATH);
  const packageSha1 = await fromFile('./package.json');

  if (!existFile) {
    await buildLayer(packageSha1);
    return;
  }

  const packagesInCache: WriteCacheProps = JSON.parse(
    await readFile(CACHE_FILE_PATH, 'utf-8')
  );

  let hasChangesInLocalDependencies = false;
  if (Object.keys(packagesInCache.dependencies || {}).length > 0) {
    const packageJson = JSON.parse(await readFile('./package.json', 'utf-8'));
    const { localDependencies } = evaluateLocalDependencies(packageJson.dependencies);
    const updatedDependencies = await getLastUpdatedFormDependencies(localDependencies);
    hasChangesInLocalDependencies =
      JSON.stringify(packagesInCache.dependencies) !==
      JSON.stringify(updatedDependencies);
  }

  if (packagesInCache.package === packageSha1 && !hasChangesInLocalDependencies) {
    return;
  }
  await buildLayer(packageSha1, packagesInCache);
};
