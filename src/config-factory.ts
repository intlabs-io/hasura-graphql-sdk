import type { CodegenConfig } from '@graphql-codegen/cli';
import { resolve } from 'path';
import SubscriptionDocLookupPlugin from './plugins/subscription-doc-lookup';

export interface GraphQLSDKOptions {
  hasuraEndpoint: string;
  hasuraAdminSecret: string;
  queriesPath: string;
  outputPath: string;
}

export function createCodegenConfig(options: GraphQLSDKOptions): CodegenConfig {
  const { hasuraEndpoint, hasuraAdminSecret, queriesPath, outputPath } = options;

  return {
    schema: {
      [hasuraEndpoint]: {
        headers: {
          'x-hasura-admin-secret': hasuraAdminSecret,
        },
      },
    },
    documents: [queriesPath],
    pluginLoader: (name: string) => {
      if (name === 'subscription-doc-lookup') return SubscriptionDocLookupPlugin;
      return require(name);
    },
    generates: {
      [outputPath]: {
        plugins: [
          {
            add: {
              content: `
                export type JsonValue =
                | string
                | number
                | boolean
                | null
                | JsonValue[]
                | { [key: string]: JsonValue };
              `.trim(),
              placement: 'prepend',
            },
          },
          {
            add: {
              content: `
                export type HasuraGraphqlSdkMethodName = keyof Sdk;

                export type HasuraGraphqlSdkMethodParams<M extends HasuraGraphqlSdkMethodName> =
                  Parameters<Sdk[M]>[0];

                export type HasuraGraphqlSdkMethodResult<M extends HasuraGraphqlSdkMethodName> =
                  Awaited<ReturnType<Sdk[M]>>;

                export type HasuraGraphqlSubscriptionMethodName =
                  keyof typeof HasuraGraphqlSubscriptionDocumentLookup;

                export type HasuraGraphqlSubscriptionDocument =
                  (typeof HasuraGraphqlSubscriptionDocumentLookup)[HasuraGraphqlSubscriptionMethodName];

                // Utility to extract the inner type of AsyncIterable<T>
                type UnwrapAsyncIterable<T> = T extends AsyncIterable<infer U> ? U : T;

                // Maps a subscription method to its input param type
                export type HasuraGraphqlSubscriptionMethodParams<
                  M extends HasuraGraphqlSubscriptionMethodName,
                > = Parameters<Sdk[M]>[0];

                // Maps a subscription method to its unwrapped result type
                export type HasuraGraphqlSubscriptionMethodResult<
                  M extends HasuraGraphqlSubscriptionMethodName,
                > = UnwrapAsyncIterable<ReturnType<Sdk[M]>>;

                // Type-safe generic fetcher usable with SWR, React Query, etc.
                export const getSwrFetcher = <
                  M extends HasuraGraphqlSdkMethodName,
                  P extends HasuraGraphqlSdkMethodParams<M>,
                  R extends HasuraGraphqlSdkMethodResult<M>,
                >(
                  sdk: Sdk,
                  method: M,
                  params: P,
                ): Promise<R> => {
                  return (sdk[method] as (p: P) => Promise<R>)(params);
                };
              `.trim(),
              placement: 'append',
            },
          },
          {
            add: {
              content: `
                export const GRAPHQL_API_URL = "${hasuraEndpoint}";
                export const GRAPHQL_WEBSOCKET_URL = "${hasuraEndpoint.replace(/^http/, 'ws')}";
              `.trim(),
              placement: 'append',
            },
          },
          'typescript',
          'typescript-operations',
          'typescript-resolvers',
          'typescript-generic-sdk',
          { 'subscription-doc-lookup': {} },
        ],
        config: {
          fetcher: 'fetch',
          dedupeFragments: true,
          skipTypename: false,
          operationResultSuffix: 'Result',
          scalars: {
            uuid: 'string',
            timestamptz: 'string',
            jsonb: 'JsonValue',
          },
        },
      },
    },
    hooks: {
      afterAllFileWrite: ['prettier --write'],
    },
  };
}

// Helper function to create a serializable config for CLI usage
export function createSerializableConfig(options: GraphQLSDKOptions): string {
  const pluginPath = resolve(__dirname, 'plugins', 'subscription-doc-lookup.js');
  
  return `
const config = {
  schema: {
    "${options.hasuraEndpoint}": {
      headers: {
        'x-hasura-admin-secret': "${options.hasuraAdminSecret}",
      },
    },
  },
  documents: ["${options.queriesPath}"],
  pluginLoader: (name) => {
    if (name === 'subscription-doc-lookup') return require("${pluginPath}");
    return require(name);
  },
  generates: {
    "${options.outputPath}": {
      plugins: [
        {
          add: {
            content: \`
              export type JsonValue =
              | string
              | number
              | boolean
              | null
              | JsonValue[]
              | { [key: string]: JsonValue };
            \`.trim(),
            placement: 'prepend',
          },
        },
        {
          add: {
            content: \`
              export type HasuraGraphqlSdkMethodName = keyof Sdk;

              export type HasuraGraphqlSdkMethodParams<M extends HasuraGraphqlSdkMethodName> =
                Parameters<Sdk[M]>[0];

              export type HasuraGraphqlSdkMethodResult<M extends HasuraGraphqlSdkMethodName> =
                Awaited<ReturnType<Sdk[M]>>;

              export type HasuraGraphqlSubscriptionMethodName =
                keyof typeof HasuraGraphqlSubscriptionDocumentLookup;

              export type HasuraGraphqlSubscriptionDocument =
                (typeof HasuraGraphqlSubscriptionDocumentLookup)[HasuraGraphqlSubscriptionMethodName];

              // Utility to extract the inner type of AsyncIterable<T>
              type UnwrapAsyncIterable<T> = T extends AsyncIterable<infer U> ? U : T;

              // Maps a subscription method to its input param type
              export type HasuraGraphqlSubscriptionMethodParams<
                M extends HasuraGraphqlSubscriptionMethodName,
              > = Parameters<Sdk[M]>[0];

              // Maps a subscription method to its unwrapped result type
              export type HasuraGraphqlSubscriptionMethodResult<
                M extends HasuraGraphqlSubscriptionMethodName,
              > = UnwrapAsyncIterable<ReturnType<Sdk[M]>>;

              // Type-safe generic fetcher usable with SWR, React Query, etc.
              export const getSwrFetcher = <
                M extends HasuraGraphqlSdkMethodName,
                P extends HasuraGraphqlSdkMethodParams<M>,
                R extends HasuraGraphqlSdkMethodResult<M>,
              >(
                sdk: Sdk,
                method: M,
                params: P,
              ): Promise<R> => {
                return (sdk[method] as (p: P) => Promise<R>)(params);
              };
            \`.trim(),
            placement: 'append',
          },
        },
        'typescript',
        'typescript-operations',
        'typescript-resolvers',
        'typescript-generic-sdk',
        { 'subscription-doc-lookup': {} },
      ],
      config: {
        fetcher: 'fetch',
        dedupeFragments: true,
        skipTypename: false,
        operationResultSuffix: 'Result',
        scalars: {
          uuid: 'string',
          timestamptz: 'string',
          jsonb: 'JsonValue',
        },
      },
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
};

module.exports = config;
`;
}
