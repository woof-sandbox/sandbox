// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./CometCore.sol";
import "./interfaces/ISandboxComet.sol";
import "./interfaces/IPriceFeed.sol";
import "./interfaces/IConfigController.sol";
import "./interfaces/ISandboxController.sol";

/**
 * @title Compound's Comet Contract
 * @notice An efficient monolithic money comet protocol
 * @author WOOF! Software
 */
// aderyn-fp-next-line(contract-locks-ether)
contract SandboxComet is CometCore, ISandboxComet {
    using SafeERC20 for IERC20;

    /// @notice can be legally deployed only via the factory which provides correct config controller address
    /// @param _configController legal address of the config controller which triggered the factory
    /// @param _ext extension deployed by the same factory
    // aderyn-fp-next-line(state-change-without-event)
    function factoryInit(address _configController, address _ext) external override {
        if (factory != address(0) || configController != address(0)) revert AlreadyInitialized();
        if (_configController == address(0) || _ext == address(0)) revert IncorrectInitialization();

        /// if Comet is deployed not via the factory, than it will have incorrect factory address and will not
        /// be listed in the factory. Thus we trust that initialization will happen only during deployment
        factory = msg.sender;
        configController = _configController;
        extension = _ext;

        /// Note: event is generated in ConfigController
    }

    /// @notice can be called only from Config Controller, as factoryInit prevents any other callers
    /// @param comet Base token, interest rate curve, collaterals
    /// @param config Global Comet reserve parameters
    // aderyn-fp-next-line(state-change-without-event)
    function initialize(
        IConfigController.CometConfig calldata comet,
        IConfigController.CometGlobalParamsConfig calldata config
    ) external override {
        /// Relies on fact that factory provides correct controller and that it is set by the time of this call
        if (msg.sender != configController) revert IncorrectInitialization();
        // aderyn-fp-next-line(reentrancy-state-change)
        sandboxController = IConfigController(msg.sender).sandboxController();

        /// Base asset
        ///

        /// Rely on base token as main characteristic of the market and that it was validated in Controller
        if (baseToken != address(0)) revert AlreadyInitialized();
        baseToken = comet.baseToken; // aderyn-fp(state-no-address-check)

        uint8 _decimals = IERC20Metadata(comet.baseToken).decimals(); // aderyn-fp(reentrancy-state-change)
        if (_decimals > MAX_BASE_DECIMALS) revert BadDecimals();

        baseScale = uint64(10 ** _decimals); // aderyn-fp(literal-instead-of-constant)
        if (baseScale < BASE_ACCRUAL_SCALE) revert BadDecimals();
        accrualDescaleFactor = baseScale / BASE_ACCRUAL_SCALE;

        // aderyn-fp-next-line(reentrancy-state-change)
        address _baseTokenPriceFeed = ISandboxController(sandboxController).tokenToPriceFeed(comet.baseToken);
        /// @dev price feed is already checked to be listed in config controller
        if (IPriceFeed(_baseTokenPriceFeed).decimals() != PRICE_FEED_DECIMALS) revert BadDecimals(); // aderyn-fp(reentrancy-state-change)
        baseTokenPriceFeed = _baseTokenPriceFeed;

        /// Collaterals
        ///

        /// Availability of collaterals is already checked in Config Controller
        uint8 colTokensLength = uint8(comet.collateralTokens.length);
        if (colTokensLength > MAX_ASSETS) revert TooManyAssets();
        numAssets = colTokensLength;

        /// Collateral and pricefeed for collateral are listed in SandboxController
        /// Collateral parameters are validated in ConfigController (including non-repeatability)
        /// Thus collaterals can be safely added directly into the storage
        for (uint8 i; i < colTokensLength; ++i) {
            address collateralToken = comet.collateralTokens[i].collateralToken;
            // aderyn-fp-next-line(reentrancy-state-change, literal-instead-of-constant)
            uint64 scale = uint64(10 ** IERC20Metadata(collateralToken).decimals());
            // aderyn-fp-next-line(reentrancy-state-change)
            address priceFeed = ISandboxController(sandboxController).tokenToPriceFeed(collateralToken);

            collateralAssets.push(
                CollateralAsset(
                    comet.collateralTokens[i].collateralToken,
                    priceFeed,
                    comet.collateralTokens[i].supplyCap,
                    comet.collateralTokens[i].borrowCollateralFactor,
                    comet.collateralTokens[i].liquidateCollateralFactor,
                    comet.collateralTokens[i].liquidationFactor,
                    scale
                )
            );
            collateralAssetIndex[comet.collateralTokens[i].collateralToken] = i;
        }

        /// Reserves
        ///

        /// It can be safely assumed, that reserve parameters are validated in Sandbox Controller
        targetPercent = config.targetPercent;
        seedReserves = config.suggestedAmountOfSeedReserves;
        unlockTimestamp = safe64(block.timestamp + config.suggestedLockTimeOfSeedReserves);

        /// Interest rate curve
        ///

        // aderyn-fp-next-line(reentrancy-state-change)
        ISandboxController.BaseAssetConfiguration memory bac = ISandboxController(sandboxController).baseAssets(comet.baseToken);
        ISandboxController.BaseAssetCurve memory curve = bac.baseAssetCurves[comet.baseTokenCurveId];

        /// It can be safely assumed, that curve parameters are validated in Sandbox Controller
        baseBorrowMin = bac.minBorrow;
        storeFrontPriceFactor = config.storeFrontPriceFactor;
        unchecked {
            supplyKink = curve.supplyKink;
            supplyPerSecondInterestRateSlopeLow = curve.supplyPerYearInterestRateSlopeLow / SECONDS_PER_YEAR;
            supplyPerSecondInterestRateSlopeHigh = curve.supplyPerYearInterestRateSlopeHigh / SECONDS_PER_YEAR;
            supplyPerSecondInterestRateBase = curve.supplyPerYearInterestRateBase / SECONDS_PER_YEAR;

            borrowKink = curve.borrowKink;
            borrowPerSecondInterestRateSlopeLow = curve.borrowPerYearInterestRateSlopeLow / SECONDS_PER_YEAR;
            borrowPerSecondInterestRateSlopeHigh = curve.borrowPerYearInterestRateSlopeHigh / SECONDS_PER_YEAR;
            borrowPerSecondInterestRateBase = curve.borrowPerYearInterestRateBase / SECONDS_PER_YEAR;
        }

        /// Indexes
        ///

        lastAccrualTime = getNowInternal();
        baseSupplyIndex = BASE_INDEX_SCALE;
        baseBorrowIndex = BASE_INDEX_SCALE;

        /// Rewards are disabled by default
        trackingIndexScale = 1;
        baseMinForRewards = type(uint256).max;
        /// to avoid explicit initialization
        /// baseTrackingSupplySpeed = 0;
        /// baseTrackingBorrowSpeed = 0;

        /// Note: event is generated in ConfigController
    }

    /**
     * @dev Prevents marked functions from being reentered
     * Note: this restrict contracts from calling comet functions in their hooks.
     * Doing so will cause the transaction to revert.
     */
    modifier nonReentrant() {
        nonReentrantBefore();
        _;
        nonReentrantAfter();
    }

    /**
     * @dev Checks that the reentrancy flag is not set and then sets the flag
     */
    function nonReentrantBefore() internal {
        bytes32 slot = REENTRANCY_GUARD_FLAG_SLOT;
        uint256 status;
        assembly ("memory-safe") {
            status := sload(slot)
        }

        if (status == REENTRANCY_GUARD_ENTERED) revert ReentrantCallBlocked();
        assembly ("memory-safe") {
            sstore(slot, REENTRANCY_GUARD_ENTERED)
        }
    }

    /**
     * @dev Unsets the reentrancy flag
     */
    function nonReentrantAfter() internal {
        bytes32 slot = REENTRANCY_GUARD_FLAG_SLOT;
        uint256 status;
        assembly ("memory-safe") {
            sstore(slot, REENTRANCY_GUARD_NOT_ENTERED)
        }
    }

    /**
     * @notice Get the i-th asset info, according to the order they were passed in originally
     * @param i The index of the asset info to get
     * @return The asset info object
     */
    function getAssetInfo(uint8 i) public view override returns (CollateralAsset memory) {
        if (i >= numAssets) revert BadAsset();
        return collateralAssets[i];
    }

    /**
     * @dev Determine index of asset that matches given address
     */
    function getAssetInfoByAddress(address asset) public view override returns (CollateralAsset memory, uint8 index) {
        index = collateralAssetIndex[asset];

        // Check if the asset exists in the active collateralAssets array
        // Special case for index 0: verify by comparing the actual token address
        if (index != 0 || (collateralAssets.length > 0 && asset == collateralAssets[0].collateralToken)) {
            return (collateralAssets[index], index);
        }

        // If not found in active list, check the removedCollateralAssets array
        index = removedCollateralAssetIndex[asset];
        // Special case for index 0 again
        if (index != 0 || (removedCollateralAssets.length > 0 && asset == removedCollateralAssets[0].collateralToken)) {
            return (removedCollateralAssets[index], index);
        }

        // Asset not found in either list — revert with an error
        revert BadAsset();
    }

    /**
     * @return The current timestamp
     **/
    function getNowInternal() internal view virtual returns (uint40) {
        if (block.timestamp > type(uint40).max) revert TimestampTooLarge();
        return uint40(block.timestamp);
    }

    /**
     * @dev Calculate accrued interest indices for base token supply and borrows
     **/
    function accruedInterestIndices(uint40 timeElapsed) internal view returns (uint64, uint64) {
        uint64 baseSupplyIndex_ = baseSupplyIndex;
        uint64 baseBorrowIndex_ = baseBorrowIndex;
        if (timeElapsed > 0) {
            uint utilization = getUtilization();
            uint64 supplyRate = getSupplyRate(utilization);
            uint64 borrowRate = getBorrowRate(utilization);
            baseSupplyIndex_ += safe64(mulFactor(baseSupplyIndex_, supplyRate * timeElapsed));
            baseBorrowIndex_ += safe64(mulFactor(baseBorrowIndex_, borrowRate * timeElapsed));
        }
        return (baseSupplyIndex_, baseBorrowIndex_);
    }

    function accrueInternal() internal {
        uint40 now_ = getNowInternal();
        uint40 timeElapsed = now_ - lastAccrualTime;

        if (_collateralRemovalState.removalInProgress) _prepareCollateralRemoval();

        if (timeElapsed != 0) {
            (baseSupplyIndex, baseBorrowIndex) = accruedInterestIndices(timeElapsed);
            if (totalSupplyBase >= baseMinForRewards) {
                trackingSupplyIndex += safe64(divBaseWei(baseTrackingSupplySpeed * timeElapsed, totalSupplyBase));
            }
            if (totalBorrowBase >= baseMinForRewards) {
                trackingBorrowIndex += safe64(divBaseWei(baseTrackingBorrowSpeed * timeElapsed, totalBorrowBase));
            }
            lastAccrualTime = now_;
        }
    }

    /**
     * @notice Linearly interpolates a curve parameter value during a transition period.
     * @dev
     * This function is used to smoothly update protocol curve parameters (such as supplyKink, interest rate slopes, etc.)
     * from a starting value to a target value over a specified duration. It ensures that the parameter changes
     * at a constant rate, providing a predictable and gradual transition rather than an abrupt jump.
     *
     * The algorithm works for both increasing and decreasing transitions. At any point during the transition,
     * the value is calculated as a function of the elapsed time since the start of the transition.
     *
     * The formula used in this implementation is:
     *   if (targetValue > startValue):
     *       interpolated = currentValue + (((targetValue - startValue) * elapsed / duration) - (currentValue - startValue))
     *   else:
     *       interpolated = currentValue - (((startValue - targetValue) * elapsed / duration) - (startValue - currentValue))
     *
     * This means:
     * - At the start (elapsed = 0):      interpolated = startValue
     * - At the end (elapsed = duration): interpolated = targetValue
     * - In between:                      interpolated is proportionally between startValue and targetValue
     *
     * Example 1: Increasing transition
     *   Suppose we want to transition supplyKink from 200 to 800 over 10 seconds.
     *   - startValue = 200
     *   - targetValue = 800
     *   - duration = 10
     *
     *   At elapsed = 0, currentValue = 200:
     *     interpolated = 200 + ((800 - 200) * 0 / 10 - (200 - 200))
     *                  = 200 + (0 - 0)
     *                  = 200
     *
     *   At elapsed = 5, currentValue = 500:
     *     interpolated = 500 + ((800 - 200) * 5 / 10 - (500 - 200))
     *                  = 500 + (300 - 300)
     *                  = 500
     *
     *   At elapsed = 10, currentValue = 800:
     *     interpolated = 800 + ((800 - 200) * 10 / 10 - (800 - 200))
     *                  = 800 + (600 - 600)
     *                  = 800
     *
     * Example 2: Decreasing transition
     *   Suppose we want to transition supplyKink from 900 to 300 over 10 seconds.
     *   - startValue = 900
     *   - targetValue = 300
     *   - duration = 10
     *
     *   At elapsed = 0, currentValue = 900:
     *     interpolated = 900 - ((900 - 300) * 0 / 10 - (900 - 900))
     *                  = 900 - (0 - 0)
     *                  = 900
     *
     *   At elapsed = 4, currentValue = 660:
     *     interpolated = 660 - ((900 - 300) * 4 / 10 - (900 - 660))
     *                  = 660 - (240 - 240)
     *                  = 660
     *
     *   At elapsed = 10, currentValue = 300:
     *     interpolated = 300 - ((900 - 300) * 10 / 10 - (900 - 300))
     *                  = 300 - (600 - 600)
     *                  = 300
     *
     * Example 3: No change
     *   If startValue = targetValue = 500, duration = 10, any elapsed, currentValue = 500:
     *     interpolated = 500 + ((500 - 500) * elapsed / 10 - (500 - 500))
     *                  = 500 + (0 - 0)
     *                  = 500
     *
     * Usage:
     *   This function is called internally by the protocol during a curve transition, typically in a function like
     *   `progressTransition(now_)`, to update each curve parameter to its correct value for the current time.
     *
     * @param startValue   The value of the parameter at the start of the transition.
     * @param targetValue  The value of the parameter at the end of the transition.
     * @param currentValue The current value of the parameter (used for incremental calculation).
     * @param elapsed      The time elapsed since the start of the transition, in seconds.
     * @param duration     The total duration of the transition, in seconds.
     * @return The interpolated value as a uint64, representing the parameter's value at the current elapsed time.
     */
    function interpolateValue(
        uint256 startValue,
        uint256 targetValue,
        uint256 currentValue,
        uint40 elapsed,
        uint40 duration
    ) internal pure returns (uint64) {
        if (targetValue > startValue) {
            return safe64(currentValue + ((((targetValue - startValue) * elapsed) / duration) - (currentValue - startValue)));
        } else {
            return safe64(currentValue - ((((startValue - targetValue) * elapsed) / duration) - (startValue - currentValue)));
        }
    }

    /**
     * @notice Initiates the collateral removal process for a given collateral asset.
     * @dev
     * This function begins a controlled and gradual removal process of a collateral asset from the protocol.
     * It is intended to allow safe offboarding of an asset without causing sudden liquidations or collateral shortfalls.
     *
     * ---
     * Access Control:
     * - Only the `configController` is authorized to call this method.
     * - Unauthorized calls will revert with `Unauthorized()`.
     *
     * ---
     * Process Constraints:
     * - Only one collateral removal process can be active at a time.
     * - If a removal is already in progress, the function will revert with `CollateralRemovalInProgress(...)`,
     *   providing:
     *     - The currently offboarding token address.
     *     - The start time of the active removal process.
     *     - The scheduled end time.
     *
     * ---
     * On Initialization:
     * - Retrieves the collateral asset metadata via `getAssetInfoByAddress(...)`.
     * - Stores the current state in `_collateralRemovalState`:
     *     - `collateralToken`: Address of the token being removed.
     *     - `startBorrowCollateralFactor` / `startLiquidateCollateralFactor`: Initial values before removal.
     *     - `startTime`: Current timestamp.
     *     - `duration`: Offboarding period, retrieved from `SandboxController`.
     *     - `collateralAssetIndex`: Index in the active collateral array.
     *     - `removalInProgress`: Flag set to `true`.
     * - Sets the collateral’s `supplyCap` to zero to block new supply immediately.
     *
     * ---
     * Safety and User Experience:
     * - Borrow and liquidation collateral factors are **reduced linearly** over time using `interpolateValue(...)`.
     * - This design prevents abrupt liquidations at the start of removal, even if the removed asset represented
     *   a large share of the user's borrowing power.
     * - The progressive decline gives users the opportunity to:
     *     - Withdraw the soon-to-be-removed collateral voluntarily.
     *     - Avoid opening new borrow positions against this collateral.
     * - Once the removal period ends, collateral factors reach 0%, and the asset is fully offboarded.
     *
     * ---
     * Post-Removal Behavior:
     * - If a user did not withdraw the collateral before the process ended:
     *     - They can **still withdraw it** without restrictions.
     *     - As long as their borrow position remains solvent, they will **not be liquidated** solely due to
     *       the collateral becoming inactive.
     *     - If the asset was not supporting an active borrow, it remains withdrawable regardless.
     *
     * ---
     * Lifecycle Summary:
     * 1. Initiation via this method.
     * 2. Progressive factor decay handled by `_prepareCollateralRemoval()` during internal state updates.
     * 3. Finalization via `_finalizeCollateralRemoval()` once the duration elapses.
     * 4. The asset is removed from active listings and added to the `removedCollateralAssets` array.
     * 5. `removalInProgress` is set to `false`. The rest of the `_collateralRemovalState` remains in storage
     *    for gas efficiency and will be overwritten on the next removal.
     *
     * @param removalAsset The address of the collateral asset to begin removing from the market.
     *
     * Emits a {CollateralRemovalInitiated} event including:
     * - The index of the collateral in the active array.
     * - The token address.
     * - The start and end timestamps of the removal window.
     *
     * Reverts if:
     * - The caller is not the config controller.
     * - A removal process is already in progress.
     */
    function initiateCollateralRemoval(address removalAsset) external override {
        if (msg.sender != configController) revert Unauthorized();

        CollateralRemovalState memory collateralRemovalState_ = _collateralRemovalState;

        if (collateralRemovalState_.removalInProgress) {
            revert CollateralRemovalInProgress(
                collateralRemovalState_.collateralToken,
                collateralRemovalState_.startTime,
                collateralRemovalState_.startTime + collateralRemovalState_.duration
            );
        }

        (CollateralAsset memory asset, uint8 assetIndex) = getAssetInfoByAddress(removalAsset);

        uint40 now_ = getNowInternal();
        uint40 duration = ISandboxController(sandboxController).removalCollateralDuration();

        // Set the collateral removal state
        _collateralRemovalState = CollateralRemovalState({
            collateralToken: asset.collateralToken,
            startBorrowCollateralFactor: asset.borrowCollateralFactor,
            startLiquidateCollateralFactor: asset.liquidateCollateralFactor,
            startTime: now_,
            duration: duration,
            collateralAssetIndex: assetIndex,
            removalInProgress: true
        });

        // Set the supply capitalization to 0, so that it is impossible to supply a collateral asset after initializing the removal process
        collateralAssets[assetIndex].supplyCap = 0;

        emit CollateralRemovalInitiated(assetIndex, asset.collateralToken, now_, (now_ + duration));
    }

    /**
     * @notice Prepares the collateral removal process by updating the collateral asset factors.
     * @dev
     * This internal function manages the gradual removal of a collateral asset from the market.
     * - If the removal period has ended (current time >= endTime), it sets the borrow and liquidate collateral factors
     *   to their target values and finalizes the removal by calling `_finalizeCollateralRemoval`.
     * - If the removal period is still ongoing, it linearly interpolates the borrow and liquidate collateral factors
     *   between their starting and target values based on the elapsed time, and updates the collateral asset in storage.
     * - This function is intended to be called during interest accrual or other internal state updates to ensure
     *   that the collateral removal process progresses smoothly over time.
     */
    function _prepareCollateralRemoval() internal {
        CollateralRemovalState memory collateralRemovalState_ = _collateralRemovalState;

        CollateralAsset memory collateralAsset_ = collateralAssets[collateralRemovalState_.collateralAssetIndex];

        // If the end time of the collateral removal is reached, finalize the removal of the asset
        if ((collateralRemovalState_.startTime + collateralRemovalState_.duration) <= getNowInternal()) {
            // Set the borrow and liquidate collateral factors to the target values
            collateralAsset_.borrowCollateralFactor = TARGET_BORROW_COLLATERAL_FACTOR;
            collateralAsset_.liquidateCollateralFactor = TARGET_LIQUIDATE_COLLATERAL_FACTOR;
            // Remove the collateral asset from the list of active collateral assets and save it to the removed assets list
            _finalizeCollateralRemoval(collateralAsset_, collateralRemovalState_);
        } else {
            uint40 now_ = getNowInternal();
            uint40 elapsed = now_ - collateralRemovalState_.startTime;

            // Calculate the new borrow collateral factors
            collateralAsset_.borrowCollateralFactor = interpolateValue(
                collateralRemovalState_.startBorrowCollateralFactor,
                TARGET_BORROW_COLLATERAL_FACTOR,
                collateralAsset_.borrowCollateralFactor,
                elapsed,
                collateralRemovalState_.duration
            );
            // Calculate the new liquidate collateral factors
            collateralAsset_.liquidateCollateralFactor = interpolateValue(
                collateralRemovalState_.startLiquidateCollateralFactor,
                TARGET_LIQUIDATE_COLLATERAL_FACTOR,
                collateralAsset_.liquidateCollateralFactor,
                elapsed,
                collateralRemovalState_.duration
            );

            // Update the asset in the list with the new borrow and liquidate collateral factors
            collateralAssets[collateralRemovalState_.collateralAssetIndex] = collateralAsset_;
        }
    }

    /**
     * @notice Finalizes the removal of a collateral asset from the market.
     * @dev
     * - Appends the removed collateral asset to the `removedCollateralAssets` array and updates the corresponding index mapping.
     * - Increments the `numRemovedAssets` counter.
     * - Removes the asset from the active `collateralAssets` array by replacing it with the last element and popping the array.
     * - Decrements the `numAssets` counter and deletes the asset's index from the active mapping.
     * - Marks the end of the collateral removal process by setting the `removalInProgress` flag to false.
     * - Emits a {CollateralAssetRemoved} event with the asset index and token address.
     * @param collateralAsset The CollateralAsset struct containing the parameters of the removed collateral.
     * @param collateralRemovalState The CollateralRemovalState struct containing the state of the removal process.
     */
    function _finalizeCollateralRemoval(
        CollateralAsset memory collateralAsset,
        CollateralRemovalState memory collateralRemovalState
    ) internal {
        // Save the removed asset to the removed assets list
        removedCollateralAssets.push(collateralAsset);
        // Save the current removed assets count and updated it
        uint8 removedAssetIndex = numRemovedAssets++;
        // Update the index mapping for removed assets
        removedCollateralAssetIndex[collateralRemovalState.collateralToken] = removedAssetIndex;

        // Remove the asset from the list
        collateralAssets[collateralRemovalState.collateralAssetIndex] = collateralAssets[numAssets - 1];
        collateralAssets.pop();
        // Update the asset count
        numAssets--;
        // Update the index mapping
        delete collateralAssetIndex[collateralRemovalState.collateralToken];

        // Mark the end of a collateral removal process
        _collateralRemovalState.removalInProgress = false;

        emit CollateralRemovalFinalized(removedAssetIndex, collateralRemovalState.collateralToken);
    }

    /**
     * @notice Check whether a collateral removal process is in progress
     * @return Whether a collateral removal process is currently ongoing
     */
    function isCollateralRemovalInProgress() public view override returns (bool) {
        return _collateralRemovalState.removalInProgress;
    }

    /**
     * @notice Accrue interest and rewards for an account
     **/
    // aderyn-fp-next-line(state-change-without-event)
    function accrueAccount(address account) external override {
        accrueInternal();

        UserBasic memory basic = userBasic[account];
        updateBasePrincipal(account, basic, basic.principal);
    }

    /**
     * @dev Note: Does not accrue interest first
     * @param utilization The utilization to check the supply rate for
     * @return The per second supply rate at `utilization`
     */
    function getSupplyRate(uint utilization) public view override returns (uint64) {
        if (utilization <= supplyKink) {
            // interestRateBase + interestRateSlopeLow * utilization
            return safe64(supplyPerSecondInterestRateBase + mulFactor(supplyPerSecondInterestRateSlopeLow, utilization));
        } else {
            // interestRateBase + interestRateSlopeLow * kink + interestRateSlopeHigh * (utilization - kink)
            return
                safe64(
                    supplyPerSecondInterestRateBase +
                        mulFactor(supplyPerSecondInterestRateSlopeLow, supplyKink) +
                        mulFactor(supplyPerSecondInterestRateSlopeHigh, (utilization - supplyKink))
                );
        }
    }

    /**
     * @dev Note: Does not accrue interest first
     * @param utilization The utilization to check the borrow rate for
     * @return The per second borrow rate at `utilization`
     */
    function getBorrowRate(uint utilization) public view override returns (uint64) {
        if (utilization <= borrowKink) {
            // interestRateBase + interestRateSlopeLow * utilization
            return safe64(borrowPerSecondInterestRateBase + mulFactor(borrowPerSecondInterestRateSlopeLow, utilization));
        } else {
            // interestRateBase + interestRateSlopeLow * kink + interestRateSlopeHigh * (utilization - kink)
            return
                safe64(
                    borrowPerSecondInterestRateBase +
                        mulFactor(borrowPerSecondInterestRateSlopeLow, borrowKink) +
                        mulFactor(borrowPerSecondInterestRateSlopeHigh, (utilization - borrowKink))
                );
        }
    }

    /**
     * @dev Note: Does not accrue interest first
     * @return The utilization rate of the base asset
     */
    function getUtilization() public view override returns (uint) {
        uint totalSupply_ = presentValueSupply(baseSupplyIndex, totalSupplyBase);
        uint totalBorrow_ = presentValueBorrow(baseBorrowIndex, totalBorrowBase);
        if (totalSupply_ == 0) {
            return 0;
        } else {
            return (totalBorrow_ * FACTOR_SCALE) / totalSupply_;
        }
    }

    /**
     * @notice Get the current price from a feed
     * @param priceFeed The address of a price feed
     * @return The price, scaled by price feed decimals
     */
    function getPrice(address priceFeed) public view override returns (uint256) {
        (, int price, , , ) = IPriceFeed(priceFeed).latestRoundData();
        if (price <= 0) revert BadPrice();
        return uint256(price);
    }

    /**
     * @notice Gets the total balance of protocol collateral reserves for an asset (with planned fees deducted)
     * @dev Note: Reverts if collateral reserves are somehow negative, which should not be possible
     * @param asset The collateral asset
     */
    function getCollateralReserves(address asset) public view override returns (uint) {
        return IERC20(asset).balanceOf(address(this)) - totalsCollateral[asset] - assetFeesController[asset] - assetFeesDAO[asset];
    }

    /**
     * @notice Gets the total amount of protocol reserves of the base asset
     */
    function getReserves() public view override returns (int) {
        (uint64 baseSupplyIndex_, uint64 baseBorrowIndex_) = accruedInterestIndices(getNowInternal() - lastAccrualTime);
        uint256 balance = IERC20(baseToken).balanceOf(address(this));
        uint totalSupply_ = presentValueSupply(baseSupplyIndex_, totalSupplyBase);
        uint totalBorrow_ = presentValueBorrow(baseBorrowIndex_, totalBorrowBase);

        /// TODO: deduct controller and dao fees
        return signed256(balance) - signed256(totalSupply_) + signed256(totalBorrow_);
    }

    /**
     * @notice Check whether an account has enough collateral to borrow
     * @param account The address to check
     * @return Whether the account is minimally collateralized enough to borrow
     */
    function isBorrowCollateralized(address account) public view override returns (bool) {
        int104 principal = userBasic[account].principal;
        if (principal >= 0) return true;

        uint24 assetsIn = userBasic[account].assetsIn;
        int liquidity = signedMulPrice(presentValue(principal), getPrice(baseTokenPriceFeed), uint64(baseScale));

        uint8 nAssets = numAssets;
        for (uint8 i = 0; i < nAssets; ) {
            if (isInAsset(assetsIn, i)) {
                if (liquidity >= 0) break;

                CollateralAsset memory asset = getAssetInfo(i);
                uint newAmount = mulPrice(userCollateral[account][asset.collateralToken], getPrice(asset.priceFeed), asset.scale);
                liquidity += signed256(mulFactor(newAmount, asset.borrowCollateralFactor));
            }
            unchecked {
                ++i;
            }
        }

        return liquidity >= 0;
    }

    /**
     * @notice Check whether an account has enough collateral to not be liquidated
     * @param account The address to check
     * @return Whether the account is minimally collateralized enough to not be liquidated
     */
    function isLiquidatable(address account) public view override returns (bool) {
        int104 principal = userBasic[account].principal;
        if (principal >= 0) return false;

        uint24 assetsIn = userBasic[account].assetsIn;
        int liquidity = signedMulPrice(presentValue(principal), getPrice(baseTokenPriceFeed), uint64(baseScale));

        uint8 nAssets = numAssets;
        for (uint8 i = 0; i < nAssets; ) {
            if (isInAsset(assetsIn, i)) {
                if (liquidity >= 0) break;

                CollateralAsset memory asset = getAssetInfo(i);
                uint newAmount = mulPrice(userCollateral[account][asset.collateralToken], getPrice(asset.priceFeed), asset.scale);
                liquidity += signed256(mulFactor(newAmount, asset.liquidateCollateralFactor));
            }
            unchecked {
                ++i;
            }
        }

        return liquidity < 0;
    }

    /**
     * @dev The change in principal broken into repay and supply amounts
     */
    function repayAndSupplyAmount(int104 oldPrincipal, int104 newPrincipal) internal pure returns (uint104, uint104) {
        // If the new principal is less than the old principal, then no amount has been repaid or supplied
        if (newPrincipal < oldPrincipal) return (0, 0);

        if (newPrincipal <= 0) {
            return (uint104(newPrincipal - oldPrincipal), 0);
        } else if (oldPrincipal >= 0) {
            return (0, uint104(newPrincipal - oldPrincipal));
        } else {
            return (uint104(-oldPrincipal), uint104(newPrincipal));
        }
    }

    /**
     * @dev The change in principal broken into withdraw and borrow amounts
     */
    function withdrawAndBorrowAmount(int104 oldPrincipal, int104 newPrincipal) internal pure returns (uint104, uint104) {
        // If the new principal is greater than the old principal, then no amount has been withdrawn or borrowed
        if (newPrincipal > oldPrincipal) return (0, 0);

        if (newPrincipal >= 0) {
            return (uint104(oldPrincipal - newPrincipal), 0);
        } else if (oldPrincipal <= 0) {
            return (0, uint104(oldPrincipal - newPrincipal));
        } else {
            return (uint104(oldPrincipal), uint104(-newPrincipal));
        }
    }

    /// Administrative segment
    ///

    /**
     * @notice Pauses different actions within Comet
     * @param supplyPaused Boolean for pausing supply actions
     * @param transferPaused Boolean for pausing transfer actions
     * @param withdrawPaused Boolean for pausing withdraw actions
     * @param absorbPaused Boolean for pausing absorb actions
     * @param buyPaused Boolean for pausing buy actions
     */
    function pause(bool supplyPaused, bool transferPaused, bool withdrawPaused, bool absorbPaused, bool buyPaused) external override {
        address dao = ISandboxController(sandboxController).dao(); // aderyn-fp(reentrancy-state-change)
        if (msg.sender != configController && msg.sender != dao) revert Unauthorized();

        pauseFlags =
            uint8(0) |
            (toUInt8(supplyPaused) << PAUSE_SUPPLY_OFFSET) |
            (toUInt8(transferPaused) << PAUSE_TRANSFER_OFFSET) |
            (toUInt8(withdrawPaused) << PAUSE_WITHDRAW_OFFSET) |
            (toUInt8(absorbPaused) << PAUSE_ABSORB_OFFSET) |
            (toUInt8(buyPaused) << PAUSE_BUY_OFFSET);

        emit PauseAction(supplyPaused, transferPaused, withdrawPaused, absorbPaused, buyPaused);
    }

    /**
     * @notice Extracts all accumulated fees to a respective caller
     * @dev access control check is within the function and restricts it to dao and controller only
     * @param asset Asset (collateral or base) to extract
     */
    function extractFees(address asset) external override {
        if (asset == address(0)) revert ZeroAddress();
        // Note: we do not check if asset is registered, as it might be already delisted collateral
        // and there is no difference between base asset or collateral

        uint256 amount;
        address dao = ISandboxController(sandboxController).dao(); // aderyn-fp(reentrancy-state-change)

        if (msg.sender == dao) {
            amount = assetFeesDAO[asset];
            assetFeesDAO[asset] = 0;
        } else if (msg.sender == configController) {
            amount = assetFeesController[asset];
            assetFeesController[asset] = 0;
        } else revert Unauthorized();

        if (amount == 0) revert AmountTooSmall();

        IERC20(asset).safeTransfer(msg.sender, amount);
        emit FeesExtracted(address(this), asset, amount, msg.sender);
    }

    /**
     * @return Whether or not supply actions are paused
     */
    function isSupplyPaused() public view override returns (bool) {
        return toBool(pauseFlags & (uint8(1) << PAUSE_SUPPLY_OFFSET));
    }

    /**
     * @return Whether or not transfer actions are paused
     */
    function isTransferPaused() public view override returns (bool) {
        return toBool(pauseFlags & (uint8(1) << PAUSE_TRANSFER_OFFSET));
    }

    /**
     * @return Whether or not withdraw actions are paused
     */
    function isWithdrawPaused() public view override returns (bool) {
        return toBool(pauseFlags & (uint8(1) << PAUSE_WITHDRAW_OFFSET));
    }

    /**
     * @return Whether or not absorb actions are paused
     */
    function isAbsorbPaused() public view override returns (bool) {
        return toBool(pauseFlags & (uint8(1) << PAUSE_ABSORB_OFFSET));
    }

    /**
     * @return Whether or not buy actions are paused
     */
    function isBuyPaused() public view override returns (bool) {
        return toBool(pauseFlags & (uint8(1) << PAUSE_BUY_OFFSET));
    }

    /**
     * @dev Multiply a number by a factor
     */
    function mulFactor(uint n, uint factor) internal pure returns (uint) {
        return (n * factor) / FACTOR_SCALE;
    }

    /**
     * @dev Divide a number by an amount of base
     */
    function divBaseWei(uint n, uint baseWei) internal view returns (uint) {
        return (n * baseScale) / baseWei;
    }

    /**
     * @dev Multiply a `fromScale` quantity by a price, returning a common price quantity
     */
    function mulPrice(uint n, uint price, uint64 fromScale) internal pure returns (uint) {
        return (n * price) / fromScale;
    }

    /**
     * @dev Multiply a signed `fromScale` quantity by a price, returning a common price quantity
     */
    function signedMulPrice(int n, uint price, uint64 fromScale) internal pure returns (int) {
        return (n * signed256(price)) / int256(uint256(fromScale));
    }

    /**
     * @dev Divide a common price quantity by a price, returning a `toScale` quantity
     */
    function divPrice(uint n, uint price, uint64 toScale) internal pure returns (uint) {
        return (n * toScale) / price;
    }

    /**
     * @dev Whether user has a non-zero balance of an asset, given assetsIn flags
     */
    function isInAsset(uint24 assetsIn, uint8 assetOffset) internal pure returns (bool) {
        return (assetsIn & (uint24(1) << assetOffset)) != 0;
    }

    /**
     * @dev Update assetsIn bit vector if user has entered or exited an asset
     */
    function updateAssetsIn(address account, uint8 index, uint256 initialUserBalance, uint256 finalUserBalance) internal {
        if (initialUserBalance == 0 && finalUserBalance != 0) {
            userBasic[account].assetsIn |= uint24(1) << index;
        } else if (initialUserBalance != 0 && finalUserBalance == 0) {
            userBasic[account].assetsIn &= ~(uint24(1) << index);
        }
    }

    /**
     * @dev Write updated principal to store and tracking participation
     */
    function updateBasePrincipal(address account, UserBasic memory basic, int104 principalNew) internal {
        int104 principal = basic.principal;
        basic.principal = principalNew;

        uint indexDelta;

        if (principal >= 0) {
            indexDelta = uint256(trackingSupplyIndex - basic.baseTrackingIndex);
        } else {
            indexDelta = uint256(trackingBorrowIndex - basic.baseTrackingIndex);
            principal = -principal;
        }

        // 0 delta means the same block or disabled rewards
        if (indexDelta > 0) {
            basic.baseTrackingAccrued += safe64((uint104(principal) * indexDelta) / trackingIndexScale / accrualDescaleFactor);
        }

        if (principalNew >= 0) {
            basic.baseTrackingIndex = trackingSupplyIndex;
        } else {
            basic.baseTrackingIndex = trackingBorrowIndex;
        }

        userBasic[account] = basic;
    }

    /**
     * @dev Safe ERC20 transfer in and returns the final amount transferred (taking into account any fees)
     * @dev Note: Safely handles non-standard ERC-20 tokens that do not return a value.
     * See here: https://medium.com/coinmonks/missing-return-value-bug-at-least-130-tokens-affected-d67bf08521ca
     */
    function doTransferIn(address asset, address from, uint256 amount) internal returns (uint256) {
        uint256 preTransferBalance = IERC20(asset).balanceOf(address(this));
        IERC20(asset).safeTransferFrom(from, address(this), amount);
        return IERC20(asset).balanceOf(address(this)) - preTransferBalance;
    }

    /**
     * @notice Supply an amount of asset to the protocol
     * @param asset The asset to supply
     * @param amount The quantity to supply
     */
    function supply(address asset, uint256 amount) external override {
        return supplyInternal(msg.sender, msg.sender, msg.sender, asset, amount, false);
    }

    /**
     * @notice Supply an amount of asset to dst
     * @param dst The address which will hold the balance
     * @param asset The asset to supply
     * @param amount The quantity to supply
     */
    function supplyTo(address dst, address asset, uint256 amount) external override {
        return supplyInternal(msg.sender, msg.sender, dst, asset, amount, false);
    }

    /**
     * @notice Supply an amount of asset from `from` to dst, if allowed
     * @param from The supplier address
     * @param dst The address which will hold the balance
     * @param asset The asset to supply
     * @param amount The quantity to supply
     */
    function supplyFrom(address from, address dst, address asset, uint256 amount) external override {
        return supplyInternal(msg.sender, from, dst, asset, amount, false);
    }

    /**
     * @notice Repay the whole debt in base asset to the protocol from `from` to dst, if allowed
     * @param from The supplier address
     * @param dst The address which will hold the balance (can be the same from address)
     */
    function repayAllFrom(address from, address dst) external override {
        return supplyInternal(msg.sender, from, dst, baseToken, borrowBalanceOf(dst), true);
    }

    /**
     * @dev Supply either collateral or base asset, depending on the asset, if operator is allowed
     */
    function supplyInternal(address operator, address from, address dst, address asset, uint256 amount, bool isAll) internal nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (isSupplyPaused()) revert Paused();

        spendAllowanceInternal(from, operator, asset, amount, isAll);

        /// In case of ...All() operation asset is guaranteed to be baseAsset
        if (asset == baseToken) {
            return supplyBase(from, dst, amount);
        } else {
            return supplyCollateral(from, dst, asset, amount);
        }
    }

    /**
     * @dev Supply an amount of base asset from `from` to dst
     */
    function supplyBase(address from, address dst, uint256 amount) internal {
        amount = doTransferIn(baseToken, from, amount);
        accrueInternal();

        UserBasic memory dstUser = userBasic[dst];
        int104 dstPrincipal = dstUser.principal;
        int256 dstBalance = presentValue(dstPrincipal) + signed256(amount);
        int104 dstPrincipalNew = principalValue(dstBalance);

        (uint104 repayAmount, uint104 supplyAmount) = repayAndSupplyAmount(dstPrincipal, dstPrincipalNew);
        totalSupplyBase += supplyAmount;
        totalBorrowBase -= repayAmount;

        updateBasePrincipal(dst, dstUser, dstPrincipalNew);

        emit Supply(from, dst, amount);

        if (supplyAmount > 0) {
            emit Transfer(address(0), dst, presentValueSupply(baseSupplyIndex, supplyAmount));
        }
    }

    /**
     * @dev Supply an amount of collateral asset from `from` to dst
     */
    function supplyCollateral(address from, address dst, address asset, uint256 amount) internal {
        amount = doTransferIn(asset, from, amount);

        (CollateralAsset memory assetInfo, uint8 index) = getAssetInfoByAddress(asset);
        uint256 totals = totalsCollateral[asset];
        totals += amount;

        if (totals > assetInfo.supplyCap) revert SupplyCapExceeded();

        uint256 dstCollateral = userCollateral[dst][asset];
        uint256 dstCollateralNew = dstCollateral + amount;

        totalsCollateral[asset] = totals;
        userCollateral[dst][asset] = dstCollateralNew;

        updateAssetsIn(dst, index, dstCollateral, dstCollateralNew);

        emit SupplyCollateral(from, dst, asset, amount);
    }

    /**
     * @notice ERC20 transfer an amount of base token to dst
     * @param dst The recipient address
     * @param amount The quantity to transfer
     * @return true
     */
    function transfer(address dst, uint256 amount) external override returns (bool) {
        transferInternal(msg.sender, msg.sender, dst, baseToken, amount, false);
        return true;
    }

    /**
     * @notice ERC20 transfer an amount of base token from src to dst, if allowed
     * @param src The sender address
     * @param dst The recipient address
     * @param amount The quantity to transfer
     * @return true
     */
    function transferFrom(address src, address dst, uint256 amount) external override returns (bool) {
        transferInternal(msg.sender, src, dst, baseToken, amount, false);
        return true;
    }

    /**
     * @notice ERC20 transfer the whole base token balance from src to dst, if allowed
     * @param src The sender address
     * @param dst The recipient address
     */
    function transferAllFrom(address src, address dst) external override {
        transferInternal(msg.sender, src, dst, baseToken, balanceOf(src), true);
    }

    /**
     * @notice Transfer an amount of asset from src to dst, if allowed
     * @param src The sender address
     * @param dst The recipient address
     * @param asset The asset to transfer
     * @param amount The quantity to transfer
     */
    function transferAssetFrom(address src, address dst, address asset, uint256 amount) external override {
        transferInternal(msg.sender, src, dst, asset, amount, false);
    }

    /**
     * @dev Transfer either collateral or base asset, depending on the asset, if operator is allowed
     */
    function transferInternal(address operator, address src, address dst, address asset, uint256 amount, bool isAll) internal nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (isTransferPaused()) revert Paused();
        if (src == dst) revert NoSelfTransfer();

        spendAllowanceInternal(src, operator, asset, amount, isAll);

        if (asset == baseToken) {
            transferBase(src, dst, amount);
        } else {
            transferCollateral(src, dst, asset, amount);
        }
    }

    /**
     * @dev Transfer an amount of base asset from src to dst, borrowing if possible/necessary
     */
    function transferBase(address src, address dst, uint256 amount) internal {
        accrueInternal();

        UserBasic memory srcUser = userBasic[src];
        UserBasic memory dstUser = userBasic[dst];

        int104 srcPrincipal = srcUser.principal;
        int104 dstPrincipal = dstUser.principal;
        int256 srcBalance = presentValue(srcPrincipal) - signed256(amount);
        int256 dstBalance = presentValue(dstPrincipal) + signed256(amount);
        int104 srcPrincipalNew = principalValue(srcBalance);
        int104 dstPrincipalNew = principalValue(dstBalance);

        (uint104 withdrawAmount, uint104 borrowAmount) = withdrawAndBorrowAmount(srcPrincipal, srcPrincipalNew);
        (uint104 repayAmount, uint104 supplyAmount) = repayAndSupplyAmount(dstPrincipal, dstPrincipalNew);

        // Note: Instead of `total += addAmount - subAmount` to avoid underflow errors.
        totalSupplyBase = totalSupplyBase + supplyAmount - withdrawAmount;
        totalBorrowBase = totalBorrowBase + borrowAmount - repayAmount;

        updateBasePrincipal(src, srcUser, srcPrincipalNew);
        updateBasePrincipal(dst, dstUser, dstPrincipalNew);

        if (srcBalance < 0) {
            if (uint256(-srcBalance) < baseBorrowMin) revert BorrowTooSmall();
            if (!isBorrowCollateralized(src)) revert NotCollateralized();
        }

        if (withdrawAmount > 0) {
            emit Transfer(src, address(0), presentValueSupply(baseSupplyIndex, withdrawAmount));
        }

        if (supplyAmount > 0) {
            emit Transfer(address(0), dst, presentValueSupply(baseSupplyIndex, supplyAmount));
        }
    }

    /**
     * @dev Transfer an amount of collateral asset from src to dst
     */
    function transferCollateral(address src, address dst, address asset, uint256 amount) internal {
        uint256 srcCollateral = userCollateral[src][asset];
        uint256 dstCollateral = userCollateral[dst][asset];
        uint256 srcCollateralNew = srcCollateral - amount;
        uint256 dstCollateralNew = dstCollateral + amount;

        userCollateral[src][asset] = srcCollateralNew;
        userCollateral[dst][asset] = dstCollateralNew;

        (, uint8 index) = getAssetInfoByAddress(asset);
        updateAssetsIn(src, index, srcCollateral, srcCollateralNew);
        updateAssetsIn(dst, index, dstCollateral, dstCollateralNew);

        // Note: no accrue interest, BorrowCF < LiquidationCF covers small changes
        if (!isBorrowCollateralized(src)) revert NotCollateralized();

        emit TransferCollateral(src, dst, asset, amount);
    }

    /**
     * @notice Withdraw an amount of asset from the protocol
     * @param asset The asset to withdraw
     * @param amount The quantity to withdraw
     */
    function withdraw(address asset, uint256 amount) external override {
        return withdrawInternal(msg.sender, msg.sender, msg.sender, asset, amount, false);
    }

    /**
     * @notice Withdraw an amount of asset to `to`
     * @param to The recipient address
     * @param asset The asset to withdraw
     * @param amount The quantity to withdraw
     */
    function withdrawTo(address to, address asset, uint256 amount) external override {
        return withdrawInternal(msg.sender, msg.sender, to, asset, amount, false);
    }

    /**
     * @notice Withdraw an amount of asset from src to `to`, if allowed
     * @param src The sender address
     * @param to The recipient address
     * @param asset The asset to withdraw
     * @param amount The quantity to withdraw
     */
    function withdrawFrom(address src, address to, address asset, uint256 amount) external override {
        return withdrawInternal(msg.sender, src, to, asset, amount, false);
    }

    /**
     * @notice Withdraw the whole asset balance from src to `to`, if allowed
     * @param src The sender address (can be msg.sender)
     * @param to The recepient address (can be msg.sender)
     */
    function withdrawAllFrom(address src, address to) external override {
        return withdrawInternal(msg.sender, src, to, baseToken, balanceOf(src), true);
    }

    /**
     * @dev Withdraw either collateral or base asset, depending on the asset, if operator is allowed
     */
    function withdrawInternal(address operator, address src, address to, address asset, uint256 amount, bool isAll) internal nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (isWithdrawPaused()) revert Paused();

        spendAllowanceInternal(src, operator, asset, amount, isAll);

        /// In case of ...All() operation asset is guaranteed to be baseAsset
        if (asset == baseToken) {
            return withdrawBase(src, to, amount);
        } else {
            return withdrawCollateral(src, to, asset, amount);
        }
    }

    /**
     * @dev Withdraw an amount of base asset from src to `to`, borrowing if possible/necessary
     */
    function withdrawBase(address src, address to, uint256 amount) internal {
        accrueInternal();

        UserBasic memory srcUser = userBasic[src];
        int104 srcPrincipal = srcUser.principal;
        int256 srcBalance = presentValue(srcPrincipal) - signed256(amount);
        int104 srcPrincipalNew = principalValue(srcBalance);

        (uint104 withdrawAmount, uint104 borrowAmount) = withdrawAndBorrowAmount(srcPrincipal, srcPrincipalNew);

        totalSupplyBase -= withdrawAmount;
        totalBorrowBase += borrowAmount;

        updateBasePrincipal(src, srcUser, srcPrincipalNew);

        if (srcBalance < 0) {
            if (uint256(-srcBalance) < baseBorrowMin) revert BorrowTooSmall();
            if (!isBorrowCollateralized(src)) revert NotCollateralized();
        }

        IERC20(baseToken).safeTransfer(to, amount);

        emit Withdraw(src, to, amount);

        if (withdrawAmount > 0) {
            emit Transfer(src, address(0), presentValueSupply(baseSupplyIndex, withdrawAmount));
        }
    }

    /**
     * @dev Withdraw an amount of collateral asset from src to `to`
     */
    function withdrawCollateral(address src, address to, address asset, uint256 amount) internal {
        uint256 srcCollateral = userCollateral[src][asset];
        uint256 srcCollateralNew = srcCollateral - amount;

        totalsCollateral[asset] -= amount;
        userCollateral[src][asset] = srcCollateralNew;

        (, uint8 index) = getAssetInfoByAddress(asset);
        updateAssetsIn(src, index, srcCollateral, srcCollateralNew);

        // Note: no accrue interest, BorrowCF < LiquidationCF covers small changes
        if (!isBorrowCollateralized(src)) revert NotCollateralized();

        IERC20(asset).safeTransfer(to, amount);

        emit WithdrawCollateral(src, to, asset, amount);
    }

    /**
     * @dev Spend allowance for an asset, either all for base asset or a specific amount
     * @param src The address of the account that is spending the allowance
     * @param operator The address of the operator spending the allowance
     * @param asset The asset for which the allowance is being spent
     * @param amount The amount of the asset to be spent, or 0 for all
     * @param isAll Whether to spend all of the allowance for the base asset
     */
    function spendAllowanceInternal(address src, address operator, address asset, uint256 amount, bool isAll) internal {
        if (isAll) {
            if (!hasPermissionAll(src, operator)) revert InsufficientAllowance(asset, src, operator);
            spendAllowanceAll(src, operator);
        } else {
            if (!hasPermission(src, operator, asset, amount)) revert InsufficientAllowance(asset, src, operator);
            spendAllowance(src, operator, asset, amount);
        }
    }

    /**
     * @notice Absorb a list of underwater accounts onto the protocol balance sheet
     * @param absorber The recipient of the incentive paid to the caller of absorb
     * @param accounts The list of underwater accounts to absorb
     */
    function absorb(address absorber, address[] calldata accounts) external override {
        if (isAbsorbPaused()) revert Paused();
        accrueInternal();
        for (uint8 i = 0; i < accounts.length; ) {
            absorbInternal(absorber, accounts[i]);
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Transfer user's collateral and debt to the protocol itself.
     */
    function absorbInternal(address absorber, address account) internal {
        if (!isLiquidatable(account)) revert NotLiquidatable();

        UserBasic memory accountUser = userBasic[account];
        int104 oldPrincipal = accountUser.principal;
        int256 oldBalance = presentValue(oldPrincipal);
        uint24 assetsIn = accountUser.assetsIn;

        uint256 basePrice = getPrice(baseTokenPriceFeed);
        uint256 deltaValue = 0;

        uint8 nAssets = numAssets;
        for (uint8 i = 0; i < nAssets; ) {
            if (isInAsset(assetsIn, i)) {
                CollateralAsset memory assetInfo = getAssetInfo(i);
                address asset = assetInfo.collateralToken;
                uint256 seizeAmount = userCollateral[account][asset];
                userCollateral[account][asset] = 0;
                totalsCollateral[asset] -= seizeAmount;

                uint256 value = mulPrice(seizeAmount, getPrice(assetInfo.priceFeed), assetInfo.scale);
                deltaValue += mulFactor(value, assetInfo.liquidationFactor);

                emit AbsorbCollateral(absorber, account, asset, seizeAmount, value);
            }
            unchecked {
                ++i;
            }
        }

        uint256 deltaBalance = divPrice(deltaValue, basePrice, uint64(baseScale));
        int256 newBalance = oldBalance + signed256(deltaBalance);
        // New balance will not be negative, all excess debt absorbed by reserves
        if (newBalance < 0) {
            newBalance = 0;
        }

        int104 newPrincipal = principalValue(newBalance);
        updateBasePrincipal(account, accountUser, newPrincipal);

        // reset assetsIn
        userBasic[account].assetsIn = 0;

        (uint104 repayAmount, uint104 supplyAmount) = repayAndSupplyAmount(oldPrincipal, newPrincipal);

        // Reserves are decreased by increasing total supply and decreasing borrows
        //  the amount of debt repaid by reserves is `newBalance - oldBalance`
        totalSupplyBase += supplyAmount;
        totalBorrowBase -= repayAmount;

        uint256 basePaidOut = unsigned256(newBalance - oldBalance);

        uint256 valueOfBasePaidOut = mulPrice(basePaidOut, basePrice, uint64(baseScale));
        emit AbsorbDebt(absorber, account, basePaidOut, valueOfBasePaidOut);

        if (newPrincipal > 0) {
            emit Transfer(address(0), account, presentValueSupply(baseSupplyIndex, unsigned104(newPrincipal)));
        }
    }

    /**
     * @notice Buy collateral from the protocol using base tokens, increasing protocol reserves
       A minimum collateral amount should be specified to indicate the maximum slippage acceptable for the buyer.
     * @param asset The asset to buy
     * @param minAmount The minimum amount of collateral tokens that should be received by the buyer
     * @param baseAmount The amount of base tokens used to buy the collateral
     * @param recipient The recipient address
     */
    function buyCollateral(address asset, uint minAmount, uint baseAmount, address recipient) external override nonReentrant {
        if (isBuyPaused()) revert Paused();
        baseAmount = doTransferIn(baseToken, msg.sender, baseAmount);

        (uint256 amountOut, , uint256 feeProtocol, uint256 feeController) = quoteCollateral(asset, baseAmount);

        // Note: Re-entrancy can skip the reserves check above on a second buyCollateral call.

        if (amountOut < minAmount) revert TooMuchSlippage();

        // Note: we do no use the reserve part of the profit, as it stays in the Comet anyway
        if (amountOut + feeProtocol + feeController > getCollateralReserves(asset)) revert InsufficientReserves();

        if (feeProtocol > 0) {
            assetFeesDAO[asset] += feeController;
        }
        if (feeController > 0) {
            assetFeesController[asset] += feeController;
        }

        // Note: Pre-transfer hook can re-enter buyCollateral with a stale collateral ERC20 balance.
        //  Assets should not be listed which allow re-entry from pre-transfer now, as too much collateral could be bought.
        //  This is also a problem if quoteCollateral derives its discount from the collateral ERC20 balance.
        IERC20(asset).safeTransfer(recipient, amountOut);

        emit BuyCollateral(msg.sender, asset, baseAmount, amountOut);
    }

    /**
     * @param asset The collateral asset to get the quote for
     * @param baseAmount The amount of the base asset to get the quote for
     */
    function quoteCollateral(
        address asset,
        uint256 baseAmount
    ) public view override returns (uint256 amountOut, uint256 feeReserve, uint256 feeProtocol, uint256 feeController) {
        (CollateralAsset memory assetInfo, ) = getAssetInfoByAddress(asset);
        uint256 assetPrice = getPrice(assetInfo.priceFeed);
        // Store front discount is derived from the collateral asset's liquidationFactor and storeFrontPriceFactor
        // discount = storeFrontPriceFactor * (1e18 - liquidationFactor)
        uint256 discountFactor = mulFactor(storeFrontPriceFactor, FACTOR_SCALE - assetInfo.liquidationFactor);

        uint256 assetPriceDiscounted = mulFactor(assetPrice, FACTOR_SCALE - discountFactor);
        uint256 basePrice = getPrice(baseTokenPriceFeed);
        // # of collateral assets
        // = (TotalValueOfBaseAmount / DiscountedPriceOfCollateralAsset) * assetScale
        // = ((basePrice * baseAmount / baseScale) / assetPriceDiscounted) * assetScale
        amountOut = (baseAmount * basePrice * assetInfo.scale) / assetPriceDiscounted / baseScale;

        /// Protocol's profit calculation
        /*

        During the absorbtion, the protocol seizes the whole user's collateral, which is distributed in the next way:

        user's collateral
        |----- 100%
        |           <- a certain % (LP) is seized directly into protocol's reserves
        |----- LF = 1 - LP, this % of collateral's value is used to cover debt
        |           <- part of the collateral's value is supplied to a user's account as a refund
        |----- debt (a collateral value which corresponds to the debt value)
        |
        |           <- this part of collateral is used to compensate the debt to the protocol
        |
        |
        ------
        LF, liquidation factor (e.g. 90%)
        LP = 1 - LF, Liquidation Penalty, e.g for  LF = 90%, LP = 10%

        So, seized collateral value can be represented as:
            value = collateral * LP% + debt value + refunded collateral

        - debt is denominated in base asset, and that is the amount the protocol expects to be returned during purchase
        - refunded collateral is added as supply, thus can be viewed as a subsidized by the protocol, and so
          it should be compensated during purchase as well
        So, we can see a collateral value as:
            value = collateral * LP% + base asset value to return

        - in general we may assume that unless bad debt happens, LP% of user's collateral value is greater than LP% of user's debt
        value = collateral * LP% + base asset value to return >= base asset value to return * LP% + base asset value to return = 
              = base asset value to return * (1 + LP) = base asset value to return * (2 - LF)

        ---------------------------
        for every baseAmount of base asset, the protocol has (2 - LF) * baseAmount * basePrice / assetPrice of collateral
        ---------------------------
        The protocol sells: baseAmount * basePrice / (assetPrice * (1 - discount)) of collateral
            discount = SFF * (1-LF)
        So, the profit can be expressed in terms of collateral value:

            collateral value = baseAmount * basePrice / assetPrice
            profit = collateral value * (2 - LF) - collateral value / (1 - discount) =
                   = collateral value * (1 - LF - 2*discount + LF*discount) / (1 - discount)
        Example: SFF = 60%, LF = 90%, LP = 10%
            with 1.1 of collateral value initially
            selling 1.064 of collateral value
            profit = collateral value * (1 - 0.9 - 2 * 0.06 + 0.9 * 0.06) / (1 - 0.06) = collateral value * 0.036
        3.6% of the base asset value supplied during purchase can be extracted from the collateral reserves as a profit
        */

        uint256 scaledBaseAmount = mulFactor(baseAmount, 2 * FACTOR_SCALE - assetInfo.liquidationFactor);
        uint256 scaledCollateralValue = (scaledBaseAmount * basePrice * assetInfo.scale) / assetPrice / baseScale;
        uint256 profit = scaledCollateralValue - amountOut;

        // function guarantees that reserve+protocol+controller == profit
        (feeReserve, feeProtocol, feeController) = _distributeProfit(profit);
    }

    /**
     * @notice Get the total amount of debt
     * @dev Note: uses updated interest indices to calculate
     * @return The amount of debt
     **/
    function totalBorrow() public view override returns (uint256) {
        (, uint64 baseBorrowIndex_) = accruedInterestIndices(getNowInternal() - lastAccrualTime);
        return presentValueBorrow(baseBorrowIndex_, totalBorrowBase);
    }

    /**
     * @notice Get the target reserves of the protocol
     * @dev Note: uses updated interest indices to calculate
     * @return The target reserves
     **/
    function targetReserves() public view override returns (uint256) {
        return (totalBorrow() * targetPercent) / FACTOR_SCALE;
    }

    /**
     * @notice Query the current positive base balance of an account or zero
     * @dev Note: uses updated interest indices to calculate
     * @param account The account whose balance to query
     * @return The present day base balance magnitude of the account, if positive
     */
    function balanceOf(address account) public view override returns (uint256) {
        (uint64 baseSupplyIndex_, ) = accruedInterestIndices(getNowInternal() - lastAccrualTime);
        int104 principal = userBasic[account].principal;
        return principal > 0 ? presentValueSupply(baseSupplyIndex_, unsigned104(principal)) : 0;
    }

    /**
     * @notice Query the current negative base balance of an account or zero
     * @dev Note: uses updated interest indices to calculate
     * @param account The account whose balance to query
     * @return The present day base balance magnitude of the account, if negative
     */
    function borrowBalanceOf(address account) public view override returns (uint256) {
        (, uint64 baseBorrowIndex_) = accruedInterestIndices(getNowInternal() - lastAccrualTime);
        int104 principal = userBasic[account].principal;
        return principal < 0 ? presentValueBorrow(baseBorrowIndex_, unsigned104(-principal)) : 0;
    }

    /// @notice Calculates fees distribution (reserves % and dao fees %)
    /// @dev Internal function for calculation over the liquidation profit or interest profit
    /// @param profitAmount The amount to calculate fees from - it is expected to be denominated in USD already
    /// @return _reserveFee Profit accumulated in Comet's reserves
    /// @return _daoFee Fee on profit in favour of DAO
    /// @return _controllerFee Fee on profit in favour of Config Controller
    function _distributeProfit(uint256 profitAmount) internal view returns (uint256 _reserveFee, uint256 _daoFee, uint256 _controllerFee) {
        int256 _reserves = getReserves();
        uint256 reserves = _reserves > 0 ? uint256(_reserves) : 0;

        uint256 basePrice = getPrice(baseTokenPriceFeed);
        uint256 reservesUsd = (reserves * basePrice) / baseScale;
        uint256 seedUsd = (seedReserves * basePrice) / baseScale;
        uint256 targetUsd = (targetReserves() * basePrice) / baseScale;

        (uint64 reservePct, uint64 protocolPct) = ISandboxController(sandboxController).getCommissions(reservesUsd, seedUsd, targetUsd);

        _reserveFee = mulFactor(profitAmount, uint256(reservePct));
        _daoFee = mulFactor(profitAmount, uint256(protocolPct));
        _controllerFee = IConfigController(configController).cometFeeEnabled(address(this)) ? profitAmount - _reserveFee - _daoFee : 0;

        if (_controllerFee == 0) {
            _reserveFee = profitAmount - _daoFee;
        }
    }

    /**
     * @notice Fallback to calling the extension delegate for everything else
     */
    // aderyn-fp-next-line(contract-locks-ether)
    fallback() external payable {
        address delegate = extension;
        assembly ("memory-safe") {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), delegate, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize()) // aderyn-fp(yul-return)
            }
        }
    }
}
