# Defender meta-transaction relayer proof-of-concept

:warning: **Go to the [Defender meta-tx workshop](https://github.com/OpenZeppelin/workshops) for a more up-to-date implementation of meta-txs using Defender Relayer and Autotasks!** :warning:

Proof of concept for relaying meta transactions using a Defender Relayer via a GSNv2-compatible Trusted Forwarder.

> Disclaimer: this is set up as a proof of concept. The code is experimental and has not been reviewed, much less audited. It is intended just for demo purposes. GSNv2 contracts have been copied from the [opengsn/forwarder](https://github.com/opengsn/forwarder) repository.

This repo is structured as follows:
- `contracts`: GSNv2 contracts for `TrustedForwarder` and `BaseRelayRecipient`, as well as a test `Boxes` contract that acts as relay recipient.
- `scripts`: Buidler script for deploying both contracts.
- `app`: Simple react-app that uses metamask for signing transaction requests, and pushes them to the server to be relayed.
- `functions`: Lambda function that acts as server, receiving the signed transaction request and pushing it on-chain using a Defender Relayer.
- `server`: Quick and dirty express.js wrapper around the lambda function, used for local development.

## Contract setup

The example `Boxes` contract extends from `BaseRelayRecipient`, and uses `_msgSender()` instead of `msg.sender` to retrieve the meta-tx signer, instead of the relayer. The contract is initialized with the `TrustedForwarder` address to trust.

```solidity
contract Boxes is BaseRelayRecipient {
  constructor(address _trustedForwarder) public {
    trustedForwarder = _trustedForwarder;
  }

  function setValue(uint256 value) public {
    address who = _msgSender();
    values[who] = value;
  }
}
```

## Client setup

Instead of sending a transaction directly, the client instead fetches its current nonce in the `TrustedForwarder` contract uses EIP712v4 to sign the meta-tx request. This logic is in [`app/src/eth/txs.js`](./app/src/eth/txs.js). Most of the complexity is related to the signature scheme, and can easily be abstracted away.

```js
// Get nonce for current signer
const forwarder = new ethers.Contract(ForwarderAddress, ForwarderAbi, provider);
const nonce = await forwarder.getNonce(from).then(nonce => nonce.toString());

// Encode meta-tx request
const boxesInterface = new ethers.utils.Interface(BoxesAbi);
const data = boxesInterface.encodeFunctionData('setValue', [number]);
const request = { from, to: BoxesAddress, value: 0, gas: 1e6, nonce, data };
const toSign = { ...TypedData, message: request };

// Directly call the JSON RPC interface, since ethers does not support signTypedDataV4 yet
// See https://github.com/ethers-io/ethers.js/issues/830
const signature = await provider.send('eth_signTypedData_v4', [from, JSON.stringify(toSign)]);

// Send request to the server
const response = await fetch(RelayUrl, {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...request, signature })
}).then(r => r.json());
```

## Server setup

The server listens for POSTs from the client, verifies the signature and nonce are correcty by calling `verify` on the `TrustedForwarder`, and then uses the `defender-relay-client` library to send a transaction to the forwarder using a Defender Relayer. This logic is in [`functions/relay.js`](./functions/relay.js)

```js
// Unpack request
const { to, from, value, gas, nonce, data, signature } = request;

// Verify request by calling the trusted forwarder
const provider = new ethers.providers.InfuraProvider('rinkeby', process.env.APP_INFURA_KEY);
const forwarder = new ethers.Contract(ForwarderAddress, ForwarderAbi, provider);
const args = [
  { to, from, value, gas, nonce, data },
  DomainSeparator,
  TypeHash,
  SuffixData,
  signature
];
await forwarder.verify(...args);

// Send meta-tx through Defender
const relayer = new Relayer(RelayerApiKey, RelayerSecretKey);
const tx = await relayer.sendTransaction({
  speed: 'fast',
  to: ForwarderAddress,
  gasLimit: gas,
  data: forwarder.interface.encodeFunctionData('execute', args),
});
``` 

## Configuration

This repo expects a `.env` file in the project root with the following values:

```bash
# Server
APP_API_KEY
APP_SECRET_KEY
APP_FORWARDER_ADDRESS
APP_BOXES_ADDRESS
APP_INFURA_KEY

# Client app
REACT_APP_FORWARDER_ADDRESS
REACT_APP_BOXES_ADDRESS
REACT_APP_RELAY_URL

# Deployment
DEPLOY_RINKEBY_PRIVATE_KEY
DEPLOY_INFURA_KEY
```
