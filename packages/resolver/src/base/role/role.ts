import { ServicesName, ServicesValues } from '@really-less/main';
import {
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { createMd5Hash } from 'utils/hash';
import { Construct } from 'constructs';

interface CreateRoleProps {
  /**
   * List of services for enable permissions in role
   */
  services: ServicesValues[];
  /**
   * App or NestedStack
   */
  scope: Construct;
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

const defaultPermissions: Record<ServicesName, string[]> = {
  dynamodb: [
    'Query',
    'Scan',
    'GetItem',
    'BatchGetItem',
    'PutItem',
    'DeleteItem',
    'UpdateItem',
    'ConditionCheckItem',
  ],
  s3: [
    'AbortMultipartUpload',
    'CreateBucket',
    'DeleteBucket',
    'DeleteObject',
    'DeleteObjectTagging',
    'DeleteObjectVersion',
    'DeleteObjectVersionTagging',
    'GetBucketTagging',
    'GetBucketVersioning',
    'GetObject',
    'GetObjectAttributes',
    'GetObjectTagging',
    'GetObjectVersion',
    'GetObjectVersionAttributes',
    'GetObjectVersionTagging',
    'ListAllMyBuckets',
    'ListBucket',
    'ListBucketMultipartUploads',
    'ListBucketVersions',
    'ListMultipartUploadParts',
    'PutObject',
    'PutObjectTagging',
    'PutObjectVersionTagging',
    'ReplicateDelete',
    'ReplicateObject',
    'ReplicateTags',
    'RestoreObject',
  ],
  lambda: ['InvokeFunction'],
  cloudwatch: ['CreateLogGroup', 'CreateLogStream', 'PutLogEvents'],
  sqs: [
    'DeleteMessage',
    'GetQueueUrl',
    'ReceiveMessage',
    'SendMessage',
    'ReceiveMessage',
    'SendMessage',
  ],
  step_function: [
    'InvokeHTTPEndpoint',
    'DescribeExecution',
    'StartExecution',
    'StopExecution',
  ],
  kms: [
    'Decrypt',
    'DescribeKey',
    'Encrypt',
    'GenerateDataKey',
    'GenerateRandom',
    'GetPublicKey',
    'Sign',
    'Verify',
  ],
  ssm: [
    'DescribeParameters',
    'GetDocument',
    'GetParameter',
    'GetParameters',
    'GetParametersByPath',
    'ListDocuments',
    'PutParameter',
  ],
  event: [
    'DescribeEventRule',
    'DescribeEventBus',
    'DescribeRule',
    'PutEvents',
    'PutRule',
  ],
};

const mapServicesName: Partial<Record<ServicesName, string>> = {
  cloudwatch: 'logs',
  step_function: 'states',
  event: 'events',
};

const getRoleName = ({ services, name }: CreateRoleProps) => {
  if (name) {
    return name;
  }

  return `role-${createMd5Hash(JSON.stringify(services))}`;
};

const createPolicyStatement = (services: ServicesValues[]) => {
  return services.map((service) => {
    if (typeof service === 'string') {
      const serviceName = mapServicesName[service] || service;
      return new PolicyStatement({
        actions: defaultPermissions[service].map((permission) => {
          return `${serviceName}:${permission}`;
        }),
      });
    } else {
      const { type, permissions, resources } = service;
      let rolePermissions: string[] = permissions as string[];
      let serviceName: string = type;
      if (type === 'custom') {
        serviceName = service.serviceName;
        rolePermissions = rolePermissions.length === 0 ? ['*'] : rolePermissions;
      } else {
        rolePermissions =
          rolePermissions.length === 0 ? defaultPermissions[type] : rolePermissions;
      }
      return new PolicyStatement({
        actions: rolePermissions.map((permission) => {
          return `${serviceName}:${permission}`;
        }),
        resources,
      });
    }
  });
};

export const createRole = (props: CreateRoleProps) => {
  const { scope, services, principal = 'lambda.amazonaws.com' } = props;
  const roleName = getRoleName(props);

  const policeDocument = new PolicyDocument({
    statements: createPolicyStatement(services),
  });

  return new Role(scope, '', {
    roleName,
    assumedBy: new ServicePrincipal(principal),
    inlinePolicies: {
      [`${roleName}-policy`]: policeDocument,
    },
  });
};
