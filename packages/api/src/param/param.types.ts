export type Source = 'body' | 'path' | 'query' | 'header';

export interface ParamProps {
  /**
   * original name of param
   *
   * @default string name of field class property
   */
  name?: string;
  /**
   * specify field is required
   * @default true
   */
  required?: boolean;
  /**
   * source to obtain field value
   * @default path
   */
  source?: Source;
}

export interface ParamMetadata extends Required<ParamProps> {
  destinationField: string;
  type: string;
}
