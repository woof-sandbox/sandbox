# WOOF Sandbox - DeFi Protocol

A decentralized finance protocol built on Arbitrum that provides lending and borrowing services with advanced configuration management and governance features.

## 🚀 Features

- **Multi-Collateral Lending**: Support for multiple collateral assets with configurable parameters
- **Dynamic Interest Rates**: Interest rate curves based on utilization rates
- **Governance System**: Proposal-based configuration changes with curator and owner roles
- **Fee Management**: Configurable fee distribution between reserves, protocol, and controllers
- **Factory Pattern**: Clone-based deployment for efficient gas usage
- **Price Feed Integration**: Support for multiple price feed types and scaling mechanisms

## 🏗️ Architecture

### Core Contracts

#### Comet Protocol
- **[SandboxComet.sol](./contracts/SandboxComet.sol)** - Main lending/borrowing contract with core DeFi functionality
- **[CometCore.sol](./contracts/CometCore.sol)** - Abstract contract with shared functions and constants
- **[CometStorage.sol](./contracts/CometStorage.sol)** - Storage layout and state variables
- **[CometMath.sol](./contracts/CometMath.sol)** - Mathematical utilities and calculations
- **[SandboxCometFactory.sol](./contracts/SandboxCometFactory.sol)** - Factory for deploying new Comet instances

#### Configuration Management
- **[SandboxController.sol](./contracts/SandboxController.sol)** - Protocol-level configuration and asset whitelisting
- **[ConfigControllerFactory.sol](./contracts/ConfigControllerFactory.sol)** - Factory for deploying ConfigController instances
- **[ConfigController.sol](./contracts/ConfigController.sol)** - Individual controller for managing Comet deployments and proposals

#### Supplementary
- **[BaseBulker.sol](./contracts/bulkers/BaseBulker.sol)** - Batch transaction execution for multiple Comet operations

## 🛠️ Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Yarn or npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sandbox
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Setup Git hooks**
   ```bash
   yarn setup:hooks
   ```

4. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Required
   ETHERSCAN_KEY=<your-etherscan-api-key>
   ANKR_KEY=<your-ankr-api-key>
   
   # Optional
   SNOWTRACE_KEY=<your-snowtrace-api-key>
   COINMARKETCAP_API_KEY=<your-coinmarketcap-api-key>
   REPORT_GAS=true
   ETH_PK=<your-private-key>
   MNEMONIC=<your-mnemonic-phrase>
   ```

## 🔧 Development

### Available Scripts

#### Build & Test
```bash
yarn build          # Compile contracts
yarn test           # Run all tests
yarn test:coverage  # Run tests with coverage report
```

#### Code Quality
```bash
yarn lint:ts        # TypeScript/JavaScript linting
yarn lint:sol       # Solidity linting
yarn prettier:sol   # Format Solidity files
yarn prettier:ts    # Format TypeScript files
```

#### Security & Analysis
```bash
yarn slither        # Static analysis with Slither
yarn aderyn         # Static analysis with Aderyn
```

#### Deployment
```bash
yarn deploy         # Deploy contracts
```

### Git Hooks

The repository uses Git hooks to ensure code quality:

#### Pre-commit Hook
- TypeScript compilation check
- ESLint on staged files
- Solhint on staged Solidity files
- Prettier formatting

#### Pre-push Hook
- Comprehensive TypeScript compilation
- Full ESLint and Solhint checks
- All tests execution
- Coverage verification
- **Aderyn security report generation**
- Artifact cleanup

**Skip hooks (if needed):**
```bash
git commit -n -m "commit without pre-commit checks"
git push --no-verify
```

## 🛡️ Branch Protection

This repository implements strict branch protection rules to maintain code quality:

### Protected Branches
- `main` - Production-ready code
- `dev` - Development branch

### Required Checks
- ✅ **CI / test** - All tests must pass
- ✅ **CI / security** - Security analysis must pass
- ✅ **CI / coverage** - Coverage requirements must be met
- ✅ **Merge Protection / merge-checks** - Merge validation
- ✅ **Prettier Check / prettier-check** - Code formatting

### Protection Rules
- [x] Require pull request before merging
- [x] Require status checks to pass
- [x] Require branches to be up to date
- [x] Require conversation resolution
- [x] Require signed commits
- [x] Require linear history
- [x] Include administrators in restrictions

## 📋 Development Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push and create pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Code review and CI checks**
   - All automated checks must pass
   - Code review by team members
   - Address any feedback

5. **Merge to dev branch**
   - Only after all checks pass
   - Maintain linear history

## 🔍 Code Quality Tools

### Linting
- **ESLint** - TypeScript/JavaScript code quality
- **Solhint** - Solidity code quality and security

### Static Analysis
- **Slither** - Solidity vulnerability detection
- **Aderyn** - Advanced Solidity analysis

### Formatting
- **Prettier** - Consistent code formatting
- **Prettier Solidity Plugin** - Solidity-specific formatting

### Testing
- **Hardhat** - Development environment
- **Mocha** - Test framework
- **Chai** - Assertion library

### Numbered Test Files

The project includes a series of **numbered test files** that are essential for protocol functionality and must always pass:

#### Core Test Suite (01-17)
These tests are explicitly included in `tsconfig.json` and are checked during:
- TypeScript compilation
- Pre-commit hooks
- CI/CD pipeline

**Test Files:**
- `01_system-initialization-test.ts` - System setup and initialization
- `02_system-params-validation-test.ts` - Parameter validation
- `03_sandbox-controller-test.ts` - Controller functionality
- `04_config-controller-test.ts` - Configuration management
- `5_supply-test.ts` - Supply operations
- `6_withdraw-test.ts` - Withdrawal operations
- `7_absorb-test.ts` - Absorption mechanics
- `8_comet-ext-test.ts` - Comet extensions
- `9_asset-info-test.ts` - Asset information
- `10_is-liquidatable-test.ts` - Liquidation checks
- `11_is-borrow-collateralized-test.ts` - Collateralization validation
- `12_reserves-test.ts` - Reserve management
- `13_allow-by-sig-test.ts` - Signature-based allowances
- `14_update-assets-in-test.ts` - Asset updates
- `15_quote-collateral-test.ts` - Collateral quoting
- `16_buy-collateral-test.ts` - Collateral purchasing
- `17_set-controller-fee.ts` - Fee configuration

#### Why These Tests Matter
- **Protocol Integrity**: These tests ensure core DeFi functionality works correctly
- **Safety**: Critical for preventing bugs in lending/borrowing operations
- **Compliance**: Required for maintaining protocol security standards
- **CI/CD**: Must pass before any deployment or merge

#### Running Numbered Tests
```bash
# Run all numbered tests
yarn test

# Run specific numbered test
npx hardhat test test/01_system-initialization-test.ts

# Check TypeScript compilation (includes all numbered tests)
npx tsc
```

## 📚 Documentation

- **[SPEC.md](./SPEC.md)** - Detailed protocol specification
- **[deploy-flow.md](./deploy-flow.md)** - Deployment instructions
- **[ADERYN_REPORT.md](./ADERYN_REPORT.md)** - Security analysis report

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all tests pass
5. Submit a pull request

### Commit Convention
Use conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Maintenance tasks

## 📄 License

This project is licensed under the BUSL-1.1 License - see the [LICENSE](./LICENSE) file for details.

## 🆘 Support

For questions and support:
- Create an issue in the repository
- Check the documentation in the `docs/` directory
- Review the specification in `SPEC.md`
# Test comment
