#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { createSerializableConfig } from './config-factory';

interface GraphQLSDKConfig {
  queries: string;
  hasura_url: string;
  hasura_admin_token: string;
  output: string;
}

function findConfig(): GraphQLSDKConfig | null {
  const cwd = process.cwd();
  
  // Check for .graphql-sdk.json
  const configFile = join(cwd, '.graphql-sdk.json');
  if (existsSync(configFile)) {
    try {
      const config = JSON.parse(readFileSync(configFile, 'utf-8'));
      console.log('Found configuration in .graphql-sdk.json');
      return config;
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
        return packageJson['graphql-sdk'];
      }
    } catch (error) {
      console.error('Error reading package.json:', error);
      return null;
    }
  }
  
  return null;
}

function expandEnvironmentVariables(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (match, envVar) => {
    return process.env[envVar] || match;
  });
}

function copyHooksSnippet() {
  const config = findConfig();
  if (!config) {
    console.error('No configuration found. Please create a .graphql-sdk.json file or add "graphql-sdk" config to your package.json');
    process.exit(1);
  }

  if (!config.output) {
    console.error('Missing required configuration field: output');
    process.exit(1);
  }

  const expandedConfig = {
    output: expandEnvironmentVariables(config.output)
  };

  // Get the directory where the SDK file is located
  const sdkDir = dirname(expandedConfig.output);
  const hooksFileName = 'hooks.ts';
  const targetPath = join(sdkDir, hooksFileName);

  // Get the hooks file content from the package
  let hooksSourcePath: string;
  
  try {
    // Try to resolve from installed package first
    const packageDir = dirname(require.resolve('@intlabs-io/graphql-sdk/package.json'));
    hooksSourcePath = join(packageDir, 'react', 'hooks.ts');
  } catch (error) {
    // Fallback to local development path
    const packageDir = resolve(__dirname, '..');
    hooksSourcePath = join(packageDir, 'react', 'hooks.ts');
  }

  if (!existsSync(hooksSourcePath)) {
    console.error(`Hooks file not found at: ${hooksSourcePath}`);
    process.exit(1);
  }

  try {
    // Ensure the target directory exists
    mkdirSync(sdkDir, { recursive: true });

    // Read the hooks file content
    const hooksContent = readFileSync(hooksSourcePath, 'utf-8');
    
    // Write the hooks file to the SDK directory
    writeFileSync(targetPath, hooksContent);
    
    console.log(`✅ React hooks snippet copied to: ${targetPath}`);
    console.log('');
    console.log('The hooks file contains utility functions for using your GraphQL SDK with React:');
    console.log('- useGraphqlSdk: Get the memoized GraphQL SDK');
    console.log('- useSwrWithGraphqlSdk: Use SWR with your GraphQL SDK');
    console.log('- useGraphqlSubscription: Subscribe to GraphQL endpoints');
    console.log('- useGraphqlUser: Fetch user data (customize for your auth system)');
    console.log('');
    console.log('Remember to install the required dependencies:');
    console.log('npm install swr graphql-ws');
  } catch (error) {
    console.error('❌ Error copying hooks snippet:', error);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  graphql-sdk generate      Generate the GraphQL SDK');
    console.log('  graphql-sdk snippet hooks Copy React hooks to your project');
    process.exit(1);
  }

  const command = args[0];
  
  if (command === 'generate') {
    generateSdk();
  } else if (command === 'snippet' && args[1] === 'hooks') {
    copyHooksSnippet();
  } else {
    console.log('Usage:');
    console.log('  graphql-sdk generate      Generate the GraphQL SDK');
    console.log('  graphql-sdk snippet hooks Copy React hooks to your project');
    process.exit(1);
  }
}

function generateSdk() {
  const config = findConfig();
  if (!config) {
    console.error('No configuration found. Please create a .graphql-sdk.json file or add "graphql-sdk" config to your package.json');
    console.error('\nExample configuration:');
    console.error(JSON.stringify({
      "queries": "./graphql",
      "hasura_url": "http://localhost:8080/v1/graphql",
      "hasura_admin_token": "your-admin-token",
      "output": "./app/lib/sdk.ts"
    }, null, 2));
    process.exit(1);
  }
  
  // Validate required fields
  const requiredFields = ['queries', 'hasura_url', 'hasura_admin_token', 'output'];
  for (const field of requiredFields) {
    if (!config[field as keyof GraphQLSDKConfig]) {
      console.error(`Missing required configuration field: ${field}`);
      process.exit(1);
    }
  }
  
  // Expand environment variables in config values
  const expandedConfig = {
    queries: expandEnvironmentVariables(config.queries),
    hasura_url: expandEnvironmentVariables(config.hasura_url),
    hasura_admin_token: expandEnvironmentVariables(config.hasura_admin_token),
    output: expandEnvironmentVariables(config.output)
  };
  
  // Set environment variables for codegen
  process.env.HASURA_GRAPHQL_ENDPOINT = expandedConfig.hasura_url;
  process.env.HASURA_ADMIN_SECRET = expandedConfig.hasura_admin_token;
  process.env.GRAPHQL_SDK_QUERIES = expandedConfig.queries;
  process.env.GRAPHQL_SDK_OUTPUT = expandedConfig.output;
  
  console.log('Generating GraphQL SDK...');
  console.log(`Queries: ${expandedConfig.queries}`);
  console.log(`Output: ${expandedConfig.output}`);
  console.log(`Hasura URL: ${expandedConfig.hasura_url}`);
  
  try {
    // Create a temporary codegen config in the user's project
    const tempConfigPath = join(process.cwd(), 'codegen.temp.js');
    
    // Generate the codegen configuration using the factory
    const codegenConfigContent = createSerializableConfig({
      hasuraEndpoint: expandedConfig.hasura_url,
      hasuraAdminSecret: expandedConfig.hasura_admin_token,
      queriesPath: expandedConfig.queries,
      outputPath: expandedConfig.output,
    });
    
    // Write the temporary config file
    const { writeFileSync, unlinkSync } = require('fs');
    writeFileSync(tempConfigPath, codegenConfigContent);
    
    try {
      execSync(`npx graphql-codegen --config ${tempConfigPath}`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('✅ GraphQL SDK generated successfully!');
    } finally {
      // Clean up temporary file
      if (require('fs').existsSync(tempConfigPath)) {
        unlinkSync(tempConfigPath);
      }
    }
  } catch (error) {
    console.error('❌ Error generating GraphQL SDK:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
