// Main entry point for the library
export { default as codegenConfig } from './codegen';
export { default as SubscriptionDocLookupPlugin } from './plugins/subscription-doc-lookup';
export { createCodegenConfig, createSerializableConfig, type GraphQLSDKOptions } from './config-factory';
