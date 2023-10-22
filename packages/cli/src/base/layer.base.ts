import { fromFile } from 'hasha';
import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { spawn } from 'child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const RESOURCE_FOLDER = '.resources';
const CACHE_FILE_PATH = `${RESOURCE_FOLDER}/cache/index.json`;

const writeCacheFile = async (sha1: string, cached = {}) => {
  await writeFile(
    CACHE_FILE_PATH,
    JSON.stringify({
      ...cached,
      package: sha1,
    })
  );
};

const evaluateLocalDependencies = (dependencies: Record<string, string> = {}) => {
  if (Object.keys(dependencies).length === 0) {
    return {};
  }

  for (const name in dependencies) {
    const version = dependencies[name];

    if (version === '*') {
      const { 1: monorepoDependency } = name.split('/');
      dependencies[name] = `file:${join('../../../', 'packages', monorepoDependency)}`;
    }
  }

  return dependencies;
};

const preparePackageJson = async () => {
  const packageJson = JSON.parse(await readFile('./package.json', 'utf-8'));
  const dependencies = Object.keys(packageJson.dependencies || {});

  if (dependencies.length === 0) {
    return false;
  }

  delete packageJson.devDependencies;
  await writeFile(
    '.resources/package.json',
    JSON.stringify({
      ...packageJson,
      dependencies: evaluateLocalDependencies(packageJson.dependencies),
      workspaces: {
        nohoist: dependencies,
      },
    })
  );
  return true;
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

const buildLayer = async (sha1: string, cached = {}) => {
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

    await writeCacheFile(sha1, cached);
    const hasDependencies = await preparePackageJson();
    if (!hasDependencies) {
      return;
    }

    await installPackages();
    await rename('.resources/node_modules', '.resources/layers/nodejs');
  } catch (err) {
    // await removeResourceFolder();
    console.log('Process aborted, please check your dependencies and try again');
  }
};

export const generateLayer = async () => {
  const existFile = existsSync(CACHE_FILE_PATH);
  const packageSha1 = await fromFile('./package.json');
  if (!existFile) {
    await buildLayer(packageSha1);
    return;
  }

  const packagesInCache = JSON.parse(await readFile(CACHE_FILE_PATH, 'utf-8'));
  if (packagesInCache.package === packageSha1) {
    return;
  }
  await buildLayer(packageSha1, packagesInCache);
};
