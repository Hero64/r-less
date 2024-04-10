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

export interface CognitoAuthorizer {
  preConfirmation?: () => any;
  preAuthentication?: () => any;
  preSignUp?: () => any;
  preTokenGeneration?: () => any;
  postAuthentication?: () => any;
  postConfirmation?: () => any;
  authorizer?: () => any;
}
