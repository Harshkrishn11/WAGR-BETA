// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DailyGame v2
 * @notice WAGR's daily trivia game. Users pay $1 USDC to answer a question.
 *         Correct answerers claim 97% of the pool equally. 3% goes to treasury.
 * @dev v2 FIX: Switched from push-payment (loop in revealAnswer) to pull-payment
 *      (claimPrize). This eliminates the gas DoS attack vector where a large
 *      number of winners could cause revealAnswer to run out of gas and lock funds.
 */
contract DailyGame is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ============================================================
    //  State Variables
    // ============================================================

    /// @notice USDC token contract (no native ETH in this contract)
    IERC20 public immutable usdc;

    /// @notice Wallet that receives the 3% platform fee
    address public treasuryAddress;

    /// @notice Fixed entry fee: 1 USDC (6 decimals)
    uint256 public constant ENTRY_FEE = 1_000_000; // 1 USDC

    /// @notice Platform fee: 3%
    uint256 public constant PLATFORM_FEE_BPS = 300; // 300 basis points = 3%

    /// @notice Current question text
    string public currentQuestion;

    /// @notice Answer options array (e.g. ["Team A", "Team B"])
    string[] public currentOptions;

    /// @notice Unix timestamp when entries close
    uint256 public deadline;

    /// @notice The correct answer index (set after deadline)
    uint8 public correctAnswerIndex;

    /// @notice Whether the answer has been revealed for this round
    bool public isRevealed;

    /// @notice Current round ID (increments each time a new question is set)
    uint256 public roundId;

    /// @notice Total USDC pool for current round
    uint256 public totalPool;

    // ── Per-round prize state (set on reveal) ──────────────────────
    /// @notice Prize per winner for each round (0 if no winners or not revealed)
    mapping(uint256 => uint256) public prizePerWinner;

    /// @notice Correct answer index for each historical round
    mapping(uint256 => uint8) public roundCorrectAnswer;

    /// @notice Whether a round has been revealed
    mapping(uint256 => bool) public roundRevealed;

    /// @notice Total pool for each historical round
    mapping(uint256 => uint256) public roundTotalPool;

    /// @notice The timestamp when the round was revealed
    mapping(uint256 => uint256) public roundRevealTime;

    /// @notice The total amount of prize claimed for a given round
    mapping(uint256 => uint256) public roundClaimedPrize;

    // ── Per-user state ─────────────────────────────────────────────
    /// @notice Tracks which address has participated this round (prevents double entry)
    mapping(uint256 => mapping(address => bool)) public hasParticipated;

    /// @notice Tracks which answer each participant chose
    mapping(uint256 => mapping(address => uint8)) public participantAnswer;

    /// @notice List of participants per answer index per round
    mapping(uint256 => mapping(uint8 => address[])) public answerParticipants;

    /// @notice Whether a user has claimed their prize for a given round
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    // ============================================================
    //  Events
    // ============================================================

    event QuestionSet(
        uint256 indexed roundId,
        string question,
        string[] options,
        uint256 deadline
    );

    event Participated(
        uint256 indexed roundId,
        address indexed player,
        uint8 answerIndex
    );

    event AnswerRevealed(
        uint256 indexed roundId,
        uint8 correctIndex,
        uint256 totalPool,
        uint256 winnerCount,
        uint256 prizePerWinner
    );

    event PrizeClaimed(
        uint256 indexed roundId,
        address indexed winner,
        uint256 amount
    );

    event TreasuryUpdated(address oldTreasury, address newTreasury);

    // ============================================================
    //  Constructor
    // ============================================================

    constructor(
        address _usdc,
        address _treasury,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_usdc != address(0), "DailyGame: zero USDC address");
        require(_treasury != address(0), "DailyGame: zero treasury address");
        usdc = IERC20(_usdc);
        treasuryAddress = _treasury;
    }

    // ============================================================
    //  Owner Functions
    // ============================================================

    /**
     * @notice Set a new daily question. Resets state for the new round.
     * @param _question   The question text
     * @param _options    Answer options (min 2, max 4)
     * @param _deadline   Unix timestamp when entries close
     */
    function setQuestion(
        string calldata _question,
        string[] calldata _options,
        uint256 _deadline
    ) external onlyOwner {
        require(_options.length >= 2 && _options.length <= 4, "DailyGame: 2-4 options required");
        require(_deadline > block.timestamp, "DailyGame: deadline must be in the future");
        require(!isActive() || isRevealed, "DailyGame: previous round not yet revealed");

        // Increment round to invalidate old mappings
        roundId++;
        currentQuestion = _question;
        currentOptions = _options;
        deadline = _deadline;
        correctAnswerIndex = 0;
        isRevealed = false;
        totalPool = 0;

        emit QuestionSet(roundId, _question, _options, _deadline);
    }

    /**
     * @notice Reveal the correct answer. Does NOT loop over winners.
     *         Fees are sent to treasury. Winners pull their prize via claimPrize().
     * @dev v2 FIX: No winner loop here — eliminates gas DoS vector.
     * @param _correctIndex  Index of the correct answer in currentOptions
     */
    function revealAnswer(uint8 _correctIndex) external onlyOwner nonReentrant {
        require(block.timestamp >= deadline, "DailyGame: round not ended yet");
        require(!isRevealed, "DailyGame: already revealed");
        require(_correctIndex < currentOptions.length, "DailyGame: invalid answer index");

        isRevealed = true;
        correctAnswerIndex = _correctIndex;

        roundRevealed[roundId] = true;
        roundCorrectAnswer[roundId] = _correctIndex;
        roundTotalPool[roundId] = totalPool;
        roundRevealTime[roundId] = block.timestamp;

        uint256 thisRoundId = roundId;
        address[] memory winners = answerParticipants[thisRoundId][_correctIndex];
        uint256 winnerCount = winners.length;

        // If no winners, send everything to treasury
        if (winnerCount == 0) {
            prizePerWinner[thisRoundId] = 0;
            usdc.safeTransfer(treasuryAddress, totalPool);
            emit AnswerRevealed(thisRoundId, _correctIndex, totalPool, 0, 0);
            return;
        }

        // Calculate fee: 3% to treasury immediately
        uint256 treasuryFee = (totalPool * PLATFORM_FEE_BPS) / 10_000;
        uint256 prizePool = totalPool - treasuryFee;
        uint256 perWinner = prizePool / winnerCount;

        // Send dust (rounding remainder) to treasury
        uint256 dust = prizePool - (perWinner * winnerCount);

        usdc.safeTransfer(treasuryAddress, treasuryFee + dust);

        // Store per-winner prize — winners claim individually via claimPrize()
        prizePerWinner[thisRoundId] = perWinner;

        emit AnswerRevealed(thisRoundId, _correctIndex, totalPool, winnerCount, perWinner);
    }

    /**
     * @notice Update the treasury wallet address
     */
    function setTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "DailyGame: zero address");
        emit TreasuryUpdated(treasuryAddress, _newTreasury);
        treasuryAddress = _newTreasury;
    }

    /**
     * @notice Emergency pause — stops all participation
     */
    function pause() external onlyOwner { _pause(); }

    /**
     * @notice Resume after emergency pause
     */
    function unpause() external onlyOwner { _unpause(); }

    /**
     * @notice Emergency withdrawal of any stuck USDC (only when paused)
     */
    function emergencyWithdraw() external onlyOwner whenPaused {
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "DailyGame: nothing to withdraw");
        usdc.safeTransfer(treasuryAddress, balance);
    }

    /**
     * @notice Sweep unclaimed prizes for a specific round after 30 days
     */
    function sweepUnclaimed(uint256 _roundId) external onlyOwner {
        require(roundRevealed[_roundId], "DailyGame: not revealed");
        require(block.timestamp >= roundRevealTime[_roundId] + 30 days, "DailyGame: too early to sweep");

        uint256 totalWinners = answerParticipants[_roundId][roundCorrectAnswer[_roundId]].length;
        uint256 totalPrize = totalWinners * prizePerWinner[_roundId];
        uint256 claimedPrize = roundClaimedPrize[_roundId];
        uint256 sweepable = totalPrize - claimedPrize;
        require(sweepable > 0, "DailyGame: nothing to sweep");

        roundClaimedPrize[_roundId] += sweepable; // prevent double sweep
        usdc.safeTransfer(treasuryAddress, sweepable);
    }

    // ============================================================
    //  User Functions
    // ============================================================

    /**
     * @notice Submit your answer and pay the $1 USDC entry fee.
     * @dev You must first approve this contract to spend 1 USDC.
     * @param _answerIndex  The index of your chosen answer
     */
    function participate(uint8 _answerIndex) external nonReentrant whenNotPaused {
        require(isActive(), "DailyGame: no active round");
        require(block.timestamp < deadline, "DailyGame: deadline passed");
        require(!hasParticipated[roundId][msg.sender], "DailyGame: already entered");
        require(_answerIndex < currentOptions.length, "DailyGame: invalid answer");

        // Mark participation before transfer (checks-effects-interactions)
        hasParticipated[roundId][msg.sender] = true;
        participantAnswer[roundId][msg.sender] = _answerIndex;
        answerParticipants[roundId][_answerIndex].push(msg.sender);
        totalPool += ENTRY_FEE;

        usdc.safeTransferFrom(msg.sender, address(this), ENTRY_FEE);

        emit Participated(roundId, msg.sender, _answerIndex);
    }

    /**
     * @notice Winners call this to pull their prize after the answer is revealed.
     * @dev v2: Pull-payment pattern — no gas DoS risk.
     * @param _roundId  The round to claim for (use roundId for current)
     */
    function claimPrize(uint256 _roundId) external nonReentrant {
        require(roundRevealed[_roundId], "DailyGame: round not revealed yet");
        require(!hasClaimed[_roundId][msg.sender], "DailyGame: already claimed");
        require(hasParticipated[_roundId][msg.sender], "DailyGame: did not participate");

        uint8 correct = roundCorrectAnswer[_roundId];
        require(participantAnswer[_roundId][msg.sender] == correct, "DailyGame: wrong answer");

        uint256 prize = prizePerWinner[_roundId];
        require(prize > 0, "DailyGame: no prize available");

        hasClaimed[_roundId][msg.sender] = true;
        roundClaimedPrize[_roundId] += prize;
        usdc.safeTransfer(msg.sender, prize);

        emit PrizeClaimed(_roundId, msg.sender, prize);
    }

    // ============================================================
    //  View Functions
    // ============================================================

    /**
     * @notice Returns true if there is an active question round
     */
    function isActive() public view returns (bool) {
        return bytes(currentQuestion).length > 0 && !isRevealed;
    }

    /**
     * @notice Get all options for the current question
     */
    function getOptions() external view returns (string[] memory) {
        return currentOptions;
    }

    /**
     * @notice Get number of participants for a specific answer in current round
     */
    function getParticipantCount(uint8 _answerIndex) external view returns (uint256) {
        return answerParticipants[roundId][_answerIndex].length;
    }

    /**
     * @notice Get total participant count across all answers
     */
    function getTotalParticipants() external view returns (uint256 total) {
        for (uint8 i = 0; i < currentOptions.length; i++) {
            total += answerParticipants[roundId][i].length;
        }
    }

    /**
     * @notice Check if a user has won a specific round and whether they've claimed
     */
    function getUserStatus(uint256 _roundId, address _user) external view returns (
        bool participated,
        bool isWinner,
        bool claimed,
        uint256 prize
    ) {
        participated = hasParticipated[_roundId][_user];
        if (participated && roundRevealed[_roundId]) {
            isWinner = participantAnswer[_roundId][_user] == roundCorrectAnswer[_roundId];
        }
        claimed = hasClaimed[_roundId][_user];
        prize = isWinner ? prizePerWinner[_roundId] : 0;
    }
}
