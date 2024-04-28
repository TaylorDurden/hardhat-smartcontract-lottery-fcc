const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

const VRF_SUB_FUND_AMOUNT = ethers.parseEther("2");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock;
  console.log(`network.name: ${network.name}`);
  if (developmentChains.includes(network.name)) {
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Address = await vrfCoordinatorV2Mock.getAddress();

    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait(1);
    subscriptionId = transactionReceipt.logs[0].args.subId;
    console.log(`subscriptionId: ${subscriptionId}`);
    // Fund the subscription
    // Usually, you'd need the link token on a real network
    await vrfCoordinatorV2Mock.fundSubscription(
      subscriptionId,
      VRF_SUB_FUND_AMOUNT,
    );
    console.log(`VRF_SUB_FUND_AMOUNT: ${VRF_SUB_FUND_AMOUNT}`);
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
    console.log(`vrfCoordinatorV2Address: ${vrfCoordinatorV2Address}`);
    console.log(`subscriptionId: ${subscriptionId}`);
  }
  const entraceFee = networkConfig[chainId]["entranceFee"];
  const gasLane = networkConfig[chainId]["gasLane"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
  const interval = networkConfig[chainId]["interval"];
  const args = [
    vrfCoordinatorV2Address,
    entraceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ];
  console.log(`args: ${args}`);
  const raffle = await deploy("Raffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  // await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying...");
    await verify(raffle.address, args);
  }
  log("------------------------");
};

module.exports.tags = ["all", "raffle"];
