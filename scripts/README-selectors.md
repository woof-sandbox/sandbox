# Selector Update Script

This script automatically updates function selectors in the ConfigController contract when target functions are upgraded.

## Overview

The `update-selectors.js` script helps maintain consistency between actual function signatures and hardcoded selectors in the ConfigController contract. It automatically calculates the correct selectors using ethers.js and updates the contract file.

## Usage

### Update All Selectors
```bash
npx hardhat run scripts/update-selectors.js
```

### Check Current Selectors vs Expected
```bash
npx hardhat run scripts/update-selectors.js --check
```

## Target Functions

The script currently manages these selectors:

| Selector Name | Function | Signature |
|---------------|----------|-----------|
| `ADD_COLLATERAL_SELECTOR` | `addCollateralAsset` | `addCollateralAsset((address,uint128,uint64,uint64,uint64))` |
| `REMOVE_COLLATERAL_SELECTOR` | `initiateCollateralRemoval` | `initiateCollateralRemoval(address)` |

## How It Works

1. **Function Definition**: Each target function is defined with its signature and description
2. **Selector Calculation**: Uses ethers.js to calculate the correct selector for each function
3. **Contract Update**: Automatically updates the ConfigController.sol file with new selectors
4. **Verification**: Provides verification and documentation of the changes

## Adding New Functions

To add a new function to the selector update process:

1. Add the function to the `TARGET_FUNCTIONS` object in `scripts/update-selectors.js`:

```javascript
const TARGET_FUNCTIONS = {
    // ... existing functions
    NEW_FUNCTION_SELECTOR: {
        functionName: "newFunction",
        signature: "newFunction(uint256,address)",
        description: "New function description"
    }
};
```

2. Add the corresponding constant to ConfigController.sol:

```solidity
bytes4 constant NEW_FUNCTION_SELECTOR = 0x12345678;
```

3. Run the script to update the selector:

```bash
npx hardhat run scripts/update-selectors.js
```

## Safety Features

- **Backup**: Always commit your changes before running the script
- **Verification**: The script provides detailed output of what was changed
- **Check Mode**: Use `--check` flag to verify selectors without making changes
- **Documentation**: Generates documentation for all selectors

## Example Output

```
🚀 Starting selector update process...

📊 Calculating selectors...
ADD_COLLATERAL_SELECTOR: 0xfad67aaa (Add collateral asset function)
REMOVE_COLLATERAL_SELECTOR: 0x58b77c0e (Initiate collateral removal function)

🔄 Updating ConfigController contract...
✅ Updated ADD_COLLATERAL_SELECTOR to 0xfad67aaa
✅ Updated REMOVE_COLLATERAL_SELECTOR to 0x58b77c0e

🔍 Verifying selectors...
ADD_COLLATERAL_SELECTOR: 0xfad67aaa
REMOVE_COLLATERAL_SELECTOR: 0x58b77c0e

📝 Selector Documentation:
```solidity
// Add collateral asset function
// Function: addCollateralAsset((address,uint128,uint64,uint64,uint64))
bytes4 constant ADD_COLLATERAL_SELECTOR = 0xfad67aaa;

// Initiate collateral removal function
// Function: initiateCollateralRemoval(address)
bytes4 constant REMOVE_COLLATERAL_SELECTOR = 0x58b77c0e;
```

✅ Selector update process completed!

💡 Next steps:
1. Review the updated ConfigController.sol file
2. Run tests to ensure everything works correctly
3. Commit the changes with appropriate documentation
```

## Troubleshooting

### Selector Mismatch
If you see a selector mismatch, it usually means:
1. The function signature has changed
2. The function signature in the script doesn't match the actual contract
3. The function was renamed or parameters were modified

### Function Not Found
If a function is not found in the contract:
1. Check that the function name and signature are correct
2. Verify the function exists in the target contract
3. Update the `TARGET_FUNCTIONS` object with the correct signature

## Best Practices

1. **Run tests** after updating selectors
2. **Review changes** before committing
3. **Document function changes** when updating signatures
4. **Use check mode** to verify selectors before updating
5. **Keep function signatures** in sync with actual contract functions 