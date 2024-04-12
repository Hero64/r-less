import {
  AuthAttributes,
  AuthorizerMetadata,
  CognitoAuthorizer,
  CognitoPropertyReflectKeys,
  CognitoReflectKeys,
  CommonStandardAttribute,
  CustomAttributeProps,
} from '@really-less/auth';

import { CommonResource, CommonResourceProps } from '../common';
import {
  BooleanAttribute,
  DateTimeAttribute,
  ICustomAttribute,
  NumberAttribute,
  StringAttribute,
  UserPool,
  UserPoolOperation,
} from 'aws-cdk-lib/aws-cognito';

type CognitoTriggerKeys = keyof Omit<CognitoAuthorizer, 'authorizer'>;

interface AuthResourceProps extends CommonResourceProps {
  authorizer: CognitoAuthorizer & Function;
}

export class AuthResource extends CommonResource {
  private metadata: AuthorizerMetadata;

  constructor(private readonly props: AuthResourceProps) {
    super(props.scope, props.stackName, props.role, props.layer);
    this.metadata = Reflect.getMetadata(
      CognitoReflectKeys.PROPERTIES,
      props.authorizer.prototype
    );

    const userPool = this.createUserPool();
    this.addUserPoolTriggers(userPool);
    this.createUserPoolClient(userPool);
  }

  private createUserPool() {
    const name = `${this.metadata.name}-auth`;

    const standardAttributes: Record<keyof AuthAttributes, CommonStandardAttribute> = this
      .metadata.attributes
      ? Reflect.getMetadata(
          CognitoPropertyReflectKeys.STANDARD,
          this.metadata.attributes.prototype
        )
      : {};
    const customAttributes: Record<keyof AuthAttributes, CustomAttributeProps<any>> = this
      .metadata.attributes
      ? Reflect.getMetadata(
          CognitoPropertyReflectKeys.CUSTOM,
          this.metadata.attributes.prototype
        )
      : {};

    return new UserPool(this.props.scope, `${this.metadata.name}-auth`, {
      userPoolName: name,
      signInAliases: Object.fromEntries(
        (this.metadata.signInAliases || ['email']).map((aliases) => [aliases, true])
      ),
      standardAttributes: this.getStandardAttributes(standardAttributes),
      customAttributes: this.getCustomAttributes(customAttributes),
      passwordPolicy: this.metadata.passwordPolicy,
    });
  }

  private createUserPoolClient(userPool: UserPool) {
    const name = `${this.metadata.name}-user-pool-client`;

    userPool.addClient(name, {
      userPoolClientName: name,
      authFlows: {
        userPassword: true,
      },
    });
  }

  private addUserPoolTriggers(userPool: UserPool) {
    // TODO: test only permitted types
    const triggerNames: Record<CognitoTriggerKeys, UserPoolOperation> = {
      postAuthentication: UserPoolOperation.POST_AUTHENTICATION,
      postConfirmation: UserPoolOperation.POST_CONFIRMATION,
      preAuthentication: UserPoolOperation.PRE_AUTHENTICATION,
      preSignUp: UserPoolOperation.PRE_SIGN_UP,
      preTokenGeneration: UserPoolOperation.PRE_TOKEN_GENERATION,
    };

    for (const key in triggerNames) {
      if (!this.props.authorizer[key as CognitoTriggerKeys]) {
        continue;
      }

      const lambda = this.createLambda({
        filename: this.metadata.filename,
        handler: {
          name: key,
        },
        pathName: this.metadata.foldername,
        role: this.role,
        layer: this.layer,
        prefix: 'cognito',
      });

      userPool.addTrigger(triggerNames[key as CognitoTriggerKeys], lambda);
    }
  }

  private getStandardAttributes(attributes: Record<string, CommonStandardAttribute>) {
    const standardAttributes: Record<string, CommonStandardAttribute> = {
      ...attributes,
    };

    const realAttributeNames: Partial<Record<keyof AuthAttributes, string>> = {
      fullName: 'fullname',
      lastName: 'familyname',
      firstName: 'giveName',
      picture: 'profilePicture',
    };

    for (const key in realAttributeNames) {
      const value = attributes[key];
      if (value) {
        standardAttributes[key] = { ...value };
        delete standardAttributes[key];
      }
    }

    if (Object.keys(standardAttributes).length === 0) {
      return;
    }

    return standardAttributes;
  }

  private getCustomAttributes(attributes: Record<string, CustomAttributeProps<any>>) {
    const customAttributes: Record<string, ICustomAttribute> = {};
    for (const name in customAttributes) {
      const propertyType = Reflect.getMetadata(
        'design:type',
        this.metadata.attributes?.prototype,
        name
      ).name;

      switch (propertyType) {
        case 'string': {
          customAttributes[name] = new StringAttribute({
            ...attributes[name],
          });
          break;
        }
        case 'boolean': {
          customAttributes[name] = new BooleanAttribute({
            ...attributes[name],
          });
          break;
        }
        case 'number': {
          customAttributes[name] = new NumberAttribute({
            ...attributes[name],
          });
          break;
        }
        default: {
          customAttributes[name] = new DateTimeAttribute({
            ...attributes[name],
          });
        }
      }
    }

    if (Object.keys(customAttributes).length === 0) {
      return;
    }

    return customAttributes;
  }
}
