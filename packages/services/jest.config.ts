import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  verbose: true,
  preset: 'jest-dynalite',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
};

export default config;
