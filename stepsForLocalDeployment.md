Run anvil locally
Run the Anvil.s.sol script. forge script script.Anvil.s.sol --broadcast --private-key <<YOUR PRIVATE KEY>> to load up your COnfig and Constants.sol.Example output list to update below
Currency currency0 = Currency.wrap( 0x95401dc811bb5740090279Ba06cfA8fcF6113778 );
  Currency currency1 = Currency.wrap( 0x998abeb3E57409262aE5b751f60747921B33613E );
  Pool initialized
  Liquidity added
  
   Susanoo ecosystem deployed successfully!
  
  Update Config.sol with these addresses:
  PoolManager poolManager = IPoolManager( 0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB );
  IHooks hookContract = IHooks( 0x303C5560eb3229fe2b73f920513aDAAaba1a90c0 );
  IPositionManager posm = IPositionManager( 0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9 );
  
  Router addresses for scripts:
  PoolSwapTest swapRouter = PoolSwapTest( 0x851356ae760d987E095750cCeb3bC6014560891C );

  Deploy to testnet
  Run the TestnetDeploy.s.sol Script. forge script script/TestnetDeploy.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast. Save your neccessary changes to your Config File
