# Contributing to Hasura GraphQL SDK

## 🚀 Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/hasura-graphql-sdk.git
   cd hasura-graphql-sdk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Set up the example project** (optional)
   ```bash
   cd example
   npm install
   # Start Hasura locally with Docker
   docker-compose up -d
   # Run the initial Hasura setup
   npm run hasura-setup
   ```

## 💻 Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, concise commit messages
   - Follow the existing code style
   - Add/update documentation as needed

3. **Build and test**
   ```bash
   npm run build
   # Test with the example project
   cd example
   #if you modified the sdk codegen
   npm run graphql-sdk
   #if you modified the hooks snippet (or added another snippet)
   npm run graphql-sdk:hooks
   npm run dev
   ```
   Note, the hooks snippet is slightly different in the example directory for easier demo setup

4. **Format your code**
   ```bash
   npx prettier --write "src/**/*.ts"
   ```

## 📝 Code Style

- TypeScript strict mode enabled
- Use Prettier for formatting (config in package.json)
- Follow existing patterns in the codebase
- Use meaningful variable and function names

## 🔄 Pull Request Process

1. **Before submitting:**
   - Ensure your code builds without errors
   - Update README.md if you've added new features
   - Add/update TypeScript types as needed
   - Test your changes with the example project

2. **PR Guidelines:**
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changes you've made and why
   - Include screenshots for UI changes (if applicable)
   - Keep PRs focused - one feature/fix per PR

## 🐛 Reporting Issues

**Before creating an issue:**
- Check existing issues to avoid duplicates
- Try to reproduce with the latest version

## 📂 Project Structure

```
src/
├── cli.ts              # CLI entry point
├── codegen.ts          # Code generation logic
├── config.ts           # Configuration management
├── index.ts            # Main export
└── plugins/            # Custom plugins

example/                # Example Next.js app
├── src/
│   ├── graphql/       # GraphQL operations
│   └── lib/           # SDK integration
└── hasura-project/    # Hasura metadata
```

## 📜 License

By contributing, you agree that your contributions will be licensed under the BSD-3-Clause License.

## 🤝 Community

- Be respectful and inclusive
- Help others when you can

## 💡 Need Help?

- Check the [README](README.md) for documentation
- Look at existing issues and PRs
- Ask questions in issues with the "question" label
