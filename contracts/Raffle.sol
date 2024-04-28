// Raffle
// Enter the lottery (paying some amount)
// Pick a random winner (verifiably random)
// Winner to be selected every X minutes -> completely automated
// Chainlink Oracle -> Randomness, Automated Execution (Chainlink Keeper)

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__LotteryNotOpen();
error Raffle__UpkeepNotNeeded(
  uint256 balance,
  uint256 playerNum,
  uint256 raffleState
);

/**
 * @title Sample Raffle Contract
 * @author Taylor Li
 * @notice This contract is for creating an untamperable decentralized smart contract
 */
contract Raffle is VRFConsumerBaseV2, AutomationCompatible {
  /* Type declarations */
  enum RaffleLotteryState {
    OPEN, // 0
    CALCULATING // 1
  }

  /* State Variables */
  uint256 private immutable i_entranceFee;
  address payable[] private s_players;
  VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
  bytes32 private immutable i_gasLane;
  uint64 private immutable i_subscriptionId;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private immutable i_callbackGasLimit;
  uint32 private constant NUM_WORDS = 1;

  /* Lottery State Variables */
  address private s_recentWinner;
  RaffleLotteryState private s_lotteryState;
  uint256 private s_lastTimeStamp;
  uint256 private immutable i_interval;

  /* Events */
  event RaffleEntered(address indexed player);
  event RequestedRaffleWinner(uint256 indexed requestId);
  event WinnerPicked(address indexed winner);

  /* Functions */
  constructor(
    address vrfCoordinatorV2, // contract
    uint256 entranceFee,
    bytes32 gasLane,
    uint64 subscriptionId,
    uint32 callbackGasLimit,
    uint256 interval
  ) VRFConsumerBaseV2(vrfCoordinatorV2) {
    i_entranceFee = entranceFee;
    i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
    i_gasLane = gasLane;
    i_subscriptionId = subscriptionId;
    i_callbackGasLimit = callbackGasLimit;
    s_lastTimeStamp = block.timestamp;
    i_interval = interval;
  }

  function enterRaffle() public payable {
    if (msg.value < i_entranceFee) {
      revert Raffle__NotEnoughETHEntered();
    }
    // can not enter raffle if the raffle not open yet
    if (s_lotteryState != RaffleLotteryState.OPEN) {
      revert Raffle__LotteryNotOpen();
    }
    s_players.push(payable(msg.sender));
    emit RaffleEntered(msg.sender);
  }

  function fulfillRandomWords(
    uint256 /*requestId*/, // a placehold for the arg, but we do not use this arg
    uint256[] memory randomWords
  ) internal virtual override {
    uint256 indexOfWinner = randomWords[0] % s_players.length;
    address payable recentWinner = s_players[indexOfWinner];
    s_recentWinner = recentWinner;
    s_lotteryState = RaffleLotteryState.OPEN;
    s_players = new address payable[](0);
    s_lastTimeStamp = block.timestamp;
    (bool success, ) = recentWinner.call{value: address(this).balance}(""); // transfer all balance to the winner...
    if (!success) {
      revert Raffle__TransferFailed();
    }
    emit WinnerPicked(recentWinner);
  }

  function performUpkeep(bytes calldata /*performData*/) external override {
    // (bool upkeepNeeded, ) = checkUpkeep("");
    // if (!upkeepNeeded) {
    //   revert Raffle__UpkeepNotNeeded(
    //     address(this).balance,
    //     s_players.length,
    //     uint256(s_lotteryState)
    //   );
    // }
    s_lotteryState = RaffleLotteryState.CALCULATING;
    uint256 requestId = i_vrfCoordinator.requestRandomWords(
      i_gasLane, // gas lane
      i_subscriptionId,
      REQUEST_CONFIRMATIONS,
      i_callbackGasLimit,
      NUM_WORDS
    );
    emit RequestedRaffleWinner(requestId);
  }

  /**
   * @dev This is the function that the Chainlink Automation(Keeper) node call
   * they look for the `upkeepNeeded` to return true.
   * The following should be true in order to return true:
   * 1. Our time interval should have passed
   * 2. The lottery should have at least 1 player, and have some ETH
   * 3. Our subscription is funded with LINK
   * 4. The lottery should be 'open' state
   */
  function checkUpkeep(
    bytes memory /*checkData*/
  ) public override returns (bool upkeepNeeded, bytes memory /*performData*/) {
    // check raffle lottery state if is open
    bool isLotteryOpen = s_lotteryState == RaffleLotteryState.OPEN;
    bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
    // check if there were player
    bool hasPlayers = s_players.length > 0;
    bool hasBalance = address(this).balance > 0;
    upkeepNeeded = (isLotteryOpen && timePassed && hasBalance && hasPlayers);
    return (upkeepNeeded, "0x0");
  }

  /* View / Pure functions */

  function getEntranceFee() public view returns (uint256) {
    return i_entranceFee;
  }

  function getPlayer(uint256 index) public view returns (address) {
    return s_players[index];
  }

  function getRecentWinner() public view returns (address) {
    return s_recentWinner;
  }

  function getRaffleState() public view returns (RaffleLotteryState) {
    return s_lotteryState;
  }

  function getNumWords() public pure returns (uint256) {
    return NUM_WORDS;
  }

  function getNumberOfPlayers() public view returns (uint256) {
    return s_players.length;
  }

  function getLastestTimestamp() public view returns (uint256) {
    return s_lastTimeStamp;
  }

  function getRequestConfirmations() public pure returns (uint256) {
    return REQUEST_CONFIRMATIONS;
  }

  function getInterval() public view returns (uint256) {
    return i_interval;
  }
}
