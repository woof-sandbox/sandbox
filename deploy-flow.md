# Deployment Flow

## 🛠️ Deployment Order

### 1. SandboxController

-   **Purpose:** Core coordination contract used to manage Comet and Config deployments.
-   **Initialization:**
    -   Constructor may require an admin or owner address.
    -   After deployment, the following setter functions must be called:
        -   `setCometFactory(address cometFactory)`
        -   `setConfigFactory(address configFactory)`
        -   `whitelistBaseAsset`
        -   `whitelistCollateralAsset`
-   **Stores:**
    -   The addresses of both the `SandboxCometFactory` and `ConfigControllerFactory`

### 2. ConfigControllerFactory

-   **Purpose:** Deploys instances of `ConfigController`.
-   **Constructor Parameters:**
    -   `SandboxController` address (used for access control and ownership assignment).
-   **Deployment Function:**
    -   `createConfigController()` in `ConfigControllerFactory.sol`
        -   Deploys a fresh `ConfigController` and assigns it to the provided `owner`, `guardian` and `curator` with proposals settings and required addresses for comet creation.

### 3. SandboxCometFactory

-   **Purpose:** Responsible for creating new `SandboxComet` instances.
-   **Constructor Parameters:**
    -   `SandboxController` address (ensures authorized access).
-   **Deployment Function:**
    -   `deployComet()` in `SandboxCometFactory.sol`
        -   Deploys `SandboxComet` and call function factoryInit to set contract addresses required for initilization proccess.
-   **Note:** This factory is used internally during `ConfigController.createComet()`

### 4. ConfigController

-   **Purpose:** Stores dynamic configuration for the `SandboxComet`, including collateral and protocol-level parameters.
-   **Key Functions:**
    -   `createComet()` in `ConfigController.sol` — **Triggers the deployment of the `SandboxComet` contract**, internally calling `SandboxCometFactory.deployComet()`.
-   **Dependencies:**
    -   Must be deployed via `ConfigControllerFactory`

### 5. SandboxComet

-   **Purpose:** The primary lending/borrowing logic contract.
-   **Deployment Path:**
    -   Is NOT deployed directly
    -   Created via `ConfigController.createComet()` which internally calls `SandboxCometFactory.createComet()`
-   **factoryInit Arguments (via factory call):**
    -   `ConfigController` address
    -   `Extension` address deployed via SandboxCometFactory

---

## 🧩 Dependency Diagram (Deployment Flow with Roles)

```mermaid
    A[SandboxController] --> B[ConfigControllerFactory]
    B --> C[SandboxCometFactory]
    B --> D[ConfigController]
    D --> E[createComet() in ConfigController.sol]
    E --> C[createComet() in SandboxCometFactory.sol]
    D --> F[SandboxComet(initialized with controller/config)]
```

### 📌 Explanation:

-   `SandboxController` is the entry point and stores references to both factories.
-   `ConfigControllerFactory` deploys `ConfigController` instances.
-   `ConfigController.createComet()` calls `SandboxCometFactory.createComet()` under the hood.
-   `SandboxComet` is fully initialized using addresses and parameters from these components.

---

## 🔗 Dependencies

**[SandboxController]** - stores roles addresse, borrow and liquidation factors, configs for base and collateral assets that will be used for validation and setting params for comet

**[ConfigCOntrollerFactory]** - stores address of `SandBoxController` and implementation of `ConfigController`. Track all `ConfigController` contracts in the protocol.

**[ConfigController]** - stores address of the `SandboxCometFactory` responsible for validation that only ConfigController can deploy `SandboxComet`. During initilization it takes address of `SandboxController`. `SandboxController` will take configuration params of the baseAsset for the `SandboxComet` and for collateral tokens. Also track all deployed `SandboxComet` contracts in the protocol.

**[SandboxCometFactory]** - stores the addresses of the comet implementation and configControllerFactory to validate during comet creation that only `ConfigController` can deploy a Comet.

**[SandboxComet]** - by calling `factoryInit` func during deployment it stores addresses of the factory and configController to verify that only `ConfigController` can call initialize in the future. `SandboxController` also plays crucial part in initialization process, as it configurations of the base asets and collateral assets that must be veryfied in the comet. `SandboxController` will also be needed to set curve params for the comet.
