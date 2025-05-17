interface S3IntegrationOptions {
  bucket: string;
  object: string;
}

interface S3Integration {
  type: 's3';
  options: S3IntegrationOptions;
}

export type IntegrationResponse = S3Integration;
