#!/usr/bin/env node
import { program } from 'commander';
import { createSpinner } from 'nanospinner';

import { getStackFiles } from './base/export';

program
  .command('prepare')
  .description('Build and deploy project')
  .action(async () => {
    const spinner = createSpinner('Generating Layers');
    try {
      spinner.start();

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

// TODO: implements a clean

program.parse();
