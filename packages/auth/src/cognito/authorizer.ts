import { REALLY_LESS_CONTEXT } from '@really-less/common';
import { getCallerFileName } from '@really-less/common/src/utils/path';
import { basename, dirname } from 'node:path';

export enum CognitoReflectKeys {
  PROPERTIES = 'cognito:properties',
}

type SignInAliases = 'email' | 'phone' | 'username';

interface PasswordPolicy {
  minLength?: number;
  requireDigits?: boolean;
  requireLowercase?: boolean;
  requireSymbols?: boolean;
  requireUppercase?: boolean;
  /**
   * time {number} time in days
   */
  time?: number;
}

export interface AuthorizerProps {
  name?: string;
  attributes?: Function;
  signInAliases?: SignInAliases[];
  passwordPolicy?: PasswordPolicy;
}

export interface AuthorizerMetadata extends AuthorizerProps {
  filename: string;
  foldername: string;
}

export interface CognitoAuthorizer {
  preAuthentication?: () => any;
  preSignUp?: () => any;
  preTokenGeneration?: () => any;
  postAuthentication?: () => any;
  postConfirmation?: () => any;
  authorizer?: () => any;
}

export const Auth = (props?: AuthorizerProps) => (constructor: Function) => {
  if (!process.env[REALLY_LESS_CONTEXT]) {
    return;
  }

  const callerFile = getCallerFileName(5);
  Reflect.defineMetadata(
    CognitoReflectKeys.PROPERTIES,
    {
      ...props,
      name: props?.name || constructor.name,
      foldername: dirname(callerFile),
      filename: basename(callerFile).replace('.js', ''),
    },
    constructor
  );
};
