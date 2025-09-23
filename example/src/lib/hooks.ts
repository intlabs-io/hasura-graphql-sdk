'use client';

import useSWR from 'swr';

import {
  HasuraGraphqlSubscriptionDocumentLookup,
  HasuraGraphqlSdkMethodName,
  HasuraGraphqlSdkMethodParams,
  HasuraGraphqlSdkMethodResult,
  HasuraGraphqlSubscriptionMethodName,
  HasuraGraphqlSubscriptionMethodParams,
  HasuraGraphqlSubscriptionMethodResult,
  getSdk,
  getSwrFetcher,
} from './sdk';

import { DocumentNode } from 'graphql';
import { print } from 'graphql';
import { Client, createClient } from 'graphql-ws';
import { useEffect, useMemo, useState } from 'react';

export const GRAPHQL_API_URL = process.env.NEXT_PUBLIC_GRAPHQL_API_URL || 'http://localhost:8080/v1/graphql';
export const GRAPHQL_WEBSOCKET_URL = process.env.NEXT_PUBLIC_GRAPHQL_WEBSOCKET_URL || 'ws://localhost:8080/v1/graphql';

/**
 * INTERNAL - start a graphql subscription
 * @param wsClient - the websocket client
 * @param methodName - the name of the method to subscribe to
 * @param variables - the variables to subscribe to
 * @param onNext - the function to call when a new result is received
 * @param onError - the function to call when an error occurs
 * @param onComplete - the function to call when the subscription is complete
 */
const startGraphqlSubscription = <
  M extends HasuraGraphqlSubscriptionMethodName,
  R extends HasuraGraphqlSubscriptionMethodResult<M>,
  V extends HasuraGraphqlSubscriptionMethodParams<M>,
>(
  wsClient: Client,
  methodName: M,
  variables: V,
  onNext: (newResult: R) => void = () => {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: (err: any) => void = () => {},
  onComplete: () => unknown = () => {},
) => {
  const document = HasuraGraphqlSubscriptionDocumentLookup[methodName];
  if (!document) throw new Error(`No document found for method: ${methodName}`);
  return wsClient.subscribe(
    {
      query: print(document),
      variables,
    },
    {
      next: ({ data }) => onNext(data as R),
      error: onError,
      complete: onComplete,
    },
  );
};

/**
 * INTERNAL - fetch based requester to Hasura GraphQL
 * modify if you need to reqch hasura in a different way than using http and fetch
 * @param graphqlUrl - the url of the graphql endpoint
 * @param headers - the headers to send with the request
 * @returns a fetch requester
 */
const getFetchRequester = <C>({
  graphqlUrl,
  headers,
}: {
  graphqlUrl: string;
  headers?: Record<string, string>;
}) => {
  return async <R, V>(
    doc: DocumentNode,
    variables?: V,
    opts?: C,
  ): Promise<R> => {
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        query: doc.loc?.source.body,
        variables,
        opts,
      }),
    });

    const responseJson = (await response?.json()) as { data?: R };

    if (!responseJson?.data) {
      throw new Error(`Malformed result: ${JSON.stringify(responseJson)}`);
    }

    return responseJson.data;
  };
};

/**
 * INTERNAL - Hasura GraphQL requester
 * @param graphqlUrl - the url of the graphql endpoint
 * @param role - the role to use for the request
 * @param token - the token to use for the request
 * @param customHeaders - the headers to send with the request
 * @returns a Hasura GraphQL requester
 */
const getHasuraRequester = <C>(
  graphqlUrl: string,
  role?: string,
  token?: string,
  customHeaders?: Record<string, string>,
) => {
  let headers: Record<string, string> = { ...customHeaders };
  if (role) headers['x-hasura-role'] = role;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return getFetchRequester<C>({ graphqlUrl, headers });
};

/**
 * INTERNAL - Admin headers for x-hasura-admin-secret header for hasura requesters in development
 * allows for more convenient iterative development in hasura without having to set up ACLs for JWT authenticated user
 * @returns Admin headers for x-hasura-admin-secret header for hasura requesters
 */
const adminHeaders = (): Record<string, string> => {
  const devMode = process.env.NODE_ENV === 'development';
  const adminSecret = process.env.NEXT_PUBLIC_HASURA_ADMIN_SECRET;
  return devMode && typeof adminSecret === 'string'
    ? { 'x-hasura-admin-secret': adminSecret }
    : {};
};

/**
 * useGraphqlUser - fetch the user from the graphql endpoint
 * Modify this to utilize the correct graphql query and identifier for your user
 * @returns the user
 */
