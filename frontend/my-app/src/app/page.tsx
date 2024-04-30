"use client";

import { MoralisProvider } from "react-moralis";
import { NotificationProvider } from "@web3uikit/core";
import Header from "../components/Header";
import LotteryEntrance from "../components/LotteryEntrance";

export default function Home() {
  return (
    <MoralisProvider initializeOnMount={false}>
      <NotificationProvider>
        <main className="bg-violet-100 min-h-screen">
          <Header />
          <LotteryEntrance />
        </main>
      </NotificationProvider>
    </MoralisProvider>
  );
}
