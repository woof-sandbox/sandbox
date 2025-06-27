# Branch Protection Setup

To ensure code quality and prevent broken code from being merged, set up the following branch protection rules for the `dev` branch:

## Required Status Checks

Enable the following status checks to be required before merging:

- **CI / test** - Ensures all tests pass
- **CI / security** - Ensures security checks pass
- **CI / coverage** - Ensures coverage reports are generated
- **Merge Protection / merge-checks** - Ensures all merge checks pass
- **Prettier Check / prettier-check** - Ensures code formatting is correct

## Branch Protection Rules

1. Go to your repository settings
2. Navigate to "Branches" → "Branch protection rules"
3. Add rule for `dev` branch
4. Enable the following options:

### ✅ Required Settings:
- [x] **Require a pull request before merging**
- [x] **Require status checks to pass before merging**
- [x] **Require branches to be up to date before merging**
- [x] **Require conversation resolution before merging**
- [x] **Require signed commits**
- [x] **Require linear history**
- [x] **Include administrators**

### 🔒 Additional Settings:
- [x] **Restrict pushes that create files that are larger than 100 MB**
- [x] **Restrict pushes that create files with a path length greater than 255 characters**

## Status Check Configuration

Add these status checks to the required list:

```
CI / test
CI / security  
CI / coverage
Merge Protection / merge-checks
Prettier Check / prettier-check
```

## Benefits

This setup ensures:
- ✅ All code is reviewed before merging
- ✅ All tests pass before merging
- ✅ Code formatting is consistent
- ✅ Security checks are performed
- ✅ No merge conflicts are allowed
- ✅ Documentation is generated
- ✅ Build artifacts are cleaned

## Workflow Summary

1. **Developer creates feature branch**
2. **Makes changes and commits**
3. **Creates pull request to dev**
4. **GitHub Actions run automatically:**
   - Prettier formatting checks
   - Linting (ESLint + Solhint)
   - TypeScript compilation
   - Tests execution
   - Security analysis
   - Coverage reporting
   - Documentation generation
5. **Code review by team members**
6. **All checks must pass before merge**
7. **Merge to dev branch** 