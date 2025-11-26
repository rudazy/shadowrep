// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title ShadowRep - Confidential On-Chain Reputation Protocol
 * @notice Privacy-preserving reputation where attestations stay encrypted forever
 * @dev Built on Zama's fhEVM for the Developer Program
 */
contract ShadowRep is ZamaEthereumConfig, Ownable {
    
    // ============ Encrypted State ============
    mapping(address => euint64) private _encryptedScores;
    mapping(address => euint64) private _attestationCounts;
    
    // ============ Public State ============
    mapping(address => bool) public isRegistered;
    mapping(address => mapping(address => bool)) public hasAttested;
    mapping(address => uint256) public lastActivityTime;
    
    uint256 public totalUsers;
    uint256 public totalAttestations;
    
    // ============ Events ============
    event UserRegistered(address indexed user, uint256 timestamp);
    event AttestationGiven(address indexed from, address indexed to, uint256 timestamp);
    // Gateway-related events (commented out due to library version incompatibility)
    // event ThresholdChecked(address indexed user, uint64 threshold);
    // event ScoreDecrypted(address indexed user, uint64 decryptedScore);
    
    // ============ Errors ============
    error AlreadyRegistered();
    error NotRegistered();
    error CannotAttestSelf();
    error AlreadyAttested();
    error InvalidScore();

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Register to start building reputation
     */
    function register() external {
        if (isRegistered[msg.sender]) revert AlreadyRegistered();
        
        isRegistered[msg.sender] = true;
        _encryptedScores[msg.sender] = FHE.asEuint64(0);
        _attestationCounts[msg.sender] = FHE.asEuint64(0);

        FHE.allowThis(_encryptedScores[msg.sender]);
        FHE.allow(_encryptedScores[msg.sender], msg.sender);
        FHE.allowThis(_attestationCounts[msg.sender]);
        FHE.allow(_attestationCounts[msg.sender], msg.sender);
        
        lastActivityTime[msg.sender] = block.timestamp;
        totalUsers++;
        
        emit UserRegistered(msg.sender, block.timestamp);
    }

    /**
     * @notice Give encrypted reputation to another user
     * @param to Recipient address
     * @param encryptedScore Encrypted score handle (1-100)
     * @param inputProof Proof for encrypted input
     */
    function giveAttestation(
        address to,
        externalEuint64 encryptedScore,
        bytes calldata inputProof
    ) external {
        if (msg.sender == to) revert CannotAttestSelf();
        if (!isRegistered[to]) revert NotRegistered();
        if (hasAttested[msg.sender][to]) revert AlreadyAttested();

        // Convert input to encrypted uint64
        euint64 score = FHE.fromExternal(encryptedScore, inputProof);

        // Clamp score between 1 and 100
        euint64 minScore = FHE.asEuint64(1);
        euint64 maxScore = FHE.asEuint64(100);

        ebool belowMin = FHE.lt(score, minScore);
        ebool aboveMax = FHE.gt(score, maxScore);

        score = FHE.select(belowMin, minScore, score);
        score = FHE.select(aboveMax, maxScore, score);

        // Add to recipient's total (homomorphic addition)
        _encryptedScores[to] = FHE.add(_encryptedScores[to], score);
        _attestationCounts[to] = FHE.add(_attestationCounts[to], FHE.asEuint64(1));

        // Update permissions
        FHE.allowThis(_encryptedScores[to]);
        FHE.allow(_encryptedScores[to], to);
        FHE.allowThis(_attestationCounts[to]);
        FHE.allow(_attestationCounts[to], to);
        
        // Mark attestation
        hasAttested[msg.sender][to] = true;
        lastActivityTime[msg.sender] = block.timestamp;
        lastActivityTime[to] = block.timestamp;
        totalAttestations++;
        
        emit AttestationGiven(msg.sender, to, block.timestamp);
    }

    /**
     * @notice Check if user meets reputation threshold (encrypted comparison)
     * @param user Address to check
     * @param threshold Minimum score required
     * @return meetsThreshold Encrypted boolean result
     */
    function checkThreshold(
        address user,
        uint64 threshold
    ) external returns (ebool meetsThreshold) {
        if (!isRegistered[user]) revert NotRegistered();
        
        euint64 encThreshold = FHE.asEuint64(threshold);
        meetsThreshold = FHE.ge(_encryptedScores[user], encThreshold);
        
        return meetsThreshold;
    }

    /**
     * @notice Get your own encrypted score (only you can decrypt)
     */
    function getMyScore() external returns (euint64) {
        if (!isRegistered[msg.sender]) revert NotRegistered();
        return _encryptedScores[msg.sender];
    }

    /**
     * @notice Get your attestation count (encrypted)
     */
    function getMyAttestationCount() external returns (euint64) {
        if (!isRegistered[msg.sender]) revert NotRegistered();
        return _attestationCounts[msg.sender];
    }

    /**
     * @notice Grant another contract permission to check your score
     * @param authorized Address to grant access
     */
    function grantAccess(address authorized) external {
        if (!isRegistered[msg.sender]) revert NotRegistered();
        FHE.allow(_encryptedScores[msg.sender], authorized);
    }

    // NOTE: Gateway functionality removed due to library version incompatibility
    // The following functions can be re-enabled when Gateway support is available
    //
    // /**
    //  * @notice Request decryption of your score via Gateway
    //  */
    // function requestMyScoreDecryption() external returns (uint256) {
    //     if (!isRegistered[msg.sender]) revert NotRegistered();
    //
    //     uint256[] memory cts = new uint256[](1);
    //     cts[0] = Gateway.toUint256(_encryptedScores[msg.sender]);
    //
    //     return Gateway.requestDecryption(
    //         cts,
    //         this.onScoreDecrypted.selector,
    //         0,
    //         block.timestamp + 100,
    //         false
    //     );
    // }
    //
    // /**
    //  * @notice Callback for score decryption
    //  */
    // function onScoreDecrypted(uint256, uint64 decryptedScore) external onlyGateway {
    //     emit ScoreDecrypted(msg.sender, decryptedScore);
    // }

    /**
     * @notice Get public profile stats
     */
    function getProfile(address user) external view returns (
        bool registered,
        uint256 lastActive
    ) {
        return (isRegistered[user], lastActivityTime[user]);
    }
}