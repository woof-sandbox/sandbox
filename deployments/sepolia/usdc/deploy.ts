import { Deployed, DeploymentManager } from '../../../plugins/deployment_manager';
import { DeploySpec, cloneGov, deployComet, exp, wait } from '../../../src/deploy';
import { ManagedFaucetToken, ManagedSimplePriceFeed } from '../../../build/types';

const clone = {
  wbtc: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
};

export default async function deploy(deploymentManager: DeploymentManager, deploySpec: DeploySpec): Promise<Deployed> {
  const deployed = await deployContracts(deploymentManager, deploySpec);
  await mintTokens(deploymentManager);
  return deployed;
}


async function makeToken(
  deploymentManager: DeploymentManager,
  amount: number,
  name: string,
  decimals: number,
  symbol: string
): Promise<ManagedFaucetToken> {
  const mint = (BigInt(amount) * 10n ** BigInt(decimals)).toString();
  return deploymentManager.deploy(symbol, 'test/ManagedFaucetToken.sol', [mint, name, decimals, symbol]);
}

async function makePriceFeed(
  deploymentManager: DeploymentManager,
  alias: string,
  initialPrice: number,
): Promise<ManagedSimplePriceFeed> {
  return deploymentManager.deploy(alias, 'test/ManagedSimplePriceFeed.sol', [initialPrice * 1e8, 8]);
}

async function deployContracts(deploymentManager: DeploymentManager, deploySpec: DeploySpec): Promise<Deployed> {
  const trace = deploymentManager.tracer();
  const signer = await deploymentManager.getSigner();

  // Deploy governance contracts
  // const { COMP, fauceteer } = await cloneGov(deploymentManager);
  const fauceteer = await deploymentManager.deploy('fauceteer', 'test/Fauceteer.sol', []);

  // Clone collateral assets from mainnet
  // const _WBTC = await deploymentManager.clone('WBTC', clone.wbtc, []);
  const WETH = await deploymentManager.clone('WETH', clone.weth, []);

  const USDC = await makeToken(deploymentManager, 10000000, 'USD Coin', 6, 'USDC');
  const _WBTC = await makeToken(deploymentManager, 20000000, 'Wrapped BTC', 8, 'WBTC');
  const COMP = await makeToken(deploymentManager, 20000000, 'Compound', 18, 'COMP');

  const usdcPriceFeed = await makePriceFeed(deploymentManager, 'USDC:priceFeed', 0.99999);
  const _wbtcPriceFeed = await makePriceFeed(deploymentManager, 'WBTC:priceFeed', 95_000);
  const _compPriceFeed = await makePriceFeed(deploymentManager, 'COMP:priceFeed', 55);
  const _wethPriceFeed = await makePriceFeed(deploymentManager, 'WETH:priceFeed', 2700);


  // Deploy all Comet-related contracts
  const deployed = await deployComet(deploymentManager, deploySpec, {
    baseToken: USDC.address,
    baseTokenPriceFeed: usdcPriceFeed.address
  });
  const { rewards } = deployed;

  // Deploy Bulker
  const bulker = await deploymentManager.deploy(
    'bulker',
    'bulkers/BaseBulker.sol',
    [signer.address, WETH.address]
  );

  await deploymentManager.idempotent(
    async () => (await COMP.balanceOf(rewards.address)).eq(0),
    async () => {
      trace(`Sending some COMP to CometRewards`);
      const amount = exp(1_000_000, 18);
      trace(await wait(COMP.connect(signer).transfer(rewards.address, amount)));
      trace(`COMP.balanceOf(${rewards.address}): ${await COMP.balanceOf(rewards.address)}`);
      trace(`COMP.balanceOf(${signer.address}): ${await COMP.balanceOf(signer.address)}`);
    }
  );

  return { ...deployed, fauceteer, bulker };
}

async function mintTokens(deploymentManager: DeploymentManager) {
  const trace = deploymentManager.tracer();
  const signer = await deploymentManager.getSigner();
  // const contracts = await deploymentManager.contracts();
  // const fauceteer = contracts.get('fauceteer');

  trace(`Attempting to mint as ${signer.address}...`);

  const {
    WETH,
    fauceteer,
    WBTC,
  } = await deploymentManager.getContracts();
  await deploymentManager.idempotent(
    async () => (await WETH.balanceOf(signer.address)).lt(exp(0.01, 18)),
    async () => {
      trace(`Minting 0.01 WETH for signer (this is a precious resource!)`);
      trace(await wait(WETH.connect(signer).deposit({ value: exp(0.01, 18) })));
      trace(`WETH.balanceOf(${signer.address}): ${await WETH.balanceOf(signer.address)}`);
    }
  );

  // const WBTC = contracts.get('WBTC');
  await deploymentManager.idempotent(
    async () => (await WBTC.balanceOf(fauceteer.address)).eq(0),
    async () => {
      trace(`Minting 20 WBTC to fauceteer`);
      const amount = exp(20, await WBTC.decimals());
      trace(await wait(WBTC.connect(signer).allocateTo(fauceteer.address, amount)));
      trace(`WBTC.balanceOf(${fauceteer.address}): ${await WBTC.balanceOf(fauceteer.address)}`);
    }
  );
}