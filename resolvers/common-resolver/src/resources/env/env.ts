import { parse } from 'dotenv';
import { aws_ssm, Stack } from 'aws-cdk-lib';

import { join } from 'node:path';
import { cwd } from 'node:process';
import { readFile } from 'node:fs/promises';
import { EnvironmentResource } from './env.types';

const SSM_PARSER = {
  'SSM::STRING': (scope: Stack, name: string, path: string) => {
    return aws_ssm.StringParameter.fromStringParameterAttributes(scope, `ssm_${name}`, {
      parameterName: path,
    }).stringValue;
  },
  'SSM::STRING_LIST': (scope: Stack, name: string, path: string) => {
    return aws_ssm.StringListParameter.fromListParameterAttributes(scope, `ssm_${name}`, {
      parameterName: path,
    }).stringListValue;
  },
  'SSM::SECURE_STRING': (scope: Stack, name: string, path: string) => {
    return aws_ssm.StringParameter.fromSecureStringParameterAttributes(
      scope,
      `ssm_${name}`,
      {
        parameterName: path,
      }
    ).stringValue;
  },
};

const ssmTypes = new Set(Object.keys(SSM_PARSER));

const parseEnvParameters = (scope: Stack, values: Record<string, any>) => {
  const envValues: Record<string, any> = {};
  for (const key in values) {
    if (typeof values[key] !== 'string') {
      envValues[key] = values[key];
      continue;
    }
    let isSSMParameter = false;
    for (const type of ssmTypes) {
      if (values[key].startsWith(type)) {
        isSSMParameter = true;
        break;
      }
    }

    if (!isSSMParameter) {
      envValues[key] = values[key];
      continue;
    }

    const [service, parameterType, path] = values[key].split('::');

    envValues[key] = SSM_PARSER[
      `${service}::${parameterType}` as keyof typeof SSM_PARSER
    ](scope, key, path);
  }

  return envValues;
};

export const processEnvValues = async (scope: Stack) => {
  const baseEnvPath = join(cwd(), '.env');
  try {
    const envFile = await readFile(baseEnvPath);
    const envContent = parse(envFile);

    return parseEnvParameters(scope, envContent);
  } catch {
    return {};
  }
};

export const getEnvValues = (
  values: Record<string, any>,
  environmentResource: EnvironmentResource
) => {
  let envValues: Record<string, any> = {};

  for (const env of environmentResource) {
    if (typeof env === 'string') {
      envValues[env] = values[env];
      continue;
    }

    envValues = {
      ...envValues,
      ...env,
    };
  }

  return envValues;
};
