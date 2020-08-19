require('dotenv').config();

usePlugin("@nomiclabs/buidler-waffle");
usePlugin("@nomiclabs/buidler-ethers");

task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();
  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://buidler.dev/config/ to learn more
module.exports = {
  defaultNetwork: 'buidlerevm',
  solc: {
    version: "0.6.12",
  },
  networks: {
    buidlerevm: {
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.DEPLOY_INFURA_KEY || ''}`,
      accounts: process.env.DEPLOY_RINKEBY_PRIVATE_KEY ? [process.env.DEPLOY_RINKEBY_PRIVATE_KEY] : []
    }
  }
};
