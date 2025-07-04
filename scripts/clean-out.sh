#!/bin/bash

# Script to clean non-major artifacts from the out directory
# This script removes artifacts for interfaces, test contracts, and utility contracts
# while preserving artifacts for main contracts

OUT_DIR="out"
MAJOR_CONTRACTS=(
    "SandboxComet.sol"
    "SandboxController.sol"
    "SandboxCometFactory.sol"
    "ConfigController.sol"
    "ConfigControllerFactory.sol"
    "CometCore.sol"
    "CometExtension.sol"
    "CometStorage.sol"
    "CometMath.sol"
)

# Contracts to exclude (interfaces, tests, utilities)
EXCLUDE_CONTRACTS=(
    # Interfaces
    "I*.sol"
    "Aggregator*.sol"
    "IMulticall3.sol"
    "SafeERC20.sol"
    "Context.sol"
    "Create2.sol"
    "Errors.sol"
    
    # Test contracts
    "Mock*.sol"
    "Test*.sol"
    "Faucet*.sol"
    "Evil*.sol"
    "Dog.sol"
    "Governor*.sol"
    "CometHarness.sol"
    "ConfigControllerInitializeTest.sol"
    "SandboxControllerNoCurvesTest.sol"
    
    # Utility contracts
    "Std*.sol"
    "console*.sol"
    "safeconsole.sol"
    "draft-IERC6093.sol"
    "Vm.sol"
    "Base.sol"
    "Script.sol"
    "ERC20.sol"
    
    # Deployment scripts
    "*.s.sol"
    
    # Managed contracts
    "Managed*.sol"
)

echo "🧹 Cleaning non-major artifacts from $OUT_DIR directory..."

# Check if out directory exists
if [ ! -d "$OUT_DIR" ]; then
    echo "❌ $OUT_DIR directory does not exist"
    exit 1
fi

# Count total artifacts before cleaning
TOTAL_BEFORE=$(find "$OUT_DIR" -maxdepth 1 -type d | wc -l)
TOTAL_BEFORE=$((TOTAL_BEFORE - 1)) # Subtract 1 for the out directory itself

echo "📊 Found $TOTAL_BEFORE artifacts before cleaning"

# Function to check if a contract should be excluded
should_exclude() {
    local contract_name="$1"
    
    # Check against exclude patterns
    for pattern in "${EXCLUDE_CONTRACTS[@]}"; do
        if [[ "$contract_name" == $pattern ]]; then
            return 0  # Should exclude
        fi
    done
    
    return 1  # Should keep
}

# Clean artifacts
CLEANED_COUNT=0
KEPT_COUNT=0

for artifact_dir in "$OUT_DIR"/*.sol; do
    if [ -d "$artifact_dir" ]; then
        contract_name=$(basename "$artifact_dir")
        
        if should_exclude "$contract_name"; then
            echo "🗑️  Removing: $contract_name"
            rm -rf "$artifact_dir"
            ((CLEANED_COUNT++))
        else
            echo "✅ Keeping: $contract_name"
            ((KEPT_COUNT++))
        fi
    fi
done

# Count total artifacts after cleaning
TOTAL_AFTER=$(find "$OUT_DIR" -maxdepth 1 -type d | wc -l)
TOTAL_AFTER=$((TOTAL_AFTER - 1)) # Subtract 1 for the out directory itself

echo ""
echo "📊 Cleaning Summary:"
echo "   • Total artifacts before: $TOTAL_BEFORE"
echo "   • Artifacts cleaned: $CLEANED_COUNT"
echo "   • Artifacts kept: $KEPT_COUNT"
echo "   • Total artifacts after: $TOTAL_AFTER"
echo ""
echo "✨ Cleaning completed successfully!" 