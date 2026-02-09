---
description: Clone, install, and build the Susanoo project.
icon: download
---

# Installation

## Clone the Repository

```bash
git clone --recursive https://github.com/your-org/susanoo.git
cd susanoo
```

{% hint style="info" %}
The `--recursive` flag is important. Susanoo uses git submodules for its dependencies (`cofhe-contracts`, `cofhe-mock-contracts`, `v4-periphery`).
{% endhint %}

If you already cloned without `--recursive`, initialize submodules manually:

```bash
git submodule update --init --recursive
```

## Install Smart Contract Dependencies

```bash
forge install
```

This pulls all Foundry-managed dependencies (Uniswap V4 core, OpenZeppelin, Solmate).

## Build the Contracts

```bash
forge build
```

You should see a successful compilation with no errors. The compiled artifacts are output to the `out/` directory.

## Install Frontend Dependencies

```bash
cd client
npm install
```

This installs the React frontend and the `cofhejs` SDK for client-side encryption.

## Verify Your Setup

Run the test suite to make sure everything is working:

```bash
# From the project root
forge test -vvv
```

{% hint style="success" %}
If all tests pass, your environment is set up correctly. You're ready for the [Quick Start](quick-start.md) guide.
{% endhint %}

## Project Structure

After installation, your directory should look like this:

```
susanoo/
  src/
    Susanoo.sol          # Main hook contract
    Queue.sol            # Decryption queue contract
    MockToken.sol        # Test ERC20 token
  script/
    Anvil.s.sol          # Full local deployment script
    TestnetDeploy.s.sol  # Testnet deployment script
    01-08_*.s.sol        # Individual deployment steps
    base/
      Config.sol         # Deployment configuration
      Constants.sol      # Shared constants
  test/
    Susanoo.t.sol        # FHE-enabled test suite
  client/
    src/
      services/          # cofhe.js integration, order management
      components/        # React UI components
      utils/             # Constants, helpers, ABIs
  lib/                   # Git submodules (v4-periphery, cofhe-contracts, etc.)
```
