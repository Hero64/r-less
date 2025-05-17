import { ServicesValues } from '@really-less/common';
import { Stack } from 'aws-cdk-lib';

export interface CreateRoleProps {
  /**
   * List of services for enable permissions in role
   */
  services: ServicesValues[];
  /**
   * App or NestedStack
   */
  scope: Stack;
  /**
   * Role name
   * @default role-{md5hash}
   */
  name?: string;
  /**
   * Reference to aws service
   */
  principal?: string;
}
