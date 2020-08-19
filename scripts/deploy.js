async function main() {
  const forwarder = await ethers.getContractFactory("Forwarder")
    .then(f => f.deploy())
    .then(c => c.deployed());
  console.log(`Trusted forwarder deployed at ${forwarder.address}`);

  const boxes = await ethers.getContractFactory("Boxes")
    .then(f => f.deploy(forwarder.address))
    .then(c => c.deployed());
  console.log(`Boxes contract deployed at ${boxes.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
