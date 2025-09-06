#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { generate } from '@graphql-codegen/cli';
import { createCodegenConfig } from './codegen';
import { findConfig } from './config';

function copyHooksSnippet() {
  const config = findConfig();
  if (!config) {
    console.error(
      'No configuration found. Please create a .graphql-sdk.json file or add "graphql-sdk" config to your package.json',
    );
    process.exit(1);
  }

  if (!config.outputDir) {
    console.error('Missing required configuration field: outputDir');
    process.exit(1);
  }

  // Get the directory where the SDK file is located
  const sdkDir = config.outputDir;
  const hooksFileName = 'hooks.ts';
  const targetPath = join(sdkDir, hooksFileName);

  // Get the hooks file content from the package
  let hooksSourcePath: string;

  try {
    // Try to resolve from installed package first
    const packageDir = dirname(
      require.resolve('@intlabs-io/graphql-sdk/package.json'),
    );
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
    console.log(
      'The hooks file contains utility functions for using your GraphQL SDK with React:',
    );
    console.log('- useGraphqlSdk: Get the memoized GraphQL SDK');
    console.log('- useSwrWithGraphqlSdk: Use SWR with your GraphQL SDK');
    console.log('- useGraphqlSubscription: Subscribe to GraphQL endpoints');
    console.log(
      '- useGraphqlUser: Fetch user data (customize for your auth system)',
    );
    console.log('');
    console.log('Remember to install the required dependencies:');
    console.log('npm install swr graphql-ws');
  } catch (error) {
    console.error('❌ Error copying hooks snippet:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  graphql-sdk generate      Generate the GraphQL SDK');
    console.log('  graphql-sdk snippet hooks Copy React hooks to your project');
    process.exit(1);
  }

  const command = args[0];

  if (command === 'generate') {
    await generateSdk();
  } else if (command === 'snippet' && args[1] === 'hooks') {
    copyHooksSnippet();
  } else {
    console.log('Usage:');
    console.log('  graphql-sdk generate      Generate the GraphQL SDK');
    console.log('  graphql-sdk snippet hooks Copy React hooks to your project');
    process.exit(1);
  }
}

async function generateSdk() {
  const config = findConfig();
  if (!config) {
    console.error(
      'No configuration found. Please create a .graphql-sdk.json file or add "graphql-sdk" config to your package.json',
    );
    console.error('\nExample configuration:');
    console.error(
      JSON.stringify(
        {
          graphqlDir: './graphql',
          hasura_url: 'http://localhost:8080/v1/graphql',
          hasura_admin_token: 'your-admin-token',
          outputDir: './app/lib',
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  // Validate required fields
  const requiredFields = [
    'graphqlDir',
    'hasura_url',
    'hasura_admin_token',
    'outputDir',
  ] as const;
  for (const field of requiredFields) {
    if (!config[field]) {
      console.error(`Missing required configuration field: ${field}`);
      process.exit(1);
    }
  }

  console.log('Generating GraphQL SDK...');
  console.log(`GraphQL Directory: ${config.graphqlDir}`);
  console.log(`Output Directory: ${config.outputDir}`);
  console.log(`Hasura URL: ${config.hasura_url}`);

  try {
    // Create the codegen configuration using the factory
    const codegenConfig = createCodegenConfig(config);

    // Use the programmatic API
    await generate(codegenConfig, true);

    console.log('✅ GraphQL SDK generated successfully!');
  } catch (error) {
    console.error('❌ Error generating GraphQL SDK:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
