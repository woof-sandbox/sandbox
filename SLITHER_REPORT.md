**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results.
Summary
 - [dead-code](#dead-code) (84 results) (Informational)
 - [uninitialized-state](#uninitialized-state) (77 results) (High)
 - [constable-states](#constable-states) (178 results) (Optimization)
 - [shadowing-local](#shadowing-local) (2 results) (Low)
 - [timestamp](#timestamp) (27 results) (Low)
 - [unused-state](#unused-state) (25 results) (Informational)
 - [reentrancy-events](#reentrancy-events) (9 results) (Low)
 - [assembly](#assembly) (23 results) (Informational)
 - [pragma](#pragma) (3 results) (Informational)
 - [solc-version](#solc-version) (3 results) (Informational)
 - [too-many-digits](#too-many-digits) (4 results) (Informational)
 - [unimplemented-functions](#unimplemented-functions) (3 results) (Informational)
 - [events-access](#events-access) (2 results) (Low)
 - [missing-zero-check](#missing-zero-check) (8 results) (Low)
 - [calls-loop](#calls-loop) (7 results) (Low)
 - [reentrancy-benign](#reentrancy-benign) (5 results) (Low)
 - [cyclomatic-complexity](#cyclomatic-complexity) (2 results) (Informational)
 - [naming-convention](#naming-convention) (47 results) (Informational)
 - [erc20-interface](#erc20-interface) (6 results) (Medium)
 - [unused-return](#unused-return) (3 results) (Medium)
 - [incorrect-equality](#incorrect-equality) (4 results) (Medium)
 - [locked-ether](#locked-ether) (1 results) (Medium)
 - [uninitialized-local](#uninitialized-local) (1 results) (Medium)
 - [events-maths](#events-maths) (1 results) (Low)
 - [costly-loop](#costly-loop) (2 results) (Informational)
## dead-code
Impact: Informational
Confidence: Medium
 - [ ] ID-0
[CometMath.signed104(uint104)](contracts/CometMath.sol#L34-L37) is never used and should be removed

contracts/CometMath.sol#L34-L37


 - [ ] ID-1
[CometMath.unsigned104(int104)](contracts/CometMath.sol#L44-L47) is never used and should be removed

contracts/CometMath.sol#L44-L47


 - [ ] ID-2
[CometMath.toUInt8(bool)](contracts/CometMath.sol#L54-L56) is never used and should be removed

contracts/CometMath.sol#L54-L56


 - [ ] ID-3
[CometMath.unsigned256(int256)](contracts/CometMath.sol#L49-L52) is never used and should be removed

contracts/CometMath.sol#L49-L52


 - [ ] ID-4
[CometMath.toBool(uint8)](contracts/CometMath.sol#L58-L60) is never used and should be removed

contracts/CometMath.sol#L58-L60


 - [ ] ID-5
[CometMath.signed256(uint256)](contracts/CometMath.sol#L39-L42) is never used and should be removed

contracts/CometMath.sol#L39-L42


 - [ ] ID-6
[CometMath.safe104(uint256)](contracts/CometMath.sol#L24-L27) is never used and should be removed

contracts/CometMath.sol#L24-L27


 - [ ] ID-7
[CometMath.safe128(uint256)](contracts/CometMath.sol#L29-L32) is never used and should be removed

contracts/CometMath.sol#L29-L32


 - [ ] ID-8
[CometMath.safe64(uint256)](contracts/CometMath.sol#L19-L22) is never used and should be removed

contracts/CometMath.sol#L19-L22


 - [ ] ID-9
[CometMath.signed104(uint104)](contracts/CometMath.sol#L34-L37) is never used and should be removed

contracts/CometMath.sol#L34-L37


 - [ ] ID-10
[CometMath.unsigned104(int104)](contracts/CometMath.sol#L44-L47) is never used and should be removed

contracts/CometMath.sol#L44-L47


 - [ ] ID-11
[CometCore.presentValueSupply(uint64,uint104)](contracts/CometCore.sol#L32-L34) is never used and should be removed

contracts/CometCore.sol#L32-L34


 - [ ] ID-12
[CometCore.presentValueBorrow(uint64,uint104)](contracts/CometCore.sol#L39-L41) is never used and should be removed

contracts/CometCore.sol#L39-L41


 - [ ] ID-13
[CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27) is never used and should be removed

contracts/CometCore.sol#L21-L27


 - [ ] ID-14
[CometMath.toUInt8(bool)](contracts/CometMath.sol#L54-L56) is never used and should be removed

contracts/CometMath.sol#L54-L56


 - [ ] ID-15
[CometMath.unsigned256(int256)](contracts/CometMath.sol#L49-L52) is never used and should be removed

contracts/CometMath.sol#L49-L52


 - [ ] ID-16
[CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52) is never used and should be removed

contracts/CometCore.sol#L46-L52


 - [ ] ID-17
[CometCore.principalValueSupply(uint64,uint256)](contracts/CometCore.sol#L58-L60) is never used and should be removed

contracts/CometCore.sol#L58-L60


 - [ ] ID-18
[CometMath.toBool(uint8)](contracts/CometMath.sol#L58-L60) is never used and should be removed

contracts/CometMath.sol#L58-L60


 - [ ] ID-19
[CometMath.signed256(uint256)](contracts/CometMath.sol#L39-L42) is never used and should be removed

contracts/CometMath.sol#L39-L42


 - [ ] ID-20
[CometMath.safe104(uint256)](contracts/CometMath.sol#L24-L27) is never used and should be removed

contracts/CometMath.sol#L24-L27


 - [ ] ID-21
[CometCore.principalValueBorrow(uint64,uint256)](contracts/CometCore.sol#L66-L68) is never used and should be removed

contracts/CometCore.sol#L66-L68


 - [ ] ID-22
[CometMath.safe128(uint256)](contracts/CometMath.sol#L29-L32) is never used and should be removed

contracts/CometMath.sol#L29-L32


 - [ ] ID-23
[CometMath.safe64(uint256)](contracts/CometMath.sol#L19-L22) is never used and should be removed

contracts/CometMath.sol#L19-L22


 - [ ] ID-24
[CometMath.signed104(uint104)](contracts/CometMath.sol#L34-L37) is never used and should be removed

contracts/CometMath.sol#L34-L37


 - [ ] ID-25
[CometMath.unsigned104(int104)](contracts/CometMath.sol#L44-L47) is never used and should be removed

contracts/CometMath.sol#L44-L47


 - [ ] ID-26
[CometCore.presentValueSupply(uint64,uint104)](contracts/CometCore.sol#L32-L34) is never used and should be removed

contracts/CometCore.sol#L32-L34


 - [ ] ID-27
[CometCore.presentValueBorrow(uint64,uint104)](contracts/CometCore.sol#L39-L41) is never used and should be removed

contracts/CometCore.sol#L39-L41


 - [ ] ID-28
[CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27) is never used and should be removed

contracts/CometCore.sol#L21-L27


 - [ ] ID-29
[CometMath.toUInt8(bool)](contracts/CometMath.sol#L54-L56) is never used and should be removed

contracts/CometMath.sol#L54-L56


 - [ ] ID-30
[CometMath.unsigned256(int256)](contracts/CometMath.sol#L49-L52) is never used and should be removed

contracts/CometMath.sol#L49-L52


 - [ ] ID-31
[CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52) is never used and should be removed

contracts/CometCore.sol#L46-L52


 - [ ] ID-32
[CometCore.principalValueSupply(uint64,uint256)](contracts/CometCore.sol#L58-L60) is never used and should be removed

contracts/CometCore.sol#L58-L60


 - [ ] ID-33
[CometMath.toBool(uint8)](contracts/CometMath.sol#L58-L60) is never used and should be removed

contracts/CometMath.sol#L58-L60


 - [ ] ID-34
[CometMath.signed256(uint256)](contracts/CometMath.sol#L39-L42) is never used and should be removed

contracts/CometMath.sol#L39-L42


 - [ ] ID-35
[CometMath.safe104(uint256)](contracts/CometMath.sol#L24-L27) is never used and should be removed

contracts/CometMath.sol#L24-L27


 - [ ] ID-36
[CometCore.principalValueBorrow(uint64,uint256)](contracts/CometCore.sol#L66-L68) is never used and should be removed

contracts/CometCore.sol#L66-L68


 - [ ] ID-37
[CometMath.safe128(uint256)](contracts/CometMath.sol#L29-L32) is never used and should be removed

contracts/CometMath.sol#L29-L32


 - [ ] ID-38
[CometMath.safe64(uint256)](contracts/CometMath.sol#L19-L22) is never used and should be removed

contracts/CometMath.sol#L19-L22


 - [ ] ID-39
[CometMath.signed104(uint104)](contracts/CometMath.sol#L34-L37) is never used and should be removed

contracts/CometMath.sol#L34-L37


 - [ ] ID-40
[CometMath.unsigned104(int104)](contracts/CometMath.sol#L44-L47) is never used and should be removed

contracts/CometMath.sol#L44-L47


 - [ ] ID-41
[CometCore.presentValueSupply(uint64,uint104)](contracts/CometCore.sol#L32-L34) is never used and should be removed

contracts/CometCore.sol#L32-L34


 - [ ] ID-42
[CometCore.presentValueBorrow(uint64,uint104)](contracts/CometCore.sol#L39-L41) is never used and should be removed

contracts/CometCore.sol#L39-L41


 - [ ] ID-43
[CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27) is never used and should be removed

contracts/CometCore.sol#L21-L27


 - [ ] ID-44
[CometMath.toUInt8(bool)](contracts/CometMath.sol#L54-L56) is never used and should be removed

contracts/CometMath.sol#L54-L56


 - [ ] ID-45
[CometMath.unsigned256(int256)](contracts/CometMath.sol#L49-L52) is never used and should be removed

contracts/CometMath.sol#L49-L52


 - [ ] ID-46
[CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52) is never used and should be removed

contracts/CometCore.sol#L46-L52


 - [ ] ID-47
[CometCore.principalValueSupply(uint64,uint256)](contracts/CometCore.sol#L58-L60) is never used and should be removed

contracts/CometCore.sol#L58-L60


 - [ ] ID-48
[CometMath.toBool(uint8)](contracts/CometMath.sol#L58-L60) is never used and should be removed

contracts/CometMath.sol#L58-L60


 - [ ] ID-49
[CometMath.signed256(uint256)](contracts/CometMath.sol#L39-L42) is never used and should be removed

contracts/CometMath.sol#L39-L42


 - [ ] ID-50
[CometMath.safe104(uint256)](contracts/CometMath.sol#L24-L27) is never used and should be removed

contracts/CometMath.sol#L24-L27


 - [ ] ID-51
[CometCore.principalValueBorrow(uint64,uint256)](contracts/CometCore.sol#L66-L68) is never used and should be removed

contracts/CometCore.sol#L66-L68


 - [ ] ID-52
[CometMath.safe128(uint256)](contracts/CometMath.sol#L29-L32) is never used and should be removed

contracts/CometMath.sol#L29-L32


 - [ ] ID-53
[CometMath.safe64(uint256)](contracts/CometMath.sol#L19-L22) is never used and should be removed

contracts/CometMath.sol#L19-L22


 - [ ] ID-54
[CometMath.signed104(uint104)](contracts/CometMath.sol#L34-L37) is never used and should be removed

contracts/CometMath.sol#L34-L37


 - [ ] ID-55
[CometMath.unsigned104(int104)](contracts/CometMath.sol#L44-L47) is never used and should be removed

contracts/CometMath.sol#L44-L47


 - [ ] ID-56
[CometCore.presentValueSupply(uint64,uint104)](contracts/CometCore.sol#L32-L34) is never used and should be removed

contracts/CometCore.sol#L32-L34


 - [ ] ID-57
[CometCore.presentValueBorrow(uint64,uint104)](contracts/CometCore.sol#L39-L41) is never used and should be removed

contracts/CometCore.sol#L39-L41


 - [ ] ID-58
[CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27) is never used and should be removed

contracts/CometCore.sol#L21-L27


 - [ ] ID-59
[CometMath.toUInt8(bool)](contracts/CometMath.sol#L54-L56) is never used and should be removed

contracts/CometMath.sol#L54-L56


 - [ ] ID-60
[CometMath.unsigned256(int256)](contracts/CometMath.sol#L49-L52) is never used and should be removed

contracts/CometMath.sol#L49-L52


 - [ ] ID-61
[CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52) is never used and should be removed

contracts/CometCore.sol#L46-L52


 - [ ] ID-62
[CometCore.principalValueSupply(uint64,uint256)](contracts/CometCore.sol#L58-L60) is never used and should be removed

contracts/CometCore.sol#L58-L60


 - [ ] ID-63
[CometMath.toBool(uint8)](contracts/CometMath.sol#L58-L60) is never used and should be removed

contracts/CometMath.sol#L58-L60


 - [ ] ID-64
[CometMath.signed256(uint256)](contracts/CometMath.sol#L39-L42) is never used and should be removed

contracts/CometMath.sol#L39-L42


 - [ ] ID-65
[CometMath.safe104(uint256)](contracts/CometMath.sol#L24-L27) is never used and should be removed

contracts/CometMath.sol#L24-L27


 - [ ] ID-66
[CometCore.principalValueBorrow(uint64,uint256)](contracts/CometCore.sol#L66-L68) is never used and should be removed

contracts/CometCore.sol#L66-L68


 - [ ] ID-67
[CometMath.safe128(uint256)](contracts/CometMath.sol#L29-L32) is never used and should be removed

contracts/CometMath.sol#L29-L32


 - [ ] ID-68
[CometMath.safe64(uint256)](contracts/CometMath.sol#L19-L22) is never used and should be removed

contracts/CometMath.sol#L19-L22


 - [ ] ID-69
[CometMath.signed104(uint104)](contracts/CometMath.sol#L34-L37) is never used and should be removed

contracts/CometMath.sol#L34-L37


 - [ ] ID-70
[CometMath.unsigned104(int104)](contracts/CometMath.sol#L44-L47) is never used and should be removed

contracts/CometMath.sol#L44-L47


 - [ ] ID-71
[CometCore.presentValueSupply(uint64,uint104)](contracts/CometCore.sol#L32-L34) is never used and should be removed

contracts/CometCore.sol#L32-L34


 - [ ] ID-72
[CometCore.presentValueBorrow(uint64,uint104)](contracts/CometCore.sol#L39-L41) is never used and should be removed

contracts/CometCore.sol#L39-L41


 - [ ] ID-73
[CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27) is never used and should be removed

contracts/CometCore.sol#L21-L27


 - [ ] ID-74
[CometMath.toUInt8(bool)](contracts/CometMath.sol#L54-L56) is never used and should be removed

contracts/CometMath.sol#L54-L56


 - [ ] ID-75
[CometMath.unsigned256(int256)](contracts/CometMath.sol#L49-L52) is never used and should be removed

contracts/CometMath.sol#L49-L52


 - [ ] ID-76
[CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52) is never used and should be removed

contracts/CometCore.sol#L46-L52


 - [ ] ID-77
[CometCore.principalValueSupply(uint64,uint256)](contracts/CometCore.sol#L58-L60) is never used and should be removed

contracts/CometCore.sol#L58-L60


 - [ ] ID-78
[CometMath.toBool(uint8)](contracts/CometMath.sol#L58-L60) is never used and should be removed

contracts/CometMath.sol#L58-L60


 - [ ] ID-79
[CometMath.signed256(uint256)](contracts/CometMath.sol#L39-L42) is never used and should be removed

contracts/CometMath.sol#L39-L42


 - [ ] ID-80
[CometMath.safe104(uint256)](contracts/CometMath.sol#L24-L27) is never used and should be removed

contracts/CometMath.sol#L24-L27


 - [ ] ID-81
[CometCore.principalValueBorrow(uint64,uint256)](contracts/CometCore.sol#L66-L68) is never used and should be removed

contracts/CometCore.sol#L66-L68


 - [ ] ID-82
[CometMath.safe128(uint256)](contracts/CometMath.sol#L29-L32) is never used and should be removed

contracts/CometMath.sol#L29-L32


 - [ ] ID-83
[CometMath.safe64(uint256)](contracts/CometMath.sol#L19-L22) is never used and should be removed

contracts/CometMath.sol#L19-L22


## uninitialized-state
Impact: High
Confidence: High
 - [ ] ID-84
[CometStorage.isAllowed](contracts/CometStorage.sol#L200) is never initialized. It is used in:
	- [CometCore.hasPermission(address,address)](contracts/CometCore.sol#L14-L16)

contracts/CometStorage.sol#L200


 - [ ] ID-85
[CometStorage.baseSupplyIndex](contracts/CometStorage.sol#L176) is never initialized. It is used in:
	- [CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27)
	- [CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52)

contracts/CometStorage.sol#L176


 - [ ] ID-86
[CometStorage.baseBorrowIndex](contracts/CometStorage.sol#L177) is never initialized. It is used in:
	- [CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27)
	- [CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52)

contracts/CometStorage.sol#L177


 - [ ] ID-87
[CometStorage.totalSupplyBase](contracts/CometStorage.sol#L180) is never initialized. It is used in:
	- [CometExtension.totalsBasic()](contracts/CometExtension.sol#L59-L71)

contracts/CometStorage.sol#L180


 - [ ] ID-88
[CometStorage.trackingIndexScale](contracts/CometStorage.sol#L145) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L145


 - [ ] ID-89
[CometStorage.supplyKink](contracts/CometStorage.sol#L105) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L105


 - [ ] ID-90
[CometStorage.baseMinForRewards](contracts/CometStorage.sol#L158) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L158


 - [ ] ID-91
[CometStorage.lastAccrualTime](contracts/CometStorage.sol#L182) is never initialized. It is used in:
	- [CometExtension.totalsBasic()](contracts/CometExtension.sol#L59-L71)

contracts/CometStorage.sol#L182


 - [ ] ID-92
[CometStorage.configController](contracts/CometStorage.sol#L86) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L86


 - [ ] ID-93
[CometStorage.unlockTimestamp](contracts/CometStorage.sol#L170) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L170


 - [ ] ID-94
[CometStorage.borrowPerSecondInterestRateBase](contracts/CometStorage.sol#L133) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L133


 - [ ] ID-95
[CometStorage.supplyPerSecondInterestRateBase](contracts/CometStorage.sol#L117) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L117


 - [ ] ID-96
[CometStorage.borrowPerSecondInterestRateSlopeLow](contracts/CometStorage.sol#L125) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L125


 - [ ] ID-97
[CometStorage.baseToken](contracts/CometStorage.sol#L95) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L95


 - [ ] ID-98
[CometStorage.trackingBorrowIndex](contracts/CometStorage.sol#L179) is never initialized. It is used in:
	- [CometExtension.totalsBasic()](contracts/CometExtension.sol#L59-L71)

contracts/CometStorage.sol#L179


 - [ ] ID-99
[CometStorage.baseTokenPriceFeed](contracts/CometStorage.sol#L101) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L101


 - [ ] ID-100
[CometStorage.trackingSupplyIndex](contracts/CometStorage.sol#L178) is never initialized. It is used in:
	- [CometExtension.totalsBasic()](contracts/CometExtension.sol#L59-L71)

contracts/CometStorage.sol#L178


 - [ ] ID-101
[CometStorage.userCollateral](contracts/CometStorage.sol#L209) is never initialized. It is used in:
	- [CometExtension.collateralBalanceOf(address,address)](contracts/CometExtension.sol#L124-L126)

contracts/CometStorage.sol#L209


 - [ ] ID-102
[CometStorage.baseSupplyIndex](contracts/CometStorage.sol#L176) is never initialized. It is used in:
	- [CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27)
	- [CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52)
	- [CometExtension.totalsBasic()](contracts/CometExtension.sol#L59-L71)

contracts/CometStorage.sol#L176


 - [ ] ID-103
[CometStorage.baseBorrowMin](contracts/CometStorage.sol#L161) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L161


 - [ ] ID-104
[CometStorage.storeFrontPriceFactor](contracts/CometStorage.sol#L137) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L137


 - [ ] ID-105
[CometStorage.baseTrackingSupplySpeed](contracts/CometStorage.sol#L149) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L149


 - [ ] ID-106
[CometStorage.seedReserves](contracts/CometStorage.sol#L167) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L167


 - [ ] ID-107
[CometStorage.borrowKink](contracts/CometStorage.sol#L121) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L121


 - [ ] ID-108
[CometStorage.pauseFlags](contracts/CometStorage.sol#L183) is never initialized. It is used in:
	- [CometExtension.totalsBasic()](contracts/CometExtension.sol#L59-L71)

contracts/CometStorage.sol#L183


 - [ ] ID-109
[CometStorage.supplyPerSecondInterestRateSlopeHigh](contracts/CometStorage.sol#L113) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L113


 - [ ] ID-110
[CometStorage.userBasic](contracts/CometStorage.sol#L206) is never initialized. It is used in:
	- [CometExtension.baseTrackingAccrued(address)](contracts/CometExtension.sol#L133-L135)

contracts/CometStorage.sol#L206


 - [ ] ID-111
[CometStorage.collateralAssets](contracts/CometStorage.sol#L212) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L212


 - [ ] ID-112
[CometStorage.borrowPerSecondInterestRateSlopeHigh](contracts/CometStorage.sol#L129) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L129


 - [ ] ID-113
[CometStorage.baseTrackingBorrowSpeed](contracts/CometStorage.sol#L153) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L153


 - [ ] ID-114
[CometStorage.baseBorrowIndex](contracts/CometStorage.sol#L177) is never initialized. It is used in:
	- [CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27)
	- [CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52)
	- [CometExtension.totalsBasic()](contracts/CometExtension.sol#L59-L71)

contracts/CometStorage.sol#L177


 - [ ] ID-115
[CometStorage.supplyPerSecondInterestRateSlopeLow](contracts/CometStorage.sol#L109) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L109


 - [ ] ID-116
[CometStorage.totalBorrowBase](contracts/CometStorage.sol#L181) is never initialized. It is used in:
	- [CometExtension.totalsBasic()](contracts/CometExtension.sol#L59-L71)

contracts/CometStorage.sol#L181


 - [ ] ID-117
[CometStorage.targetPercent](contracts/CometStorage.sol#L164) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L164


 - [ ] ID-118
[CometStorage.totalSupplyBase](contracts/CometStorage.sol#L180) is never initialized. It is used in:
	- [CometExtension.totalsBasic()](contracts/CometExtension.sol#L59-L71)

contracts/CometStorage.sol#L180


 - [ ] ID-119
[CometStorage.trackingIndexScale](contracts/CometStorage.sol#L145) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L145


 - [ ] ID-120
[CometStorage.supplyKink](contracts/CometStorage.sol#L105) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L105


 - [ ] ID-121
[CometStorage.baseMinForRewards](contracts/CometStorage.sol#L158) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L158


 - [ ] ID-122
[CometStorage.lastAccrualTime](contracts/CometStorage.sol#L182) is never initialized. It is used in:
	- [CometExtension.totalsBasic()](contracts/CometExtension.sol#L59-L71)

contracts/CometStorage.sol#L182


 - [ ] ID-123
[CometStorage.configController](contracts/CometStorage.sol#L86) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L86


 - [ ] ID-124
[CometStorage.unlockTimestamp](contracts/CometStorage.sol#L170) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L170


 - [ ] ID-125
[CometStorage.isAllowed](contracts/CometStorage.sol#L200) is never initialized. It is used in:
	- [CometCore.hasPermission(address,address)](contracts/CometCore.sol#L14-L16)

contracts/CometStorage.sol#L200


 - [ ] ID-126
[CometStorage.borrowPerSecondInterestRateBase](contracts/CometStorage.sol#L133) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L133


 - [ ] ID-127
[CometStorage.supplyPerSecondInterestRateBase](contracts/CometStorage.sol#L117) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L117


 - [ ] ID-128
[CometStorage.borrowPerSecondInterestRateSlopeLow](contracts/CometStorage.sol#L125) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L125


 - [ ] ID-129
[CometStorage.baseToken](contracts/CometStorage.sol#L95) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L95


 - [ ] ID-130
[CometStorage.trackingBorrowIndex](contracts/CometStorage.sol#L179) is never initialized. It is used in:
	- [CometExtension.totalsBasic()](contracts/CometExtension.sol#L59-L71)

contracts/CometStorage.sol#L179


 - [ ] ID-131
[CometStorage.baseTokenPriceFeed](contracts/CometStorage.sol#L101) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L101


 - [ ] ID-132
[CometStorage.trackingSupplyIndex](contracts/CometStorage.sol#L178) is never initialized. It is used in:
	- [CometExtension.totalsBasic()](contracts/CometExtension.sol#L59-L71)

contracts/CometStorage.sol#L178


 - [ ] ID-133
[CometStorage.userCollateral](contracts/CometStorage.sol#L209) is never initialized. It is used in:
	- [CometExtension.collateralBalanceOf(address,address)](contracts/CometExtension.sol#L124-L126)

contracts/CometStorage.sol#L209


 - [ ] ID-134
[CometStorage.baseSupplyIndex](contracts/CometStorage.sol#L176) is never initialized. It is used in:
	- [CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27)
	- [CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52)
	- [CometExtension.totalsBasic()](contracts/CometExtension.sol#L59-L71)

contracts/CometStorage.sol#L176


 - [ ] ID-135
[CometStorage.baseBorrowMin](contracts/CometStorage.sol#L161) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L161


 - [ ] ID-136
[CometStorage.storeFrontPriceFactor](contracts/CometStorage.sol#L137) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L137


 - [ ] ID-137
[CometStorage.baseTrackingSupplySpeed](contracts/CometStorage.sol#L149) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L149


 - [ ] ID-138
[CometStorage.seedReserves](contracts/CometStorage.sol#L167) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L167


 - [ ] ID-139
[CometStorage.borrowKink](contracts/CometStorage.sol#L121) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L121


 - [ ] ID-140
[CometStorage.pauseFlags](contracts/CometStorage.sol#L183) is never initialized. It is used in:
	- [CometExtension.totalsBasic()](contracts/CometExtension.sol#L59-L71)

contracts/CometStorage.sol#L183


 - [ ] ID-141
[CometStorage.supplyPerSecondInterestRateSlopeHigh](contracts/CometStorage.sol#L113) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L113


 - [ ] ID-142
[CometStorage.baseSupplyIndex](contracts/CometStorage.sol#L176) is never initialized. It is used in:
	- [CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27)
	- [CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52)

contracts/CometStorage.sol#L176


 - [ ] ID-143
[CometStorage.userBasic](contracts/CometStorage.sol#L206) is never initialized. It is used in:
	- [CometExtension.baseTrackingAccrued(address)](contracts/CometExtension.sol#L133-L135)

contracts/CometStorage.sol#L206


 - [ ] ID-144
[CometStorage.collateralAssets](contracts/CometStorage.sol#L212) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L212


 - [ ] ID-145
[CometStorage.baseBorrowIndex](contracts/CometStorage.sol#L177) is never initialized. It is used in:
	- [CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27)
	- [CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52)

contracts/CometStorage.sol#L177


 - [ ] ID-146
[CometStorage.borrowPerSecondInterestRateSlopeHigh](contracts/CometStorage.sol#L129) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L129


 - [ ] ID-147
[CometStorage.baseTrackingBorrowSpeed](contracts/CometStorage.sol#L153) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L153


 - [ ] ID-148
[CometStorage.baseBorrowIndex](contracts/CometStorage.sol#L177) is never initialized. It is used in:
	- [CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27)
	- [CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52)
	- [CometExtension.totalsBasic()](contracts/CometExtension.sol#L59-L71)

contracts/CometStorage.sol#L177


 - [ ] ID-149
[CometStorage.supplyPerSecondInterestRateSlopeLow](contracts/CometStorage.sol#L109) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L109


 - [ ] ID-150
[CometStorage.totalBorrowBase](contracts/CometStorage.sol#L181) is never initialized. It is used in:
	- [CometExtension.totalsBasic()](contracts/CometExtension.sol#L59-L71)

contracts/CometStorage.sol#L181


 - [ ] ID-151
[CometStorage.targetPercent](contracts/CometStorage.sol#L164) is never initialized. It is used in:
	- [CometExtension.getConfiguration()](contracts/CometExtension.sol#L215-L241)

contracts/CometStorage.sol#L164


 - [ ] ID-152
[CometStorage.isAllowed](contracts/CometStorage.sol#L200) is never initialized. It is used in:
	- [CometCore.hasPermission(address,address)](contracts/CometCore.sol#L14-L16)

contracts/CometStorage.sol#L200


 - [ ] ID-153
[CometStorage.baseSupplyIndex](contracts/CometStorage.sol#L176) is never initialized. It is used in:
	- [CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27)
	- [CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52)

contracts/CometStorage.sol#L176


 - [ ] ID-154
[CometStorage.baseBorrowIndex](contracts/CometStorage.sol#L177) is never initialized. It is used in:
	- [CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27)
	- [CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52)

contracts/CometStorage.sol#L177


 - [ ] ID-155
[CometStorage.isAllowed](contracts/CometStorage.sol#L200) is never initialized. It is used in:
	- [CometCore.hasPermission(address,address)](contracts/CometCore.sol#L14-L16)

contracts/CometStorage.sol#L200


 - [ ] ID-156
[CometStorage.baseSupplyIndex](contracts/CometStorage.sol#L176) is never initialized. It is used in:
	- [CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27)
	- [CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52)

contracts/CometStorage.sol#L176


 - [ ] ID-157
[CometStorage.baseBorrowIndex](contracts/CometStorage.sol#L177) is never initialized. It is used in:
	- [CometCore.presentValue(int104)](contracts/CometCore.sol#L21-L27)
	- [CometCore.principalValue(int256)](contracts/CometCore.sol#L46-L52)

contracts/CometStorage.sol#L177


 - [ ] ID-158
[CometStorage.isAllowed](contracts/CometStorage.sol#L200) is never initialized. It is used in:
	- [CometCore.hasPermission(address,address)](contracts/CometCore.sol#L14-L16)

contracts/CometStorage.sol#L200


 - [ ] ID-159
[CometStorage.baseTrackingSupplySpeed](contracts/CometStorage.sol#L149) is never initialized. It is used in:
	- [SandboxComet.accrueInternal()](contracts/SandboxComet.sol#L215-L229)

contracts/CometStorage.sol#L149


 - [ ] ID-160
[CometStorage.baseTrackingBorrowSpeed](contracts/CometStorage.sol#L153) is never initialized. It is used in:
	- [SandboxComet.accrueInternal()](contracts/SandboxComet.sol#L215-L229)

contracts/CometStorage.sol#L153


## constable-states
Impact: Optimization
Confidence: High
 - [ ] ID-161
[CometStorage.baseMinForRewards](contracts/CometStorage.sol#L158) should be constant 

contracts/CometStorage.sol#L158


 - [ ] ID-162
[CometStorage.supplyPerSecondInterestRateSlopeLow](contracts/CometStorage.sol#L109) should be constant 

contracts/CometStorage.sol#L109


 - [ ] ID-163
[CometStorage.baseBorrowIndex](contracts/CometStorage.sol#L177) should be constant 

contracts/CometStorage.sol#L177


 - [ ] ID-164
[CometStorage.baseToken](contracts/CometStorage.sol#L95) should be constant 

contracts/CometStorage.sol#L95


 - [ ] ID-165
[CometStorage.configController](contracts/CometStorage.sol#L86) should be constant 

contracts/CometStorage.sol#L86


 - [ ] ID-166
[CometStorage.borrowPerSecondInterestRateSlopeHigh](contracts/CometStorage.sol#L129) should be constant 

contracts/CometStorage.sol#L129


 - [ ] ID-167
[CometStorage.extension](contracts/CometStorage.sol#L92) should be constant 

contracts/CometStorage.sol#L92


 - [ ] ID-168
[CometStorage.accrualDescaleFactor](contracts/CometStorage.sol#L173) should be constant 

contracts/CometStorage.sol#L173


 - [ ] ID-169
[CometStorage.numAssets](contracts/CometStorage.sol#L186) should be constant 

contracts/CometStorage.sol#L186


 - [ ] ID-170
[CometStorage.storeFrontPriceFactor](contracts/CometStorage.sol#L137) should be constant 

contracts/CometStorage.sol#L137


 - [ ] ID-171
[CometStorage.baseSupplyIndex](contracts/CometStorage.sol#L176) should be constant 

contracts/CometStorage.sol#L176


 - [ ] ID-172
[CometStorage._closed](contracts/CometStorage.sol#L189) should be constant 

contracts/CometStorage.sol#L189


 - [ ] ID-173
[CometStorage.baseTrackingBorrowSpeed](contracts/CometStorage.sol#L153) should be constant 

contracts/CometStorage.sol#L153


 - [ ] ID-174
[CometStorage.targetPercent](contracts/CometStorage.sol#L164) should be constant 

contracts/CometStorage.sol#L164


 - [ ] ID-175
[CometStorage.borrowPerSecondInterestRateBase](contracts/CometStorage.sol#L133) should be constant 

contracts/CometStorage.sol#L133


 - [ ] ID-176
[CometStorage.supplyPerSecondInterestRateBase](contracts/CometStorage.sol#L117) should be constant 

contracts/CometStorage.sol#L117


 - [ ] ID-177
[CometStorage.supplyPerSecondInterestRateSlopeHigh](contracts/CometStorage.sol#L113) should be constant 

contracts/CometStorage.sol#L113


 - [ ] ID-178
[CometStorage.trackingIndexScale](contracts/CometStorage.sol#L145) should be constant 

contracts/CometStorage.sol#L145


 - [ ] ID-179
[CometStorage.baseScale](contracts/CometStorage.sol#L141) should be constant 

contracts/CometStorage.sol#L141


 - [ ] ID-180
[CometStorage.trackingBorrowIndex](contracts/CometStorage.sol#L179) should be constant 

contracts/CometStorage.sol#L179


 - [ ] ID-181
[CometStorage.pauseFlags](contracts/CometStorage.sol#L183) should be constant 

contracts/CometStorage.sol#L183


 - [ ] ID-182
[CometStorage.trackingSupplyIndex](contracts/CometStorage.sol#L178) should be constant 

contracts/CometStorage.sol#L178


 - [ ] ID-183
[CometStorage.totalBorrowBase](contracts/CometStorage.sol#L181) should be constant 

contracts/CometStorage.sol#L181


 - [ ] ID-184
[CometStorage.sandboxController](contracts/CometStorage.sol#L89) should be constant 

contracts/CometStorage.sol#L89


 - [ ] ID-185
[CometStorage.baseBorrowMin](contracts/CometStorage.sol#L161) should be constant 

contracts/CometStorage.sol#L161


 - [ ] ID-186
[CometStorage.totalSupplyBase](contracts/CometStorage.sol#L180) should be constant 

contracts/CometStorage.sol#L180


 - [ ] ID-187
[CometStorage.baseTrackingSupplySpeed](contracts/CometStorage.sol#L149) should be constant 

contracts/CometStorage.sol#L149


 - [ ] ID-188
[CometStorage.unlockTimestamp](contracts/CometStorage.sol#L170) should be constant 

contracts/CometStorage.sol#L170


 - [ ] ID-189
[CometStorage.factory](contracts/CometStorage.sol#L98) should be constant 

contracts/CometStorage.sol#L98


 - [ ] ID-190
[CometStorage.borrowKink](contracts/CometStorage.sol#L121) should be constant 

contracts/CometStorage.sol#L121


 - [ ] ID-191
[CometStorage.borrowPerSecondInterestRateSlopeLow](contracts/CometStorage.sol#L125) should be constant 

contracts/CometStorage.sol#L125


 - [ ] ID-192
[CometStorage.baseTokenPriceFeed](contracts/CometStorage.sol#L101) should be constant 

contracts/CometStorage.sol#L101


 - [ ] ID-193
[CometStorage.lastAccrualTime](contracts/CometStorage.sol#L182) should be constant 

contracts/CometStorage.sol#L182


 - [ ] ID-194
[CometStorage.supplyKink](contracts/CometStorage.sol#L105) should be constant 

contracts/CometStorage.sol#L105


 - [ ] ID-195
[CometStorage.seedReserves](contracts/CometStorage.sol#L167) should be constant 

contracts/CometStorage.sol#L167


 - [ ] ID-196
[CometStorage.baseMinForRewards](contracts/CometStorage.sol#L158) should be constant 

contracts/CometStorage.sol#L158


 - [ ] ID-197
[CometStorage.supplyPerSecondInterestRateSlopeLow](contracts/CometStorage.sol#L109) should be constant 

contracts/CometStorage.sol#L109


 - [ ] ID-198
[CometStorage.baseBorrowIndex](contracts/CometStorage.sol#L177) should be constant 

contracts/CometStorage.sol#L177


 - [ ] ID-199
[CometStorage.baseToken](contracts/CometStorage.sol#L95) should be constant 

contracts/CometStorage.sol#L95


 - [ ] ID-200
[CometStorage.configController](contracts/CometStorage.sol#L86) should be constant 

contracts/CometStorage.sol#L86


 - [ ] ID-201
[CometStorage.borrowPerSecondInterestRateSlopeHigh](contracts/CometStorage.sol#L129) should be constant 

contracts/CometStorage.sol#L129


 - [ ] ID-202
[CometStorage.extension](contracts/CometStorage.sol#L92) should be constant 

contracts/CometStorage.sol#L92


 - [ ] ID-203
[CometStorage.accrualDescaleFactor](contracts/CometStorage.sol#L173) should be constant 

contracts/CometStorage.sol#L173


 - [ ] ID-204
[CometStorage.numAssets](contracts/CometStorage.sol#L186) should be constant 

contracts/CometStorage.sol#L186


 - [ ] ID-205
[CometStorage.storeFrontPriceFactor](contracts/CometStorage.sol#L137) should be constant 

contracts/CometStorage.sol#L137


 - [ ] ID-206
[CometStorage.baseSupplyIndex](contracts/CometStorage.sol#L176) should be constant 

contracts/CometStorage.sol#L176


 - [ ] ID-207
[CometStorage._closed](contracts/CometStorage.sol#L189) should be constant 

contracts/CometStorage.sol#L189


 - [ ] ID-208
[CometStorage.baseTrackingBorrowSpeed](contracts/CometStorage.sol#L153) should be constant 

contracts/CometStorage.sol#L153


 - [ ] ID-209
[CometStorage.targetPercent](contracts/CometStorage.sol#L164) should be constant 

contracts/CometStorage.sol#L164


 - [ ] ID-210
[CometStorage.borrowPerSecondInterestRateBase](contracts/CometStorage.sol#L133) should be constant 

contracts/CometStorage.sol#L133


 - [ ] ID-211
[CometStorage.supplyPerSecondInterestRateBase](contracts/CometStorage.sol#L117) should be constant 

contracts/CometStorage.sol#L117


 - [ ] ID-212
[CometStorage.supplyPerSecondInterestRateSlopeHigh](contracts/CometStorage.sol#L113) should be constant 

contracts/CometStorage.sol#L113


 - [ ] ID-213
[CometStorage.trackingIndexScale](contracts/CometStorage.sol#L145) should be constant 

contracts/CometStorage.sol#L145


 - [ ] ID-214
[CometStorage.baseScale](contracts/CometStorage.sol#L141) should be constant 

contracts/CometStorage.sol#L141


 - [ ] ID-215
[CometStorage.trackingBorrowIndex](contracts/CometStorage.sol#L179) should be constant 

contracts/CometStorage.sol#L179


 - [ ] ID-216
[CometStorage.pauseFlags](contracts/CometStorage.sol#L183) should be constant 

contracts/CometStorage.sol#L183


 - [ ] ID-217
[CometStorage.trackingSupplyIndex](contracts/CometStorage.sol#L178) should be constant 

contracts/CometStorage.sol#L178


 - [ ] ID-218
[CometStorage.totalBorrowBase](contracts/CometStorage.sol#L181) should be constant 

contracts/CometStorage.sol#L181


 - [ ] ID-219
[CometStorage.sandboxController](contracts/CometStorage.sol#L89) should be constant 

contracts/CometStorage.sol#L89


 - [ ] ID-220
[CometStorage.baseBorrowMin](contracts/CometStorage.sol#L161) should be constant 

contracts/CometStorage.sol#L161


 - [ ] ID-221
[CometStorage.totalSupplyBase](contracts/CometStorage.sol#L180) should be constant 

contracts/CometStorage.sol#L180


 - [ ] ID-222
[CometStorage.baseTrackingSupplySpeed](contracts/CometStorage.sol#L149) should be constant 

contracts/CometStorage.sol#L149


 - [ ] ID-223
[CometStorage.unlockTimestamp](contracts/CometStorage.sol#L170) should be constant 

contracts/CometStorage.sol#L170


 - [ ] ID-224
[CometStorage.factory](contracts/CometStorage.sol#L98) should be constant 

contracts/CometStorage.sol#L98


 - [ ] ID-225
[CometStorage.borrowKink](contracts/CometStorage.sol#L121) should be constant 

contracts/CometStorage.sol#L121


 - [ ] ID-226
[CometStorage.borrowPerSecondInterestRateSlopeLow](contracts/CometStorage.sol#L125) should be constant 

contracts/CometStorage.sol#L125


 - [ ] ID-227
[CometStorage.baseTokenPriceFeed](contracts/CometStorage.sol#L101) should be constant 

contracts/CometStorage.sol#L101


 - [ ] ID-228
[CometStorage.lastAccrualTime](contracts/CometStorage.sol#L182) should be constant 

contracts/CometStorage.sol#L182


 - [ ] ID-229
[CometStorage.supplyKink](contracts/CometStorage.sol#L105) should be constant 

contracts/CometStorage.sol#L105


 - [ ] ID-230
[CometStorage.seedReserves](contracts/CometStorage.sol#L167) should be constant 

contracts/CometStorage.sol#L167


 - [ ] ID-231
[CometStorage.baseMinForRewards](contracts/CometStorage.sol#L158) should be constant 

contracts/CometStorage.sol#L158


 - [ ] ID-232
[CometStorage.supplyPerSecondInterestRateSlopeLow](contracts/CometStorage.sol#L109) should be constant 

contracts/CometStorage.sol#L109


 - [ ] ID-233
[CometStorage.baseBorrowIndex](contracts/CometStorage.sol#L177) should be constant 

contracts/CometStorage.sol#L177


 - [ ] ID-234
[CometStorage.baseToken](contracts/CometStorage.sol#L95) should be constant 

contracts/CometStorage.sol#L95


 - [ ] ID-235
[CometStorage.configController](contracts/CometStorage.sol#L86) should be constant 

contracts/CometStorage.sol#L86


 - [ ] ID-236
[CometStorage.borrowPerSecondInterestRateSlopeHigh](contracts/CometStorage.sol#L129) should be constant 

contracts/CometStorage.sol#L129


 - [ ] ID-237
[CometStorage.extension](contracts/CometStorage.sol#L92) should be constant 

contracts/CometStorage.sol#L92


 - [ ] ID-238
[CometStorage.accrualDescaleFactor](contracts/CometStorage.sol#L173) should be constant 

contracts/CometStorage.sol#L173


 - [ ] ID-239
[CometStorage.numAssets](contracts/CometStorage.sol#L186) should be constant 

contracts/CometStorage.sol#L186


 - [ ] ID-240
[CometStorage.storeFrontPriceFactor](contracts/CometStorage.sol#L137) should be constant 

contracts/CometStorage.sol#L137


 - [ ] ID-241
[CometStorage.baseSupplyIndex](contracts/CometStorage.sol#L176) should be constant 

contracts/CometStorage.sol#L176


 - [ ] ID-242
[CometStorage._closed](contracts/CometStorage.sol#L189) should be constant 

contracts/CometStorage.sol#L189


 - [ ] ID-243
[CometStorage.baseTrackingBorrowSpeed](contracts/CometStorage.sol#L153) should be constant 

contracts/CometStorage.sol#L153


 - [ ] ID-244
[CometStorage.targetPercent](contracts/CometStorage.sol#L164) should be constant 

contracts/CometStorage.sol#L164


 - [ ] ID-245
[CometStorage.borrowPerSecondInterestRateBase](contracts/CometStorage.sol#L133) should be constant 

contracts/CometStorage.sol#L133


 - [ ] ID-246
[CometStorage.supplyPerSecondInterestRateBase](contracts/CometStorage.sol#L117) should be constant 

contracts/CometStorage.sol#L117


 - [ ] ID-247
[CometStorage.supplyPerSecondInterestRateSlopeHigh](contracts/CometStorage.sol#L113) should be constant 

contracts/CometStorage.sol#L113


 - [ ] ID-248
[CometStorage.trackingIndexScale](contracts/CometStorage.sol#L145) should be constant 

contracts/CometStorage.sol#L145


 - [ ] ID-249
[CometStorage.baseScale](contracts/CometStorage.sol#L141) should be constant 

contracts/CometStorage.sol#L141


 - [ ] ID-250
[CometStorage.trackingBorrowIndex](contracts/CometStorage.sol#L179) should be constant 

contracts/CometStorage.sol#L179


 - [ ] ID-251
[CometStorage.pauseFlags](contracts/CometStorage.sol#L183) should be constant 

contracts/CometStorage.sol#L183


 - [ ] ID-252
[CometStorage.trackingSupplyIndex](contracts/CometStorage.sol#L178) should be constant 

contracts/CometStorage.sol#L178


 - [ ] ID-253
[CometStorage.totalBorrowBase](contracts/CometStorage.sol#L181) should be constant 

contracts/CometStorage.sol#L181


 - [ ] ID-254
[CometStorage.sandboxController](contracts/CometStorage.sol#L89) should be constant 

contracts/CometStorage.sol#L89


 - [ ] ID-255
[CometStorage.baseBorrowMin](contracts/CometStorage.sol#L161) should be constant 

contracts/CometStorage.sol#L161


 - [ ] ID-256
[CometStorage.totalSupplyBase](contracts/CometStorage.sol#L180) should be constant 

contracts/CometStorage.sol#L180


 - [ ] ID-257
[CometStorage.baseTrackingSupplySpeed](contracts/CometStorage.sol#L149) should be constant 

contracts/CometStorage.sol#L149


 - [ ] ID-258
[CometStorage.unlockTimestamp](contracts/CometStorage.sol#L170) should be constant 

contracts/CometStorage.sol#L170


 - [ ] ID-259
[CometStorage.factory](contracts/CometStorage.sol#L98) should be constant 

contracts/CometStorage.sol#L98


 - [ ] ID-260
[CometStorage.borrowKink](contracts/CometStorage.sol#L121) should be constant 

contracts/CometStorage.sol#L121


 - [ ] ID-261
[CometStorage.borrowPerSecondInterestRateSlopeLow](contracts/CometStorage.sol#L125) should be constant 

contracts/CometStorage.sol#L125


 - [ ] ID-262
[CometStorage.baseTokenPriceFeed](contracts/CometStorage.sol#L101) should be constant 

contracts/CometStorage.sol#L101


 - [ ] ID-263
[CometStorage.lastAccrualTime](contracts/CometStorage.sol#L182) should be constant 

contracts/CometStorage.sol#L182


 - [ ] ID-264
[CometStorage.supplyKink](contracts/CometStorage.sol#L105) should be constant 

contracts/CometStorage.sol#L105


 - [ ] ID-265
[CometStorage.seedReserves](contracts/CometStorage.sol#L167) should be constant 

contracts/CometStorage.sol#L167


 - [ ] ID-266
[CometStorage.baseMinForRewards](contracts/CometStorage.sol#L158) should be constant 

contracts/CometStorage.sol#L158


 - [ ] ID-267
[CometStorage.supplyPerSecondInterestRateSlopeLow](contracts/CometStorage.sol#L109) should be constant 

contracts/CometStorage.sol#L109


 - [ ] ID-268
[CometStorage.baseBorrowIndex](contracts/CometStorage.sol#L177) should be constant 

contracts/CometStorage.sol#L177


 - [ ] ID-269
[CometStorage.baseToken](contracts/CometStorage.sol#L95) should be constant 

contracts/CometStorage.sol#L95


 - [ ] ID-270
[CometStorage.configController](contracts/CometStorage.sol#L86) should be constant 

contracts/CometStorage.sol#L86


 - [ ] ID-271
[CometStorage.borrowPerSecondInterestRateSlopeHigh](contracts/CometStorage.sol#L129) should be constant 

contracts/CometStorage.sol#L129


 - [ ] ID-272
[CometStorage.extension](contracts/CometStorage.sol#L92) should be constant 

contracts/CometStorage.sol#L92


 - [ ] ID-273
[CometStorage.accrualDescaleFactor](contracts/CometStorage.sol#L173) should be constant 

contracts/CometStorage.sol#L173


 - [ ] ID-274
[CometStorage.numAssets](contracts/CometStorage.sol#L186) should be constant 

contracts/CometStorage.sol#L186


 - [ ] ID-275
[CometStorage.storeFrontPriceFactor](contracts/CometStorage.sol#L137) should be constant 

contracts/CometStorage.sol#L137


 - [ ] ID-276
[CometStorage.baseSupplyIndex](contracts/CometStorage.sol#L176) should be constant 

contracts/CometStorage.sol#L176


 - [ ] ID-277
[CometStorage._closed](contracts/CometStorage.sol#L189) should be constant 

contracts/CometStorage.sol#L189


 - [ ] ID-278
[CometStorage.baseTrackingBorrowSpeed](contracts/CometStorage.sol#L153) should be constant 

contracts/CometStorage.sol#L153


 - [ ] ID-279
[CometStorage.targetPercent](contracts/CometStorage.sol#L164) should be constant 

contracts/CometStorage.sol#L164


 - [ ] ID-280
[CometStorage.borrowPerSecondInterestRateBase](contracts/CometStorage.sol#L133) should be constant 

contracts/CometStorage.sol#L133


 - [ ] ID-281
[CometStorage.supplyPerSecondInterestRateBase](contracts/CometStorage.sol#L117) should be constant 

contracts/CometStorage.sol#L117


 - [ ] ID-282
[CometStorage.supplyPerSecondInterestRateSlopeHigh](contracts/CometStorage.sol#L113) should be constant 

contracts/CometStorage.sol#L113


 - [ ] ID-283
[CometStorage.trackingIndexScale](contracts/CometStorage.sol#L145) should be constant 

contracts/CometStorage.sol#L145


 - [ ] ID-284
[CometStorage.baseScale](contracts/CometStorage.sol#L141) should be constant 

contracts/CometStorage.sol#L141


 - [ ] ID-285
[CometStorage.trackingBorrowIndex](contracts/CometStorage.sol#L179) should be constant 

contracts/CometStorage.sol#L179


 - [ ] ID-286
[CometStorage.pauseFlags](contracts/CometStorage.sol#L183) should be constant 

contracts/CometStorage.sol#L183


 - [ ] ID-287
[CometStorage.trackingSupplyIndex](contracts/CometStorage.sol#L178) should be constant 

contracts/CometStorage.sol#L178


 - [ ] ID-288
[CometStorage.totalBorrowBase](contracts/CometStorage.sol#L181) should be constant 

contracts/CometStorage.sol#L181


 - [ ] ID-289
[CometStorage.sandboxController](contracts/CometStorage.sol#L89) should be constant 

contracts/CometStorage.sol#L89


 - [ ] ID-290
[CometStorage.baseBorrowMin](contracts/CometStorage.sol#L161) should be constant 

contracts/CometStorage.sol#L161


 - [ ] ID-291
[CometStorage.totalSupplyBase](contracts/CometStorage.sol#L180) should be constant 

contracts/CometStorage.sol#L180


 - [ ] ID-292
[CometStorage.baseTrackingSupplySpeed](contracts/CometStorage.sol#L149) should be constant 

contracts/CometStorage.sol#L149


 - [ ] ID-293
[CometStorage.unlockTimestamp](contracts/CometStorage.sol#L170) should be constant 

contracts/CometStorage.sol#L170


 - [ ] ID-294
[CometStorage.factory](contracts/CometStorage.sol#L98) should be constant 

contracts/CometStorage.sol#L98


 - [ ] ID-295
[CometStorage.borrowKink](contracts/CometStorage.sol#L121) should be constant 

contracts/CometStorage.sol#L121


 - [ ] ID-296
[CometStorage.borrowPerSecondInterestRateSlopeLow](contracts/CometStorage.sol#L125) should be constant 

contracts/CometStorage.sol#L125


 - [ ] ID-297
[CometStorage.baseTokenPriceFeed](contracts/CometStorage.sol#L101) should be constant 

contracts/CometStorage.sol#L101


 - [ ] ID-298
[CometStorage.lastAccrualTime](contracts/CometStorage.sol#L182) should be constant 

contracts/CometStorage.sol#L182


 - [ ] ID-299
[CometStorage.supplyKink](contracts/CometStorage.sol#L105) should be constant 

contracts/CometStorage.sol#L105


 - [ ] ID-300
[CometStorage.seedReserves](contracts/CometStorage.sol#L167) should be constant 

contracts/CometStorage.sol#L167


 - [ ] ID-301
[CometStorage.baseMinForRewards](contracts/CometStorage.sol#L158) should be constant 

contracts/CometStorage.sol#L158


 - [ ] ID-302
[CometStorage.supplyPerSecondInterestRateSlopeLow](contracts/CometStorage.sol#L109) should be constant 

contracts/CometStorage.sol#L109


 - [ ] ID-303
[CometStorage.baseBorrowIndex](contracts/CometStorage.sol#L177) should be constant 

contracts/CometStorage.sol#L177


 - [ ] ID-304
[CometStorage.baseToken](contracts/CometStorage.sol#L95) should be constant 

contracts/CometStorage.sol#L95


 - [ ] ID-305
[CometStorage.configController](contracts/CometStorage.sol#L86) should be constant 

contracts/CometStorage.sol#L86


 - [ ] ID-306
[CometStorage.borrowPerSecondInterestRateSlopeHigh](contracts/CometStorage.sol#L129) should be constant 

contracts/CometStorage.sol#L129


 - [ ] ID-307
[CometStorage.extension](contracts/CometStorage.sol#L92) should be constant 

contracts/CometStorage.sol#L92


 - [ ] ID-308
[CometStorage.accrualDescaleFactor](contracts/CometStorage.sol#L173) should be constant 

contracts/CometStorage.sol#L173


 - [ ] ID-309
[CometStorage.numAssets](contracts/CometStorage.sol#L186) should be constant 

contracts/CometStorage.sol#L186


 - [ ] ID-310
[CometStorage.storeFrontPriceFactor](contracts/CometStorage.sol#L137) should be constant 

contracts/CometStorage.sol#L137


 - [ ] ID-311
[CometStorage.baseSupplyIndex](contracts/CometStorage.sol#L176) should be constant 

contracts/CometStorage.sol#L176


 - [ ] ID-312
[CometStorage._closed](contracts/CometStorage.sol#L189) should be constant 

contracts/CometStorage.sol#L189


 - [ ] ID-313
[CometStorage.baseTrackingBorrowSpeed](contracts/CometStorage.sol#L153) should be constant 

contracts/CometStorage.sol#L153


 - [ ] ID-314
[CometStorage.targetPercent](contracts/CometStorage.sol#L164) should be constant 

contracts/CometStorage.sol#L164


 - [ ] ID-315
[CometStorage.borrowPerSecondInterestRateBase](contracts/CometStorage.sol#L133) should be constant 

contracts/CometStorage.sol#L133


 - [ ] ID-316
[CometStorage.supplyPerSecondInterestRateBase](contracts/CometStorage.sol#L117) should be constant 

contracts/CometStorage.sol#L117


 - [ ] ID-317
[CometStorage.supplyPerSecondInterestRateSlopeHigh](contracts/CometStorage.sol#L113) should be constant 

contracts/CometStorage.sol#L113


 - [ ] ID-318
[CometStorage.trackingIndexScale](contracts/CometStorage.sol#L145) should be constant 

contracts/CometStorage.sol#L145


 - [ ] ID-319
[CometStorage.baseScale](contracts/CometStorage.sol#L141) should be constant 

contracts/CometStorage.sol#L141


 - [ ] ID-320
[CometStorage.trackingBorrowIndex](contracts/CometStorage.sol#L179) should be constant 

contracts/CometStorage.sol#L179


 - [ ] ID-321
[CometStorage.pauseFlags](contracts/CometStorage.sol#L183) should be constant 

contracts/CometStorage.sol#L183


 - [ ] ID-322
[CometStorage.trackingSupplyIndex](contracts/CometStorage.sol#L178) should be constant 

contracts/CometStorage.sol#L178


 - [ ] ID-323
[CometStorage.totalBorrowBase](contracts/CometStorage.sol#L181) should be constant 

contracts/CometStorage.sol#L181


 - [ ] ID-324
[CometStorage.sandboxController](contracts/CometStorage.sol#L89) should be constant 

contracts/CometStorage.sol#L89


 - [ ] ID-325
[CometStorage.baseBorrowMin](contracts/CometStorage.sol#L161) should be constant 

contracts/CometStorage.sol#L161


 - [ ] ID-326
[CometStorage.totalSupplyBase](contracts/CometStorage.sol#L180) should be constant 

contracts/CometStorage.sol#L180


 - [ ] ID-327
[CometStorage.baseTrackingSupplySpeed](contracts/CometStorage.sol#L149) should be constant 

contracts/CometStorage.sol#L149


 - [ ] ID-328
[CometStorage.unlockTimestamp](contracts/CometStorage.sol#L170) should be constant 

contracts/CometStorage.sol#L170


 - [ ] ID-329
[CometStorage.factory](contracts/CometStorage.sol#L98) should be constant 

contracts/CometStorage.sol#L98


 - [ ] ID-330
[CometStorage.borrowKink](contracts/CometStorage.sol#L121) should be constant 

contracts/CometStorage.sol#L121


 - [ ] ID-331
[CometStorage.borrowPerSecondInterestRateSlopeLow](contracts/CometStorage.sol#L125) should be constant 

contracts/CometStorage.sol#L125


 - [ ] ID-332
[CometStorage.baseTokenPriceFeed](contracts/CometStorage.sol#L101) should be constant 

contracts/CometStorage.sol#L101


 - [ ] ID-333
[CometStorage.lastAccrualTime](contracts/CometStorage.sol#L182) should be constant 

contracts/CometStorage.sol#L182


 - [ ] ID-334
[CometStorage.supplyKink](contracts/CometStorage.sol#L105) should be constant 

contracts/CometStorage.sol#L105


 - [ ] ID-335
[CometStorage.seedReserves](contracts/CometStorage.sol#L167) should be constant 

contracts/CometStorage.sol#L167


 - [ ] ID-336
[CometStorage._closed](contracts/CometStorage.sol#L189) should be constant 

contracts/CometStorage.sol#L189


 - [ ] ID-337
[CometStorage.baseTrackingBorrowSpeed](contracts/CometStorage.sol#L153) should be constant 

contracts/CometStorage.sol#L153


 - [ ] ID-338
[CometStorage.baseTrackingSupplySpeed](contracts/CometStorage.sol#L149) should be constant 

contracts/CometStorage.sol#L149


## shadowing-local
Impact: Low
Confidence: High
 - [ ] ID-339
[ICometExtension.allowBySig(address,address,bool,uint256,uint256,uint8,bytes32,bytes32).isAllowed](contracts/interfaces/ICometExtension.sol#L47) shadows:
	- [CometStorage.isAllowed](contracts/CometStorage.sol#L200) (state variable)

contracts/interfaces/ICometExtension.sol#L47


 - [ ] ID-340
[ICometExtension.allowBySig(address,address,bool,uint256,uint256,uint8,bytes32,bytes32).isAllowed](contracts/interfaces/ICometExtension.sol#L47) shadows:
	- [CometStorage.isAllowed](contracts/CometStorage.sol#L200) (state variable)

contracts/interfaces/ICometExtension.sol#L47


## timestamp
Impact: Low
Confidence: Medium
 - [ ] ID-341
[CometExtension.allowBySig(address,address,bool,uint256,uint256,uint8,bytes32,bytes32)](contracts/CometExtension.sol#L187-L211) uses timestamp for comparisons
	Dangerous comparisons:
	- [block.timestamp >= expiry](contracts/CometExtension.sol#L209)

contracts/CometExtension.sol#L187-L211


 - [ ] ID-342
[CometExtension.allowBySig(address,address,bool,uint256,uint256,uint8,bytes32,bytes32)](contracts/CometExtension.sol#L187-L211) uses timestamp for comparisons
	Dangerous comparisons:
	- [block.timestamp >= expiry](contracts/CometExtension.sol#L209)

contracts/CometExtension.sol#L187-L211


 - [ ] ID-343
[ConfigController.acceptCuratorRole()](contracts/ConfigController.sol#L275-L285) uses timestamp for comparisons
	Dangerous comparisons:
	- [block.timestamp > curatorProposalExpiry](contracts/ConfigController.sol#L277)

contracts/ConfigController.sol#L275-L285


 - [ ] ID-344
[ConfigController.acceptCuratorRole()](contracts/ConfigController.sol#L275-L285) uses timestamp for comparisons
	Dangerous comparisons:
	- [block.timestamp > curatorProposalExpiry](contracts/ConfigController.sol#L277)

contracts/ConfigController.sol#L275-L285


 - [ ] ID-345
[SandboxComet.supplyBase(address,address,uint256)](contracts/SandboxComet.sol#L695-L715) uses timestamp for comparisons
	Dangerous comparisons:
	- [supplyAmount > 0](contracts/SandboxComet.sol#L712)

contracts/SandboxComet.sol#L695-L715


 - [ ] ID-346
[SandboxComet.transferBase(address,address,uint256)](contracts/SandboxComet.sol#L806-L841) uses timestamp for comparisons
	Dangerous comparisons:
	- [srcBalance < 0](contracts/SandboxComet.sol#L829)
	- [uint256(- srcBalance) < baseBorrowMin](contracts/SandboxComet.sol#L830)
	- [withdrawAmount > 0](contracts/SandboxComet.sol#L834)
	- [supplyAmount > 0](contracts/SandboxComet.sol#L838)

contracts/SandboxComet.sol#L806-L841


 - [ ] ID-347
[SandboxComet.buyCollateral(address,uint256,uint256,address)](contracts/SandboxComet.sol#L1053-L1079) uses timestamp for comparisons
	Dangerous comparisons:
	- [amountOut < minAmount](contracts/SandboxComet.sol#L1061)
	- [amountOut + feeProtocol + feeController > getCollateralReserves(asset)](contracts/SandboxComet.sol#L1064)
	- [feeProtocol > 0](contracts/SandboxComet.sol#L1066)
	- [feeController > 0](contracts/SandboxComet.sol#L1069)

contracts/SandboxComet.sol#L1053-L1079


 - [ ] ID-348
[SandboxComet.extractFees(address)](contracts/SandboxComet.sol#L448-L468) uses timestamp for comparisons
	Dangerous comparisons:
	- [amount == 0](contracts/SandboxComet.sol#L464)

contracts/SandboxComet.sol#L448-L468


 - [ ] ID-349
[SandboxComet._distributeProfit(uint256)](contracts/SandboxComet.sol#L1208-L1226) uses timestamp for comparisons
	Dangerous comparisons:
	- [_controllerFee == 0](contracts/SandboxComet.sol#L1223)
	- [_reserves > 0](contracts/SandboxComet.sol#L1210)

contracts/SandboxComet.sol#L1208-L1226


 - [ ] ID-350
[SandboxComet.getBorrowRate(uint256)](contracts/SandboxComet.sol#L266-L279) uses timestamp for comparisons
	Dangerous comparisons:
	- [utilization <= borrowKink](contracts/SandboxComet.sol#L267)

contracts/SandboxComet.sol#L266-L279


 - [ ] ID-351
[SandboxComet.withdrawBase(address,address,uint256)](contracts/SandboxComet.sol#L916-L943) uses timestamp for comparisons
	Dangerous comparisons:
	- [srcBalance < 0](contracts/SandboxComet.sol#L931)
	- [uint256(- srcBalance) < baseBorrowMin](contracts/SandboxComet.sol#L932)
	- [withdrawAmount > 0](contracts/SandboxComet.sol#L940)

contracts/SandboxComet.sol#L916-L943


 - [ ] ID-352
[SandboxComet.updateAssetsIn(address,uint8,uint256,uint256)](contracts/SandboxComet.sol#L550-L556) uses timestamp for comparisons
	Dangerous comparisons:
	- [initialUserBalance == 0 && finalUserBalance != 0](contracts/SandboxComet.sol#L551)
	- [initialUserBalance != 0 && finalUserBalance == 0](contracts/SandboxComet.sol#L553)

contracts/SandboxComet.sol#L550-L556


 - [ ] ID-353
[SandboxComet.getNowInternal()](contracts/SandboxComet.sol#L194-L197) uses timestamp for comparisons
	Dangerous comparisons:
	- [block.timestamp > type()(uint40).max](contracts/SandboxComet.sol#L195)

contracts/SandboxComet.sol#L194-L197


 - [ ] ID-354
[SandboxComet.isBorrowCollateralized(address)](contracts/SandboxComet.sol#L332-L354) uses timestamp for comparisons
	Dangerous comparisons:
	- [principal >= 0](contracts/SandboxComet.sol#L334)
	- [liquidity >= 0](contracts/SandboxComet.sol#L342)
	- [liquidity >= 0](contracts/SandboxComet.sol#L353)

contracts/SandboxComet.sol#L332-L354


 - [ ] ID-355
[SandboxComet.updateBasePrincipal(address,CometStorage.UserBasic,int104)](contracts/SandboxComet.sol#L561-L586) uses timestamp for comparisons
	Dangerous comparisons:
	- [principal >= 0](contracts/SandboxComet.sol#L567)
	- [indexDelta > 0](contracts/SandboxComet.sol#L575)
	- [principalNew >= 0](contracts/SandboxComet.sol#L579)

contracts/SandboxComet.sol#L561-L586


 - [ ] ID-356
[SandboxComet.isLiquidatable(address)](contracts/SandboxComet.sol#L361-L383) uses timestamp for comparisons
	Dangerous comparisons:
	- [principal >= 0](contracts/SandboxComet.sol#L363)
	- [liquidity >= 0](contracts/SandboxComet.sol#L371)
	- [liquidity < 0](contracts/SandboxComet.sol#L382)

contracts/SandboxComet.sol#L361-L383


 - [ ] ID-357
[SandboxComet.getUtilization()](contracts/SandboxComet.sol#L285-L293) uses timestamp for comparisons
	Dangerous comparisons:
	- [totalSupply_ == 0](contracts/SandboxComet.sol#L288)

contracts/SandboxComet.sol#L285-L293


 - [ ] ID-358
[SandboxComet.accrueInternal()](contracts/SandboxComet.sol#L215-L229) uses timestamp for comparisons
	Dangerous comparisons:
	- [timeElapsed != 0](contracts/SandboxComet.sol#L219)
	- [totalSupplyBase >= baseMinForRewards](contracts/SandboxComet.sol#L221)
	- [totalBorrowBase >= baseMinForRewards](contracts/SandboxComet.sol#L224)

contracts/SandboxComet.sol#L215-L229


 - [ ] ID-359
[SandboxComet.isInAsset(uint24,uint8)](contracts/SandboxComet.sol#L543-L545) uses timestamp for comparisons
	Dangerous comparisons:
	- [(assetsIn & (uint24(1) << assetOffset)) != 0](contracts/SandboxComet.sol#L544)

contracts/SandboxComet.sol#L543-L545


 - [ ] ID-360
[SandboxComet.accruedInterestIndices(uint256)](contracts/SandboxComet.sol#L202-L213) uses timestamp for comparisons
	Dangerous comparisons:
	- [timeElapsed > 0](contracts/SandboxComet.sol#L205)

contracts/SandboxComet.sol#L202-L213


 - [ ] ID-361
[SandboxComet.repayAndSupplyAmount(int104,int104)](contracts/SandboxComet.sol#L388-L399) uses timestamp for comparisons
	Dangerous comparisons:
	- [newPrincipal < oldPrincipal](contracts/SandboxComet.sol#L390)
	- [newPrincipal <= 0](contracts/SandboxComet.sol#L392)
	- [oldPrincipal >= 0](contracts/SandboxComet.sol#L394)

contracts/SandboxComet.sol#L388-L399


 - [ ] ID-362
[SandboxComet.absorbInternal(address,address)](contracts/SandboxComet.sol#L985-L1043) uses timestamp for comparisons
	Dangerous comparisons:
	- [newBalance < 0](contracts/SandboxComet.sol#L1018)
	- [newPrincipal > 0](contracts/SandboxComet.sol#L1040)

contracts/SandboxComet.sol#L985-L1043


 - [ ] ID-363
[SandboxComet.withdrawAndBorrowAmount(int104,int104)](contracts/SandboxComet.sol#L404-L415) uses timestamp for comparisons
	Dangerous comparisons:
	- [newPrincipal > oldPrincipal](contracts/SandboxComet.sol#L406)
	- [newPrincipal >= 0](contracts/SandboxComet.sol#L408)

contracts/SandboxComet.sol#L404-L415


 - [ ] ID-364
[SandboxComet.getSupplyRate(uint256)](contracts/SandboxComet.sol#L246-L259) uses timestamp for comparisons
	Dangerous comparisons:
	- [utilization <= supplyKink](contracts/SandboxComet.sol#L247)

contracts/SandboxComet.sol#L246-L259


 - [ ] ID-365
[SandboxComet.transferInternal(address,address,address,address,uint256)](contracts/SandboxComet.sol#L788-L801) uses timestamp for comparisons
	Dangerous comparisons:
	- [amount == type()(uint256).max](contracts/SandboxComet.sol#L794)

contracts/SandboxComet.sol#L788-L801


 - [ ] ID-366
[SandboxComet.withdrawInternal(address,address,address,address,uint256)](contracts/SandboxComet.sol#L899-L911) uses timestamp for comparisons
	Dangerous comparisons:
	- [amount == type()(uint256).max](contracts/SandboxComet.sol#L904)

contracts/SandboxComet.sol#L899-L911


 - [ ] ID-367
[SandboxComet.supplyInternal(address,address,address,address,uint256)](contracts/SandboxComet.sol#L678-L690) uses timestamp for comparisons
	Dangerous comparisons:
	- [amount == type()(uint256).max](contracts/SandboxComet.sol#L683)

contracts/SandboxComet.sol#L678-L690


## unused-state
Impact: Informational
Confidence: High
 - [ ] ID-368
[CometStorage.PAUSE_TRANSFER_OFFSET](contracts/CometStorage.sol#L57) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L57


 - [ ] ID-369
[CometStorage.PAUSE_BUY_OFFSET](contracts/CometStorage.sol#L60) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L60


 - [ ] ID-370
[CometStorage.REENTRANCY_GUARD_ENTERED](contracts/CometStorage.sol#L82) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L82


 - [ ] ID-371
[CometStorage.MAX_BASE_DECIMALS](contracts/CometStorage.sol#L53) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L53


 - [ ] ID-372
[CometStorage.REENTRANCY_GUARD_NOT_ENTERED](contracts/CometStorage.sol#L81) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L81


 - [ ] ID-373
[CometStorage.PAUSE_WITHDRAW_OFFSET](contracts/CometStorage.sol#L58) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L58


 - [ ] ID-374
[CometStorage.PAUSE_SUPPLY_OFFSET](contracts/CometStorage.sol#L56) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L56


 - [ ] ID-375
[CometStorage.accrualDescaleFactor](contracts/CometStorage.sol#L173) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L173


 - [ ] ID-376
[CometStorage.PAUSE_ABSORB_OFFSET](contracts/CometStorage.sol#L59) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L59


 - [ ] ID-377
[CometStorage.REENTRANCY_GUARD_FLAG_SLOT](contracts/CometStorage.sol#L78) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L78


 - [ ] ID-378
[CometStorage._closed](contracts/CometStorage.sol#L189) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L189


 - [ ] ID-379
[CometStorage.PRICE_FEED_DECIMALS](contracts/CometStorage.sol#L63) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L63


 - [ ] ID-380
[CometStorage.PAUSE_TRANSFER_OFFSET](contracts/CometStorage.sol#L57) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L57


 - [ ] ID-381
[CometStorage.PAUSE_BUY_OFFSET](contracts/CometStorage.sol#L60) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L60


 - [ ] ID-382
[CometStorage.REENTRANCY_GUARD_ENTERED](contracts/CometStorage.sol#L82) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L82


 - [ ] ID-383
[CometStorage.MAX_BASE_DECIMALS](contracts/CometStorage.sol#L53) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L53


 - [ ] ID-384
[CometStorage.REENTRANCY_GUARD_NOT_ENTERED](contracts/CometStorage.sol#L81) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L81


 - [ ] ID-385
[CometStorage.PAUSE_WITHDRAW_OFFSET](contracts/CometStorage.sol#L58) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L58


 - [ ] ID-386
[CometStorage.PAUSE_SUPPLY_OFFSET](contracts/CometStorage.sol#L56) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L56


 - [ ] ID-387
[CometStorage.accrualDescaleFactor](contracts/CometStorage.sol#L173) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L173


 - [ ] ID-388
[CometStorage.PAUSE_ABSORB_OFFSET](contracts/CometStorage.sol#L59) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L59


 - [ ] ID-389
[CometStorage.REENTRANCY_GUARD_FLAG_SLOT](contracts/CometStorage.sol#L78) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L78


 - [ ] ID-390
[CometStorage._closed](contracts/CometStorage.sol#L189) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L189


 - [ ] ID-391
[CometStorage.PRICE_FEED_DECIMALS](contracts/CometStorage.sol#L63) is never used in [CometExtension](contracts/CometExtension.sol#L6-L242)

contracts/CometStorage.sol#L63


 - [ ] ID-392
[CometStorage._closed](contracts/CometStorage.sol#L189) is never used in [SandboxComet](contracts/SandboxComet.sol#L15-L1252)

contracts/CometStorage.sol#L189


## reentrancy-events
Impact: Low
Confidence: Medium
 - [ ] ID-393
Reentrancy in [SandboxCometFactory.createComet()](contracts/SandboxCometFactory.sol#L43-L55):
	External calls:
	- [ISandboxComet(comet).factoryInit(msg.sender,address(ext))](contracts/SandboxCometFactory.sol#L51)
	Event emitted after the call(s):
	- [CometCreated(comet,address(ext),msg.sender)](contracts/SandboxCometFactory.sol#L53)

contracts/SandboxCometFactory.sol#L43-L55


 - [ ] ID-394
Reentrancy in [ConfigController.createComet(IConfigController.CometConfig)](contracts/ConfigController.sol#L148-L213):
	External calls:
	- [comet = ISandboxCometFactory(cometFactory).createComet()](contracts/ConfigController.sol#L199)
	- [ISandboxComet(comet).initialize(_cometConfig,_globalConfig)](contracts/ConfigController.sol#L200)
	Event emitted after the call(s):
	- [CometCreated(comet,_cometConfig.baseToken,baseAssetConfig.priceFeed,cometsNum + 1,_cometConfig.baseTokenCurveId)](contracts/ConfigController.sol#L210)

contracts/ConfigController.sol#L148-L213


 - [ ] ID-395
Reentrancy in [ConfigController.createComet(IConfigController.CometConfig)](contracts/ConfigController.sol#L148-L213):
	External calls:
	- [comet = ISandboxCometFactory(cometFactory).createComet()](contracts/ConfigController.sol#L199)
	- [ISandboxComet(comet).initialize(_cometConfig,_globalConfig)](contracts/ConfigController.sol#L200)
	Event emitted after the call(s):
	- [CometCreated(comet,_cometConfig.baseToken,baseAssetConfig.priceFeed,cometsNum + 1,_cometConfig.baseTokenCurveId)](contracts/ConfigController.sol#L210)

contracts/ConfigController.sol#L148-L213


 - [ ] ID-396
Reentrancy in [ConfigControllerFactory.createConfigController(address,address,address,uint256,string,uint256,uint256)](contracts/ConfigControllerFactory.sol#L43-L90):
	External calls:
	- [IConfigController(configController).initialize(msg.sender,_curator,_guardian,_marketFactory,_curatorFee,_name,_curatorProposalDuration,_proposalDuration)](contracts/ConfigControllerFactory.sol#L65-L74)
	Event emitted after the call(s):
	- [ConfigControllerCreated(configController,msg.sender,_curator,_guardian,_marketFactory,_curatorFee,_name,_curatorProposalDuration,_proposalDuration,controllerAddresses.length - 1)](contracts/ConfigControllerFactory.sol#L76-L87)

contracts/ConfigControllerFactory.sol#L43-L90


 - [ ] ID-397
Reentrancy in [SandboxComet.withdrawCollateral(address,address,address,uint256)](contracts/SandboxComet.sol#L948-L964):
	External calls:
	- [doTransferOut(asset,to,amount)](contracts/SandboxComet.sol#L961)
		- [IERC20NonStandard(asset).transfer(to,amount)](contracts/SandboxComet.sol#L623)
	Event emitted after the call(s):
	- [WithdrawCollateral(src,to,asset,amount)](contracts/SandboxComet.sol#L963)

contracts/SandboxComet.sol#L948-L964


 - [ ] ID-398
Reentrancy in [SandboxComet.supplyBase(address,address,uint256)](contracts/SandboxComet.sol#L695-L715):
	External calls:
	- [amount = doTransferIn(baseToken,from,amount)](contracts/SandboxComet.sol#L696)
		- [IERC20NonStandard(asset).transferFrom(from,address(this),amount)](contracts/SandboxComet.sol#L595)
	Event emitted after the call(s):
	- [Supply(from,dst,amount)](contracts/SandboxComet.sol#L710)
	- [Transfer(address(0),dst,presentValueSupply(baseSupplyIndex,supplyAmount))](contracts/SandboxComet.sol#L713)

contracts/SandboxComet.sol#L695-L715


 - [ ] ID-399
Reentrancy in [SandboxComet.supplyCollateral(address,address,address,uint256)](contracts/SandboxComet.sol#L720-L738):
	External calls:
	- [amount = doTransferIn(asset,from,amount)](contracts/SandboxComet.sol#L721)
		- [IERC20NonStandard(asset).transferFrom(from,address(this),amount)](contracts/SandboxComet.sol#L595)
	Event emitted after the call(s):
	- [SupplyCollateral(from,dst,asset,amount)](contracts/SandboxComet.sol#L737)

contracts/SandboxComet.sol#L720-L738


 - [ ] ID-400
Reentrancy in [SandboxComet.extractFees(address)](contracts/SandboxComet.sol#L448-L468):
	External calls:
	- [doTransferOut(asset,msg.sender,amount)](contracts/SandboxComet.sol#L466)
		- [IERC20NonStandard(asset).transfer(to,amount)](contracts/SandboxComet.sol#L623)
	Event emitted after the call(s):
	- [FeesExtracted(address(this),asset,amount,msg.sender)](contracts/SandboxComet.sol#L467)

contracts/SandboxComet.sol#L448-L468


 - [ ] ID-401
Reentrancy in [SandboxComet.withdrawBase(address,address,uint256)](contracts/SandboxComet.sol#L916-L943):
	External calls:
	- [doTransferOut(baseToken,to,amount)](contracts/SandboxComet.sol#L936)
		- [IERC20NonStandard(asset).transfer(to,amount)](contracts/SandboxComet.sol#L623)
	Event emitted after the call(s):
	- [Transfer(src,address(0),presentValueSupply(baseSupplyIndex,withdrawAmount))](contracts/SandboxComet.sol#L941)
	- [Withdraw(src,to,amount)](contracts/SandboxComet.sol#L938)

contracts/SandboxComet.sol#L916-L943


## assembly
Impact: Informational
Confidence: High
 - [ ] ID-402
[Create2.deploy(uint256,bytes32,bytes)](lib/openzeppelin-contracts/contracts/utils/Create2.sol#L37-L56) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/utils/Create2.sol#L44-L52)

lib/openzeppelin-contracts/contracts/utils/Create2.sol#L37-L56


 - [ ] ID-403
[Create2.computeAddress(bytes32,bytes32,address)](lib/openzeppelin-contracts/contracts/utils/Create2.sol#L70-L91) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/utils/Create2.sol#L71-L90)

lib/openzeppelin-contracts/contracts/utils/Create2.sol#L70-L91


 - [ ] ID-404
[Clones.cloneWithImmutableArgs(address,bytes,uint256)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L143-L158) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L152-L154)

lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L143-L158


 - [ ] ID-405
[Clones.fetchCloneArgs(address)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L229-L235) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L231-L233)

lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L229-L235


 - [ ] ID-406
[Clones.clone(address,uint256)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L39-L54) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L43-L50)

lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L39-L54


 - [ ] ID-407
[Clones.predictDeterministicAddress(address,bytes32,address)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L98-L113) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L103-L112)

lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L98-L113


 - [ ] ID-408
[Clones.cloneDeterministic(address,bytes32,uint256)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L74-L93) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L82-L89)

lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L74-L93


 - [ ] ID-409
[SafeERC20._callOptionalReturn(IERC20,bytes)](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L173-L191) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L176-L186)

lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L173-L191


 - [ ] ID-410
[SafeERC20._callOptionalReturnBool(IERC20,bytes)](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L201-L211) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L205-L209)

lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L201-L211


 - [ ] ID-411
[Create2.deploy(uint256,bytes32,bytes)](lib/openzeppelin-contracts/contracts/utils/Create2.sol#L37-L56) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/utils/Create2.sol#L44-L52)

lib/openzeppelin-contracts/contracts/utils/Create2.sol#L37-L56


 - [ ] ID-412
[Create2.computeAddress(bytes32,bytes32,address)](lib/openzeppelin-contracts/contracts/utils/Create2.sol#L70-L91) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/utils/Create2.sol#L71-L90)

lib/openzeppelin-contracts/contracts/utils/Create2.sol#L70-L91


 - [ ] ID-413
[SafeERC20._callOptionalReturn(IERC20,bytes)](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L173-L191) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L176-L186)

lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L173-L191


 - [ ] ID-414
[Clones.cloneWithImmutableArgs(address,bytes,uint256)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L143-L158) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L152-L154)

lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L143-L158


 - [ ] ID-415
[Clones.fetchCloneArgs(address)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L229-L235) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L231-L233)

lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L229-L235


 - [ ] ID-416
[Clones.clone(address,uint256)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L39-L54) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L43-L50)

lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L39-L54


 - [ ] ID-417
[Clones.predictDeterministicAddress(address,bytes32,address)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L98-L113) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L103-L112)

lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L98-L113


 - [ ] ID-418
[Clones.cloneDeterministic(address,bytes32,uint256)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L74-L93) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L82-L89)

lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L74-L93


 - [ ] ID-419
[SafeERC20._callOptionalReturnBool(IERC20,bytes)](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L201-L211) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L205-L209)

lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L201-L211


 - [ ] ID-420
[SandboxComet.nonReentrantBefore()](contracts/SandboxComet.sol#L146-L157) uses assembly
	- [INLINE ASM](contracts/SandboxComet.sol#L149-L151)
	- [INLINE ASM](contracts/SandboxComet.sol#L154-L156)

contracts/SandboxComet.sol#L146-L157


 - [ ] ID-421
[SandboxComet.nonReentrantAfter()](contracts/SandboxComet.sol#L162-L168) uses assembly
	- [INLINE ASM](contracts/SandboxComet.sol#L165-L167)

contracts/SandboxComet.sol#L162-L168


 - [ ] ID-422
[SandboxComet.fallback()](contracts/SandboxComet.sol#L1231-L1245) uses assembly
	- [INLINE ASM](contracts/SandboxComet.sol#L1233-L1244)

contracts/SandboxComet.sol#L1231-L1245


 - [ ] ID-423
[SandboxComet.doTransferOut(address,address,uint256)](contracts/SandboxComet.sol#L622-L642) uses assembly
	- [INLINE ASM](contracts/SandboxComet.sol#L625-L640)

contracts/SandboxComet.sol#L622-L642


 - [ ] ID-424
[SandboxComet.doTransferIn(address,address,uint256)](contracts/SandboxComet.sol#L593-L615) uses assembly
	- [INLINE ASM](contracts/SandboxComet.sol#L597-L612)

contracts/SandboxComet.sol#L593-L615


## pragma
Impact: Informational
Confidence: High
 - [ ] ID-425
2 different versions of Solidity are used:
	- Version constraint 0.8.28 is used by:
		-[0.8.28](contracts/CometCore.sol#L2)
		-[0.8.28](contracts/CometExtension.sol#L2)
		-[0.8.28](contracts/CometMath.sol#L2)
		-[0.8.28](contracts/CometStorage.sol#L2)
		-[0.8.28](contracts/SandboxCometFactory.sol#L2)
		-[0.8.28](contracts/interfaces/ICometExtension.sol#L2)
		-[0.8.28](contracts/interfaces/IConfigController.sol#L2)
		-[0.8.28](contracts/interfaces/IConfigControllerFactory.sol#L2)
		-[0.8.28](contracts/interfaces/ISandboxComet.sol#L2)
		-[0.8.28](contracts/interfaces/ISandboxCometFactory.sol#L2)
		-[0.8.28](contracts/interfaces/ISandboxController.sol#L2)
		-[0.8.28](contracts/interfaces/ISandboxErrors.sol#L2)
	- Version constraint ^0.8.20 is used by:
		-[^0.8.20](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/utils/Create2.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/utils/Errors.sol#L4)

contracts/CometCore.sol#L2


 - [ ] ID-426
2 different versions of Solidity are used:
	- Version constraint 0.8.28 is used by:
		-[0.8.28](contracts/CometCore.sol#L2)
		-[0.8.28](contracts/CometMath.sol#L2)
		-[0.8.28](contracts/CometStorage.sol#L2)
		-[0.8.28](contracts/ConfigController.sol#L2)
		-[0.8.28](contracts/interfaces/IConfigController.sol#L2)
		-[0.8.28](contracts/interfaces/IConfigControllerErrors.sol#L2)
		-[0.8.28](contracts/interfaces/IConfigControllerEvents.sol#L2)
		-[0.8.28](contracts/interfaces/IConfigControllerFactory.sol#L2)
		-[0.8.28](contracts/interfaces/ISandboxComet.sol#L2)
		-[0.8.28](contracts/interfaces/ISandboxCometFactory.sol#L2)
		-[0.8.28](contracts/interfaces/ISandboxController.sol#L2)
		-[0.8.28](contracts/interfaces/ISandboxErrors.sol#L2)
	- Version constraint ^0.8.20 is used by:
		-[^0.8.20](lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol#L4)

contracts/CometCore.sol#L2


 - [ ] ID-427
2 different versions of Solidity are used:
	- Version constraint 0.8.28 is used by:
		-[0.8.28](contracts/CometCore.sol#L2)
		-[0.8.28](contracts/CometMath.sol#L2)
		-[0.8.28](contracts/CometStorage.sol#L2)
		-[0.8.28](contracts/ConfigController.sol#L2)
		-[0.8.28](contracts/ConfigControllerFactory.sol#L2)
		-[0.8.28](contracts/interfaces/IConfigController.sol#L2)
		-[0.8.28](contracts/interfaces/IConfigControllerErrors.sol#L2)
		-[0.8.28](contracts/interfaces/IConfigControllerEvents.sol#L2)
		-[0.8.28](contracts/interfaces/IConfigControllerFactory.sol#L2)
		-[0.8.28](contracts/interfaces/ISandboxComet.sol#L2)
		-[0.8.28](contracts/interfaces/ISandboxCometFactory.sol#L2)
		-[0.8.28](contracts/interfaces/ISandboxController.sol#L2)
		-[0.8.28](contracts/interfaces/ISandboxErrors.sol#L2)
	- Version constraint ^0.8.20 is used by:
		-[^0.8.20](lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/utils/Create2.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/utils/Errors.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol#L4)

contracts/CometCore.sol#L2


## solc-version
Impact: Informational
Confidence: High
 - [ ] ID-428
Version constraint ^0.8.20 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
	- VerbatimInvalidDeduplication
	- FullInlinerNonExpressionSplitArgumentEvaluationOrder
	- MissingSideEffectsOnSelectorAccess.
It is used by:
	- [^0.8.20](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/utils/Create2.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/utils/Errors.sol#L4)

lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L4


 - [ ] ID-429
Version constraint ^0.8.20 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
	- VerbatimInvalidDeduplication
	- FullInlinerNonExpressionSplitArgumentEvaluationOrder
	- MissingSideEffectsOnSelectorAccess.
It is used by:
	- [^0.8.20](lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol#L4)

lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol#L4


 - [ ] ID-430
Version constraint ^0.8.20 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
	- VerbatimInvalidDeduplication
	- FullInlinerNonExpressionSplitArgumentEvaluationOrder
	- MissingSideEffectsOnSelectorAccess.
It is used by:
	- [^0.8.20](lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/utils/Create2.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/utils/Errors.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol#L4)

lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol#L4


## too-many-digits
Impact: Informational
Confidence: Medium
 - [ ] ID-431
[Clones.cloneDeterministic(address,bytes32,uint256)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L74-L93) uses literals with too many digits:
	- [mstore(uint256,uint256)(0x00,implementation << 0x60 >> 0xe8 | 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L85)

lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L74-L93


 - [ ] ID-432
[Clones.clone(address,uint256)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L39-L54) uses literals with too many digits:
	- [mstore(uint256,uint256)(0x00,implementation << 0x60 >> 0xe8 | 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L46)

lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L39-L54


 - [ ] ID-433
[Clones.cloneDeterministic(address,bytes32,uint256)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L74-L93) uses literals with too many digits:
	- [mstore(uint256,uint256)(0x00,implementation << 0x60 >> 0xe8 | 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L85)

lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L74-L93


 - [ ] ID-434
[Clones.clone(address,uint256)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L39-L54) uses literals with too many digits:
	- [mstore(uint256,uint256)(0x00,implementation << 0x60 >> 0xe8 | 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000)](lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L46)

lib/openzeppelin-contracts/contracts/proxy/Clones.sol#L39-L54


## unimplemented-functions
Impact: Informational
Confidence: High
 - [ ] ID-435
[ISandboxComet](contracts/interfaces/ISandboxComet.sol#L13-L150) does not implement functions:
	- [ISandboxComet.absorb(address,address[])](contracts/interfaces/ISandboxComet.sol#L105)
	- [ISandboxComet.accrueAccount(address)](contracts/interfaces/ISandboxComet.sol#L141)
	- [ISandboxComet.balanceOf(address)](contracts/interfaces/ISandboxComet.sol#L123)
	- [ISandboxComet.borrowBalanceOf(address)](contracts/interfaces/ISandboxComet.sol#L125)
	- [ISandboxComet.buyCollateral(address,uint256,uint256,address)](contracts/interfaces/ISandboxComet.sol#L107)
	- [ISandboxComet.extractFees(address)](contracts/interfaces/ISandboxComet.sol#L129)
	- [ISandboxComet.factoryInit(address,address)](contracts/interfaces/ISandboxComet.sol#L98)
	- [ISandboxComet.getBorrowRate(uint256)](contracts/interfaces/ISandboxComet.sol#L145)
	- [ISandboxComet.getCollateralReserves(address)](contracts/interfaces/ISandboxComet.sol#L111)
	- [ISandboxComet.getPrice(address)](contracts/interfaces/ISandboxComet.sol#L115)
	- [ISandboxComet.getReserves()](contracts/interfaces/ISandboxComet.sol#L113)
	- [ISandboxComet.getSupplyRate(uint256)](contracts/interfaces/ISandboxComet.sol#L143)
	- [ISandboxComet.getUtilization()](contracts/interfaces/ISandboxComet.sol#L147)
	- [ISandboxComet.initialize(IConfigController.CometConfig,IConfigController.CometGlobalParamsConfig)](contracts/interfaces/ISandboxComet.sol#L100-L103)
	- [ISandboxComet.isAbsorbPaused()](contracts/interfaces/ISandboxComet.sol#L137)
	- [ISandboxComet.isBorrowCollateralized(address)](contracts/interfaces/ISandboxComet.sol#L117)
	- [ISandboxComet.isBuyPaused()](contracts/interfaces/ISandboxComet.sol#L139)
	- [ISandboxComet.isLiquidatable(address)](contracts/interfaces/ISandboxComet.sol#L119)
	- [ISandboxComet.isSupplyPaused()](contracts/interfaces/ISandboxComet.sol#L131)
	- [ISandboxComet.isTransferPaused()](contracts/interfaces/ISandboxComet.sol#L133)
	- [ISandboxComet.isWithdrawPaused()](contracts/interfaces/ISandboxComet.sol#L135)
	- [ISandboxComet.pause(bool,bool,bool,bool,bool)](contracts/interfaces/ISandboxComet.sol#L127)
	- [ISandboxComet.quoteCollateral(address,uint256)](contracts/interfaces/ISandboxComet.sol#L109)
	- [ISandboxComet.supply(address,uint256)](contracts/interfaces/ISandboxComet.sol#L78)
	- [ISandboxComet.supplyFrom(address,address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L82)
	- [ISandboxComet.supplyTo(address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L80)
	- [ISandboxComet.targetReserves()](contracts/interfaces/ISandboxComet.sol#L149)
	- [ISandboxComet.totalBorrow()](contracts/interfaces/ISandboxComet.sol#L121)
	- [ISandboxComet.transfer(address,uint256)](contracts/interfaces/ISandboxComet.sol#L84)
	- [ISandboxComet.transferAsset(address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L88)
	- [ISandboxComet.transferAssetFrom(address,address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L90)
	- [ISandboxComet.transferFrom(address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L86)
	- [ISandboxComet.withdraw(address,uint256)](contracts/interfaces/ISandboxComet.sol#L92)
	- [ISandboxComet.withdrawFrom(address,address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L96)
	- [ISandboxComet.withdrawTo(address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L94)

contracts/interfaces/ISandboxComet.sol#L13-L150


 - [ ] ID-436
[ISandboxComet](contracts/interfaces/ISandboxComet.sol#L13-L150) does not implement functions:
	- [ISandboxComet.absorb(address,address[])](contracts/interfaces/ISandboxComet.sol#L105)
	- [ISandboxComet.accrueAccount(address)](contracts/interfaces/ISandboxComet.sol#L141)
	- [ISandboxComet.balanceOf(address)](contracts/interfaces/ISandboxComet.sol#L123)
	- [ISandboxComet.borrowBalanceOf(address)](contracts/interfaces/ISandboxComet.sol#L125)
	- [ISandboxComet.buyCollateral(address,uint256,uint256,address)](contracts/interfaces/ISandboxComet.sol#L107)
	- [ISandboxComet.extractFees(address)](contracts/interfaces/ISandboxComet.sol#L129)
	- [ISandboxComet.factoryInit(address,address)](contracts/interfaces/ISandboxComet.sol#L98)
	- [ISandboxComet.getBorrowRate(uint256)](contracts/interfaces/ISandboxComet.sol#L145)
	- [ISandboxComet.getCollateralReserves(address)](contracts/interfaces/ISandboxComet.sol#L111)
	- [ISandboxComet.getPrice(address)](contracts/interfaces/ISandboxComet.sol#L115)
	- [ISandboxComet.getReserves()](contracts/interfaces/ISandboxComet.sol#L113)
	- [ISandboxComet.getSupplyRate(uint256)](contracts/interfaces/ISandboxComet.sol#L143)
	- [ISandboxComet.getUtilization()](contracts/interfaces/ISandboxComet.sol#L147)
	- [ISandboxComet.initialize(IConfigController.CometConfig,IConfigController.CometGlobalParamsConfig)](contracts/interfaces/ISandboxComet.sol#L100-L103)
	- [ISandboxComet.isAbsorbPaused()](contracts/interfaces/ISandboxComet.sol#L137)
	- [ISandboxComet.isBorrowCollateralized(address)](contracts/interfaces/ISandboxComet.sol#L117)
	- [ISandboxComet.isBuyPaused()](contracts/interfaces/ISandboxComet.sol#L139)
	- [ISandboxComet.isLiquidatable(address)](contracts/interfaces/ISandboxComet.sol#L119)
	- [ISandboxComet.isSupplyPaused()](contracts/interfaces/ISandboxComet.sol#L131)
	- [ISandboxComet.isTransferPaused()](contracts/interfaces/ISandboxComet.sol#L133)
	- [ISandboxComet.isWithdrawPaused()](contracts/interfaces/ISandboxComet.sol#L135)
	- [ISandboxComet.pause(bool,bool,bool,bool,bool)](contracts/interfaces/ISandboxComet.sol#L127)
	- [ISandboxComet.quoteCollateral(address,uint256)](contracts/interfaces/ISandboxComet.sol#L109)
	- [ISandboxComet.supply(address,uint256)](contracts/interfaces/ISandboxComet.sol#L78)
	- [ISandboxComet.supplyFrom(address,address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L82)
	- [ISandboxComet.supplyTo(address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L80)
	- [ISandboxComet.targetReserves()](contracts/interfaces/ISandboxComet.sol#L149)
	- [ISandboxComet.totalBorrow()](contracts/interfaces/ISandboxComet.sol#L121)
	- [ISandboxComet.transfer(address,uint256)](contracts/interfaces/ISandboxComet.sol#L84)
	- [ISandboxComet.transferAsset(address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L88)
	- [ISandboxComet.transferAssetFrom(address,address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L90)
	- [ISandboxComet.transferFrom(address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L86)
	- [ISandboxComet.withdraw(address,uint256)](contracts/interfaces/ISandboxComet.sol#L92)
	- [ISandboxComet.withdrawFrom(address,address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L96)
	- [ISandboxComet.withdrawTo(address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L94)

contracts/interfaces/ISandboxComet.sol#L13-L150


 - [ ] ID-437
[ISandboxComet](contracts/interfaces/ISandboxComet.sol#L13-L150) does not implement functions:
	- [ISandboxComet.absorb(address,address[])](contracts/interfaces/ISandboxComet.sol#L105)
	- [ISandboxComet.accrueAccount(address)](contracts/interfaces/ISandboxComet.sol#L141)
	- [ISandboxComet.balanceOf(address)](contracts/interfaces/ISandboxComet.sol#L123)
	- [ISandboxComet.borrowBalanceOf(address)](contracts/interfaces/ISandboxComet.sol#L125)
	- [ISandboxComet.buyCollateral(address,uint256,uint256,address)](contracts/interfaces/ISandboxComet.sol#L107)
	- [ISandboxComet.extractFees(address)](contracts/interfaces/ISandboxComet.sol#L129)
	- [ISandboxComet.factoryInit(address,address)](contracts/interfaces/ISandboxComet.sol#L98)
	- [ISandboxComet.getBorrowRate(uint256)](contracts/interfaces/ISandboxComet.sol#L145)
	- [ISandboxComet.getCollateralReserves(address)](contracts/interfaces/ISandboxComet.sol#L111)
	- [ISandboxComet.getPrice(address)](contracts/interfaces/ISandboxComet.sol#L115)
	- [ISandboxComet.getReserves()](contracts/interfaces/ISandboxComet.sol#L113)
	- [ISandboxComet.getSupplyRate(uint256)](contracts/interfaces/ISandboxComet.sol#L143)
	- [ISandboxComet.getUtilization()](contracts/interfaces/ISandboxComet.sol#L147)
	- [ISandboxComet.initialize(IConfigController.CometConfig,IConfigController.CometGlobalParamsConfig)](contracts/interfaces/ISandboxComet.sol#L100-L103)
	- [ISandboxComet.isAbsorbPaused()](contracts/interfaces/ISandboxComet.sol#L137)
	- [ISandboxComet.isBorrowCollateralized(address)](contracts/interfaces/ISandboxComet.sol#L117)
	- [ISandboxComet.isBuyPaused()](contracts/interfaces/ISandboxComet.sol#L139)
	- [ISandboxComet.isLiquidatable(address)](contracts/interfaces/ISandboxComet.sol#L119)
	- [ISandboxComet.isSupplyPaused()](contracts/interfaces/ISandboxComet.sol#L131)
	- [ISandboxComet.isTransferPaused()](contracts/interfaces/ISandboxComet.sol#L133)
	- [ISandboxComet.isWithdrawPaused()](contracts/interfaces/ISandboxComet.sol#L135)
	- [ISandboxComet.pause(bool,bool,bool,bool,bool)](contracts/interfaces/ISandboxComet.sol#L127)
	- [ISandboxComet.quoteCollateral(address,uint256)](contracts/interfaces/ISandboxComet.sol#L109)
	- [ISandboxComet.supply(address,uint256)](contracts/interfaces/ISandboxComet.sol#L78)
	- [ISandboxComet.supplyFrom(address,address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L82)
	- [ISandboxComet.supplyTo(address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L80)
	- [ISandboxComet.targetReserves()](contracts/interfaces/ISandboxComet.sol#L149)
	- [ISandboxComet.totalBorrow()](contracts/interfaces/ISandboxComet.sol#L121)
	- [ISandboxComet.transfer(address,uint256)](contracts/interfaces/ISandboxComet.sol#L84)
	- [ISandboxComet.transferAsset(address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L88)
	- [ISandboxComet.transferAssetFrom(address,address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L90)
	- [ISandboxComet.transferFrom(address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L86)
	- [ISandboxComet.withdraw(address,uint256)](contracts/interfaces/ISandboxComet.sol#L92)
	- [ISandboxComet.withdrawFrom(address,address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L96)
	- [ISandboxComet.withdrawTo(address,address,uint256)](contracts/interfaces/ISandboxComet.sol#L94)

contracts/interfaces/ISandboxComet.sol#L13-L150


## events-access
Impact: Low
Confidence: Medium
 - [ ] ID-438
[ConfigController.grantOwnership(address)](contracts/ConfigController.sol#L248-L251) should emit an event for: 
	- [owner = _newOwner](contracts/ConfigController.sol#L250) 
	- [owner = _newOwner](contracts/ConfigController.sol#L250) 

contracts/ConfigController.sol#L248-L251


 - [ ] ID-439
[ConfigController.grantOwnership(address)](contracts/ConfigController.sol#L248-L251) should emit an event for: 
	- [owner = _newOwner](contracts/ConfigController.sol#L250) 
	- [owner = _newOwner](contracts/ConfigController.sol#L250) 

contracts/ConfigController.sol#L248-L251


## missing-zero-check
Impact: Low
Confidence: Medium
 - [ ] ID-440
[ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._cometFactory](contracts/ConfigController.sol#L108) lacks a zero-check on :
		- [cometFactory = _cometFactory](contracts/ConfigController.sol#L135)

contracts/ConfigController.sol#L108


 - [ ] ID-441
[ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._guardian](contracts/ConfigController.sol#L107) lacks a zero-check on :
		- [guardian = _guardian](contracts/ConfigController.sol#L133)

contracts/ConfigController.sol#L107


 - [ ] ID-442
[ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._owner](contracts/ConfigController.sol#L105) lacks a zero-check on :
		- [owner = _owner](contracts/ConfigController.sol#L132)

contracts/ConfigController.sol#L105


 - [ ] ID-443
[ConfigController.setGuardian(address)._newGuardian](contracts/ConfigController.sol#L310) lacks a zero-check on :
		- [guardian = _newGuardian](contracts/ConfigController.sol#L312)

contracts/ConfigController.sol#L310


 - [ ] ID-444
[ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._cometFactory](contracts/ConfigController.sol#L108) lacks a zero-check on :
		- [cometFactory = _cometFactory](contracts/ConfigController.sol#L135)

contracts/ConfigController.sol#L108


 - [ ] ID-445
[ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._guardian](contracts/ConfigController.sol#L107) lacks a zero-check on :
		- [guardian = _guardian](contracts/ConfigController.sol#L133)

contracts/ConfigController.sol#L107


 - [ ] ID-446
[ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._owner](contracts/ConfigController.sol#L105) lacks a zero-check on :
		- [owner = _owner](contracts/ConfigController.sol#L132)

contracts/ConfigController.sol#L105


 - [ ] ID-447
[ConfigController.setGuardian(address)._newGuardian](contracts/ConfigController.sol#L310) lacks a zero-check on :
		- [guardian = _newGuardian](contracts/ConfigController.sol#L312)

contracts/ConfigController.sol#L310


## calls-loop
Impact: Low
Confidence: Medium
 - [ ] ID-448
[ConfigController._validateCollateralTokenConfig(IConfigController.CollateralTokenConfig)](contracts/ConfigController.sol#L338-L371) has external calls inside a loop: [! ISandboxController(sandboxController).isCollateralTokenWhitelisted(collateralTokenConfig.collateralToken)](contracts/ConfigController.sol#L339)
	Calls stack containing the loop:
		ConfigController.createComet(IConfigController.CometConfig)

contracts/ConfigController.sol#L338-L371


 - [ ] ID-449
[ConfigController._validateCollateralTokenConfig(IConfigController.CollateralTokenConfig)](contracts/ConfigController.sol#L338-L371) has external calls inside a loop: [collateralAssetLimitations = ISandboxController(sandboxController).collateralAssets(collateralTokenConfig.collateralToken)](contracts/ConfigController.sol#L342-L343)
	Calls stack containing the loop:
		ConfigController.createComet(IConfigController.CometConfig)

contracts/ConfigController.sol#L338-L371


 - [ ] ID-450
[ConfigController._validateCollateralTokenConfig(IConfigController.CollateralTokenConfig)](contracts/ConfigController.sol#L338-L371) has external calls inside a loop: [! ISandboxController(sandboxController).isCollateralTokenWhitelisted(collateralTokenConfig.collateralToken)](contracts/ConfigController.sol#L339)
	Calls stack containing the loop:
		ConfigController.createComet(IConfigController.CometConfig)

contracts/ConfigController.sol#L338-L371


 - [ ] ID-451
[ConfigController._validateCollateralTokenConfig(IConfigController.CollateralTokenConfig)](contracts/ConfigController.sol#L338-L371) has external calls inside a loop: [collateralAssetLimitations = ISandboxController(sandboxController).collateralAssets(collateralTokenConfig.collateralToken)](contracts/ConfigController.sol#L342-L343)
	Calls stack containing the loop:
		ConfigController.createComet(IConfigController.CometConfig)

contracts/ConfigController.sol#L338-L371


 - [ ] ID-452
[SandboxComet.getPrice(address)](contracts/SandboxComet.sol#L300-L304) has external calls inside a loop: [(None,price,None,None,None) = IPriceFeed(priceFeed).latestRoundData()](contracts/SandboxComet.sol#L301)
	Calls stack containing the loop:
		SandboxComet.absorb(address,address[])
		SandboxComet.absorbInternal(address,address)
		SandboxComet.isLiquidatable(address)

contracts/SandboxComet.sol#L300-L304


 - [ ] ID-453
[SandboxComet.initialize(IConfigController.CometConfig,IConfigController.CometGlobalParamsConfig)](contracts/SandboxComet.sol#L31-L130) has external calls inside a loop: [scale = uint64(10 ** IERC20NonStandard(collateralToken).decimals())](contracts/SandboxComet.sol#L71)

contracts/SandboxComet.sol#L31-L130


 - [ ] ID-454
[SandboxComet.initialize(IConfigController.CometConfig,IConfigController.CometGlobalParamsConfig)](contracts/SandboxComet.sol#L31-L130) has external calls inside a loop: [priceFeed = ISandboxController(sandboxController).tokenToPriceFeed(collateralToken)](contracts/SandboxComet.sol#L72)

contracts/SandboxComet.sol#L31-L130


## reentrancy-benign
Impact: Low
Confidence: Medium
 - [ ] ID-455
Reentrancy in [ConfigController.createComet(IConfigController.CometConfig)](contracts/ConfigController.sol#L148-L213):
	External calls:
	- [comet = ISandboxCometFactory(cometFactory).createComet()](contracts/ConfigController.sol#L199)
	- [ISandboxComet(comet).initialize(_cometConfig,_globalConfig)](contracts/ConfigController.sol#L200)
	State variables written after the call(s):
	- [cometId[comet] = cometsNum](contracts/ConfigController.sol#L204)
	- [comets.push(comet)](contracts/ConfigController.sol#L203)

contracts/ConfigController.sol#L148-L213


 - [ ] ID-456
Reentrancy in [ConfigController.createComet(IConfigController.CometConfig)](contracts/ConfigController.sol#L148-L213):
	External calls:
	- [comet = ISandboxCometFactory(cometFactory).createComet()](contracts/ConfigController.sol#L199)
	- [ISandboxComet(comet).initialize(_cometConfig,_globalConfig)](contracts/ConfigController.sol#L200)
	State variables written after the call(s):
	- [cometId[comet] = cometsNum](contracts/ConfigController.sol#L204)
	- [comets.push(comet)](contracts/ConfigController.sol#L203)

contracts/ConfigController.sol#L148-L213


 - [ ] ID-457
Reentrancy in [SandboxComet.supplyBase(address,address,uint256)](contracts/SandboxComet.sol#L695-L715):
	External calls:
	- [amount = doTransferIn(baseToken,from,amount)](contracts/SandboxComet.sol#L696)
		- [IERC20NonStandard(asset).transferFrom(from,address(this),amount)](contracts/SandboxComet.sol#L595)
	State variables written after the call(s):
	- [accrueInternal()](contracts/SandboxComet.sol#L697)
		- [(baseSupplyIndex,baseBorrowIndex) = accruedInterestIndices(timeElapsed)](contracts/SandboxComet.sol#L220)
	- [accrueInternal()](contracts/SandboxComet.sol#L697)
		- [(baseSupplyIndex,baseBorrowIndex) = accruedInterestIndices(timeElapsed)](contracts/SandboxComet.sol#L220)
	- [accrueInternal()](contracts/SandboxComet.sol#L697)
		- [lastAccrualTime = now_](contracts/SandboxComet.sol#L227)
	- [totalBorrowBase -= repayAmount](contracts/SandboxComet.sol#L706)
	- [totalSupplyBase += supplyAmount](contracts/SandboxComet.sol#L705)
	- [accrueInternal()](contracts/SandboxComet.sol#L697)
		- [trackingBorrowIndex += safe64(divBaseWei(baseTrackingBorrowSpeed * timeElapsed,totalBorrowBase))](contracts/SandboxComet.sol#L225)
	- [accrueInternal()](contracts/SandboxComet.sol#L697)
		- [trackingSupplyIndex += safe64(divBaseWei(baseTrackingSupplySpeed * timeElapsed,totalSupplyBase))](contracts/SandboxComet.sol#L222)
	- [updateBasePrincipal(dst,dstUser,dstPrincipalNew)](contracts/SandboxComet.sol#L708)
		- [userBasic[account] = basic](contracts/SandboxComet.sol#L585)

contracts/SandboxComet.sol#L695-L715


 - [ ] ID-458
Reentrancy in [SandboxComet.supplyCollateral(address,address,address,uint256)](contracts/SandboxComet.sol#L720-L738):
	External calls:
	- [amount = doTransferIn(asset,from,amount)](contracts/SandboxComet.sol#L721)
		- [IERC20NonStandard(asset).transferFrom(from,address(this),amount)](contracts/SandboxComet.sol#L595)
	State variables written after the call(s):
	- [totalsCollateral[asset] = totals](contracts/SandboxComet.sol#L732)
	- [updateAssetsIn(dst,index,dstCollateral,dstCollateralNew)](contracts/SandboxComet.sol#L735)
		- [userBasic[account].assetsIn |= uint24(1) << index](contracts/SandboxComet.sol#L552)
		- [userBasic[account].assetsIn &= ~ (uint24(1) << index)](contracts/SandboxComet.sol#L554)
	- [userCollateral[dst][asset] = dstCollateralNew](contracts/SandboxComet.sol#L733)

contracts/SandboxComet.sol#L720-L738


 - [ ] ID-459
Reentrancy in [SandboxComet.buyCollateral(address,uint256,uint256,address)](contracts/SandboxComet.sol#L1053-L1079):
	External calls:
	- [baseAmount = doTransferIn(baseToken,msg.sender,baseAmount)](contracts/SandboxComet.sol#L1055)
		- [IERC20NonStandard(asset).transferFrom(from,address(this),amount)](contracts/SandboxComet.sol#L595)
	State variables written after the call(s):
	- [assetFeesController[asset] += feeController](contracts/SandboxComet.sol#L1070)
	- [assetFeesDAO[asset] += feeController](contracts/SandboxComet.sol#L1067)

contracts/SandboxComet.sol#L1053-L1079


## cyclomatic-complexity
Impact: Informational
Confidence: High
 - [ ] ID-460
[ConfigController.createComet(IConfigController.CometConfig)](contracts/ConfigController.sol#L148-L213) has a high cyclomatic complexity (12).

contracts/ConfigController.sol#L148-L213


 - [ ] ID-461
[ConfigController.createComet(IConfigController.CometConfig)](contracts/ConfigController.sol#L148-L213) has a high cyclomatic complexity (12).

contracts/ConfigController.sol#L148-L213


## naming-convention
Impact: Informational
Confidence: High
 - [ ] ID-462
Parameter [ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._owner](contracts/ConfigController.sol#L105) is not in mixedCase

contracts/ConfigController.sol#L105


 - [ ] ID-463
Parameter [ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._curator](contracts/ConfigController.sol#L106) is not in mixedCase

contracts/ConfigController.sol#L106


 - [ ] ID-464
Parameter [ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._guardian](contracts/ConfigController.sol#L107) is not in mixedCase

contracts/ConfigController.sol#L107


 - [ ] ID-465
Parameter [ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._cometFactory](contracts/ConfigController.sol#L108) is not in mixedCase

contracts/ConfigController.sol#L108


 - [ ] ID-466
Parameter [ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._curatorFee](contracts/ConfigController.sol#L109) is not in mixedCase

contracts/ConfigController.sol#L109


 - [ ] ID-467
Parameter [ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._curatorProposalDuration](contracts/ConfigController.sol#L111) is not in mixedCase

contracts/ConfigController.sol#L111


 - [ ] ID-468
Parameter [ConfigController.setProposalDurations(uint256,uint256)._curatorProposalDuration](contracts/ConfigController.sol#L321) is not in mixedCase

contracts/ConfigController.sol#L321


 - [ ] ID-469
Parameter [ConfigController.grantOwnership(address)._newOwner](contracts/ConfigController.sol#L248) is not in mixedCase

contracts/ConfigController.sol#L248


 - [ ] ID-470
Parameter [ConfigController.createComet(IConfigController.CometConfig)._cometConfig](contracts/ConfigController.sol#L148) is not in mixedCase

contracts/ConfigController.sol#L148


 - [ ] ID-471
Parameter [ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._proposalDuration](contracts/ConfigController.sol#L112) is not in mixedCase

contracts/ConfigController.sol#L112


 - [ ] ID-472
Parameter [ConfigController.setProposalDurations(uint256,uint256)._proposalDuration](contracts/ConfigController.sol#L321) is not in mixedCase

contracts/ConfigController.sol#L321


 - [ ] ID-473
Parameter [ConfigController.setGuardian(address)._newGuardian](contracts/ConfigController.sol#L310) is not in mixedCase

contracts/ConfigController.sol#L310


 - [ ] ID-474
Parameter [ConfigController.proposeCurator(address)._proposedCurator](contracts/ConfigController.sol#L256) is not in mixedCase

contracts/ConfigController.sol#L256


 - [ ] ID-475
Parameter [ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._name](contracts/ConfigController.sol#L110) is not in mixedCase

contracts/ConfigController.sol#L110


 - [ ] ID-476
Parameter [ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._owner](contracts/ConfigController.sol#L105) is not in mixedCase

contracts/ConfigController.sol#L105


 - [ ] ID-477
Parameter [ConfigControllerFactory.createConfigController(address,address,address,uint256,string,uint256,uint256)._curatorFee](contracts/ConfigControllerFactory.sol#L47) is not in mixedCase

contracts/ConfigControllerFactory.sol#L47


 - [ ] ID-478
Parameter [ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._curator](contracts/ConfigController.sol#L106) is not in mixedCase

contracts/ConfigController.sol#L106


 - [ ] ID-479
Parameter [ConfigControllerFactory.createConfigController(address,address,address,uint256,string,uint256,uint256)._name](contracts/ConfigControllerFactory.sol#L48) is not in mixedCase

contracts/ConfigControllerFactory.sol#L48


 - [ ] ID-480
Parameter [ConfigControllerFactory.createConfigController(address,address,address,uint256,string,uint256,uint256)._proposalDuration](contracts/ConfigControllerFactory.sol#L50) is not in mixedCase

contracts/ConfigControllerFactory.sol#L50


 - [ ] ID-481
Parameter [ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._guardian](contracts/ConfigController.sol#L107) is not in mixedCase

contracts/ConfigController.sol#L107


 - [ ] ID-482
Parameter [ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._cometFactory](contracts/ConfigController.sol#L108) is not in mixedCase

contracts/ConfigController.sol#L108


 - [ ] ID-483
Parameter [ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._curatorFee](contracts/ConfigController.sol#L109) is not in mixedCase

contracts/ConfigController.sol#L109


 - [ ] ID-484
Parameter [ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._curatorProposalDuration](contracts/ConfigController.sol#L111) is not in mixedCase

contracts/ConfigController.sol#L111


 - [ ] ID-485
Parameter [ConfigControllerFactory.createConfigController(address,address,address,uint256,string,uint256,uint256)._curatorProposalDuration](contracts/ConfigControllerFactory.sol#L49) is not in mixedCase

contracts/ConfigControllerFactory.sol#L49


 - [ ] ID-486
Parameter [ConfigController.setProposalDurations(uint256,uint256)._curatorProposalDuration](contracts/ConfigController.sol#L321) is not in mixedCase

contracts/ConfigController.sol#L321


 - [ ] ID-487
Parameter [ConfigControllerFactory.createConfigController(address,address,address,uint256,string,uint256,uint256)._marketFactory](contracts/ConfigControllerFactory.sol#L46) is not in mixedCase

contracts/ConfigControllerFactory.sol#L46


 - [ ] ID-488
Parameter [ConfigController.grantOwnership(address)._newOwner](contracts/ConfigController.sol#L248) is not in mixedCase

contracts/ConfigController.sol#L248


 - [ ] ID-489
Parameter [ConfigController.createComet(IConfigController.CometConfig)._cometConfig](contracts/ConfigController.sol#L148) is not in mixedCase

contracts/ConfigController.sol#L148


 - [ ] ID-490
Parameter [ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._proposalDuration](contracts/ConfigController.sol#L112) is not in mixedCase

contracts/ConfigController.sol#L112


 - [ ] ID-491
Parameter [ConfigController.setProposalDurations(uint256,uint256)._proposalDuration](contracts/ConfigController.sol#L321) is not in mixedCase

contracts/ConfigController.sol#L321


 - [ ] ID-492
Parameter [ConfigControllerFactory.createConfigController(address,address,address,uint256,string,uint256,uint256)._curator](contracts/ConfigControllerFactory.sol#L44) is not in mixedCase

contracts/ConfigControllerFactory.sol#L44


 - [ ] ID-493
Parameter [ConfigController.setGuardian(address)._newGuardian](contracts/ConfigController.sol#L310) is not in mixedCase

contracts/ConfigController.sol#L310


 - [ ] ID-494
Parameter [ConfigControllerFactory.isController(address)._controller](contracts/ConfigControllerFactory.sol#L101) is not in mixedCase

contracts/ConfigControllerFactory.sol#L101


 - [ ] ID-495
Parameter [ConfigController.proposeCurator(address)._proposedCurator](contracts/ConfigController.sol#L256) is not in mixedCase

contracts/ConfigController.sol#L256


 - [ ] ID-496
Parameter [ConfigControllerFactory.createConfigController(address,address,address,uint256,string,uint256,uint256)._guardian](contracts/ConfigControllerFactory.sol#L45) is not in mixedCase

contracts/ConfigControllerFactory.sol#L45


 - [ ] ID-497
Parameter [ConfigController.initialize(address,address,address,address,uint256,string,uint256,uint256)._name](contracts/ConfigController.sol#L110) is not in mixedCase

contracts/ConfigController.sol#L110


 - [ ] ID-498
Parameter [SandboxController.setReserveCommissions(uint64[3])._reserveCommissions](contracts/SandboxController.sol#L166) is not in mixedCase

contracts/SandboxController.sol#L166


 - [ ] ID-499
Parameter [SandboxController.setTreasury(address)._treasury](contracts/SandboxController.sol#L214) is not in mixedCase

contracts/SandboxController.sol#L214


 - [ ] ID-500
Parameter [SandboxController.getCommissions(uint256,uint256,uint256)._targetReserves](contracts/SandboxController.sol#L243) is not in mixedCase

contracts/SandboxController.sol#L243


 - [ ] ID-501
Parameter [SandboxController.getCommissions(uint256,uint256,uint256)._currentReserves](contracts/SandboxController.sol#L241) is not in mixedCase

contracts/SandboxController.sol#L241


 - [ ] ID-502
Parameter [SandboxController.getCommissions(uint256,uint256,uint256)._seedReserves](contracts/SandboxController.sol#L242) is not in mixedCase

contracts/SandboxController.sol#L242


 - [ ] ID-503
Variable [SandboxController._controllerConfiguration](contracts/SandboxController.sol#L34) is not in mixedCase

contracts/SandboxController.sol#L34


 - [ ] ID-504
Parameter [SandboxController.setProtocolCommissions(uint64[3])._protocolCommissions](contracts/SandboxController.sol#L189) is not in mixedCase

contracts/SandboxController.sol#L189


 - [ ] ID-505
Parameter [SandboxController.setFeeEnabled(bool)._feeEnabled](contracts/SandboxController.sol#L225) is not in mixedCase

contracts/SandboxController.sol#L225


 - [ ] ID-506
Parameter [SandboxController.setConfiguration(ISandboxController.SandboxControllerConfiguration)._config](contracts/SandboxController.sol#L421) is not in mixedCase

contracts/SandboxController.sol#L421


 - [ ] ID-507
Parameter [SandboxComet.factoryInit(address,address)._ext](contracts/SandboxComet.sol#L19) is not in mixedCase

contracts/SandboxComet.sol#L19


 - [ ] ID-508
Parameter [SandboxComet.factoryInit(address,address)._configController](contracts/SandboxComet.sol#L19) is not in mixedCase

contracts/SandboxComet.sol#L19


## erc20-interface
Impact: Medium
Confidence: High
 - [ ] ID-509
[IERC20NonStandard](contracts/interfaces/IERC20NonStandard.sol#L9-L52) has incorrect ERC20 function interface:[IERC20NonStandard.transfer(address,uint256)](contracts/interfaces/IERC20NonStandard.sol#L30)

contracts/interfaces/IERC20NonStandard.sol#L9-L52


 - [ ] ID-510
[IERC20NonStandard](contracts/interfaces/IERC20NonStandard.sol#L9-L52) has incorrect ERC20 function interface:[IERC20NonStandard.transferFrom(address,address,uint256)](contracts/interfaces/IERC20NonStandard.sol#L38)

contracts/interfaces/IERC20NonStandard.sol#L9-L52


 - [ ] ID-511
[IERC20NonStandard](contracts/interfaces/IERC20NonStandard.sol#L9-L52) has incorrect ERC20 function interface:[IERC20NonStandard.approve(address,uint256)](contracts/interfaces/IERC20NonStandard.sol#L23)

contracts/interfaces/IERC20NonStandard.sol#L9-L52


 - [ ] ID-512
[IERC20NonStandard](contracts/interfaces/IERC20NonStandard.sol#L9-L52) has incorrect ERC20 function interface:[IERC20NonStandard.transfer(address,uint256)](contracts/interfaces/IERC20NonStandard.sol#L30)

contracts/interfaces/IERC20NonStandard.sol#L9-L52


 - [ ] ID-513
[IERC20NonStandard](contracts/interfaces/IERC20NonStandard.sol#L9-L52) has incorrect ERC20 function interface:[IERC20NonStandard.transferFrom(address,address,uint256)](contracts/interfaces/IERC20NonStandard.sol#L38)

contracts/interfaces/IERC20NonStandard.sol#L9-L52


 - [ ] ID-514
[IERC20NonStandard](contracts/interfaces/IERC20NonStandard.sol#L9-L52) has incorrect ERC20 function interface:[IERC20NonStandard.approve(address,uint256)](contracts/interfaces/IERC20NonStandard.sol#L23)

contracts/interfaces/IERC20NonStandard.sol#L9-L52


## unused-return
Impact: Medium
Confidence: Medium
 - [ ] ID-515
[SandboxController.whitelistBaseAsset(address,address,ISandboxController.BaseAssetCurve,uint256)](contracts/SandboxController.sol#L269-L313) ignores return value by [(None,answer,None,None,None) = IPriceFeed(priceFeed).latestRoundData()](contracts/SandboxController.sol#L288)

contracts/SandboxController.sol#L269-L313


 - [ ] ID-516
[SandboxController.whitelistCollateralAsset(address,address,uint64,uint64,uint64,uint64,uint64,uint64)](contracts/SandboxController.sol#L338-L407) ignores return value by [(None,answer,None,None,None) = IPriceFeed(priceFeed).latestRoundData()](contracts/SandboxController.sol#L361)

contracts/SandboxController.sol#L338-L407


 - [ ] ID-517
[SandboxComet.getPrice(address)](contracts/SandboxComet.sol#L300-L304) ignores return value by [(None,price,None,None,None) = IPriceFeed(priceFeed).latestRoundData()](contracts/SandboxComet.sol#L301)

contracts/SandboxComet.sol#L300-L304


## incorrect-equality
Impact: Medium
Confidence: High
 - [ ] ID-518
[SandboxComet.extractFees(address)](contracts/SandboxComet.sol#L448-L468) uses a dangerous strict equality:
	- [amount == 0](contracts/SandboxComet.sol#L464)

contracts/SandboxComet.sol#L448-L468


 - [ ] ID-519
[SandboxComet.updateAssetsIn(address,uint8,uint256,uint256)](contracts/SandboxComet.sol#L550-L556) uses a dangerous strict equality:
	- [initialUserBalance != 0 && finalUserBalance == 0](contracts/SandboxComet.sol#L553)

contracts/SandboxComet.sol#L550-L556


 - [ ] ID-520
[SandboxComet.getUtilization()](contracts/SandboxComet.sol#L285-L293) uses a dangerous strict equality:
	- [totalSupply_ == 0](contracts/SandboxComet.sol#L288)

contracts/SandboxComet.sol#L285-L293


 - [ ] ID-521
[SandboxComet._distributeProfit(uint256)](contracts/SandboxComet.sol#L1208-L1226) uses a dangerous strict equality:
	- [_controllerFee == 0](contracts/SandboxComet.sol#L1223)

contracts/SandboxComet.sol#L1208-L1226


## locked-ether
Impact: Medium
Confidence: High
 - [ ] ID-522
Contract locking ether found:
	Contract [SandboxComet](contracts/SandboxComet.sol#L15-L1252) has payable functions:
	 - [SandboxComet.fallback()](contracts/SandboxComet.sol#L1231-L1245)
	 - [SandboxComet.receive()](contracts/SandboxComet.sol#L1247-L1251)
	But does not have a function to withdraw the ether

contracts/SandboxComet.sol#L15-L1252


## uninitialized-local
Impact: Medium
Confidence: Medium
 - [ ] ID-523
[SandboxComet.extractFees(address).amount](contracts/SandboxComet.sol#L453) is a local variable never initialized

contracts/SandboxComet.sol#L453


## events-maths
Impact: Low
Confidence: Medium
 - [ ] ID-524
[SandboxComet.initialize(IConfigController.CometConfig,IConfigController.CometGlobalParamsConfig)](contracts/SandboxComet.sol#L31-L130) should emit an event for: 
	- [baseScale = uint64(10 ** _decimals)](contracts/SandboxComet.sol#L49) 
	- [accrualDescaleFactor = baseScale / BASE_ACCRUAL_SCALE](contracts/SandboxComet.sol#L51) 
	- [numAssets = colTokensLength](contracts/SandboxComet.sol#L64) 
	- [targetPercent = config.targetPercent](contracts/SandboxComet.sol#L92) 
	- [seedReserves = config.suggestedAmountOfSeedReserves](contracts/SandboxComet.sol#L93) 
	- [baseBorrowMin = bac.minBorrow](contracts/SandboxComet.sol#L103) 
	- [storeFrontPriceFactor = config.storeFrontPriceFactor](contracts/SandboxComet.sol#L104) 
	- [supplyKink = curve.supplyKink](contracts/SandboxComet.sol#L106) 
	- [supplyPerSecondInterestRateSlopeLow = curve.supplyPerYearInterestRateSlopeLow / SECONDS_PER_YEAR](contracts/SandboxComet.sol#L107) 
	- [supplyPerSecondInterestRateSlopeHigh = curve.supplyPerYearInterestRateSlopeHigh / SECONDS_PER_YEAR](contracts/SandboxComet.sol#L108) 
	- [supplyPerSecondInterestRateBase = curve.supplyPerYearInterestRateBase / SECONDS_PER_YEAR](contracts/SandboxComet.sol#L109) 
	- [borrowKink = curve.borrowKink](contracts/SandboxComet.sol#L111) 
	- [borrowPerSecondInterestRateSlopeLow = curve.borrowPerYearInterestRateSlopeLow / SECONDS_PER_YEAR](contracts/SandboxComet.sol#L112) 
	- [borrowPerSecondInterestRateSlopeHigh = curve.borrowPerYearInterestRateSlopeHigh / SECONDS_PER_YEAR](contracts/SandboxComet.sol#L113) 
	- [borrowPerSecondInterestRateBase = curve.borrowPerYearInterestRateBase / SECONDS_PER_YEAR](contracts/SandboxComet.sol#L114) 

contracts/SandboxComet.sol#L31-L130


## costly-loop
Impact: Informational
Confidence: Medium
 - [ ] ID-525
[SandboxComet.absorbInternal(address,address)](contracts/SandboxComet.sol#L985-L1043) has costly operations inside a loop:
	- [totalSupplyBase += supplyAmount](contracts/SandboxComet.sol#L1032)
	Calls stack containing the loop:
		SandboxComet.absorb(address,address[])

contracts/SandboxComet.sol#L985-L1043


 - [ ] ID-526
[SandboxComet.absorbInternal(address,address)](contracts/SandboxComet.sol#L985-L1043) has costly operations inside a loop:
	- [totalBorrowBase -= repayAmount](contracts/SandboxComet.sol#L1033)
	Calls stack containing the loop:
		SandboxComet.absorb(address,address[])

contracts/SandboxComet.sol#L985-L1043


