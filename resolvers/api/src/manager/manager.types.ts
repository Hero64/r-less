import { Stack } from 'aws-cdk-lib';

export interface ManagerInitializeProps {
  appScope: Stack;
  apiName: string;
}
