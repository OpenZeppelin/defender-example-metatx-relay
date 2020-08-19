import ethers from 'ethers';
import BoxesAbi from '../abis/Boxes.json';

const ZeroAddress = '0x0000000000000000000000000000000000000000';
const BoxesAddress = process.env.REACT_APP_BOXES_ADDRESS || ZeroAddress;

export async function fetch() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  if (!signer) return;
  const from = await signer.getAddress();
  const network = await provider.getNetwork();
  if (network.chainId !== 4) return;

  const forwarder = new ethers.Contract(BoxesAddress, BoxesAbi, provider);
  return forwarder.getValue(from).then(value => value.toString());
}