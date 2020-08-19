const RelayerApiKey = process.env.APP_API_KEY;
const RelayerSecretKey = process.env.APP_SECRET_KEY;
const ForwarderAddress = process.env.APP_FORWARDER_ADDRESS;

const { Relayer } = require('defender-relay-client');
const { ethers } = require('ethers');
const ForwarderAbi = require('../artifacts/Forwarder.json').abi;

const { TypedDataUtils } = require('eth-sig-util');
const { bufferToHex } = require('ethereumjs-util');

const EIP712DomainType = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' }
]

const ForwardRequestType = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'gas', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'data', type: 'bytes' }
];

const TypedData = {
  domain: {
    name: 'Defender',
    version: '1',
    chainId: 4,
    verifyingContract: ForwarderAddress
  },
  primaryType: 'ForwardRequest',
  types: {
    EIP712Domain: EIP712DomainType,
    ForwardRequest: ForwardRequestType
  },
  message: {}
};

const GenericParams = 'address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data';
const TypeName = `ForwardRequest(${GenericParams})`;
const TypeHash = ethers.utils.id(TypeName);

const DomainSeparator = bufferToHex(TypedDataUtils.hashStruct('EIP712Domain', TypedData.domain, TypedData.types));
const SuffixData = '0x';

async function relay(request) {
  // Unpack request
  const { to, from, value, gas, nonce, data, signature } = request;

  // Validate request
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
  const forwardData = forwarder.interface.encodeFunctionData('execute', args);
  const relayer = new Relayer(RelayerApiKey, RelayerSecretKey);
  const tx = await relayer.sendTransaction({
    speed: 'fast',
    to: ForwarderAddress,
    gasLimit: gas,
    data: forwardData,
  });

  console.log(`Sent meta-tx: ${tx.hash}`);
  return tx;
}

// Handler for lambda function
exports.handler = async function(event, context, callback) {
  try {
    const data = JSON.parse(event.body);
    const response = await relay(data);
    callback(null, { statusCode: 200, body: JSON.stringify(response) });
  } catch (err) {
    callback(err);  
  }  
}
