import 'dotenv/config';
import { createCodegenConfig } from './config-factory';

// Get configuration from environment variables set by CLI
const hasuraEndpoint = process.env.HASURA_GRAPHQL_ENDPOINT!;
const hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET!;
const queriesPath = process.env.GRAPHQL_SDK_QUERIES || 'graphql/**/*.graphql';
const outputPath = process.env.GRAPHQL_SDK_OUTPUT || './generated/sdk.ts';

const config = createCodegenConfig({
  hasuraEndpoint,
  hasuraAdminSecret,
  queriesPath,
  outputPath,
});

export default config;
