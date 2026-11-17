// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";


contract TokenVesting is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    struct VestingSchedule {
        address beneficiary;
        bool initialized;
        bool revocable;
        bool revoked;
        uint64 cliff;
        uint64 start;
        uint64 duration;
        uint64 slicePeriodSeconds;
        uint256 amountTotal;
        uint256 released;
    }

    IERC20 private immutable _token;

    bytes32[] private _vestingSchedulesIds;

    mapping(bytes32 => VestingSchedule) private _vestingSchedules;

    mapping(address => uint256) private _holdersVestingCount;

    mapping(address => bytes32[]) private _beneficiarySchedules;

    uint256 private _vestingSchedulesTotalAmount;

    
    error ZeroAddressNotAllowed();
    error ZeroAmountNotAllowed();
    error InvalidDuration();
    error InvalidSlicePeriod();
    error InvalidCliff();
    error InsufficientUnallocatedTokens(uint256 requested, uint256 available);
    error InsufficientReleasableTokens(uint256 requested, uint256 available);
    error ScheduleNotFound();
    error ScheduleAlreadyRevoked();
    error ScheduleNotRevocable();
    error ScheduleAlreadyExists();
    error UnauthorizedCaller();
    error InvalidVestingIndex();
    error CannotRecoverVestingToken();

    
    event VestingScheduleCreated(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint64 start,
        uint64 cliff,
        uint64 duration,
        uint64 slicePeriodSeconds,
        bool revocable,
        uint256 amountTotal
    );

    event TokensReleased(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount
    );

    event VestingScheduleRevoked(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint256 unvestedAmount,
        uint256 vestedAmount
    );

    event ExcessTokensWithdrawn(
        address indexed recipient,
        uint256 amount
    );

    event ForeignTokenRecovered(
        address indexed tokenAddress,
        address indexed recipient,
        uint256 amount
    );

   
    modifier onlyIfVestingScheduleExists(bytes32 scheduleId) {
        if (!_vestingSchedules[scheduleId].initialized) {
            revert ScheduleNotFound();
        }
        _;
    }

    modifier onlyIfVestingScheduleNotRevoked(bytes32 scheduleId) {
        if (!_vestingSchedules[scheduleId].initialized) {
            revert ScheduleNotFound();
        }
        if (_vestingSchedules[scheduleId].revoked) {
            revert ScheduleAlreadyRevoked();
        }
        _;
    }

    
    constructor(address token_, address initialOwner_)
        Ownable(initialOwner_)
    {
        if (token_ == address(0) || initialOwner_ == address(0)) {
            revert ZeroAddressNotAllowed();
        }
        _token = IERC20(token_);
    }

    function createVestingSchedule(
        address beneficiary,
        uint64 start,
        uint64 cliff,
        uint64 duration,
        uint64 slicePeriodSeconds,
        bool revocable,
        uint256 amount
    ) external onlyOwner whenNotPaused nonReentrant returns (bytes32 scheduleId) {
        _token.safeTransferFrom(msg.sender, address(this), amount);

        return _createSchedule(
            beneficiary,
            start,
            cliff,
            duration,
            slicePeriodSeconds,
            revocable,
            amount
        );
    }

    function createVestingScheduleFromBalance(
        address beneficiary,
        uint64 start,
        uint64 cliff,
        uint64 duration,
        uint64 slicePeriodSeconds,
        bool revocable,
        uint256 amount
    ) external onlyOwner whenNotPaused nonReentrant returns (bytes32 scheduleId) {
        uint256 withdrawable = getWithdrawableAmount();
        if (amount > withdrawable) {
            revert InsufficientUnallocatedTokens(amount, withdrawable);
        }

        return _createSchedule(
            beneficiary,
            start,
            cliff,
            duration,
            slicePeriodSeconds,
            revocable,
            amount
        );
    }

   
    function release(bytes32 scheduleId, uint256 amount)
        external
        whenNotPaused
        nonReentrant
        onlyIfVestingScheduleNotRevoked(scheduleId)
    {
        VestingSchedule storage schedule = _vestingSchedules[scheduleId];
        bool isBeneficiary = msg.sender == schedule.beneficiary;
        bool isOwner = msg.sender == owner();
        if (!isBeneficiary && !isOwner) {
            revert UnauthorizedCaller();
        }

        uint256 releasable = computeReleasableAmount(scheduleId);
        if (amount > releasable) {
            revert InsufficientReleasableTokens(amount, releasable);
        }
        if (amount == 0) {
            revert ZeroAmountNotAllowed();
        }

        schedule.released += amount;
        _vestingSchedulesTotalAmount -= amount;

        _token.safeTransfer(schedule.beneficiary, amount);

        emit TokensReleased(scheduleId, schedule.beneficiary, amount);
    }

    
    function releaseAll(bytes32 scheduleId) external whenNotPaused nonReentrant {
        uint256 releasable = computeReleasableAmount(scheduleId);
        if (releasable == 0) {
            revert InsufficientReleasableTokens(0, 0);
        }

        VestingSchedule storage schedule = _vestingSchedules[scheduleId];
        bool isBeneficiary = msg.sender == schedule.beneficiary;
        bool isOwner = msg.sender == owner();
        if (!isBeneficiary && !isOwner) {
            revert UnauthorizedCaller();
        }

        schedule.released += releasable;
        _vestingSchedulesTotalAmount -= releasable;

        _token.safeTransfer(schedule.beneficiary, releasable);

        emit TokensReleased(scheduleId, schedule.beneficiary, releasable);
    }

    
    function revoke(bytes32 scheduleId)
        external
        onlyOwner
        whenNotPaused
        nonReentrant
        onlyIfVestingScheduleNotRevoked(scheduleId)
    {
        VestingSchedule storage schedule = _vestingSchedules[scheduleId];
        if (!schedule.revocable) {
            revert ScheduleNotRevocable();
        }

        uint256 vestedAmount = _computeVestedAmount(schedule);
        uint256 unvestedAmount = schedule.amountTotal - vestedAmount;

        schedule.revoked = true;
        schedule.amountTotal = vestedAmount;

        _vestingSchedulesTotalAmount -= unvestedAmount;

        if (unvestedAmount > 0) {
            _token.safeTransfer(owner(), unvestedAmount);
        }

        emit VestingScheduleRevoked(
            scheduleId,
            schedule.beneficiary,
            unvestedAmount,
            vestedAmount
        );
    }


    function withdrawSurplus(uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        if (amount == 0) {
            revert ZeroAmountNotAllowed();
        }
        uint256 withdrawable = getWithdrawableAmount();
        if (amount > withdrawable) {
            revert InsufficientUnallocatedTokens(amount, withdrawable);
        }

        _token.safeTransfer(owner(), amount);

        emit ExcessTokensWithdrawn(owner(), amount);
    }

  
    function recoverForeignERC20(address tokenAddress, uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        if (tokenAddress == address(_token)) {
            revert CannotRecoverVestingToken();
        }
        if (tokenAddress == address(0)) {
            revert ZeroAddressNotAllowed();
        }
        if (amount == 0) {
            revert ZeroAmountNotAllowed();
        }

        IERC20(tokenAddress).safeTransfer(owner(), amount);

        emit ForeignTokenRecovered(tokenAddress, owner(), amount);
    }

   
    function pause() external onlyOwner {
        _pause();
    }

   
    function unpause() external onlyOwner {
        _unpause();
    }

  
    function getToken() external view returns (address) {
        return address(_token);
    }


    function getVestingSchedulesCount() external view returns (uint256) {
        return _vestingSchedulesIds.length;
    }

  
    function getVestingIdAtIndex(uint256 index) external view returns (bytes32) {
        if (index >= _vestingSchedulesIds.length) {
            revert InvalidVestingIndex();
        }
        return _vestingSchedulesIds[index];
    }

  
    function getSchedulesByBeneficiary(address beneficiary)
        external
        view
        returns (bytes32[] memory)
    {
        return _beneficiarySchedules[beneficiary];
    }

  
    function getVestingScheduleByAddressAndIndex(address beneficiary, uint256 index)
        external
        pure
        returns (bytes32)
    {
        return computeScheduleIdForAddressAndIndex(beneficiary, index);
    }

    
    function getVestingSchedulesTotalAmount() external view returns (uint256) {
        return _vestingSchedulesTotalAmount;
    }


    function getWithdrawableAmount() public view returns (uint256) {
        uint256 balance = _token.balanceOf(address(this));
        if (balance > _vestingSchedulesTotalAmount) {
            return balance - _vestingSchedulesTotalAmount;
        }
        return 0;
    }


    function getVestingSchedule(bytes32 scheduleId)
        external
        view
        onlyIfVestingScheduleExists(scheduleId)
        returns (VestingSchedule memory)
    {
        return _vestingSchedules[scheduleId];
    }

   
    function computeReleasableAmount(bytes32 scheduleId)
        public
        view
        onlyIfVestingScheduleExists(scheduleId)
        returns (uint256)
    {
        VestingSchedule storage schedule = _vestingSchedules[scheduleId];
        return _computeReleasableAmount(schedule);
    }

    
    function computeScheduleIdForAddressAndIndex(address beneficiary, uint256 index)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(beneficiary, index));
    }

    function _createSchedule(
        address beneficiary,
        uint64 start,
        uint64 cliff,
        uint64 duration,
        uint64 slicePeriodSeconds,
        bool revocable,
        uint256 amount
    ) internal returns (bytes32 scheduleId) {
        if (beneficiary == address(0)) {
            revert ZeroAddressNotAllowed();
        }
        if (amount == 0) {
            revert ZeroAmountNotAllowed();
        }
        if (duration == 0) {
            revert InvalidDuration();
        }
        if (slicePeriodSeconds == 0) {
            revert InvalidSlicePeriod();
        }
        if (cliff > duration) {
            revert InvalidCliff();
        }

        uint256 currentCount = _holdersVestingCount[beneficiary];
        scheduleId = computeScheduleIdForAddressAndIndex(beneficiary, currentCount);

        if (_vestingSchedules[scheduleId].initialized) {
            revert ScheduleAlreadyExists();
        }

        _vestingSchedules[scheduleId] = VestingSchedule({
            beneficiary: beneficiary,
            initialized: true,
            revocable: revocable,
            revoked: false,
            cliff: cliff,
            start: start,
            duration: duration,
            slicePeriodSeconds: slicePeriodSeconds,
            amountTotal: amount,
            released: 0
        });

        _vestingSchedulesTotalAmount += amount;
        _vestingSchedulesIds.push(scheduleId);
        _beneficiarySchedules[beneficiary].push(scheduleId);
        _holdersVestingCount[beneficiary] = currentCount + 1;

        emit VestingScheduleCreated(
            scheduleId,
            beneficiary,
            start,
            cliff,
            duration,
            slicePeriodSeconds,
            revocable,
            amount
        );

        return scheduleId;
    }

   
    function _computeReleasableAmount(VestingSchedule storage schedule)
        internal
        view
        returns (uint256)
    {
        uint256 currentTime = block.timestamp;

        if (currentTime < schedule.start + schedule.cliff) {
            return 0;
        }

        if (currentTime >= schedule.start + schedule.duration) {
            return schedule.amountTotal - schedule.released;
        }

        uint256 timeElapsed = currentTime - schedule.start;
        uint256 vestedSlicePeriods = timeElapsed / schedule.slicePeriodSeconds;
        uint256 vestedSeconds = vestedSlicePeriods * schedule.slicePeriodSeconds;
        uint256 vestedAmount = (schedule.amountTotal * vestedSeconds) / schedule.duration;

        return vestedAmount - schedule.released;
    }

  
    function _computeVestedAmount(VestingSchedule storage schedule)
        internal
        view
        returns (uint256)
    {
        uint256 currentTime = block.timestamp;

        if (currentTime < schedule.start + schedule.cliff) {
            return 0;
        }

        if (currentTime >= schedule.start + schedule.duration) {
            return schedule.amountTotal;
        }

        uint256 timeElapsed = currentTime - schedule.start;
        uint256 vestedSlicePeriods = timeElapsed / schedule.slicePeriodSeconds;
        uint256 vestedSeconds = vestedSlicePeriods * schedule.slicePeriodSeconds;
        return (schedule.amountTotal * vestedSeconds) / schedule.duration;
    }
}
