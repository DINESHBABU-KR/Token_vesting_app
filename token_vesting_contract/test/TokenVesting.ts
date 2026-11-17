import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

const tokenSupply = ethers.parseEther("1000000");

async function deployFixture() {
  const [owner, beneficiary, other] = await ethers.getSigners();
  const token = await ethers.deployContract("MockERC20", [
    "Mock Token",
    "MOCK",
    tokenSupply,
  ]);
  const vesting = await ethers.deployContract("TokenVesting", [
    await token.getAddress(),
    owner.address,
  ]);

  await token.approve(await vesting.getAddress(), tokenSupply);

  return { owner, beneficiary, other, token, vesting };
}

async function latestTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  if (block === null) {
    throw new Error("Latest block not found");
  }
  return block.timestamp;
}

async function mineAt(timestamp: number) {
  await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
  await ethers.provider.send("evm_mine", []);
}

describe("TokenVesting", function () {
  it("creates and indexes a funded vesting schedule", async function () {
    const { beneficiary, token, vesting } = await deployFixture();
    const start = (await latestTimestamp()) + 1000;
    const amount = ethers.parseEther("1000");
    const scheduleId = await vesting.computeScheduleIdForAddressAndIndex(
      beneficiary.address,
      0,
    );

    await expect(
      vesting.createVestingSchedule(
        beneficiary.address,
        start,
        100,
        1000,
        100,
        true,
        amount,
      ),
    )
      .to.emit(vesting, "VestingScheduleCreated")
      .withArgs(scheduleId, beneficiary.address, start, 100, 1000, 100, true, amount);

    expect(await vesting.getVestingSchedulesCount()).to.equal(1n);
    expect(await vesting.getVestingIdAtIndex(0)).to.equal(scheduleId);
    expect(await vesting.getSchedulesByBeneficiary(beneficiary.address)).to.deep.equal([
      scheduleId,
    ]);
    expect(await vesting.getVestingSchedulesTotalAmount()).to.equal(amount);
    expect(await vesting.getWithdrawableAmount()).to.equal(0n);
    expect(await token.balanceOf(await vesting.getAddress())).to.equal(amount);
  });

  it("rejects invalid schedules", async function () {
    const { beneficiary, vesting } = await deployFixture();
    const start = (await latestTimestamp()) + 1000;
    const amount = ethers.parseEther("100");

    await expect(
      vesting.createVestingSchedule(
        ethers.ZeroAddress,
        start,
        0,
        1000,
        100,
        false,
        amount,
      ),
    ).to.be.revertedWithCustomError(vesting, "ZeroAddressNotAllowed");

    await expect(
      vesting.createVestingSchedule(
        beneficiary.address,
        start,
        0,
        0,
        100,
        false,
        amount,
      ),
    ).to.be.revertedWithCustomError(vesting, "InvalidDuration");

    await expect(
      vesting.createVestingSchedule(
        beneficiary.address,
        start,
        0,
        1000,
        0,
        false,
        amount,
      ),
    ).to.be.revertedWithCustomError(vesting, "InvalidSlicePeriod");

    await expect(
      vesting.createVestingSchedule(
        beneficiary.address,
        start,
        1001,
        1000,
        100,
        false,
        amount,
      ),
    ).to.be.revertedWithCustomError(vesting, "InvalidCliff");
  });

  it("unlocks sliced tokens after the cliff and restricts releases to the beneficiary or owner", async function () {
    const { owner, beneficiary, other, vesting } = await deployFixture();
    const start = (await latestTimestamp()) + 100;
    const amount = ethers.parseEther("1000");
    const scheduleId = await vesting.computeScheduleIdForAddressAndIndex(
      beneficiary.address,
      0,
    );

    await vesting.createVestingSchedule(
      beneficiary.address,
      start,
      200,
      1000,
      100,
      false,
      amount,
    );

    await mineAt(start + 199);
    expect(await vesting.computeReleasableAmount(scheduleId)).to.equal(0n);

    await mineAt(start + 250);
    const releasable = ethers.parseEther("200");
    expect(await vesting.computeReleasableAmount(scheduleId)).to.equal(releasable);

    await expect(
      vesting.connect(other).release(scheduleId, 1n),
    ).to.be.revertedWithCustomError(vesting, "UnauthorizedCaller");

    await expect(
      vesting.connect(beneficiary).release(scheduleId, ethers.parseEther("100")),
    )
      .to.emit(vesting, "TokensReleased")
      .withArgs(scheduleId, beneficiary.address, ethers.parseEther("100"));

    await vesting.connect(owner).releaseAll(scheduleId);
    expect(await vesting.computeReleasableAmount(scheduleId)).to.equal(0n);
    expect(await vesting.getVestingSchedulesTotalAmount()).to.equal(
      amount - releasable,
    );
  });

  it("rejects releases above the currently vested amount", async function () {
    const { beneficiary, vesting } = await deployFixture();
    const start = (await latestTimestamp()) + 100;
    const scheduleId = await vesting.computeScheduleIdForAddressAndIndex(
      beneficiary.address,
      0,
    );

    await vesting.createVestingSchedule(
      beneficiary.address,
      start,
      0,
      1000,
      100,
      false,
      ethers.parseEther("1000"),
    );

    await expect(
      vesting.connect(beneficiary).release(scheduleId, 1n),
    )
      .to.be.revertedWithCustomError(vesting, "InsufficientReleasableTokens")
      .withArgs(1n, 0n);
  });

  it("refunds unvested tokens when revoking a revocable schedule", async function () {
    const { owner, beneficiary, token, vesting } = await deployFixture();
    const start = (await latestTimestamp()) + 100;
    const amount = ethers.parseEther("1000");
    const vestedAmount = ethers.parseEther("400");
    const scheduleId = await vesting.computeScheduleIdForAddressAndIndex(
      beneficiary.address,
      0,
    );

    await vesting.createVestingSchedule(
      beneficiary.address,
      start,
      0,
      1000,
      100,
      true,
      amount,
    );
    await mineAt(start + 400);

    await expect(vesting.revoke(scheduleId))
      .to.emit(vesting, "VestingScheduleRevoked")
      .withArgs(
        scheduleId,
        beneficiary.address,
        amount - vestedAmount,
        vestedAmount,
      );

    const schedule = await vesting.getVestingSchedule(scheduleId);
    expect(schedule.revoked).to.equal(true);
    expect(schedule.amountTotal).to.equal(vestedAmount);
    expect(await vesting.getVestingSchedulesTotalAmount()).to.equal(vestedAmount);
    expect(await token.balanceOf(owner.address)).to.equal(
      tokenSupply - vestedAmount,
    );
    await expect(vesting.revoke(scheduleId)).to.be.revertedWithCustomError(
      vesting,
      "ScheduleAlreadyRevoked",
    );
  });

  it("enforces owner-only controls and pauses schedule creation", async function () {
    const { owner, beneficiary, other, vesting } = await deployFixture();
    const start = (await latestTimestamp()) + 1000;
    const amount = ethers.parseEther("100");

    await expect(vesting.connect(other).pause()).to.be.revertedWithCustomError(
      vesting,
      "OwnableUnauthorizedAccount",
    );

    await vesting.connect(owner).pause();
    await expect(
      vesting.createVestingSchedule(
        beneficiary.address,
        start,
        0,
        1000,
        100,
        false,
        amount,
      ),
    ).to.be.revertedWithCustomError(vesting, "EnforcedPause");

    await vesting.connect(owner).unpause();
    await vesting.createVestingSchedule(
      beneficiary.address,
      start,
      0,
      1000,
      100,
      false,
      amount,
    );
    expect(await vesting.getVestingSchedulesCount()).to.equal(1n);
  });

  it("allows withdrawing only surplus vesting tokens and recovering foreign tokens", async function () {
    const { owner, beneficiary, token, vesting } = await deployFixture();
    const amount = ethers.parseEther("500");
    const surplus = ethers.parseEther("200");
    const withdrawAmount = ethers.parseEther("150");
    const start = (await latestTimestamp()) + 1000;

    await vesting.createVestingSchedule(
      beneficiary.address,
      start,
      0,
      1000,
      100,
      false,
      amount,
    );
    await token.transfer(await vesting.getAddress(), surplus);

    await expect(vesting.withdrawSurplus(withdrawAmount))
      .to.emit(vesting, "ExcessTokensWithdrawn")
      .withArgs(owner.address, withdrawAmount);
    expect(await vesting.getWithdrawableAmount()).to.equal(
      surplus - withdrawAmount,
    );
    await expect(
      vesting.withdrawSurplus(surplus),
    ).to.be.revertedWithCustomError(vesting, "InsufficientUnallocatedTokens");

    const foreignToken = await ethers.deployContract("MockERC20", [
      "Foreign Token",
      "FOREIGN",
      ethers.parseEther("10"),
    ]);
    const foreignAmount = ethers.parseEther("5");
    await foreignToken.transfer(await vesting.getAddress(), foreignAmount);

    await expect(
      vesting.recoverForeignERC20(
        await foreignToken.getAddress(),
        foreignAmount,
      ),
    )
      .to.emit(vesting, "ForeignTokenRecovered")
      .withArgs(await foreignToken.getAddress(), owner.address, foreignAmount);
    expect(await foreignToken.balanceOf(owner.address)).to.equal(
      ethers.parseEther("10"),
    );
  });
});
