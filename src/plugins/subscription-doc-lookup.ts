import { PluginFunction, Types } from '@graphql-codegen/plugin-helpers';
import { GraphQLSchema } from 'graphql';

const plugin: PluginFunction = (
  _schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  _config: any,
): string => {
  const subscriptionEntries = documents
    .flatMap((doc) => doc.document?.definitions ?? [])
    .filter(
      (def) =>
        def.kind === 'OperationDefinition' && def.operation === 'subscription',
    )
    .map((def) => {
      if (def.kind === 'OperationDefinition' && def.name) {
        const opName = def.name.value;
        return `  ${opName}: ${opName}Document,`;
      }
      return null;
    })
    .filter((line): line is string => Boolean(line));

  return `
export const HasuraGraphqlSubscriptionDocumentLookup = {
${subscriptionEntries.join('\n')}
} as const;
`;
};

export default { plugin };
