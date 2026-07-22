import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { config } from '../config/index.js';

// Use AWS_PROFILE if set (for local dev with named profiles)
const profileOpts = config.aws.profile ? {} : {};

const client = new DynamoDBClient({
  region: config.aws.region,
  ...(config.aws.dynamoEndpoint && { endpoint: config.aws.dynamoEndpoint }),
});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export { client };
