import { useWeb3Contract, useMoralis } from "react-moralis";
import { useNotification } from "@web3uikit/core";
import { formatEther, formatUnits } from "ethers/lib/utils";
import { contractAddresses, abi, ContractAddressesType } from "../../constants";
import { useEffect, useState } from "react";

export default function LotteryEntrance() {
  const zeroStr = "0";
  const [entranceFee, setEntranceFee] = useState<string>();
  const [entranceFeeDisplay, setEntranceFeeDisplay] = useState<string>(zeroStr);
  const [numberOfPlayers, setNumberOfPlayers] = useState<string>(zeroStr);
  const [recentWinner, setRecentWinner] = useState<string>(zeroStr);
  const [raffleState, setRaffleState] = useState<string>(zeroStr);
  const [prizePool, setPrizePool] = useState(zeroStr);
  const { chainId: chainIdHex, isWeb3Enabled } = useMoralis();
  const chainId = parseInt(chainIdHex!);
  const dispatch = useNotification();
  console.log(`chainId: ${chainId}`);
  const raffleAddress =
    chainId in contractAddresses ? contractAddresses[chainId][0] : undefined;
  const {
    runContractFunction: enterRaffle,
    isFetching,
    isLoading,
  } = useWeb3Contract({
    abi: abi,
    contractAddress: raffleAddress,
    functionName: "enterRaffle",
    params: {},
    msgValue: entranceFee,
  });
  const { runContractFunction: getEntranceFee } = useWeb3Contract({
    abi: abi,
    contractAddress: raffleAddress,
    functionName: "getEntranceFee",
    params: {},
  });
  const { runContractFunction: getNumberOfPlayers } = useWeb3Contract({
    abi: abi,
    contractAddress: raffleAddress,
    functionName: "getNumberOfPlayers",
    params: {},
  });
  const { runContractFunction: getRecentWinner } = useWeb3Contract({
    abi: abi,
    contractAddress: raffleAddress,
    functionName: "getRecentWinner",
    params: {},
  });
  const { runContractFunction: getRaffleState } = useWeb3Contract({
    abi: abi,
    contractAddress: raffleAddress,
    functionName: "getRaffleState",
    params: {},
  });
  const updateUI = async () => {
    const entranceFeeFromCall = (await getEntranceFee()) as string;
    const numPlayersFromCall = (await getNumberOfPlayers()) as string;
    const recentWinnerFromCall = (await getRecentWinner()) as string;
    const raffleStateFromCall = (await getRaffleState()) as string;
    console.log(`fee: ${JSON.stringify(entranceFeeFromCall)}`);
    if (entranceFeeFromCall) {
      const ethFee = formatUnits(entranceFeeFromCall);
      setEntranceFeeDisplay(ethFee);
      setEntranceFee(entranceFeeFromCall.toString());
      setNumberOfPlayers(numPlayersFromCall.toString());
      setRecentWinner(recentWinnerFromCall.toString());
      setRaffleState(raffleStateFromCall.toString());
    }
  };

  const handleEnterRaffle = async () => {
    await enterRaffle({
      onSuccess: handleSuccess,
      onError: (err) => console.log(err),
    });
  };

  const handleSuccess = async (tx: any) => {
    await tx.wait(1);

    handleNewNotification();
    updateUI();
  };

  const handleNewNotification = () => {
    dispatch({
      type: "info",
      message: "Transaction Complete!",
      title: "Tx Notification",
      position: "topR",
    });
  };

  useEffect(() => {
    if (isWeb3Enabled) {
      updateUI();
    }
  }, [isWeb3Enabled]);
  return (
    <div className="p-4 text-xl">
      <div className="flex justify-around m-4">
        <div className="text-center shadow-md p-4 rounded-md border border-indigo-500/100 w-1/3 m-4">
          <div className="text-6xl text-indigo-700 font-bold italic">
            {entranceFeeDisplay}
          </div>
          <div className="text-3xl font-light text-indigo-700">
            entrance fee
          </div>
        </div>
        <div className="text-center shadow-md p-4 rounded-md border border-indigo-500/100 w-1/3 m-4">
          <div className="text-6xl text-indigo-700 font-bold italic">
            {formatEther(prizePool)}
          </div>
          <div className="text-3xl font-light text-indigo-700">prize pool</div>
        </div>
        <div className="text-center shadow-md p-4 rounded-md border border-indigo-500/100 w-1/3 m-4">
          <div className="text-6xl text-indigo-700 font-bold italic">
            {numberOfPlayers}
          </div>
          <div className="text-3xl font-light text-indigo-700">
            number of Players
          </div>
        </div>
      </div>
      <div>
        <div className="flex justify-around text-indigo-700">
          {recentWinner}
        </div>
        <div className="flex justify-around text-indigo-700 italic">
          recent winner
        </div>
      </div>
      <div className="flex justify-around m-4 text-indigo-700">
        The Lottery State is: {raffleState == "0" ? "On" : "Off"}{" "}
      </div>
      <div className="p-4 flex justify-center">
        <button
          onClick={handleEnterRaffle}
          disabled={isFetching || isLoading}
          className="bg-violet-500 hover:bg-violet-700 text-white p-4 rounded-md"
        >
          {isLoading || isFetching ? (
            <div className="flex">
              <div className="animate-spin spinner-border h-6 w-6 border-b-2 rounded-full"></div>
              &nbsp; Processing ...
            </div>
          ) : (
            <div>Enter Lottery</div>
          )}
        </button>
      </div>
    </div>
    // {raffleAddress ? (
    //   <div>
    //     <button onClick={handleEnterRaffle}>Enter Raffle</button>
    //     <br />
    //     Raffle Entrance Fee: {entranceFeeDisplay}
    //   </div>
    // ) : (
    //   <div>No raffle address detected...</div>
    // )}
  );
}
