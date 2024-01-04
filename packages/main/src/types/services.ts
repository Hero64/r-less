interface PermissionService<T extends string, P extends string> {
  type: T;
  permissions?: P[];
  resources?: string;
}

type DynamoPermissions =
  | 'Query'
  | 'Scan'
  | 'GetItem'
  | 'BatchGetItem'
  | 'PutItem'
  | 'DeleteItem'
  | 'UpdateItem'
  | 'ConditionCheckItem';

type S3Permissions =
  | 'AbortMultipartUpload'
  | 'CreateBucket'
  | 'DeleteBucket'
  | 'DeleteObject'
  | 'DeleteObjectTagging'
  | 'DeleteObjectVersion'
  | 'DeleteObjectVersionTagging'
  | 'GetBucketTagging'
  | 'GetBucketVersioning'
  | 'GetEncryptionConfiguration'
  | 'GetObject'
  | 'GetObjectAttributes'
  | 'GetObjectTagging'
  | 'GetObjectVersion'
  | 'GetObjectVersionAttributes'
  | 'GetObjectVersionTagging'
  | 'ListAllMyBuckets'
  | 'ListBucket'
  | 'ListBucketMultipartUploads'
  | 'ListBucketVersions'
  | 'ListMultipartUploadParts'
  | 'PutObject'
  | 'PutObjectTagging'
  | 'PutObjectVersionTagging'
  | 'ReplicateDelete'
  | 'ReplicateObject'
  | 'ReplicateTags'
  | 'RestoreObject';

type LambdaPermissions = 'InvokeFunction';

type LogsPermission = 'CreateLogGroup' | 'CreateLogStream' | 'PutLogEvents';

export type Services =
  | 'dynamodb'
  | 's3'
  | 'lambda'
  | 'logs'
  | 'sqs'
  | 'step_functions'
  | 'kms'
  | 'cloudfront'
  | 'ssm'
  | 'event'
  | PermissionService<'dynamodb', DynamoPermissions>
  | PermissionService<'s3', S3Permissions>
  | PermissionService<'lambda', LambdaPermissions>
  | PermissionService<'logs', LogsPermission>
  | (PermissionService<'custom', string> & { serviceName: string });
