const { ethers, network } = require("hardhat");
const fs = require("fs");

const FRONTEND_ADDRESS_FILE = "frontend/my-app/constants/contractAddress.json";
const FRONTEND_ABI_FILE = "frontend/my-app/constants/abi.json";

module.exports = async () => {
  if (process.env.UPDATE_FRONTEND) {
    console.log("Updating frontend...");
    await updateContractAddress();
    await updateABI();
  }
};

async function updateABI() {
  const raffle = await ethers.getContract("Raffle");
  fs.writeFileSync(FRONTEND_ABI_FILE, raffle.interface.formatJson());
}

async function updateContractAddress() {
  const raffle = await ethers.getContract("Raffle");
  const raffleAddress = await raffle.getAddress();
  const currentAddresses = JSON.parse(
    fs.readFileSync(FRONTEND_ADDRESS_FILE, "utf-8"),
  );
  const chainId = network.config.chainId;
  if (chainId in currentAddresses) {
    if (!currentAddresses[chainId].includes(raffleAddress)) {
      currentAddresses[chainId].push(raffleAddress);
    }
  } else {
    currentAddresses[chainId] = [raffleAddress];
  }
  fs.writeFileSync(FRONTEND_ADDRESS_FILE, JSON.stringify(currentAddresses));
}

module.exports.tags = ["all", "frontend"];
