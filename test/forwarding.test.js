const { expect } = require("chai");

const { TypedDataUtils, signTypedData_v4 } = require('eth-sig-util');
const { bufferToHex, privateToAddress, toBuffer } = require('ethereumjs-util');

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
]

const GenericParams = 'address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data';
const TypeName = `ForwardRequest(${GenericParams})`;
const TypeHash = ethers.utils.id(TypeName);

const TypedData = (domain) => ({
  domain: {
    name: 'Test Domain',
    version: '1',
    chainId: 31337,
    ...domain
  },
  primaryType: 'ForwardRequest',
  types: {
    EIP712Domain: EIP712DomainType,
    ForwardRequest: ForwardRequestType
  },
  message: {}
});

describe("forwarding", function() {
  it("forwards a meta transaction", async function() {
    const [signer] = await ethers.getSigners();

    const forwarder = await ethers.getContractFactory("Forwarder")
      .then(f => f.deploy())
      .then(c => c.deployed());
    // console.log(`Trusted forwarder deployed at ${forwarder.address}`);

    const boxes = await ethers.getContractFactory("Boxes")
      .then(f => f.deploy(forwarder.address))
      .then(c => c.deployed());
    // console.log(`Boxes contract deployed at ${forwarder.address}`);
    
    const randomValue = Math.floor(Math.random() * 100);
    const from = await signer.getAddress();
    const data = boxes.interface.encodeFunctionData('setValue', [randomValue]);
    const request = {
      from,
      to: boxes.address,
      value: 0,
      gas: 1e6,
      nonce: 0,
      data
    }

    // TODO: find a nicer way to get the private keys out of buidler-evm
    const senderPrivateKey = toBuffer(ethers.provider._buidlerProvider._genesisAccounts[0].privateKey);
    expect(bufferToHex(privateToAddress(senderPrivateKey))).to.eq(from.toLowerCase());

    const typedData = TypedData({ verifyingContract: forwarder.address });
    const toSign = { ... typedData, message: request };
    const signature = bufferToHex(signTypedData_v4(senderPrivateKey, { data: toSign }));
    const domainSeparator = bufferToHex(TypedDataUtils.hashStruct('EIP712Domain', typedData.domain, typedData.types));

    const receipt = await forwarder.execute(request, domainSeparator, TypeHash, '0x', signature).then(t => t.wait());
    expect(receipt.events.length).to.eq(1);
    const actualValue = await boxes.getValue(from);
    expect(actualValue.toString()).to.eq(randomValue.toString());
  });
});
