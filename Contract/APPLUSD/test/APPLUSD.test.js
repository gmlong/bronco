const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("APPLUSD项目测试", function () {
  let testUSDT, priceOracle, applusd;
  let owner, user1, user2;
  let usdtAddress, oracleAddress, applusdAddress;

  before(async function () {
    // 获取测试账户
    [owner, user1, user2] = await ethers.getSigners();
    
    console.log("测试账户:");
    console.log("Owner:", owner.address);
    console.log("User1:", user1.address);
    console.log("User2:", user2.address);
  });

  describe("合约部署", function () {
    it("应该成功部署所有合约", async function () {
      // 部署TestUSDT
      const TestUSDT = await ethers.getContractFactory("TestUSDT");
      testUSDT = await TestUSDT.deploy();
      await testUSDT.waitForDeployment();
      usdtAddress = await testUSDT.getAddress();

      // 部署PriceOracle
      const PriceOracle = await ethers.getContractFactory("PriceOracle");
      priceOracle = await PriceOracle.deploy();
      await priceOracle.waitForDeployment();
      oracleAddress = await priceOracle.getAddress();

      // 部署可升级APPLUSD
      const APPLUSD = await ethers.getContractFactory("APPLUSD");
      applusd = await upgrades.deployProxy(
        APPLUSD,
        [usdtAddress, oracleAddress],
        { initializer: 'initialize' }
      );
      await applusd.waitForDeployment();
      applusdAddress = await applusd.getAddress();

      expect(usdtAddress).to.not.equal(ethers.ZeroAddress);
      expect(oracleAddress).to.not.equal(ethers.ZeroAddress);
      expect(applusdAddress).to.not.equal(ethers.ZeroAddress);

      console.log("✅ 所有合约部署成功");
      console.log("TestUSDT:", usdtAddress);
      console.log("PriceOracle:", oracleAddress);
      console.log("APPLUSD:", applusdAddress);
    });
  });

  describe("TestUSDT合约测试", function () {
    it("应该具有正确的基本信息", async function () {
      expect(await testUSDT.name()).to.equal("Test USDT");
      expect(await testUSDT.symbol()).to.equal("TUSDT");
      expect(await testUSDT.decimals()).to.equal(6);
    });

    it("任何人都应该能够mint代币", async function () {
      const mintAmount = ethers.parseUnits("1000", 6); // 1000 USDT
      
      await testUSDT.connect(user1).mint(user1.address, mintAmount);
      expect(await testUSDT.balanceOf(user1.address)).to.equal(mintAmount);

      await testUSDT.connect(user2).mintTokens(user2.address, 500); // 500 USDT
      expect(await testUSDT.balanceOf(user2.address)).to.equal(ethers.parseUnits("500", 6));
      
      console.log("✅ USDT mint功能正常");
    });
  });

  describe("PriceOracle合约测试", function () {
    it("应该具有正确的初始价格", async function () {
      const price = await priceOracle.getAPPLPriceInUSDT();
      const expectedPrice = 260n * 10n**6n; // 260 USDT with 6 decimals
      expect(price).to.equal(expectedPrice);
      
      console.log("✅ 初始价格设置正确: 1 APPL = 260 USDT");
    });

    it("应该正确计算兑换数量", async function () {
      // 测试USDT换APPL
      const usdtAmount = ethers.parseUnits("260", 6); // 260 USDT
      const applAmount = await priceOracle.getAPPLAmountForUSDT(usdtAmount);
      expect(applAmount).to.equal(ethers.parseUnits("1", 18)); // 应该得到1 APPL

      // 测试APPL换USDT
      const applInput = ethers.parseUnits("2", 18); // 2 APPL
      const usdtOutput = await priceOracle.getUSDTAmountForAPPL(applInput);
      expect(usdtOutput).to.equal(ethers.parseUnits("520", 6)); // 应该得到520 USDT

      console.log("✅ 价格计算功能正常");
    });

    it("只有所有者能够更新价格", async function () {
      const newPrice = 300n * 10n**6n; // 300 USDT
      
      // 非所有者尝试更新应该失败
      await expect(
        priceOracle.connect(user1).updatePrice(newPrice)
      ).to.be.revertedWithCustomError(priceOracle, "OwnableUnauthorizedAccount");

      // 所有者更新应该成功
      await priceOracle.connect(owner).updatePrice(newPrice);
      expect(await priceOracle.getAPPLPriceInUSDT()).to.equal(newPrice);

      // 恢复原价格
      await priceOracle.connect(owner).updatePrice(260n * 10n**6n);
      
      console.log("✅ 价格更新权限控制正常");
    });
  });

  describe("APPLUSD合约测试", function () {
    beforeEach(async function () {
      // 给用户mint一些USDT用于测试
      await testUSDT.mint(user1.address, ethers.parseUnits("10000", 6)); // 10000 USDT
      await testUSDT.mint(user2.address, ethers.parseUnits("5000", 6)); // 5000 USDT
    });

    it("应该具有正确的基本信息", async function () {
      expect(await applusd.name()).to.equal("Apple USD");
      expect(await applusd.symbol()).to.equal("APPLUSD");
      expect(await applusd.decimals()).to.equal(18);
      expect(await applusd.usdtToken()).to.equal(usdtAddress);
      expect(await applusd.priceOracle()).to.equal(oracleAddress);
      
      console.log("✅ APPLUSD基本信息正确");
    });

    it("用户应该能够存入USDT获得APPLUSD", async function () {
      const depositAmount = ethers.parseUnits("2600", 6); // 2600 USDT
      const expectedAPPL = ethers.parseUnits("10", 18); // 应该得到10 APPL

      // 授权APPLUSD合约使用用户的USDT
      await testUSDT.connect(user1).approve(applusdAddress, depositAmount);

      // 检查预期的APPL数量
      const calculatedAPPL = await applusd.getAPPLAmountForDeposit(depositAmount);
      expect(calculatedAPPL).to.equal(expectedAPPL);

      // 执行存入
      await expect(applusd.connect(user1).deposit(depositAmount))
        .to.emit(applusd, "Deposit")
        .withArgs(user1.address, depositAmount, expectedAPPL);

      // 验证余额
      expect(await applusd.balanceOf(user1.address)).to.equal(expectedAPPL);
      expect(await testUSDT.balanceOf(applusdAddress)).to.equal(depositAmount);

      console.log("✅ 存入功能正常");
    });

    it("用户应该能够赎回APPLUSD获得USDT", async function () {
      // 先存入一些USDT获得APPLUSD
      const depositAmount = ethers.parseUnits("1300", 6); // 1300 USDT
      await testUSDT.connect(user1).approve(applusdAddress, depositAmount);
      await applusd.connect(user1).deposit(depositAmount);

      const applBalance = await applusd.balanceOf(user1.address);
      const redeemAmount = applBalance / 2n; // 赎回一半
      const expectedUSDT = await applusd.getUSDTAmountForRedeem(redeemAmount);

      // 执行赎回
      await expect(applusd.connect(user1).redeem(redeemAmount))
        .to.emit(applusd, "Redeem")
        .withArgs(user1.address, redeemAmount, expectedUSDT);

      // 验证余额变化
      expect(await applusd.balanceOf(user1.address)).to.equal(applBalance - redeemAmount);

      console.log("✅ 赎回功能正常");
    });

    it("应该正确处理边界情况", async function () {
      // 测试存入0数量
      await expect(applusd.connect(user1).deposit(0))
        .to.be.revertedWith("Amount must be greater than 0");

      // 测试赎回0数量
      await expect(applusd.connect(user1).redeem(0))
        .to.be.revertedWith("Amount must be greater than 0");

      // 测试余额不足的赎回
      const largeAmount = ethers.parseUnits("1000", 18);
      await expect(applusd.connect(user1).redeem(largeAmount))
        .to.be.revertedWith("Insufficient APPLUSD balance");

      console.log("✅ 边界情况处理正常");
    });

    it("只有所有者能够执行管理功能", async function () {
      const newUSDTAddress = user1.address; // 仅用于测试
      const newOracleAddress = user2.address; // 仅用于测试

      // 非所有者尝试更新应该失败
      await expect(
        applusd.connect(user1).updateUSDTToken(newUSDTAddress)
      ).to.be.revertedWithCustomError(applusd, "OwnableUnauthorizedAccount");

      await expect(
        applusd.connect(user1).updatePriceOracle(newOracleAddress)
      ).to.be.revertedWithCustomError(applusd, "OwnableUnauthorizedAccount");

      console.log("✅ 管理权限控制正常");
    });
  });

  describe("集成测试", function () {
    it("完整的存入和赎回流程", async function () {
      console.log("\n=== 开始集成测试 ===");

      // 给用户mint USDT
      const initialUSDT = ethers.parseUnits("5200", 6); // 5200 USDT
      await testUSDT.mint(user1.address, initialUSDT);
      
      console.log("1. 用户初始USDT余额:", ethers.formatUnits(await testUSDT.balanceOf(user1.address), 6), "USDT");

      // 用户存入USDT
      const depositAmount = ethers.parseUnits("2600", 6); // 2600 USDT
      await testUSDT.connect(user1).approve(applusdAddress, depositAmount);
      await applusd.connect(user1).deposit(depositAmount);

      const applBalance = await applusd.balanceOf(user1.address);
      console.log("2. 存入后APPLUSD余额:", ethers.formatUnits(applBalance, 18), "APPLUSD");
      console.log("3. 合约USDT余额:", ethers.formatUnits(await applusd.getUSDTBalance(), 6), "USDT");

      // 用户赎回一部分APPLUSD
      const redeemAmount = applBalance / 4n; // 赎回1/4
      await applusd.connect(user1).redeem(redeemAmount);

      console.log("4. 赎回后APPLUSD余额:", ethers.formatUnits(await applusd.balanceOf(user1.address), 18), "APPLUSD");
      console.log("5. 最终USDT余额:", ethers.formatUnits(await testUSDT.balanceOf(user1.address), 6), "USDT");

      // 验证数学计算
      const finalAPPL = await applusd.balanceOf(user1.address);
      const expectedFinalAPPL = applBalance - redeemAmount;
      expect(finalAPPL).to.equal(expectedFinalAPPL);

      console.log("✅ 集成测试通过");
    });

    it("多用户并发操作测试", async function () {
      // 获取新的用户实例（确保干净的状态）
      const [, , , user3, user4] = await ethers.getSigners();
      
      // 给两个新用户mint USDT
      await testUSDT.mint(user3.address, ethers.parseUnits("2600", 6));
      await testUSDT.mint(user4.address, ethers.parseUnits("1300", 6));

      // 两个用户同时存入
      await testUSDT.connect(user3).approve(applusdAddress, ethers.parseUnits("2600", 6));
      await testUSDT.connect(user4).approve(applusdAddress, ethers.parseUnits("1300", 6));

      await applusd.connect(user3).deposit(ethers.parseUnits("2600", 6));
      await applusd.connect(user4).deposit(ethers.parseUnits("1300", 6));

      // 验证余额
      expect(await applusd.balanceOf(user3.address)).to.equal(ethers.parseUnits("10", 18));
      expect(await applusd.balanceOf(user4.address)).to.equal(ethers.parseUnits("5", 18));

      console.log("✅ 多用户操作测试通过");
    });
  });

  describe("升级测试", function () {
    it("合约应该支持升级", async function () {
      // 获取当前实现地址
      const currentImpl = await upgrades.erc1967.getImplementationAddress(applusdAddress);
      
      // 部署新版本（这里只是演示，实际上是相同的合约）
      const APPLUSD_V2 = await ethers.getContractFactory("APPLUSD");
      const upgradedContract = await upgrades.upgradeProxy(applusdAddress, APPLUSD_V2);

      // 验证升级后的合约地址保持不变
      expect(await upgradedContract.getAddress()).to.equal(applusdAddress);
      
      // 验证状态保持不变（如果之前有存入的话）
      // 这里我们只验证配置是否保持
      expect(await upgradedContract.usdtToken()).to.equal(usdtAddress);
      expect(await upgradedContract.priceOracle()).to.equal(oracleAddress);

      console.log("✅ 合约升级测试通过");
    });
  });
}); 