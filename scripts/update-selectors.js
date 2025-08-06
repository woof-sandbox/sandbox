const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Script to update selectors in ConfigController when target functions are upgraded
 * This script automatically calculates the correct selectors for target functions
 * and updates the ConfigController contract with the new values.
 */

// Target functions and their expected signatures
const TARGET_FUNCTIONS = {
    ADD_COLLATERAL_SELECTOR: {
        functionName: "addCollateralAsset",
        signature: "addCollateralAsset((address,uint128,uint64,uint64,uint64))",
        description: "Add collateral asset function"
    },
    REMOVE_COLLATERAL_SELECTOR: {
        functionName: "initiateCollateralRemoval", 
        signature: "initiateCollateralRemoval(address)",
        description: "Initiate collateral removal function"
    }
};

/**
 * Calculate selector for a function signature
 * @param {string} signature - Function signature
 * @returns {string} - Selector in hex format
 */
function calculateSelector(signature) {
    const iface = new ethers.utils.Interface([`function ${signature}`]);
    const functionName = signature.split('(')[0];
    return iface.getSighash(functionName);
}

/**
 * Update selector in ConfigController contract file
 * @param {string} selectorName - Name of the selector constant
 * @param {string} newSelector - New selector value
 * @param {string} contractPath - Path to the contract file
 */
function updateSelectorInContract(selectorName, newSelector, contractPath) {
    try {
        let contractContent = fs.readFileSync(contractPath, 'utf8');
        
        // Find and replace the selector
        const selectorRegex = new RegExp(`(bytes4\\s+constant\\s+${selectorName}\\s*=\\s*)0x[a-fA-F0-9]+;`, 'g');
        const replacement = `$1${newSelector};`;
        
        if (selectorRegex.test(contractContent)) {
            contractContent = contractContent.replace(selectorRegex, replacement);
            fs.writeFileSync(contractPath, contractContent);
            console.log(`✅ Updated ${selectorName} to ${newSelector}`);
        } else {
            console.log(`❌ Could not find ${selectorName} in contract`);
        }
    } catch (error) {
        console.error(`❌ Error updating ${selectorName}:`, error.message);
    }
}

/**
 * Verify selectors match expected values
 * @param {Object} expectedSelectors - Expected selector values
 */
function verifySelectors(expectedSelectors) {
    console.log("\n🔍 Verifying selectors...");
    
    for (const [selectorName, expectedSelector] of Object.entries(expectedSelectors)) {
        console.log(`${selectorName}: ${expectedSelector}`);
    }
}

/**
 * Generate documentation for selectors
 * @param {Object} selectors - Current selector values
 */
function generateDocumentation(selectors) {
    console.log("\n📝 Selector Documentation:");
    console.log("```solidity");
    
    for (const [selectorName, selectorValue] of Object.entries(selectors)) {
        const functionInfo = TARGET_FUNCTIONS[selectorName];
        console.log(`// ${functionInfo.description}`);
        console.log(`// Function: ${functionInfo.signature}`);
        console.log(`bytes4 constant ${selectorName} = ${selectorValue};`);
        console.log("");
    }
    
    console.log("```");
}

/**
 * Main function to update selectors
 */
async function main() {
    console.log("🚀 Starting selector update process...\n");
    
    const contractPath = path.join(__dirname, "../contracts/ConfigController.sol");
    const selectors = {};
    
    // Calculate selectors for all target functions
    console.log("📊 Calculating selectors...");
    for (const [selectorName, functionInfo] of Object.entries(TARGET_FUNCTIONS)) {
        const selector = calculateSelector(functionInfo.signature);
        selectors[selectorName] = selector;
        console.log(`${selectorName}: ${selector} (${functionInfo.description})`);
    }
    
    // Update contract file
    console.log("\n🔄 Updating ConfigController contract...");
    for (const [selectorName, selector] of Object.entries(selectors)) {
        updateSelectorInContract(selectorName, selector, contractPath);
    }
    
    // Verify the updates
    verifySelectors(selectors);
    
    // Generate documentation
    generateDocumentation(selectors);
    
    console.log("\n✅ Selector update process completed!");
    console.log("\n💡 Next steps:");
    console.log("1. Review the updated ConfigController.sol file");
    console.log("2. Run tests to ensure everything works correctly");
    console.log("3. Commit the changes with appropriate documentation");
}

/**
 * Function to check current selectors vs calculated selectors
 */
async function checkSelectors() {
    console.log("🔍 Checking current selectors vs calculated selectors...\n");
    
    const contractPath = path.join(__dirname, "../contracts/ConfigController.sol");
    const contractContent = fs.readFileSync(contractPath, 'utf8');
    
    for (const [selectorName, functionInfo] of Object.entries(TARGET_FUNCTIONS)) {
        const calculatedSelector = calculateSelector(functionInfo.signature);
        
        // Extract current selector from contract
        const selectorRegex = new RegExp(`bytes4\\s+constant\\s+${selectorName}\\s*=\\s*(0x[a-fA-F0-9]+);`, 'g');
        const match = selectorRegex.exec(contractContent);
        
        if (match) {
            const currentSelector = match[1];
            const status = currentSelector === calculatedSelector ? "✅" : "❌";
            console.log(`${status} ${selectorName}:`);
            console.log(`   Current:  ${currentSelector}`);
            console.log(`   Expected: ${calculatedSelector}`);
            console.log(`   Function: ${functionInfo.signature}`);
            console.log("");
        } else {
            console.log(`❌ ${selectorName}: Not found in contract`);
        }
    }
}

// Export functions for use in other scripts
module.exports = {
    calculateSelector,
    updateSelectorInContract,
    verifySelectors,
    generateDocumentation,
    TARGET_FUNCTIONS
};

// Run main function if script is executed directly
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes("--check")) {
        checkSelectors()
            .then(() => process.exit(0))
            .catch((error) => {
                console.error(error);
                process.exit(1);
            });
    } else {
        main()
            .then(() => process.exit(0))
            .catch((error) => {
                console.error(error);
                process.exit(1);
            });
    }
} 