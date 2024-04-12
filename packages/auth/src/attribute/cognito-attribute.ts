import 'reflect-metadata';

export enum CognitoPropertyReflectKeys {
  CUSTOM = 'cognito:custom-attribute',
  STANDARD = 'cognito:standard-attribute',
}

interface CommonCustomAttribute {
  mutable?: boolean;
}

export interface CommonStandardAttribute extends CommonCustomAttribute {
  required?: boolean;
}

export interface NumberCustomAttribute extends CommonCustomAttribute {
  min?: number;
  max?: number;
}

export interface StringCustomAttribute extends CommonCustomAttribute {
  minLen?: number;
  maxLen?: number;
}

export interface AuthAttributes {
  email?: string;
  /**
   * fullName {string} attribute mapping to fullname
   */
  fullName?: string;
  nickname?: string;
  birthday?: Date;
  /**
   * lastName {string} attribute mapping to familyName
   */
  lastName?: string;
  gender?: string;
  /**
   * firstName {string} attribute mapping to giveName
   */
  firstName?: string;
  lastUpdateTime?: Date;
  locale?: string;
  middleName?: string;
  phoneNumber?: string;
  /**
   * picture {string} attribute mapping to profilePicture
   */
  picture?: string;

  website?: string;
}

export type CustomAttributeProps<T> = T extends Number
  ? NumberCustomAttribute
  : T extends string
  ? StringCustomAttribute
  : CommonCustomAttribute;

export const CustomAttribute =
  <T extends Record<A, number | string | boolean | Date>, A extends keyof T>(
    props: CustomAttributeProps<T[A]> = {} as CustomAttributeProps<T[A]>
  ) =>
  (target: T, propertyKey: A) => {
    const properties: Record<keyof T, CustomAttributeProps<T[A]>> = Reflect.getMetadata(
      CognitoPropertyReflectKeys.CUSTOM,
      target
    ) || {};

    properties[propertyKey] = {
      ...props,
      name: propertyKey as string,
    };
    Reflect.defineMetadata(propertyKey, properties, target);
  };

export const StandardAttribute =
  (props: CommonStandardAttribute = {}) =>
  (target: any, propertyKey: keyof AuthAttributes) => {
    const properties: Record<keyof AuthAttributes, CommonStandardAttribute> =
      Reflect.getMetadata(CognitoPropertyReflectKeys.STANDARD, target) || {};

    properties[propertyKey] = props;
    Reflect.defineMetadata(propertyKey, properties, target);
  };
