import { readFile, writeFile, rename } from 'node:fs/promises';
import { glob } from 'glob';
import { dirname, join } from 'node:path';

const getResourceFile = (resource: string, file: string) => {
  const [fileName, className] = resource.split('.');
  const requiredRegex = new RegExp(`const ${fileName}.?=.?require\(.+\)`);

  const requiredFile = file.match(requiredRegex);

  return {
    className,
    path: requiredFile?.[1].replace(/(\(|\)|"|"|;)/g, '') || '',
  };
};

export const changeImport = (stackContent: string, oldName: string, newName: string) => {
  return stackContent.replace(`require("${oldName}`, `require("${newName}`);
};

export const renameDotFile = async (
  stackContent: string,
  filePath: string,
  importPath: string
) => {
  const hasDots = filePath.indexOf('.');
  if (hasDots === -1) {
    return;
  }

  const newFileName = `./${filePath.replaceAll('.', '-').replace('-js', '.js')}`;

  await rename(filePath, newFileName);
  return changeImport(
    stackContent,
    importPath,
    importPath.replaceAll('.', '-').replace('-', '.')
  );
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

  await writeFile(
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

    let newContent = content;

    const resourceList = list.replaceAll(' ', '').split(',');
    for (const resource of resourceList) {
      const { path, className } = getResourceFile(resource, content) || '';

      const filePath = join(dirname(file), `${path}.js`);
      await addExportMethodInFile(filePath, className);
      const renameResponse = await renameDotFile(newContent, filePath, path);
      if (renameResponse) {
        newContent = renameResponse;
      }
    }

    if (content !== newContent) {
      await writeFile(file, newContent);
    }
  }
};
