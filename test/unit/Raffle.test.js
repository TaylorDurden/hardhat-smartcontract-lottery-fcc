const { assert, expect } = require("chai");
require("@nomicfoundation/hardhat-chai-matchers");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", function () {
      let raffle,
        raffleContract,
        vrfCoordinatorV2Mock,
        raffleEntranceFee,
        deployer,
        interval,
        accounts,
        player;
      const chainId = network.config.chainId;
      beforeEach(async function () {
        accounts = await ethers.getSigners();
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer,
        );
        raffle = await ethers.getContract("Raffle", deployer);
        // raffle = raffleContract.connect(deployer);
        raffleEntranceFee = await raffle.getEntranceFee();
        interval = await raffle.getInterval();
      });

      describe("constructor", function () {
        it("initialized the raffle correctly", async function () {
          // Ideally we make our tests have just 1 assert per "it"
          const raffleState = await raffle.getRaffleState();
          const interval = await raffle.getInterval();
          assert.equal(raffleState.toString(), "0");
          assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
        });
      });

      describe("enterRaffle", function () {
        it("reverts when you don't pay enough", async () => {
          await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
            raffle,
            "Raffle__NotEnoughETHEntered",
          );
        });
        it("records players when enter", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          const playerFromContract = await raffle.getPlayer(0);
          assert.equal(playerFromContract, deployer);
        });
        it("emits event on enter entrance fee", async () => {
          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee }),
          ).to.emit(raffle, "RaffleEntered");
        });
        it("doesn't allow entrance when raffle is calculating", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            ethers.toNumber(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          // We pretend to be a Chainlink Keeper
          await raffle.performUpkeep("0x");
          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee }),
          ).to.be.revertedWithCustomError(raffle, "Raffle__LotteryNotOpen");
        });
      });

      describe("checkUpkeep", () => {
        it("returns false if people haven't sent any ETH", async () => {
          await network.provider.send("evm_increaseTime", [
            ethers.toNumber(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x"); // Simulate a tx to get the contract function return result
          assert(!upkeepNeeded);
        });
        it("returns false if raffle isn't open", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            ethers.toNumber(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await raffle.performUpkeep("0x");
          const raffleState = await raffle.getRaffleState();
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
          assert.equal(raffleState.toString(), "1");
          assert(!upkeepNeeded);
        });
        it("returns false if the time isn't passed", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            ethers.toNumber(interval) - 5,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
          assert(!upkeepNeeded);
        });
        it("returns true if enough time has passed, has palyers, eth, and is open raffle", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            ethers.toNumber(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const raffleState = await raffle.getRaffleState();
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
          assert.equal(raffleState.toString(), "0");
          assert(upkeepNeeded);
        });
      });

      describe("performUpkeep", () => {
        it("it can only run if checkUpkeep is true", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            ethers.toNumber(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const tx = await raffle.performUpkeep.staticCall("0x");
          assert(tx);
        });
        it("reverts when checkUpkeep is false", async () => {
          await expect(
            raffle.performUpkeep("0x"),
          ).to.be.revertedWithCustomError(raffle, "Raffle__UpkeepNotNeeded");
        });
        it("updates the raffle state, emits event for requestId, and calls the vrf coordinator", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            ethers.toNumber(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const txResponse = await raffle.performUpkeep("0x");
          const txReceipt = await txResponse.wait(1);
          const raffleState = await raffle.getRaffleState();
          console.log(
            `txReceipt.logs[1].args.requestId: ${JSON.stringify(ethers.toNumber(txReceipt.logs[1].args.requestId))}`,
          );
          const requestId = txReceipt.logs[1].args.requestId;
          assert(ethers.toNumber(requestId) > 0);
          assert(raffleState == 1);
        });
      });

      describe("fulfillRandomWords", () => {
        beforeEach(async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            ethers.toNumber(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
        });

        it("can only be called after performUpkeep", async () => {
          const raffleAddress = await raffle.getAddress();
          console.log(`raffleAddress: ${raffleAddress}`);
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, raffleAddress),
          ).to.be.revertedWith("nonexistent request");
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, raffleAddress),
          ).to.be.revertedWith("nonexistent request");
        });
        it("picks a winner, resets the lottery, and sends money to the winner", async () => {
          let winnerStartingBalance;
          const additionalEntrants = 3;
          const startingAccountIndex = 1; // deployer = 0
          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + additionalEntrants;
            i++
          ) {
            const accountConnectedRaffle = raffle.connect(accounts[i]);
            await accountConnectedRaffle.enterRaffle({
              value: raffleEntranceFee,
            });
          }
          const startingTimestamp = await raffle.getLastestTimestamp();

          // performUpkeep (mock being Chainlink Keepers)
          // fulfillRandomWords (mock being the Chainlink VRF)
          // We will have to wait for the fulfillRandomWords to be called
          await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
              console.log("Found the event!");
              try {
                // Now lets get the ending values...
                const recentWinner = await raffle.getRecentWinner();
                console.log(`recentWinner: ${recentWinner}`);
                console.log(`accounts[0]: ${accounts[0].address}`);
                console.log(`accounts[1]: ${accounts[1].address}`);
                console.log(`accounts[2]: ${accounts[2].address}`);
                console.log(`accounts[3]: ${accounts[3].address}`);
                const raffleState = await raffle.getRaffleState();
                const winnerBalance = await ethers.provider.getBalance(
                  accounts[1].address,
                );
                console.log(`winnerBalance: ${winnerBalance}`);
                const endingTimeStamp = await raffle.getLastestTimestamp();
                const numPlayers = await raffle.getNumberOfPlayers();
                await expect(raffle.getPlayer(0)).to.be.reverted;
                assert.equal(recentWinner.toString(), accounts[1].address);
                assert.equal(numPlayers.toString(), "0");
                assert.equal(raffleState, 0);
                assert.equal(
                  winnerBalance.toString(),
                  (
                    winnerStartingBalance +
                    raffleEntranceFee +
                    raffleEntranceFee *
                      (await ethers.toBigInt(additionalEntrants))
                  ).toString(),
                );
                assert(endingTimeStamp > startingTimestamp);
              } catch (e) {
                reject(e); // reject the error if reach the 200s timeout
              }
              resolve();
            });
            // Setting up the listener
            // below, we will fire the event, and the listener will pick it up, and resolve
            try {
              const tx = await raffle.performUpkeep("0x");
              const txReceipt = await tx.wait(1);
              const requestId = txReceipt.logs[1].args.requestId;
              const raffleAddress = await raffle.getAddress();

              winnerStartingBalance = await ethers.provider.getBalance(
                accounts[1].address,
              );
              console.log(`winnerStartingBalance: ${winnerStartingBalance}`);
              await vrfCoordinatorV2Mock.fulfillRandomWords(
                requestId,
                raffleAddress,
              );
            } catch (e) {
              reject(e);
            }
          });
        });
      });
    });