export const useGraphqlUser = () => {
  const { authUser, isInitialized } = { authUser: undefined, isInitialized: false } as { authUser: any, isInitialized: boolean } //XXX: get Auth User
  const identifier = authUser?.id

  const { data: { users_by_pk: user } = {}, isLoading } =
    useSwrWithGraphqlSdk('GetUser', { id: identifier || '' });

  return {
    user,
    isLoading: !isInitialized ? true : isLoading,
  };
};

/**
 * useGraphqlUserSubscription - subscribe to the user from the graphql endpoint
 * Modify this to utilize the correct graphql query and identifier for your user
 * @returns the user
 */
export const useGraphqlUserSubscription = () => {
  const { authUser, isInitialized } = { authUser: undefined, isInitialized: false } as { authUser: any, isInitialized: boolean } //XXX: get Auth User
  const identifier = authUser?.id

  const subscriptionVariables = useMemo(
    () => (isInitialized ? { id: identifier || '' } : undefined),
    [isInitialized],
  );

  const { data, error } = useGraphqlSubscription(
    'UserUpdates',
    subscriptionVariables,
  );

  return {
    graphqlUser: data?.users_by_pk,
    error,
  };
};

/**
 * useGraphqlSdk - get the memoized graphql sdk
 * @param role - the role to use for the request
 * @returns the graphql sdk
 */
export const useGraphqlSdk = (role?: string) => {
  const sessionJwt: string | undefined = undefined //XXX: get JWT
  return useMemo(() => {
    // For demo purposes, use admin headers when no JWT is available
    return getSdk(getHasuraRequester(GRAPHQL_API_URL, role, sessionJwt, adminHeaders()));
  }, [sessionJwt, role]);
};

/**
 * useSwrWithGraphqlSdk - get the memoized graphql sdk with swr
 * @param method - the method to use for the request
 * @param params - the params to use for the request
 * @param config - the config to use for the request
 * @returns the graphql sdk
 */
export const useSwrWithGraphqlSdk = <M extends HasuraGraphqlSdkMethodName>(
  method: M,
  params: HasuraGraphqlSdkMethodParams<M> | undefined, // swr will not run if this is undefined, must pass empty params if you want it to run with no params
  config?: Parameters<typeof useSWR<HasuraGraphqlSdkMethodResult<M>>>[2],
) => {
  const sdk = useGraphqlSdk();
  const swr = useSWR<HasuraGraphqlSdkMethodResult<M>>(
    [method, params, sdk],
    sdk && params ? () => getSwrFetcher(sdk, method, params) : null,
    config,
  );

  return {
    ...swr,
    isLoading: !sdk || swr.isLoading, // override isLoading to also be true if the sdk isn't available
  };
};

/**
 * INTERNAL - useGraphqlWs Client - get the memoized graphql websocket client
 * @param role - the role to use for the request
 * @param customHeaders - the headers to send with the request
 * @returns the graphql websocket client
 */
const useGraphqlWsClient = (role?: string, customHeaders: Record<string, string> = {}) => {
  const sessionJwt: string | undefined = undefined //XXX: get JWT
  return useMemo(() => {
    // For demo purposes, use admin headers when no JWT is available
    const adminHeadersForWs = adminHeaders();
    return createClient({
      url: GRAPHQL_WEBSOCKET_URL,
      connectionParams: {
        headers: {
          ...customHeaders,
          ...adminHeadersForWs,
          ...(sessionJwt ? { Authorization: `Bearer ${sessionJwt}` } : {}),
          ...(role ? { 'x-hasura-role': role } : {}),
        },
      },
    });
  }, [sessionJwt, role]);
};

/**
 * useGraphqlSubscription - subscribe to the graphql endpoint
 * @param methodName - the name of the method to subscribe to
 * @param variables - the variables to subscribe to
 * @returns the data and error
 */
export const useGraphqlSubscription = <
  M extends HasuraGraphqlSubscriptionMethodName,
  R extends HasuraGraphqlSubscriptionMethodResult<M>,
  V extends HasuraGraphqlSubscriptionMethodParams<M>,
>(
  methodName: M,
  variables?: V, // if variables is undefined, subscription will not start
) => {
  const [data, setData] = useState<R | null>(null);
  const [error, setError] = useState<string | null>(null);

  const client = useGraphqlWsClient();

  useEffect(() => {
    if (client && variables) {
      console.log('starting subscription');
      const dispose = startGraphqlSubscription<M, R, V>(
        client,
        methodName,
        variables,
        setData,
        setError,
      );

      return () => {
        console.log('ending subscription');
        dispose?.();
      };
    }
  }, [methodName, variables, client]);

  return { data, error };
};