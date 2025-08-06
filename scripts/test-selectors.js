const { ethers } = require("hardhat");
const { calculateSelector, TARGET_FUNCTIONS } = require("./update-selectors");

/**
 * Test script to verify selector calculations
 */
async function testSelectors() {
    console.log("🧪 Testing selector calculations...\n");
    
    // Test each target function
    for (const [selectorName, functionInfo] of Object.entries(TARGET_FUNCTIONS)) {
        console.log(`Testing ${selectorName}:`);
        console.log(`  Function: ${functionInfo.functionName}`);
        console.log(`  Signature: ${functionInfo.signature}`);
        
        const selector = calculateSelector(functionInfo.signature);
        console.log(`  Calculated Selector: ${selector}`);
        
        // Verify with ethers directly
        const iface = new ethers.utils.Interface([`function ${functionInfo.signature}`]);
        const ethersSelector = iface.getSighash(functionInfo.functionName);
        console.log(`  Ethers Selector: ${ethersSelector}`);
        
        const match = selector === ethersSelector;
        console.log(`  Match: ${match ? "✅" : "❌"}`);
        console.log("");
    }
    
    console.log("✅ Selector test completed!");
}

// Run the test
testSelectors()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }); 