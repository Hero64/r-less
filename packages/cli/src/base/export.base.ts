import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import { dirname, join } from 'path';

const getResourceFile = (resource: string, file: string) => {
  const [fileName, className] = resource.split('.');
  const requiredRegex = new RegExp(`const ${fileName}.?=.?require\(.+\)`);

  const requiredFile = file.match(requiredRegex);

  return {
    className,
    path: requiredFile?.[1].replace(/(\(|\)|"|"|;)/g, '') || '',
  };
};

const addExportMethodInFile = async (path: string, className: string) => {
  const content = await readFile(path, 'utf-8');
  const initialization = `${className.toLocaleLowerCase()}1`;

  const regexMethod = new RegExp(`${className}.prototype,.+["|'](.*)["|'],`, 'g');
  let exportMethods = ``;
  const methods = content.matchAll(regexMethod);
  for (const method of methods) {
    exportMethods += `
      exports.${method[1]} = ${initialization}.${method[1]};
    `;
  }

  writeFile(
    path,
    `
      ${content}
      const ${initialization} = new ${className}();
      ${exportMethods}
    `
  );
};

export const getStackFiles = async () => {
  const stackFiles = await glob('./dist/**/*.stack.js');

  for (const file of stackFiles) {
    const content = await readFile(file, 'utf-8');
    const resources = content.match(/resources:\s*\[(?:[^,\n]+(?:,\s*)?)*\]/);

    if (!resources) {
      continue;
    }

    const list = resources[0].match(/\[(.*)\]/)?.[1];

    if (!list) {
      continue;
    }

    const resourceList = list.replaceAll(' ', '').split(',');
    for (const resource of resourceList) {
      const { path, className } = getResourceFile(resource, content) || '';

      const filePath = join(dirname(file), `${path}.js`);
      addExportMethodInFile(filePath, className);
    }
  }
};
