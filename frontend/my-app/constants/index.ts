import contractAddress from "./contractAddress.json";
import abi from "./abi.json";
export type ContractAddressesType = Record<string, string[]>;
const contractAddresses: ContractAddressesType = contractAddress;
export { contractAddresses, abi };
