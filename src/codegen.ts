import type { CodegenConfig } from '@graphql-codegen/cli';
import SubscriptionDocLookupPlugin from './plugins/subscription-doc-lookup';
import { findConfig, GraphQLSDKConfig } from './config';

export function createCodegenConfig(
  options: GraphQLSDKConfig | null,
): CodegenConfig {
  if (!options) {
    throw new Error(
      'No configuration found. Please add to .env, create a .graphql-sdk.json file or add "graphql-sdk" config to your package.json',
    );
  }

  const {
    hasura_url: hasuraEndpoint,
    hasura_admin_token: hasuraAdminSecret,
    queries: queriesPath,
    output: outputPath,
  } = options;

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
      if (name === 'subscription-doc-lookup')
        return SubscriptionDocLookupPlugin;
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

export default createCodegenConfig(findConfig());
