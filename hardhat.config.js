/** @type import('hardhat/config').HardhatUserConfig */
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;

module.exports = {
  networks: {
    hardhat: {
      chainId: 31337,
      blockConfirmations: 1,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || "",
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
      blockConfirmations: 6,
    },
  },
  solidity: "0.8.24",
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    outputFile: "gas-report.txt",
    noColors: true,
    coinmarketcap: COINMARKETCAP_API_KEY,
    token: "ETH",
  },
  mocha: {
    timeout: 500000, // 200 seconds max
    setTimeout: 500000,
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
    },
  },
};
