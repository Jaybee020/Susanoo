---
description: Reference for the Queue.sol contract used to manage FHE decryption results.
icon: layer-group
---

# Queue.sol (Decryption Queue)

`Queue` is a helper contract that manages a FIFO queue of encrypted value handles pending decryption from the Fhenix network. Each Uniswap V4 pool gets its own `Queue` instance.

## Overview

The queue bridges the gap between asynchronous FHE decryption and synchronous swap execution:

1. **afterSwap** pushes encrypted condition handles into the queue
2. **beforeSwap** reads from the front of the queue to check if decryption results are available

Under the hood, it wraps OpenZeppelin's `DoubleEndedQueue.Bytes32Deque` with type-safe conversions between `bytes32` and `euint128`.

## Functions

### push

Adds an encrypted handle to the back of the queue.

```solidity
function push(euint128 handle) external
```

Called by the Susanoo hook after computing a homomorphic condition and requesting decryption.

---

### pop

Removes and returns the element at the front of the queue.

```solidity
function pop() external returns (euint128)
```

Called after a decrypted result has been read and processed.

---

### peek

Returns the element at the front of the queue without removing it.

```solidity
function peek() external view returns (euint128)
```

Used to check the next pending decryption result before deciding whether to process it.

---

### length

Returns the number of elements currently in the queue.

```solidity
function length() external view returns (uint256)
```

---

### isEmpty

Returns whether the queue has no elements.

```solidity
function isEmpty() external view returns (bool)
```

## Internal Conversions

The queue converts between `euint128` (FHE handle type) and `bytes32` (OpenZeppelin deque storage type):

```solidity
function euintToBytes32(euint128 input) private pure returns (bytes32) {
    return bytes32(euint128.unwrap(input));
}

function bytes32ToEuint(bytes32 input) private pure returns (euint128) {
    return euint128.wrap(uint256(input));
}
```

## Usage Pattern

```
afterSwap:
  condition = _calculateExecutionCondition(order, tick, priceUp)
  FHE.decrypt(condition)    // Request async decryption
  queue.push(condition)     // Store handle for later

beforeSwap:
  while !queue.isEmpty():
    handle = queue.peek()
    (result, ready) = FHE.getDecryptResultSafe(handle)
    if !ready: break        // Stop at first un-decrypted item
    queue.pop()
    if result == 1: executeOrder(...)
```

## Deployment

Queue contracts are created automatically by the Susanoo hook when a pool is initialized (`afterInitialize`). Each pool has exactly one Queue instance, stored in the `poolDecryptionQueues` mapping.
