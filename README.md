# @intlabs/graphql-sdk

A TypeScript-first code generation library that creates a fully typed SDK for your Hasura GraphQL queries and mutations. This dev dependency tool generates type-safe client code, React hooks, and utilities to streamline your GraphQL development workflow.

## Features

- **Type-safe SDK generation** - Generate fully typed GraphQL client from your queries and mutations
- **React integration** - Built-in SWR hooks and WebSocket subscription wrappers
- **Flexible configuration** - Configure via `package.json` or `.graphql-sdk.json`
- **TypeScript-first** - Full TypeScript support with comprehensive type definitions
- **Type guards** - Reusable type guard utilities for runtime type checking
- **File-based queries** - Organize your GraphQL operations in separate files

## Under the Hood

This project wraps [GraphQL Codegen](https://the-guild.dev/graphql/codegen) by [The Guild](https://the-guild.dev/), providing a streamlined Hasura-specific configuration with working examples for type-safe react hooks. The CLI programmatically calls GraphQL Codegen, making it easier to use as a standalone tool.

### Integration with Existing Codegen Projects

If you're already using GraphQL Codegen in your project, you can integrate this SDK's functionality directly:

- **Use the codegen config**: Import and use the configuration from `codegen.ts` in your existing codegen setup
- **Use the plugins**: The SDK includes custom plugins (like the subscription document lookup plugin) that can be added to your existing codegen configuration

## Installation

```bash
npm install --save-dev @intlabs/graphql-sdk
```

## Quick Start

1. **Create your GraphQL operations** in a dedicated folder (e.g., `./graphql/`):

```graphql
# graphql/users.graphql
query GetUsers {
  users {
    id
    name
    email
  }
}

mutation CreateUser($name: String!, $email: String!) {
  insert_users_one(object: { name: $name, email: $email }) {
    id
    name
    email
  }
}
```

2. **Add the script to your `package.json`**:

```json
{
  "scripts": {
    "graphql-sdk": "graphql-sdk generate"
  }
}
```

3. **Configure the SDK** (see [Configuration](#configuration) below)

4. **Generate your SDK**:

```bash
npm run graphql-sdk
```

## Usage

### CLI Usage

#### Using npm script (recommended):
```bash
# Generate SDK
npm run graphql-sdk

# Copy React hooks to your project
npm run graphql-sdk snippet hooks
```

#### Using npx with inline options:
```bash
# Generate SDK
npx @intlabs/graphql-sdk generate \
  --graphqlDir="./graphql" \
  --hasura_url="http://localhost:8080/v1/graphql" \
  --hasura_admin_token="your-admin-token" \
  --outputDir="./app/lib"

# Copy React hooks
npx @intlabs/graphql-sdk snippet hooks \
  --outputDir="./app/lib"
```

### Using the Generated SDK

Once generated, you can import and use your typed SDK:

```typescript
import { getSdk } from './app/lib/sdk'

// Initialize the SDK with a requester
const sdk = getSdk(async (doc, variables) => {
  const response = await fetch('http://localhost:8080/v1/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hasura-admin-secret': 'your-admin-token'
    },
    body: JSON.stringify({
      query: doc.loc?.source.body,
      variables
    })
  })
  return (await response.json()).data
})

// Fully typed queries and mutations
const users = await sdk.GetUsers()
const newUser = await sdk.CreateUser({ 
  name: "John Doe", 
  email: "john@example.com" 
})
```

### React Integration

First, copy the React hooks to your project using the snippet command:

```bash
npm run graphql-sdk snippet hooks
```

This command copies a `hooks.ts` file to your project that provides utility functions for using your GraphQL SDK with React. The hooks file includes:
- `useSwrWithGraphqlSdk` - Integration with SWR for queries
- `useGraphqlSubscription` - WebSocket subscriptions support
- `useGraphqlSdk` - Memoized SDK instance with authentication
- Helper functions for authentication and role-based access

After copying the hooks, install the required dependencies:

```bash
npm install swr graphql-ws
```

#### useSwrWithGraphqlSdk Hook

This hook integrates your GraphQL SDK with SWR for efficient data fetching with caching:

```typescript
import { useSwrWithGraphqlSdk } from './app/lib/hooks'

function UsersList() {
  const { data, error, isLoading } = useSwrWithGraphqlSdk(
    'GetUsers', 
    {} // params - pass undefined to skip the query
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

// With parameters
function UserProfile({ userId }: { userId: string }) {
  const { data, error, isLoading } = useSwrWithGraphqlSdk(
    'GetUser',
    { id: userId } // typed parameters
  )
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <div>{data?.users_by_pk?.name}</div>
}
```

#### useGraphqlSubscription Hook

For real-time updates using WebSocket subscriptions:

```typescript
import { useGraphqlSubscription } from './app/lib/hooks'

function LiveUserProfile({ userId }: { userId: string }) {
  const { data, error } = useGraphqlSubscription(
    'UserUpdates',
    { id: userId } // subscription variables
  )
  
  if (error) return <div>Error: {error}</div>
  
  return (
    <div>
      <h2>{data?.users_by_pk?.name}</h2>
      <p>{data?.users_by_pk?.email}</p>
    </div>
  )
}

// Subscription without parameters
function LiveUsersList() {
  const { data, error } = useGraphqlSubscription(
    'AllUsersUpdates',
    {} // empty params for subscriptions without variables
  )
  
  return (
    <div>
      {data?.users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  )
}
```

## Configuration

Configure the SDK generation using one of these methods:

### Option 1: package.json
```json
{
  "graphql-sdk": {
    "graphqlDir": "./graphql",
    "hasura_url": "http://localhost:8080/v1/graphql",
    "hasura_admin_token": "your-admin-token",
    "outputDir": "./app/lib"
  }
}
```

### Option 2: .graphql-sdk.json
```json
{
  "graphqlDir": "./graphql",
  "hasura_url": "http://localhost:8080/v1/graphql",
  "hasura_admin_token": "your-admin-token",
  "outputDir": "./app/lib"
}
```

### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `graphqlDir` | `string` | ✅ | Path to directory containing GraphQL files |
| `hasura_url` | `string` | ✅ | Your Hasura GraphQL endpoint URL |
| `hasura_admin_token` | `string` | ✅ | Hasura admin secret token |
| `outputDir` | `string` | ✅ | Output directory for generated SDK and hooks files |

**Note**: The `outputDir` configuration is used by both commands:
- `generate` command: Creates `sdk.ts` file in this directory
- `snippet hooks` command: Creates `hooks.ts` file in this directory

## Type Guards

The library includes reusable type guard utilities for runtime type checking:

```typescript
import { isUser, isUserArray } from './app/lib/sdk'

// Type guard for single user
if (isUser(data)) {
  // data is now typed as User
  console.log(data.name)
}

// Type guard for user arrays
if (isUserArray(data)) {
  // data is now typed as User[]
  data.forEach(user => console.log(user.email))
}
```

## Environment Variables

For security, you can use environment variables for sensitive configuration:

```bash
# .env
HASURA_GRAPHQL_ADMIN_SECRET=your-secret-token
HASURA_GRAPHQL_ENDPOINT=http://localhost:8080/v1/graphql
```

Then reference them in your configuration:

```json
{
  "graphqlDir": "./graphql",
  "hasura_url": "${HASURA_GRAPHQL_ENDPOINT}",
  "hasura_admin_token": "${HASURA_ADMIN_SECRET}",
  "outputDir": "./app/lib"
}
```

## Requirements

- Node.js 16+ 
- TypeScript 4.5+
- A Hasura v2 instance
- GraphQL query/mutation files

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

BSD 3-Clause "New" or "Revised" License - see [LICENSE](LICENSE) file for details.
