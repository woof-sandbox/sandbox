# Branch Protection & CI/CD Setup

This document outlines the branch protection rules and CI/CD workflow for the WOOF Sandbox repository.

## 🛡️ Branch Protection Rules

### Protected Branches
- `main` - Production-ready code (requires admin approval for changes)
- `dev` - Development branch (primary development target)

### Required Status Checks

The following status checks must pass before merging:

#### Core Checks
- ✅ **CI / test** - Runs all tests and ensures they pass
- ✅ **CI / security** - Security analysis with Slither and Aderyn
- ✅ **CI / coverage** - Code coverage verification (minimum 80%)
- ✅ **Merge Protection / merge-checks** - Validates merge requirements
- ✅ **Prettier Check / prettier-check** - Code formatting validation

#### Additional Checks
- ✅ **TypeScript Compilation** - Ensures TypeScript code compiles correctly
- ✅ **Solidity Compilation** - Ensures Solidity contracts compile without errors
- ✅ **Linting** - ESLint and Solhint checks pass
- ✅ **Documentation** - Ensures documentation is up to date

## 🔧 GitHub Actions Workflows

### CI Workflow (`ci.yml`)
**Triggers:** Push to any branch, Pull Request

**Jobs:**
1. **test** - Runs all tests with coverage
2. **security** - Static analysis with Slither and Aderyn
3. **coverage** - Generates and validates coverage reports

### Prettier Check (`prettier-check.yml`)
**Triggers:** Pull Request

**Purpose:** Ensures code formatting consistency

### Merge Protection (`merge-protection.yml`)
**Triggers:** Pull Request

**Purpose:** Validates merge requirements and branch status

## 📋 Branch Protection Configuration

### Settings to Enable

#### ✅ Required Settings:
- [x] **Require a pull request before merging**
  - Dismiss stale PR approvals when new commits are pushed
  - Require review from code owners
  - Require at least 1 approving review
  - Require review from at least 1 code owner

- [x] **Require status checks to pass before merging**
  - Require branches to be up to date before merging
  - Status checks that are required:
    ```
    CI / test
    CI / security
    CI / coverage
    Merge Protection / merge-checks
    Prettier Check / prettier-check
    ```

- [x] **Require conversation resolution before merging**
- [x] **Require signed commits**
- [x] **Require linear history**
- [x] **Include administrators**

#### 🔒 Additional Settings:
- [x] **Restrict pushes that create files that are larger than 100 MB**
- [x] **Restrict pushes that create files with a path length greater than 255 characters**
- [x] **Allow force pushes** - Disabled for all users
- [x] **Allow deletions** - Disabled for all users

### Code Owner Configuration

Create `.github/CODEOWNERS` file:
```
# Global code owners
* @woof-team

# Solidity contracts
/contracts/ @solidity-team

# Tests
/test/ @test-team

# Documentation
/docs/ @docs-team
```

## 🚀 Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/your-feature-name
```

### 2. Pull Request Process
1. **Create PR** to `dev` branch
2. **Automated checks run:**
   - Prettier formatting
   - Linting (ESLint + Solhint)
   - TypeScript compilation
   - Solidity compilation
   - Tests execution
   - Security analysis
   - Coverage reporting
3. **Code review** by team members
4. **Address feedback** and update PR
5. **All checks must pass** before merge
6. **Merge to dev** branch

### 3. Release Process
1. **Create release branch** from `dev`
2. **Final testing** and validation
3. **Create PR** to `main` branch
4. **Admin approval** required
5. **Merge to main** for production

## 📊 Quality Gates

### Test Coverage Requirements
- **Minimum coverage:** 80%
- **Critical functions:** 100% coverage required
- **New features:** Must include tests

### Security Requirements
- **Slither analysis:** No high/critical vulnerabilities
- **Aderyn analysis:** No high/critical issues
- **Code review:** All changes reviewed by at least 2 team members

### Code Quality Requirements
- **Linting:** No ESLint or Solhint errors
- **Formatting:** Prettier formatting applied
- **Documentation:** New functions documented
- **Type safety:** TypeScript strict mode enabled

## 🔍 Monitoring & Alerts

### Failed Checks
- Automated notifications for failed CI checks
- Slack/Discord integration for team alerts
- Email notifications for critical failures

### Performance Monitoring
- Build time tracking
- Test execution time monitoring
- Coverage trend analysis

## 🛠️ Local Development Setup

### Pre-commit Setup
```bash
# Install pre-commit hooks
yarn setup:hooks

# Verify hooks are working
git commit -m "test: verify hooks"
```

### Running Checks Locally
```bash
# Run all checks
yarn lint:ts && yarn lint:sol && yarn test && yarn build

# Run security analysis
yarn slither && yarn aderyn

# Check formatting
yarn prettier:check
```

## 📈 Benefits

This setup ensures:
- ✅ **Code Quality** - All code is reviewed and tested
- ✅ **Security** - Automated security checks prevent vulnerabilities
- ✅ **Consistency** - Standardized formatting and linting
- ✅ **Reliability** - Comprehensive testing prevents regressions
- ✅ **Documentation** - Automated documentation generation
- ✅ **Compliance** - Audit trail for all changes
- ✅ **Collaboration** - Clear review process for team members

## 🔧 Troubleshooting

### Common Issues

#### Pre-commit Hook Failures
```bash
# Skip pre-commit hook (emergency only)
git commit -n -m "emergency fix"

# Fix formatting issues
yarn prettier:sol && yarn prettier:ts
```

#### CI Check Failures
1. Check the specific error in GitHub Actions
2. Run the failing check locally
3. Fix the issue and push changes
4. Re-run the check

#### Merge Conflicts
1. Rebase your branch on the latest dev
2. Resolve conflicts
3. Push updated branch
4. Re-request review if needed

## 📞 Support

For issues with branch protection or CI/CD:
- Create an issue with the `ci/cd` label
- Contact the DevOps team
- Check the GitHub Actions logs for detailed error information 