This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

This setup requires docker compose.

```
npm i
docker compose up -d
npm run hasura-setup
```

Note, hasura-setup is a convenience wrapper on the Hasura cli. For your own project you should be installing and using the official Hasura cli.

## Use GraphQL SDK

Add a query or mutation to `src/graphql`, for example:

```graphql
# src/graphql/user_queries.graphql
query GetUserByEmail($email: String!) {
  users(where: { email: { _eq: $email } }) {
    id
    name
    email
  }
}
```

To access the Hasura console on http://localhost:8080, the secret key is `myadminsecretkey`

Re-generate the SDK after adding new queries/mutations:
```bash
npm run graphql-sdk
```

### Direct SDK Usage

You can use the generated SDK directly in your code:

```typescript
import { getSdk } from './lib/sdk'

// Initialize the SDK with a requester
const sdk = getSdk(async (doc, variables) => {
  const response = await fetch('http://localhost:8080/v1/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hasura-admin-secret': 'myadminsecretkey'
    },
    body: JSON.stringify({
      query: doc.loc?.source.body,
      variables
    })
  })
  return (await response.json()).data
})

// Use the SDK
const users = await sdk.GetUsers()
const newUser = await sdk.CreateUser({ 
  name: "John Doe", 
  email: "john@example.com" 
})
```

### React Hooks Usage

The hooks.ts file provides React-specific utilities for using the SDK:

#### useSwrWithGraphqlSdk

This hook integrates with SWR for caching and revalidation:

```typescript
import { useSwrWithGraphqlSdk } from './lib/hooks'

function UserList() {
  // Fetch all users
  const { data, error, isLoading } = useSwrWithGraphqlSdk(
    'GetUsers',
    {} // parameters (empty object for queries without variables)
  )
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return (
    <ul>
      {data?.users.map(user => (
        <li key={user.id}>{user.name} - {user.email}</li>
      ))}
    </ul>
  )
}

// Query with parameters
function UserDetail({ userId }: { userId: string }) {
  const { data, error, isLoading } = useSwrWithGraphqlSdk(
    'GetUser',
    { id: userId } // Pass undefined to skip the query
  )
  
  return <div>{data?.users_by_pk?.name}</div>
}
```

#### useGraphqlSubscription

For real-time updates using WebSocket subscriptions:

```typescript
import { useGraphqlSubscription } from './lib/hooks'

function LiveUserProfile({ userId }: { userId: string }) {
  const { data, error } = useGraphqlSubscription(
    'UserUpdates',
    { id: userId }
  )
  
  if (error) return <div>Error: {error}</div>
  
  return (
    <div>
      <h2>Live User Data:</h2>
      <p>Name: {data?.users_by_pk?.name}</p>
      <p>Email: {data?.users_by_pk?.email}</p>
    </div>
  )
}

// Subscription for all users
function LiveUsersList() {
  const { data, error } = useGraphqlSubscription(
    'AllUsersUpdates',
    {} // empty object for subscriptions without variables
  )
  
  return (
    <div>
      <h2>All Users (Live):</h2>
      {data?.users.map(user => (
        <div key={user.id}>
          {user.name} ({user.email})
        </div>
      ))}
    </div>
  )
}
```

### Authentication

The hooks support JWT-based authentication. Update the hooks to use your authentication provider:

```typescript
// In hooks.ts, update the useGraphqlUser and useGraphqlSdk hooks
// to get the JWT token from your auth provider:

export const useGraphqlSdk = (role?: string) => {
  const sessionJwt = useAuth().token // Replace with your auth provider
  return useMemo(() => {
    if (!sessionJwt) return null;
    return getSdk(getHasuraRequester(GRAPHQL_API_URL, role, sessionJwt));
  }, [sessionJwt, role]);
};
```
