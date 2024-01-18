export type ServicesName =
  | 'dynamodb'
  | 's3'
  | 'lambda'
  | 'cloudwatch'
  | 'sqs'
  | 'step_function'
  | 'kms'
  | 'ssm'
  | 'event';

interface PermissionService<T extends ServicesName | 'custom', P extends string> {
  type: T;
  permissions?: P[];
  resources?: string[];
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

type SQSPermissions =
  | 'DeleteMessage'
  | 'GetQueueUrl'
  | 'ReceiveMessage'
  | 'SendMessage'
  | 'ReceiveMessage'
  | 'SendMessage';

type StepFunctionPermissions =
  | 'InvokeHTTPEndpoint'
  | 'DescribeExecution'
  | 'StartExecution'
  | 'StopExecution';

type KMSPermissions =
  | 'Decrypt'
  | 'DescribeKey'
  | 'Encrypt'
  | 'GenerateDataKey'
  | 'GenerateRandom'
  | 'GetPublicKey'
  | 'Sign'
  | 'Verify';

type SSMPermissions =
  | 'DescribeParameters'
  | 'GetDocument'
  | 'GetParameter'
  | 'GetParameters'
  | 'GetParametersByPath'
  | 'ListDocuments'
  | 'PutParameter';

type EventPermissions =
  | 'DescribeEventRule'
  | 'DescribeEventBus'
  | 'DescribeRule'
  | 'PutEvents'
  | 'PutRule';

export type ServicesValues =
  | ServicesName
  | PermissionService<'dynamodb', DynamoPermissions>
  | PermissionService<'s3', S3Permissions>
  | PermissionService<'lambda', LambdaPermissions>
  | PermissionService<'cloudwatch', LogsPermission>
  | PermissionService<'sqs', SQSPermissions>
  | PermissionService<'step_function', StepFunctionPermissions>
  | PermissionService<'kms', KMSPermissions>
  | PermissionService<'ssm', SSMPermissions>
  | PermissionService<'event', EventPermissions>
  | (PermissionService<'custom', string> & { serviceName: string });
