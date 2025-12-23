// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title CryptoVeilGame
/// @notice 10x10 encrypted grid game where players move with fully homomorphic encryption
contract CryptoVeilGame is ZamaEthereumConfig {
    uint32 private constant MIN_COORD = 1;
    uint32 private constant MAX_COORD = 10;
    uint32 private constant DIRECTION_MODULO = 4;

    // Directions after normalization: 0 = up, 1 = down, 2 = left, 3 = right
    struct Position {
        euint32 x;
        euint32 y;
    }

    mapping(address player => Position) private _positions;
    mapping(address player => bool) private _hasJoined;

    event PlayerJoined(address indexed player, euint32 x, euint32 y);
    event PlayerMoved(address indexed player, euint32 x, euint32 y);

    /// @notice Join the game and receive a random starting coordinate inside the 10x10 board.
    function joinGame() external {
        require(!_hasJoined[msg.sender], "Player already joined");

        Position memory startingPosition = Position({x: _randomCoordinate(), y: _randomCoordinate()});
        _positions[msg.sender] = startingPosition;
        _hasJoined[msg.sender] = true;

        _allowPositionAccess(msg.sender);
        emit PlayerJoined(msg.sender, startingPosition.x, startingPosition.y);
    }

    /// @notice Move in one of the four directions using an encrypted direction input.
    /// @param directionInput Encrypted direction handle (0=up, 1=down, 2=left, 3=right) before normalization
    /// @param inputProof Proof generated alongside the encrypted input
    function move(externalEuint32 directionInput, bytes calldata inputProof) external {
        require(_hasJoined[msg.sender], "Join first");

        euint32 normalizedDirection = _normalizeDirection(FHE.fromExternal(directionInput, inputProof));
        Position storage position = _positions[msg.sender];

        position.x = _updateHorizontal(position.x, normalizedDirection);
        position.y = _updateVertical(position.y, normalizedDirection);

        _allowPositionAccess(msg.sender);
        emit PlayerMoved(msg.sender, position.x, position.y);
    }

    /// @notice Get a player's encrypted position.
    /// @dev Does not rely on msg.sender to respect view method guidance.
    function getPlayerPosition(address player) external view returns (euint32, euint32) {
        require(_hasJoined[player], "Unknown player");
        Position storage position = _positions[player];
        return (position.x, position.y);
    }

    /// @notice Check whether a player has joined.
    /// @dev Does not rely on msg.sender to respect view method guidance.
    function hasJoined(address player) external view returns (bool) {
        return _hasJoined[player];
    }

    /// @notice Return board limits for clients.
    function boardLimits() external pure returns (uint32 minCoordinate, uint32 maxCoordinate) {
        return (MIN_COORD, MAX_COORD);
    }

    function _randomCoordinate() internal returns (euint32) {
        // Random number in [0, MAX_COORD-1] shifted into [1, MAX_COORD]
        euint32 sample = FHE.randEuint32();
        euint32 bounded = FHE.rem(sample, MAX_COORD);
        return FHE.add(bounded, FHE.asEuint32(MIN_COORD));
    }

    function _normalizeDirection(euint32 direction) internal returns (euint32) {
        return FHE.rem(direction, DIRECTION_MODULO);
    }

    function _updateHorizontal(euint32 current, euint32 direction) internal returns (euint32) {
        ebool moveLeft = FHE.eq(direction, FHE.asEuint32(2));
        ebool moveRight = FHE.eq(direction, FHE.asEuint32(3));
        return _applyStep(current, moveRight, moveLeft);
    }

    function _updateVertical(euint32 current, euint32 direction) internal returns (euint32) {
        ebool moveUp = FHE.eq(direction, FHE.asEuint32(0));
        ebool moveDown = FHE.eq(direction, FHE.asEuint32(1));
        return _applyStep(current, moveUp, moveDown);
    }

    function _applyStep(euint32 current, ebool increment, ebool decrement) internal returns (euint32) {
        euint32 one = FHE.asEuint32(1);
        euint32 incremented = FHE.add(current, one);
        euint32 decremented = FHE.sub(current, one);

        ebool atMin = FHE.le(current, FHE.asEuint32(MIN_COORD));
        ebool atMax = FHE.ge(current, FHE.asEuint32(MAX_COORD));

        euint32 safeIncrement = FHE.select(atMax, current, incremented);
        euint32 safeDecrement = FHE.select(atMin, current, decremented);

        euint32 afterIncrement = FHE.select(increment, safeIncrement, current);
        return FHE.select(decrement, safeDecrement, afterIncrement);
    }

    function _allowPositionAccess(address player) internal {
        Position storage position = _positions[player];
        FHE.allowThis(position.x);
        FHE.allowThis(position.y);
        FHE.allow(position.x, player);
        FHE.allow(position.y, player);
    }
}
