import { existsSync, readFileSync } from 'fs';
import 'dotenv/config';
import { resolve, join, dirname } from 'path';

export interface GraphQLSDKConfig {
  graphqlDir: string;
  hasura_url: string;
  hasura_admin_token: string;
  outputDir: string;
}

export function findConfig(): GraphQLSDKConfig | null {
  const cwd = process.cwd();

  // Check for environment variables
  const envConfig = {
    graphqlDir: process.env.GRAPHQL_SDK_GRAPHQL_DIR,
    hasura_url: process.env.GRAPHQL_SDK_HASURA_URL,
    hasura_admin_token: process.env.GRAPHQL_SDK_HASURA_ADMIN_TOKEN,
    outputDir: process.env.GRAPHQL_SDK_OUTPUT_DIR,
  };
  if (
    typeof envConfig.graphqlDir === 'string' &&
    typeof envConfig.hasura_url === 'string' &&
    typeof envConfig.hasura_admin_token === 'string' &&
    typeof envConfig.outputDir === 'string'
  ) {
    console.log('Found configuration in environment variables');
    return envConfig as GraphQLSDKConfig;
  }

  // Check for .graphql-sdk.json
  const configFile = join(cwd, '.graphql-sdk.json');
  if (existsSync(configFile)) {
    try {
      const config = JSON.parse(readFileSync(configFile, 'utf-8'));
      console.log('Found configuration in .graphql-sdk.json');
      return expandEnvironmentVariables(config);
    } catch (error) {
      console.error('Error reading .graphql-sdk.json:', error);
      return null;
    }
  }

  // Check for package.json config
  const packageFile = join(cwd, 'package.json');
  if (existsSync(packageFile)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageFile, 'utf-8'));
      if (packageJson['graphql-sdk']) {
        console.log('Found configuration in package.json');
        return expandEnvironmentVariables(packageJson['graphql-sdk']);
      }
    } catch (error) {
      console.error('Error reading package.json:', error);
      return null;
    }
  }

  return null;
}

function expandEnvironmentVariables<T extends Record<string, unknown>>(
  config: T,
): T {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => [
      key,
      typeof value === 'string'
        ? value.replace(/\$\{([^}]+)\}/g, (match: string, envVar: string) => {
            return process.env[envVar] || match;
          })
        : value,
    ]),
  ) as T;
}
