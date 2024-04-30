import { ConnectButton } from "@web3uikit/web3";

export default function Header() {
  return (
    <div className="flex justify-between px-8 py-4 border-b-4">
      <div className="text-4xl text-violet-500 font-bold">
        Smart Contract Lottery
      </div>
      <ConnectButton moralisAuth={false} />
    </div>
  );
}
