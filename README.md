# Compound Comet

## Getting started

1. Clone the repo
2. Run `yarn install`

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

## Comet protocol contracts

**[SandboxComet.sol](./contracts/SandboxComet.sol)** - Contract that inherits `ISandboxComet.sol` and is the implementation for most of Comet's core functionalities.

**[CometCore.sol](./contracts/CometCore.sol)** - Abstract contract that inherits `CometStorage.sol`, and `CometMath.sol`. This contracts contains functions and constants that are shared for `SandboxComet.sol`.

**[CometStorage.sol](./contracts/Comet)** - Contract that defines the storage variables used for the Comet protocol.

**[CometMath.sol](https://github.com/compound-finance/comet/blob/main/contracts/CometMath.sol)** - Contract that defines math functions that are used throughout the Comet codebase.

**[CometFactory.sol](https://github.com/compound-finance/comet/blob/main/contracts/CometFactory.sol)** - Contract that inherits `CometConfiguration.sol` and is used to deploy new versions of `Comet.sol`. This contract will mainly be called by the Configurator during the governance upgrade process.

## Configurator contracts

**[SandboxController](./contracts/SandboxController.sol)** - Contract that inherits `ISandboxController.sol` and `ISandboxErrors.sol` and is used for protocol configurations, whitelisting base and collateral assets that can be used in comet.

**[ConfigControllerFactory](./contracts/ConfigControllerFactory.sol)** - Contract that inherits `IConfigControllerFactory.sol` and is used for deploying `ConfigController.sol` contract via clone proxy pattern.

**[ConfigController](./contracts/ConfigController.sol)** - Contract that inherits `IConfigController.sol` and is used for deploying a new comet via `SandboxCometFactory.sol` contract.

**[SandboxCometFactory](./contracts/SandboxCometFactory.sol)** - Factory contract that inherits `ISandboxCometFactory.sol` and is used creating new comet instances using the clone pattern.

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
