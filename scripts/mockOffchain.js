const { ethers, network } = require("hardhat");

async function mockKeepers() {
  console.log(`network.config.chainId: ${network.config.chainId}`);
  const raffle = await ethers.getContract("Raffle");
  console.log(`raffle.address: ${await raffle.getAddress()}`);
  const raffleAddress = await raffle.getAddress();
  const checkData = "0x";
  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall(checkData);
  console.log(`upkeepNeeded: ${upkeepNeeded}`);
  if (upkeepNeeded) {
    const vrfCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock",
    );
    await vrfCoordinatorV2Mock.addConsumer("1", raffleAddress);
    const tx = await raffle.performUpkeep(checkData);
    const txReceipt = await tx.wait(1);
    const requestId = txReceipt.logs[1].args.requestId;
    console.log(`Performed upkeep with RequestId: ${requestId}`);
    if (network.config.chainId == 31337) {
      console.log(`111network.config.chainId: ${network.config.chainId}`);
      await mockVrf(requestId, raffle);
    } else {
      await mockVrf(requestId, raffle);
    }
  } else {
    console.log("No upkeep needed!");
  }
}

async function mockVrf(requestId, raffle) {
  console.log("We on a local network? Ok let's pretend...");
  const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
  // await vrfCoordinatorV2Mock.addConsumer("1", raffle.address);
  await vrfCoordinatorV2Mock.fulfillRandomWords(
    requestId,
    await raffle.getAddress(),
  );
  console.log("Responded!");
  const recentWinner = await raffle.getRecentWinner();
  console.log(`The winner is: ${recentWinner}`);
}

mockKeepers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
