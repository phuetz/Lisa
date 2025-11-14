# Contributing to Lisa

First off, thank you for considering contributing to Lisa! It's people like you that make Lisa such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to fostering an open and welcoming environment. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Git
- Modern browser (Chrome, Firefox, Safari, Edge)
- Basic knowledge of TypeScript and React

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Lisa.git
   cd Lisa
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment**
   ```bash
   cp .env.example .env.local
   # Fill in your API keys
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Screenshots** if applicable
- **Environment details** (browser, OS, Node version)

**Bug Report Template:**
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g. macOS 13.0]
 - Browser: [e.g. Chrome 120]
 - Node version: [e.g. 18.17.0]
 - Lisa version: [e.g. 3.3.0]
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case** and motivation
- **Proposed solution** (if you have one)
- **Alternative solutions** considered

### Contributing Code

1. **Find or Create an Issue**
   - Look for issues tagged `good first issue` or `help wanted`
   - Or create a new issue describing what you want to work on

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Make Your Changes**
   - Write clean, documented code
   - Follow our coding standards
   - Add tests for new features
   - Update documentation

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation changes
   - `style:` formatting, missing semicolons, etc.
   - `refactor:` code restructuring
   - `test:` adding tests
   - `chore:` maintenance tasks

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Standards

### TypeScript

- Use **TypeScript strict mode**
- Define types for all function parameters and return values
- Avoid `any` - use `unknown` or proper types
- Use interfaces for object shapes

**Good:**
```typescript
interface UserData {
  id: string;
  name: string;
  email: string;
}

function processUser(user: UserData): string {
  return `${user.name} (${user.email})`;
}
```

**Bad:**
```typescript
function processUser(user: any) {
  return user.name + ' ' + user.email;
}
```

### React Components

- Use **functional components** with hooks
- Extract complex logic into custom hooks
- Use memo/useMemo/useCallback appropriately
- Keep components small and focused

**Good:**
```typescript
interface Props {
  userId: string;
  onUpdate: (data: UserData) => void;
}

export function UserProfile({ userId, onUpdate }: Props) {
  const { user, loading } = useUser(userId);

  if (loading) return <Spinner />;
  return <div>{user.name}</div>;
}
```

### Utilities

- Add **JSDoc comments** for all exported functions
- Include usage examples in comments
- Export types alongside implementations
- Use descriptive parameter names

**Template:**
```typescript
/**
 * Retries an async operation with exponential backoff
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Result with success status and data/error
 *
 * @example
 * const result = await retryWithBackoff(
 *   async () => fetch('/api/data'),
 *   { maxAttempts: 3 }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  // Implementation...
}
```

### File Organization

```
src/
├── agents/           # Agent implementations
├── components/       # React components
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
│   ├── __tests__/   # Unit tests
│   └── index.ts     # Central exports
├── workflow/         # Workflow system
├── types/            # TypeScript type definitions
└── main.tsx         # App entry point
```

### Naming Conventions

- **Files**: camelCase for utilities, PascalCase for components
  - `retry.ts`, `UserProfile.tsx`
- **Functions**: camelCase
  - `retryWithBackoff()`, `useAnalytics()`
- **Classes**: PascalCase
  - `CircuitBreaker`, `ModelCache`
- **Constants**: UPPER_SNAKE_CASE
  - `MAX_RETRIES`, `DEFAULT_TIMEOUT`
- **Types/Interfaces**: PascalCase
  - `RetryOptions`, `UserData`

## Testing Guidelines

### Unit Tests

- Write tests for all new utilities
- Aim for 80%+ code coverage
- Test edge cases and error conditions
- Use descriptive test names

**Template:**
```typescript
describe('retryWithBackoff', () => {
  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(fn);

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');

    const result = await retryWithBackoff(fn, { maxAttempts: 3 });

    expect(result.success).toBe(true);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific file
npm test validation.test.ts
```

### Test Structure

- **Arrange**: Set up test data and mocks
- **Act**: Execute the code being tested
- **Assert**: Verify the results

### Using Test Helpers

```typescript
import {
  wait,
  createFlakeyMock,
  mockLocalStorage
} from './testHelpers';

describe('MyFeature', () => {
  beforeEach(() => {
    mockLocalStorage(); // Mock localStorage
  });

  it('should handle flaky operations', async () => {
    // Mock that fails 2 times then succeeds
    const fn = createFlakeyMock('success', 2);

    const result = await retryWithBackoff(fn, { maxAttempts: 5 });

    expect(result.success).toBe(true);
  });
});
```

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] No console errors
- [ ] Lint passes (`npm run lint`)

### PR Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran.

## Checklist:
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process

1. **Automated Checks**
   - All tests must pass
   - Linting must pass
   - Build must succeed

2. **Code Review**
   - At least one approval required
   - Address all comments
   - Maintain respectful dialogue

3. **Merge**
   - Squash and merge for feature branches
   - Include issue number in commit message

## Project Structure

### Key Directories

- **`src/agents/`** - Agent implementations (44 specialized agents)
- **`src/components/`** - React UI components
- **`src/hooks/`** - Custom React hooks (33+ hooks)
- **`src/utils/`** - Utility functions and tools
- **`src/workflow/`** - Workflow system and templates
- **`tests/`** - Integration and E2E tests
- **`public/`** - Static assets and Service Worker

### Important Files

- **`src/utils/index.ts`** - Central export file
- **`src/main.tsx`** - App entry point
- **`vite.config.ts`** - Build configuration
- **`vitest.config.ts`** - Test configuration

## Development Workflow

### Feature Development

1. Create feature branch
2. Implement feature with tests
3. Update documentation
4. Create PR
5. Address review comments
6. Merge when approved

### Bug Fixes

1. Create issue if doesn't exist
2. Create fix branch
3. Write test reproducing bug
4. Fix bug
5. Verify test passes
6. Create PR

### Adding a New Agent

1. Create agent class in `src/agents/`
   ```typescript
   export class MyAgent implements BaseAgent {
     name = 'MyAgent';
     async execute(input: any) { /* ... */ }
   }
   ```

2. Register in `src/agents/registry.ts`
   ```typescript
   agentRegistry.register(new MyAgent());
   ```

3. Add to lazy loader in `src/utils/lazyAgent.ts`

4. Write tests in `tests/agents/`

5. Update documentation

### Adding a New Utility

1. Create utility file in `src/utils/`
2. Add JSDoc comments
3. Export from `src/utils/index.ts`
4. Write tests in `src/utils/__tests__/`
5. Add usage examples to `EXAMPLES.md`

## Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Questions?

- Check existing documentation (IMPROVEMENTS.md, EXAMPLES.md)
- Search existing issues
- Create a new issue with the `question` label

## Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes for their contributions
- CHANGELOG.md

Thank you for contributing to Lisa! 🎉
