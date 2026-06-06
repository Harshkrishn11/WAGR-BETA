// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title WagrPredictionMarket v5
 * @notice Hybrid Resolution + Fair Refund Model.
 *
 *  Resolution Rules:
 *    1. CREATOR resolves  → 24-hour dispute window → then Claimable (fees paid at finalization)
 *    2. ADMIN resolves    → INSTANTLY Claimable (fees paid immediately)
 *    3. ADMIN can override a Creator's resolution during the 24h window → instant Claimable
 *    4. ADMIN can invalidate any Active or Resolved (disputed) market
 *
 *  Refund / Invalidation Rules (KEY CHANGE in v5):
 *    - On invalidation, ALL bettors get 100% of their wager back (no fees deducted)
 *    - Creator's seed penalty goes DIRECTLY to the treasury wallet
 *    - Fees are NEVER deducted from user funds on invalidation
 *
 *  Fee Model (only on successful resolution):
 *    - Creator earns 2% of total pool
 *    - Platform earns 1% of total pool
 *    - Fees are paid ONLY when market becomes Claimable (not on resolution announcement)
 *      This ensures that if a Creator resolves and Admin later invalidates during the
 *      dispute window, NO fees have been paid yet and full refunds are possible.
 */
contract WagrPredictionMarket is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ============================================================
    //  Constants
    // ============================================================

    uint256 public constant CREATOR_FEE_BPS   = 200;         // 2% to market creator
    uint256 public constant PLATFORM_FEE_BPS  = 100;         // 1% to platform treasury
    uint256 public constant DISPUTE_WINDOW    = 24 hours;    // 24h dispute for creator resolutions
    uint256 public constant MAX_DURATION      = 365 days;    // Max market duration

    uint256 public minSeedAmount = 5_000_000; // $5 USDC (6 decimals)

    // ============================================================
    //  State Variables
    // ============================================================

    IERC20  public immutable usdc;
    address public treasuryAddress;
    uint256 public nextMarketId;

    enum MarketStatus {
        Active,      // 0 — Betting open
        Resolved,    // 1 — Creator resolved — in 24h dispute window (fees NOT yet paid)
        Claimable,   // 2 — Winners can claim (fees have been paid to creator & platform)
        Invalidated  // 3 — Cancelled — bettors get 100% refund, creator penalty → treasury
    }

    struct Market {
        uint256      id;
        address      creator;
        string       question;
        string       category;
        string[]     options;
        uint256      deadline;
        uint256      resolvedAt;          // Timestamp when resolved
        uint8        correctOptionIndex;
        MarketStatus status;
        uint256      totalPool;
        uint256      creatorFee;          // Set when fees are paid (at Claimable)
        uint256      platformFee;         // Set when fees are paid (at Claimable)
        uint256      creatorSeedAmount;
        bool         resolvedByAdmin;     // true = admin resolved (instant), false = creator (dispute)
    }

    mapping(uint256 => Market)                                        public markets;
    mapping(uint256 => mapping(uint8 => uint256))                     public optionPools;
    mapping(uint256 => mapping(address => mapping(uint8 => uint256))) public userWagers;
    mapping(uint256 => mapping(address => bool))                      public hasClaimed;
    mapping(uint256 => mapping(address => bool))                      public hasRefunded;

    // ============================================================
    //  Events
    // ============================================================

    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string  question,
        string  category,
        string[] options,
        uint256 deadline,
        uint256 seedAmount
    );
    event BetPlaced(uint256 indexed marketId, address indexed user, uint8 optionIndex, uint256 amount);
    event MarketResolved(uint256 indexed marketId, uint8 correctOptionIndex, uint256 totalPool, uint256 creatorFee, uint256 platformFee, uint256 claimableFrom, bool resolvedByAdmin);
    event MarketClaimable(uint256 indexed marketId);
    event MarketInvalidated(uint256 indexed marketId, uint256 penaltyToTreasury);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event RefundClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event MinSeedUpdated(uint256 oldMin, uint256 newMin);

    // ============================================================
    //  Constructor
    // ============================================================

    constructor(
        address _usdc,
        address _treasury,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_usdc     != address(0), "Zero USDC");
        require(_treasury != address(0), "Zero treasury");
        usdc            = IERC20(_usdc);
        treasuryAddress = _treasury;
    }

    // ============================================================
    //  Public — Create Market
    // ============================================================

    function createMarket(
        string   calldata _question,
        string   calldata _category,
        string[] calldata _options,
        uint256           _deadline,
        uint8             _seedOption,
        uint256           _seedAmount
    ) external nonReentrant whenNotPaused {
        require(_options.length >= 2,          "Need >= 2 options");
        require(_deadline > block.timestamp,   "Deadline in past");
        require(_deadline <= block.timestamp + MAX_DURATION, "Deadline too far in future");
        require(_seedAmount >= minSeedAmount,  "Seed below minimum");
        require(_seedOption < _options.length, "Invalid seed option");

        uint256 marketId = nextMarketId++;

        Market storage m = markets[marketId];
        m.id               = marketId;
        m.creator          = msg.sender;
        m.question         = _question;
        m.category         = _category;
        m.options          = _options;
        m.deadline         = _deadline;
        m.status           = MarketStatus.Active;
        m.creatorSeedAmount = _seedAmount;

        usdc.safeTransferFrom(msg.sender, address(this), _seedAmount);

        m.totalPool                                   += _seedAmount;
        optionPools[marketId][_seedOption]            += _seedAmount;
        userWagers[marketId][msg.sender][_seedOption] += _seedAmount;

        emit MarketCreated(marketId, msg.sender, _question, _category, _options, _deadline, _seedAmount);
        emit BetPlaced(marketId, msg.sender, _seedOption, _seedAmount);
    }

    // ============================================================
    //  Public — Place Bet
    // ============================================================

    function placeBet(
        uint256 _marketId,
        uint8   _optionIndex,
        uint256 _amount
    ) external nonReentrant whenNotPaused {
        Market storage m = markets[_marketId];
        require(_marketId < nextMarketId,           "Market does not exist");
        require(m.status == MarketStatus.Active,    "Market not active");
        require(block.timestamp < m.deadline,        "Betting closed");
        require(_optionIndex < m.options.length,    "Invalid option");
        require(_amount > 0,                        "Amount must be > 0");

        usdc.safeTransferFrom(msg.sender, address(this), _amount);

        m.totalPool                                     += _amount;
        optionPools[_marketId][_optionIndex]            += _amount;
        userWagers[_marketId][msg.sender][_optionIndex] += _amount;

        emit BetPlaced(_marketId, msg.sender, _optionIndex, _amount);
    }

    // ============================================================
    //  CREATOR — Resolve Own Market (24h dispute window)
    //  NOTE: Fees are NOT paid here. They are paid only at finalization.
    //        This ensures invalidation during dispute = 100% refund.
    // ============================================================

    function creatorResolveMarket(uint256 _marketId, uint8 _correctOptionIndex) external whenNotPaused nonReentrant {
        Market storage m = markets[_marketId];
        require(msg.sender == m.creator,                   "Only creator can call");
        require(m.status == MarketStatus.Active,           "Not active");
        require(block.timestamp >= m.deadline,              "Deadline not reached");
        require(_correctOptionIndex < m.options.length,    "Invalid option index");
        require(optionPools[_marketId][_correctOptionIndex] > 0, "Winning pool cannot be 0");

        m.status             = MarketStatus.Resolved;   // 24h dispute window starts
        m.correctOptionIndex = _correctOptionIndex;
        m.resolvedAt         = block.timestamp;
        m.resolvedByAdmin    = false;
        // Fees are NOT paid yet — paid at finalizeResolution

        uint256 claimableFrom = block.timestamp + DISPUTE_WINDOW;
        // Preview fee amounts for the event (not paid yet)
        uint256 previewCreatorFee  = (m.totalPool * CREATOR_FEE_BPS)  / 10000;
        uint256 previewPlatformFee = (m.totalPool * PLATFORM_FEE_BPS) / 10000;
        emit MarketResolved(_marketId, _correctOptionIndex, m.totalPool, previewCreatorFee, previewPlatformFee, claimableFrom, false);
    }

    // ============================================================
    //  ADMIN — Resolve Market (INSTANT — no dispute window)
    //  Fees are paid immediately since admin resolution is trusted.
    // ============================================================

    function resolveMarket(uint256 _marketId, uint8 _correctOptionIndex) external onlyOwner {
        Market storage m = markets[_marketId];
        require(m.status == MarketStatus.Active,          "Not active");
        require(block.timestamp >= m.deadline,             "Deadline not reached");
        require(_correctOptionIndex < m.options.length,   "Invalid option index");
        require(optionPools[_marketId][_correctOptionIndex] > 0, "Winning pool cannot be 0");

        m.status             = MarketStatus.Claimable;  // INSTANT — no dispute window
        m.correctOptionIndex = _correctOptionIndex;
        m.resolvedAt         = block.timestamp;
        m.resolvedByAdmin    = true;

        _payFeesAndFinalize(m);  // Pay fees immediately on admin resolution

        emit MarketResolved(_marketId, _correctOptionIndex, m.totalPool, m.creatorFee, m.platformFee, block.timestamp, true);
        emit MarketClaimable(_marketId);
    }

    // ============================================================
    //  ADMIN — Override Creator Resolution (during 24h dispute)
    //  Corrects the result. Fees paid immediately. Instant Claimable.
    // ============================================================

    function overrideResolution(uint256 _marketId, uint8 _newCorrectIndex) external onlyOwner {
        Market storage m = markets[_marketId];
        require(m.status == MarketStatus.Resolved,                  "Not in dispute window");
        require(!m.resolvedByAdmin,                                  "Admin resolution cannot be overridden");
        require(block.timestamp < m.resolvedAt + DISPUTE_WINDOW,    "Dispute window closed");
        require(_newCorrectIndex < m.options.length,                "Invalid option index");
        require(optionPools[_marketId][_newCorrectIndex] > 0,       "Winning pool cannot be 0");

        m.correctOptionIndex = _newCorrectIndex;
        m.resolvedByAdmin    = true;
        m.status             = MarketStatus.Claimable;  // Instant after admin override

        _payFeesAndFinalize(m);  // Pay fees immediately on admin override

        emit MarketResolved(_marketId, _newCorrectIndex, m.totalPool, m.creatorFee, m.platformFee, block.timestamp, true);
        emit MarketClaimable(_marketId);
    }

    // ============================================================
    //  Anyone — Finalize Creator Resolution (after 24h dispute window)
    //  This is when fees finally get paid for creator-resolved markets.
    // ============================================================

    function finalizeResolution(uint256 _marketId) external whenNotPaused nonReentrant {
        Market storage m = markets[_marketId];
        require(m.status == MarketStatus.Resolved,                  "Not resolved");
        require(block.timestamp >= m.resolvedAt + DISPUTE_WINDOW,   "Dispute window still active");

        m.status = MarketStatus.Claimable;

        _payFeesAndFinalize(m);  // Fees paid here, after dispute window safely passes

        emit MarketClaimable(_marketId);
    }

    // ============================================================
    //  ADMIN — Invalidate Market
    //  100% refund for ALL users. Creator seed penalty → treasury.
    //  No creator fee, no platform fee ever deducted from user funds.
    // ============================================================

    function invalidateMarket(uint256 _marketId, bool _keepCreatorSeed) external onlyOwner {
        Market storage m = markets[_marketId];
        require(
            m.status == MarketStatus.Active || m.status == MarketStatus.Resolved,
            "Cannot invalidate"
        );
        // Guard: ensure fees were never paid (they shouldn't be in Active or Resolved)
        // For Resolved (creator dispute window), fees have NOT been paid yet, so full refund is safe.
        require(m.creatorFee == 0 && m.platformFee == 0, "Fees already paid, cannot fully refund");
        require(!hasRefunded[_marketId][address(0)],     "Already invalidated");

        m.status = MarketStatus.Invalidated;

        uint256 penalty = 0;
        if (_keepCreatorSeed) {
            hasRefunded[_marketId][address(0)] = true; // sentinel for seed penalty
            penalty = m.creatorSeedAmount;
            // Send creator's seed as penalty DIRECTLY to treasury
            usdc.safeTransfer(treasuryAddress, penalty);
        }

        emit MarketInvalidated(_marketId, penalty);
    }

    // ============================================================
    //  User — Claim Refund (on invalidated markets — 100% refund)
    // ============================================================

    function claimRefund(uint256 _marketId) external nonReentrant {
        Market storage m = markets[_marketId];
        require(m.status == MarketStatus.Invalidated, "Market not invalidated");
        require(!hasRefunded[_marketId][msg.sender],  "Already refunded");

        hasRefunded[_marketId][msg.sender] = true;

        // Refund 100% of all wagers across all options
        uint256 refund = 0;
        uint8 numOptions = uint8(m.options.length);
        for (uint8 i = 0; i < numOptions; i++) {
            refund += userWagers[_marketId][msg.sender][i];
        }

        // If creator seed was penalised, subtract seed from creator's refund
        // (their wagers beyond the seed amount are still fully refunded)
        bool seedPenalised = hasRefunded[_marketId][address(0)];
        if (seedPenalised && msg.sender == m.creator) {
            uint256 seedPenalty = m.creatorSeedAmount;
            if (refund > seedPenalty) {
                refund -= seedPenalty;
            } else {
                refund = 0;
            }
        }

        require(refund > 0, "No refund available");
        usdc.safeTransfer(msg.sender, refund);
        emit RefundClaimed(_marketId, msg.sender, refund);
    }

    // ============================================================
    //  User — Claim Winnings (only after Claimable)
    // ============================================================

    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage m = markets[_marketId];
        require(m.status == MarketStatus.Claimable,       "Not claimable yet");
        require(!hasClaimed[_marketId][msg.sender],        "Already claimed");

        uint8   winOpt    = m.correctOptionIndex;
        uint256 userWager = userWagers[_marketId][msg.sender][winOpt];
        require(userWager > 0, "No winning wager");

        hasClaimed[_marketId][msg.sender] = true;

        uint256 winningPool = optionPools[_marketId][winOpt];
        uint256 prizePool   = m.totalPool - m.creatorFee - m.platformFee;
        uint256 payout      = (userWager * prizePool) / winningPool;
        require(payout > 0, "Zero payout");

        usdc.safeTransfer(msg.sender, payout);
        emit WinningsClaimed(_marketId, msg.sender, payout);
    }

    // ============================================================
    //  Internal — Pay Fees & Finalize
    //  Called ONLY when market definitively reaches Claimable status.
    //  Never called during invalidation → ensures 100% refund on disputes.
    // ============================================================

    function _payFeesAndFinalize(Market storage m) internal {
        uint256 totalPool   = m.totalPool;
        uint256 creatorFee  = (totalPool * CREATOR_FEE_BPS)  / 10000;
        uint256 platformFee = (totalPool * PLATFORM_FEE_BPS) / 10000;

        m.creatorFee  = creatorFee;
        m.platformFee = platformFee;

        if (creatorFee > 0)  usdc.safeTransfer(m.creator,       creatorFee);
        if (platformFee > 0) usdc.safeTransfer(treasuryAddress, platformFee);
    }

    // ============================================================
    //  Admin Setters
    // ============================================================

    function setTreasury(address _new) external onlyOwner {
        require(_new != address(0), "Zero address");
        emit TreasuryUpdated(treasuryAddress, _new);
        treasuryAddress = _new;
    }

    function setMinSeedAmount(uint256 _new) external onlyOwner {
        emit MinSeedUpdated(minSeedAmount, _new);
        minSeedAmount = _new;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ============================================================
    //  View Functions
    // ============================================================

    function getMarket(uint256 _marketId) external view returns (Market memory) {
        return markets[_marketId];
    }

    function getMarketOptions(uint256 _marketId) external view returns (string[] memory) {
        return markets[_marketId].options;
    }

    function getUserWager(uint256 _marketId, address _user, uint8 _optionIndex) external view returns (uint256) {
        return userWagers[_marketId][_user][_optionIndex];
    }

    function getOptionPool(uint256 _marketId, uint8 _optionIndex) external view returns (uint256) {
        return optionPools[_marketId][_optionIndex];
    }

    function getDisputeWindowEnd(uint256 _marketId) external view returns (uint256) {
        Market storage m = markets[_marketId];
        if (m.status != MarketStatus.Resolved) return 0;
        return m.resolvedAt + DISPUTE_WINDOW;
    }
}
