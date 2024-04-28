const { ethers } = require("hardhat");

const networkConfig = {
  31337: {
    name: "hardhat",
    subscriptionId: "11499",
    entranceFee: ethers.parseEther("0.01"),
    gasLane:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    callbackGasLimit: "500000",
    interval: "20",
  },
  11155111: {
    name: "sepolia",
    // https://docs.chain.link/vrf/v2/subscription/supported-networks#sepolia-testnet
    vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
    entranceFee: ethers.parseEther("0.01"),
    gasLane:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    subscriptionId: "11499",
    callbackGasLimit: "500000",
    interval: "20",
  },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
  networkConfig,
  developmentChains,
};
