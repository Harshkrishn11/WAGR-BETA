// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title FriendBet
 * @notice WAGR's peer-to-peer bet contract. Two users bet USDC on a condition.
 *         A designated judge resolves the bet. Winner gets 97%, treasury gets 3%.
 * @dev Uses SafeERC20, ReentrancyGuard, Ownable, Pausable for maximum security.
 */
contract FriendBet is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ============================================================
    //  Enums & Structs
    // ============================================================

    /// @notice Lifecycle states of a bet
    enum BetStatus {
        Open,       // Created by A, waiting for B to accept
        Active,     // Both parties have deposited, waiting for judge
        Resolved,   // Judge has called a winner, payouts sent
        Cancelled   // Creator cancelled before anyone accepted
    }

    /// @notice Full bet record
    struct Bet {
        uint256 id;
        address creator;      // Person who created the bet
        address opponent;     // Person who accepted the bet (set on acceptBet)
        address judge;        // Neutral party who calls the winner
        uint256 amount;       // USDC amount each party deposits (6 decimals)
        string condition;     // Human-readable bet description (max 200 chars)
        uint256 deadline;     // Unix timestamp — bet must be resolved by this time
        BetStatus status;
        address winner;       // Set when resolved
    }

    // ============================================================
    //  State Variables
    // ============================================================

    /// @notice USDC token contract
    IERC20 public immutable usdc;

    /// @notice Wallet that receives the 3% platform fee
    address public treasuryAddress;

    /// @notice Platform fee: 3%
    uint256 public constant PLATFORM_FEE_BPS = 300;

    /// @notice Minimum bet: 1 USDC (6 decimals)
    uint256 public constant MIN_BET = 1_000_000;

    /// @notice Maximum bet: 100 USDC (6 decimals)
    uint256 public constant MAX_BET = 100_000_000;

    /// @notice Auto-incrementing bet ID counter
    uint256 public betCounter;

    /// @notice All bets by ID
    mapping(uint256 => Bet) public bets;

    /// @notice All bet IDs created by an address
    mapping(address => uint256[]) public betsByCreator;

    /// @notice All bet IDs where address is opponent
    mapping(address => uint256[]) public betsByOpponent;

    /// @notice All bet IDs where address is judge
    mapping(address => uint256[]) public betsByJudge;

    // ============================================================
    //  Events
    // ============================================================

    event BetCreated(
        uint256 indexed betId,
        address indexed creator,
        address indexed judge,
        uint256 amount,
        string condition,
        uint256 deadline
    );

    event BetAccepted(
        uint256 indexed betId,
        address indexed opponent
    );

    event BetResolved(
        uint256 indexed betId,
        address indexed winner,
        uint256 payout,
        uint256 fee
    );

    event BetCancelled(uint256 indexed betId, address indexed creator);

    /// @notice Emitted when both parties get refunded due to judge inactivity
    event StalemateClaimed(uint256 indexed betId, uint256 refundEach);

    event TreasuryUpdated(address oldTreasury, address newTreasury);

    // ============================================================
    //  Constructor
    // ============================================================

    /**
     * @param _usdc          USDC token address
     * @param _treasury      Wallet receiving 3% fee
     * @param _initialOwner  Contract owner / admin
     */
    constructor(
        address _usdc,
        address _treasury,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_usdc != address(0), "FriendBet: zero USDC address");
        require(_treasury != address(0), "FriendBet: zero treasury address");
        usdc = IERC20(_usdc);
        treasuryAddress = _treasury;
    }

    // ============================================================
    //  User Functions
    // ============================================================

    /**
     * @notice Create a new bet. Deposit your USDC now — it stays locked until resolution.
     * @dev You must approve this contract for `_amount` USDC before calling.
     * @param _condition  Plain-English bet description (max 200 chars)
     * @param _amount     USDC each party deposits (1–100 USDC, 6 decimals)
     * @param _judge      Address of the neutral judge
     * @param _deadline   Unix timestamp deadline for resolution
     * @return betId      The unique ID of this bet
     */
    function createBet(
        string calldata _condition,
        uint256 _amount,
        address _judge,
        uint256 _deadline
    ) external nonReentrant whenNotPaused returns (uint256 betId) {
        require(bytes(_condition).length > 0, "FriendBet: empty condition");
        require(bytes(_condition).length <= 200, "FriendBet: condition too long");
        require(_amount >= MIN_BET && _amount <= MAX_BET, "FriendBet: amount out of range");
        require(_judge != address(0), "FriendBet: zero judge address");
        require(_judge != msg.sender, "FriendBet: judge cannot be creator");
        require(_deadline > block.timestamp, "FriendBet: deadline in the past");

        // Increment and assign ID
        betCounter++;
        betId = betCounter;

        // Record the bet
        bets[betId] = Bet({
            id: betId,
            creator: msg.sender,
            opponent: address(0),
            judge: _judge,
            amount: _amount,
            condition: _condition,
            deadline: _deadline,
            status: BetStatus.Open,
            winner: address(0)
        });

        betsByCreator[msg.sender].push(betId);
        betsByJudge[_judge].push(betId);

        // Pull creator's deposit
        usdc.safeTransferFrom(msg.sender, address(this), _amount);

        emit BetCreated(betId, msg.sender, _judge, _amount, _condition, _deadline);
    }

    /**
     * @notice Accept an open bet by depositing the matching USDC amount.
     * @dev You must approve this contract for the bet's `amount` USDC before calling.
     * @param _betId  The ID of the bet you want to accept
     */
    function acceptBet(uint256 _betId) external nonReentrant whenNotPaused {
        Bet storage bet = bets[_betId];

        require(bet.id != 0, "FriendBet: bet does not exist");
        require(bet.status == BetStatus.Open, "FriendBet: bet not open");
        require(block.timestamp < bet.deadline, "FriendBet: past deadline");
        require(msg.sender != bet.creator, "FriendBet: creator cannot accept own bet");
        require(msg.sender != bet.judge, "FriendBet: judge cannot be opponent");

        // Update state before transfer
        bet.opponent = msg.sender;
        bet.status = BetStatus.Active;

        betsByOpponent[msg.sender].push(_betId);

        // Pull opponent's deposit
        usdc.safeTransferFrom(msg.sender, address(this), bet.amount);

        emit BetAccepted(_betId, msg.sender);
    }

    /**
     * @notice Judge calls the winner. Pays out 97% to winner, 3% to treasury.
     * @param _betId   The bet to resolve
     * @param _winner  Address of the winner (must be creator or opponent)
     */
    function resolveBet(uint256 _betId, address _winner) external nonReentrant {
        Bet storage bet = bets[_betId];

        require(bet.id != 0, "FriendBet: bet does not exist");
        require(bet.status == BetStatus.Active, "FriendBet: bet not active");
        require(msg.sender == bet.judge, "FriendBet: only judge can resolve");
        require(
            _winner == bet.creator || _winner == bet.opponent,
            "FriendBet: winner must be a participant"
        );

        // Mark resolved before payouts (checks-effects-interactions)
        bet.status = BetStatus.Resolved;
        bet.winner = _winner;

        // Total pot = both deposits
        uint256 totalPot = bet.amount * 2;

        // 3% platform fee
        uint256 treasuryFee = (totalPot * PLATFORM_FEE_BPS) / 10_000;
        uint256 winnerPayout = totalPot - treasuryFee;

        // Pay treasury
        usdc.safeTransfer(treasuryAddress, treasuryFee);

        // Pay winner
        usdc.safeTransfer(_winner, winnerPayout);

        emit BetResolved(_betId, _winner, winnerPayout, treasuryFee);
    }

    /**
     * @notice Cancel an open bet. Only creator can cancel, only if not yet accepted.
     * @param _betId  The bet to cancel
     */
    function cancelBet(uint256 _betId) external nonReentrant {
        Bet storage bet = bets[_betId];

        require(bet.id != 0, "FriendBet: bet does not exist");
        require(bet.status == BetStatus.Open, "FriendBet: can only cancel open bets");
        require(msg.sender == bet.creator, "FriendBet: only creator can cancel");

        // Mark cancelled before refund
        bet.status = BetStatus.Cancelled;

        // Refund creator's deposit
        usdc.safeTransfer(bet.creator, bet.amount);

        emit BetCancelled(_betId, msg.sender);
    }

    /**
     * @notice Claim a stalemate refund when a judge fails to resolve an Active bet
     *         after the deadline has passed by more than 7 days.
     * @dev L-2 FIX: Prevents funds from being locked forever due to judge inactivity.
     *      Both parties get 100% refund — no platform fee taken.
     *      Can be called by EITHER the creator OR the opponent.
     * @param _betId  The bet to claim stalemate on
     */
    function claimStalemate(uint256 _betId) external nonReentrant {
        Bet storage bet = bets[_betId];

        require(bet.id != 0, "FriendBet: bet does not exist");
        require(bet.status == BetStatus.Active, "FriendBet: bet not active");
        require(
            msg.sender == bet.creator || msg.sender == bet.opponent,
            "FriendBet: only participants can claim stalemate"
        );
        require(
            block.timestamp > bet.deadline + 7 days,
            "FriendBet: must wait 7 days past deadline before stalemate"
        );

        // Mark cancelled — prevents double-claim
        bet.status = BetStatus.Cancelled;

        // Full refund to both parties — no fees taken
        usdc.safeTransfer(bet.creator, bet.amount);
        usdc.safeTransfer(bet.opponent, bet.amount);

        emit StalemateClaimed(_betId, bet.amount);
    }

    // ============================================================
    //  Owner Functions
    // ============================================================

    /**
     * @notice Update treasury wallet
     */
    function setTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "FriendBet: zero address");
        emit TreasuryUpdated(treasuryAddress, _newTreasury);
        treasuryAddress = _newTreasury;
    }

    /**
     * @notice Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Resume after pause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============================================================
    //  View Functions
    // ============================================================

    /**
     * @notice Get full bet details
     */
    function getBet(uint256 _betId) external view returns (Bet memory) {
        return bets[_betId];
    }

    /**
     * @notice Get all bet IDs created by an address
     */
    function getBetsByCreator(address _creator) external view returns (uint256[] memory) {
        return betsByCreator[_creator];
    }

    /**
     * @notice Get all bet IDs where address is opponent
     */
    function getBetsByOpponent(address _opponent) external view returns (uint256[] memory) {
        return betsByOpponent[_opponent];
    }

    /**
     * @notice Get all bets involving an address (as creator or opponent)
     */
    function getBetsForUser(address _user) external view returns (uint256[] memory) {
        uint256[] memory created = betsByCreator[_user];
        uint256[] memory accepted = betsByOpponent[_user];
        uint256 total = created.length + accepted.length;
        uint256[] memory result = new uint256[](total);

        for (uint256 i = 0; i < created.length; i++) {
            result[i] = created[i];
        }
        for (uint256 i = 0; i < accepted.length; i++) {
            result[created.length + i] = accepted[i];
        }
        return result;
    }
}
