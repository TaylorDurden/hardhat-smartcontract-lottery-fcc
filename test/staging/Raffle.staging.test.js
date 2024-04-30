const { assert, expect } = require("chai");
require("@nomicfoundation/hardhat-chai-matchers");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", function () {
      let raffle, raffleEntranceFee, deployer;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        raffle = await ethers.getContract("Raffle", deployer);
        console.log(`raffle address: ${await raffle.getAddress()}`);
        raffleEntranceFee = await raffle.getEntranceFee();
      });

      describe("fulfillRandomWords", () => {
        it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async () => {
          // enter the raffle
          console.log("Setting up test...");
          const startingTimestamp = await raffle.getLastestTimestamp();
          const accounts = await ethers.getSigners();
          let winnerStartingBalance;
          console.log("Setting up Listener...");
          await new Promise(async (resolve, reject) => {
            // setup listener before we enter the raffle
            // Just in case the blockchain moves REALLY fast
            raffle.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!");
              try {
                // add our asserts here
                const winner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const winnerBalance = await ethers.provider.getBalance(
                  accounts[0].address,
                );
                const endingTimestamp = await raffle.getLastestTimestamp();
                await expect(raffle.getPlayer(0)).to.be.reverted;
                assert.equal(winner.toString(), accounts[0].address);
                assert.equal(raffleState, 0);
                assert.equal(
                  winnerBalance.toString(),
                  (
                    winnerStartingBalance +
                    (await ethers.toBigInt(raffleEntranceFee))
                  ).toString(),
                );
                assert(endingTimestamp > startingTimestamp);
                resolve();
              } catch (e) {
                console.error(e);
                reject(e);
              }
            });
            // Then enter the raffle fee
            console.log("Entering Raffle...");
            const tx = await raffle.enterRaffle({ value: raffleEntranceFee });
            await tx.wait(1);
            console.log("Ok, time to wait...");
            winnerStartingBalance = await ethers.provider.getBalance(
              accounts[0].address,
            );
            console.log(
              `winnerStartingBalance: ${winnerStartingBalance.toString()}`,
            );
          });
        });
      });
    });
