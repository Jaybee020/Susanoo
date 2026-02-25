export const susanooAbi = [
  {
    type: "event",
    name: "OrderPlaced",
    inputs: [
      { name: "orderId", type: "uint256", indexed: false },
      { name: "trader", type: "address", indexed: true },
      { name: "triggerTick", type: "uint256", indexed: false },
      { name: "zeroForOne", type: "bool", indexed: false },
      { name: "orderType", type: "uint256", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "keyId", type: "bytes32", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OrderEdited",
    inputs: [
      { name: "orderId", type: "uint256", indexed: false },
      { name: "trader", type: "address", indexed: true },
      { name: "newTriggerTick", type: "uint256", indexed: false },
      { name: "newAmount", type: "uint256", indexed: false },
      { name: "keyId", type: "bytes32", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OrderExecuted",
    inputs: [
      { name: "orderId", type: "uint256", indexed: false },
      { name: "trader", type: "address", indexed: true },
      { name: "executedTick", type: "int24", indexed: false },
      { name: "keyId", type: "bytes32", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OrderCancelled",
    inputs: [
      { name: "orderId", type: "uint256", indexed: false },
      { name: "trader", type: "address", indexed: true },
      { name: "keyId", type: "bytes32", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DecryptionRequested",
    inputs: [
      { name: "orderId", type: "uint256", indexed: false },
      { name: "conditionHandle", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;
