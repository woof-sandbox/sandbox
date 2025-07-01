# Compound Comet

## Getting started

1. Clone the repo  
2. Run `yarn` or `yarn install` to install dependencies

> ℹ️ **Note:** External dependencies required for the project are configured as Git submodules.  
> They will be automatically initialized and updated before installing main packages  
> via the `preinstall` script when you run `yarn`.

## Env variables

The following env variables are used in the repo. One way to set up these env
variables is to create a `.env` in the root directory of this repo.

Required env variables:

```
ETHERSCAN_KEY=<key>
ANKR_KEY=<key>
```

Optional env variables:

```
SNOWTRACE_KEY=<key>
COINMARKETCAP_API_KEY=<key>
REPORT_GAS=true
ETH_PK=<eth-key>             # takes precedence over MNEMONIC
MNEMONIC=<mnemonic>
```

## Git hooks

The repo's Git hooks are defined the `.githooks/` directory.

You can enable them by running:

```
# requires git version 2.9 or greater
git config core.hooksPath .githooks
```

You can skip pre-commit checks with the `-n` flag:

```
git commit -n -m "commit without running pre-commit hook"
```

## Additional Tools

This project provides several tools for code quality, security, and coverage. Below are the main tools, what they do, and how to run them.

#### Linter

- **TypeScript/JavaScript Linter**

  - **Command:** `lint:ts`
  - **What it does:** Runs ESLint on all TypeScript and JavaScript files to enforce code style and catch errors.
  - **How to run:**
    ```
    npm run lint:ts
    ```

- **Solidity Linter**
  - **Command:** `lint:sol`
  - **What it does:** Runs Solhint on all Solidity contracts using the `.solhint.json` configuration.
  - **How to run:**
    ```
    npm run lint:sol
    ```

#### Slither (Static Analysis)

- **Command:** `slither`
- **What it does:** Runs Slither, a static analysis tool for Solidity, to detect vulnerabilities and code quality issues.
- **How to run:**
  ```
  npm run slither
  ```
- **Note:**  
  Slither must be installed separately (e.g., via `pip install slither-analyzer`).  
  The command analyzes the `contracts/` directory and outputs to `artifacts/`.

#### Coverage

- **Command:** `test:coverage`
- **What it does:** Runs tests and generates a code coverage report for Solidity contracts.
- **How to run:**
  ```
  npm run test:coverage
  ```
- **Output:**  
  Coverage results are saved in the `coverage/` directory or printed in the terminal.

#### Aderyn

- **Command:** `aderyn`
- **What it does:** Runs Aderyn, a static analysis tool for Solidity, to detect vulnerabilities and code quality issues.
- **How to run:**
  ```
  npm run aderyn
  ```
- **Note:**  
  Aderyn must be installed separately (e.g., via `brew install cyfrin/tap/aderyn`).  
  Aderyn installation [docs](https://github.com/Cyfrin/aderyn)

**Tip:**  
All commands are run from the project root. If you use yarn instead of npm, replace `npm run <command>` with `yarn <command>`.

## Comet protocol contracts

**[SandboxComet.sol](./contracts/SandboxComet.sol)** - Contract that inherits `ISandboxComet.sol` and is the implementation for most of Comet's core functionalities.

**[CometCore.sol](./contracts/CometCore.sol)** - Abstract contract that inherits `CometStorage.sol`, and `CometMath.sol`. This contracts contains functions and constants that are shared for `SandboxComet.sol`.

**[CometStorage.sol](./contracts/CometStorage.sol)** - Contract that defines the storage variables used for the Comet protocol.

**[CometMath.sol](./contracts/CometMath.sol)** - Contract that defines math functions that are used throughout the Comet codebase.

**[SandboxCometFactory](./contracts/SandboxCometFactory.sol)** - Factory contract that inherits `ISandboxCometFactory.sol` and is used creating new comet instances using the clone pattern.

## Configurator contracts

**[SandboxController](./contracts/SandboxController.sol)** - Contract that inherits `ISandboxController.sol` and `ISandboxErrors.sol` and is used for protocol configurations, whitelisting base and collateral assets that can be used in comet.

**[ConfigControllerFactory](./contracts/ConfigControllerFactory.sol)** - Contract that inherits `IConfigControllerFactory.sol` and is used for deploying `ConfigController.sol` contract via clone proxy pattern.

**[ConfigController](./contracts/ConfigController.sol)** - Contract that inherits `IConfigController.sol` and is used for deploying a new comet via `SandboxCometFactory.sol` contract.

## Supplementary contracts

**[BaseBulker.sol](./contracts/bulkers/BaseBulker.sol)** - Contract that allows multiple Comet functions to be called in a single transaction.

## Usage

Look at the scripts section inside `package.json` to find all commands.

### Build contracts

Compiles contracts.

`yarn build`

### Run tests

Runs all tests in the `test` directory.

`yarn test`

### Run tests with coverage tool

Runs all tests while also evaluating code coverage.

`yarn test:coverage`

The coverage report will be saved in the `coverage` directory.
