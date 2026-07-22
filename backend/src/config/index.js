export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:3001',
  aws: {
    region: process.env.AWS_REGION || 'us-east-2',
    dynamoEndpoint: process.env.DYNAMODB_ENDPOINT || undefined,
    profile: process.env.AWS_PROFILE || undefined,
  },
  secretId: process.env.BZY_SECRET_ID || 'bzy/env',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
  },
  tables: {
    businesses: 'bzy-businesses',
    services: 'bzy-services',
    bookings: 'bzy-bookings',
    customers: 'bzy-customers',
    payments: 'bzy-payments',
    numberQueue: 'bzy-number-queue',
    pushTokens: 'bzy-push-tokens',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  square: {
    accessToken: process.env.SQUARE_ACCESS_TOKEN || '',
    environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
    webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || '',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
  },
  expo: {
    accessToken: process.env.EXPO_ACCESS_TOKEN || '',
  },
};
