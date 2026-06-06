import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const PREDICTION_MARKET_ADDRESS = "0x738856039fC3Ab086FFA3Ab478cDebA21A130c4b";
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  const [deployer] = await ethers.getSigners();
  console.log("Seeding with wallet:", deployer.address);

  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  const wagr = await ethers.getContractAt("WagrPredictionMarket", PREDICTION_MARKET_ADDRESS);

  const balance = await usdc.balanceOf(deployer.address);
  console.log("USDC Balance:", ethers.formatUnits(balance, 6));

  const totalSeedRequired = ethers.parseUnits("30", 6); // 3 markets * 10 USDC

  if (balance < totalSeedRequired) {
    console.error("Not enough USDC to seed markets. Please get some faucet USDC on Base Sepolia.");
    return;
  }

  console.log("Approving USDC...");
  const tx0 = await usdc.approve(PREDICTION_MARKET_ADDRESS, totalSeedRequired);
  await tx0.wait();
  console.log("Approved.");

  const now = Math.floor(Date.now() / 1000);

  const marketsToCreate = [
    {
      question: "Will Bitcoin hit $100k by the end of 2026?",
      category: "Crypto",
      options: ["Yes", "No"],
      deadline: now + 86400 * 30, // 30 days
      seedOption: 0,
      seedAmount: ethers.parseUnits("10", 6)
    },
    {
      question: "Who will win the next US Presidential Election?",
      category: "Politics",
      options: ["Donald Trump", "Kamala Harris", "Other"],
      deadline: now + 86400 * 14, // 14 days
      seedOption: 0,
      seedAmount: ethers.parseUnits("10", 6)
    },
    {
      question: "Will Apple release a foldable iPhone in 2026?",
      category: "Tech",
      options: ["Yes", "No"],
      deadline: now + 86400 * 60, // 60 days
      seedOption: 1,
      seedAmount: ethers.parseUnits("10", 6)
    }
  ];

  for (let i = 0; i < marketsToCreate.length; i++) {
    const m = marketsToCreate[i];
    console.log(`Creating market: ${m.question}`);
    try {
      const tx = await wagr.createMarket(m.question, m.category, m.options, m.deadline, m.seedOption, m.seedAmount);
      await tx.wait();
      console.log(`Market ${i} created!`);
    } catch(e) {
      console.error(`Failed to create market ${i}:`, e);
    }
  }

  console.log("Seeding complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
