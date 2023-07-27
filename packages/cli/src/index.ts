#!/usr/bin/env node
import { program } from 'commander';
import { createSpinner } from 'nanospinner';

import { generateLayer } from './base/layer.base';
import { getStackFiles } from './base/export.base';

program
  .command('prepare')
  .description('Build and deploy project')
  .action(async () => {
    const spinner = createSpinner('Generating Layers');
    try {
      spinner.start();
      await generateLayer();
      spinner.update({
        text: 'Exporting resources',
      });
      await getStackFiles();
    } catch (e) {
      console.log(e);
    } finally {
      spinner.stop();
    }
  });

program.parse();
