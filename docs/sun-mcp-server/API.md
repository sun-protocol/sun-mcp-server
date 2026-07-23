# API Reference

> Generated from the runtime tool definitions by `npm run docs:tools`; do not edit manually.

This catalog contains 23 OpenAPI-generated tools and 18 custom SUNSWAP tools.

## OpenAPI-Generated Tools

Source of truth: `specs/sunio-open-api.json`. Risk annotations are derived from the HTTP method.

### scanTransactions

Scan transactions

- Endpoint: `GET /apiv2/transactions/scan`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `protocol` | query | no | Protocol to filter: V1, V1_5, V2, V3, V4, CURVE, ALL |
| `tokenAddress` | query | no | Token address to filter, can not be used with poolAddress |
| `poolAddress` | query | no | Comma-separated pool address to filter, can not be used with tokenAddress |
| `type` | query | no | Transaction type to filter: add, withdraw, swap |
| `startTime` | query | no | Start time (format: yyyy-MM-dd HH:mm:ss or yyyy-MM-dd) |
| `endTime` | query | no | End time (format: yyyy-MM-dd HH:mm:ss or yyyy-MM-dd) |
| `pageSize` | query | no | Page size; default: 10 |
| `offset` | query | no | Pagination offset from previous response |

### getTokens

Fetches a list of tokens based on token address or protocol.

- Endpoint: `GET /apiv2/tokens`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `tokenAddress` | query | no | Comma-separated token addresses |
| `protocol` | query | no | Protocol: V1, V1_5, V2, V3, V4, CURVE, ALL |
| `pageNo` | query | no | Page number, starting from 1; default: 1 |
| `pageSize` | query | no | Page size; default: 10 |
| `sort` | query | no | Sort field: reserveUsd, volumeUsd1d; default: "reserveUsd" |
| `filterBlackList` | query | no | Whether to filter out results that are in the blacklist. Set to true to exclude blacklisted tokens.; default: true |

### searchTokens

Searches tokens by a query string and protocol.

- Endpoint: `GET /apiv2/tokens/search`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `query` | query | no | Search query |
| `protocol` | query | no | Protocol: V1, V1_5, V2, V3, V4, CURVE, ALL; default: "ALL" |
| `pageNo` | query | no | Page number, starting from 1; default: 1 |
| `pageSize` | query | no | Page size; default: 10 |
| `sort` | query | no | Sort field: reserveUsd, volumeUsd1d; default: "reserveUsd" |
| `filterBlackList` | query | no | Whether to filter out results that are in the blacklist. Set to true to exclude blacklisted tokens.; default: true |

### getProtocol

Fetch protocol details

- Endpoint: `GET /apiv2/protocols`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `protocol` | query | no | Protocol: V1, V1_5, V2, V3, V4, CURVE, ALL |

### getVolHistory

Fetch historical protocol volume data

- Endpoint: `GET /apiv2/protocols/history/vol`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `protocol` | query | no | Protocol: V1, V1_5, V2, V3, V4, CURVE, ALL; default: "ALL" |
| `startDate` | query | no | Start date inclusive, format: yyyy-MM-dd |
| `endDate` | query | no | End date inclusive, format: yyyy-MM-dd |

### getUsersCountHistory

Fetch historical protocol users count data

- Endpoint: `GET /apiv2/protocols/history/usersCount`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `protocol` | query | no | Protocol: V1, V1_5, V2, V3, V4, CURVE, ALL; default: "ALL" |
| `startDate` | query | no | Start date inclusive, format: yyyy-MM-dd |
| `endDate` | query | no | End date inclusive, format: yyyy-MM-dd |

### getTransactionsHistory

Fetch historical protocol transactions data

- Endpoint: `GET /apiv2/protocols/history/transactions`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `protocol` | query | no | Protocol: V1, V1_5, V2, V3, V4, CURVE, ALL; default: "ALL" |
| `startDate` | query | no | Start date inclusive, format: yyyy-MM-dd |
| `endDate` | query | no | End date inclusive, format: yyyy-MM-dd |

### getPoolsCountHistory

Fetch historical protocol pools count data

- Endpoint: `GET /apiv2/protocols/history/poolsCount`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `protocol` | query | no | Protocol: V1, V1_5, V2, V3, V4, CURVE, ALL; default: "ALL" |
| `startDate` | query | no | Start date inclusive, format: yyyy-MM-dd |
| `endDate` | query | no | End date inclusive, format: yyyy-MM-dd |

### getLiqHistory

Fetch historical protocol liquidity data

- Endpoint: `GET /apiv2/protocols/history/liq`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `protocol` | query | no | Protocol: V1, V1_5, V2, V3, V4, CURVE, ALL; default: "ALL" |
| `startDate` | query | no | Start date inclusive, format: yyyy-MM-dd |
| `endDate` | query | no | End date inclusive, format: yyyy-MM-dd |

### getPrice

Get token price

- Endpoint: `GET /apiv2/price`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `tokenAddress` | query | no | Token address list, separated by comma |
| `symbol` | query | no | Token symbol or address list, separated by comma |

### getUserPositions

Fetch user positions

- Endpoint: `GET /apiv2/positions/user`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `userAddress` | query | no | User wallet address |
| `poolAddress` | query | no | Pool address to filter |
| `protocol` | query | no | Protocol to filter: V1, V1_5, V2, V3, V4, CURVE, ALL |
| `query` | query | no | Search keyword (fuzzy match) |
| `pageNo` | query | no | Page number, starting from 1; default: 1 |
| `pageSize` | query | no | Page size; default: 10 |
| `sort` | query | no | Sort field: lpBalanceUsd, lastActiveBlockTime; default: "lpBalanceUsd" |

### getPoolUserPositionTick

Fetch pool all user positions tick liquidity

- Endpoint: `GET /apiv2/positions/tick`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `poolAddress` | query | yes | Pool address to filter |
| `pageNo` | query | no | Page number, starting from 1; default: 1 |
| `pageSize` | query | no | Page size; default: 10 |

### getPools

Fetch pools by pool address, token address, or protocol

- Endpoint: `GET /apiv2/pools`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `poolAddress` | query | no | Comma-separated pool address to filter, can not be used with tokenAddress |
| `tokenAddress` | query | no | Token address to filter, can not be used with poolAddress |
| `protocol` | query | no | Protocol to filter: V1, V1_5, V2, V3, V4, CURVE, ALL |
| `pageNo` | query | no | Page number, starting from 1; default: 1 |
| `pageSize` | query | no | Page size; default: 10 |
| `sort` | query | no | Sort field: reserveUsd, volumeUsd1d, feeUsd1d, totalApr; default: "reserveUsd" |
| `desc` | query | no | Sort order, true for descending, false for ascending; default: true |
| `filterBlackList` | query | no | Whether to filter out results that are in the blacklist. Set to true to exclude blacklisted pools.; default: true |

### getTopApyPoolList

Retrieves a paginated list of liquidity pools with the highest Annual Percentage Yield (APY)

- Endpoint: `GET /apiv2/pools/top_apy_list`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `pageNo` | query | no | Page number, starting from 1; default: 1 |
| `pageSize` | query | no | Page size; default: 10 |

### searchPools

Search pools by query string

- Endpoint: `GET /apiv2/pools/search`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `query` | query | no | Search query (pool address, token address, or token name/symbol) |
| `protocol` | query | no | Protocol to filter: V1, V1_5, V2, V3, V4, CURVE, ALL |
| `pageNo` | query | no | Page number, starting from 1; default: 1 |
| `pageSize` | query | no | Page size; default: 10 |
| `sort` | query | no | Sort field: reserveUsd, volumeUsd1d, feeUsd1d, totalApr; default: "reserveUsd" |
| `desc` | query | no | Sort order, true for descending, false for ascending; default: true |
| `filterBlackList` | query | no | Whether to filter out results that are in the blacklist. Set to true to exclude blacklisted pools.; default: true |

### searchCountPools

Search pools by query string

- Endpoint: `GET /apiv2/pools/search/count`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `query` | query | no | Search query (pool address, token address, or token name/symbol) |
| `protocol` | query | no | Protocol to filter: V1, V1_5, V2, V3, V4, CURVE, ALL |
| `filterBlackList` | query | no | Whether to filter out results that are in the blacklist. Set to true to exclude blacklisted pools.; default: true |

### getPoolHooks

Fetches a list of pool hooks

- Endpoint: `GET /apiv2/pools/hooks`
- Risk: `read-only, idempotent, open-world`

No parameters.

### getPoolVolHistory

Fetch historical pool volume data

- Endpoint: `GET /apiv2/pools/history/vol`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `poolAddress` | query | yes | Pool address |
| `startDate` | query | no | Start date inclusive, format: yyyy-MM-dd |
| `endDate` | query | no | End date inclusive, format: yyyy-MM-dd |

### getPoolLiqHistory

Fetch historical pool liquidity data

- Endpoint: `GET /apiv2/pools/history/liq`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `poolAddress` | query | yes | Pool address |
| `startDate` | query | no | Start date inclusive, format: yyyy-MM-dd |
| `endDate` | query | no | End date inclusive, format: yyyy-MM-dd |

### getPairs

Fetch token pairs from pair_info table (direct entity query)

- Endpoint: `GET /apiv2/pairs`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `protocols` | query | no | Comma-separated protocols to filter: V1, V1_5, V2, CURVE (V3 excluded) |
| `protocol` | query | no | Comma-separated protocols to filter: V1, V1_5, V2, CURVE (V3 excluded) |
| `tokenAddress` | query | no | Token address to filter (matches base_id or quote_id) |
| `pageNo` | query | no | Page number, starting from 1; default: 1 |
| `pageSize` | query | no | Page size; default: 10 |
| `sort` | query | no | Sort field: price, updateTime, baseAmountVol1d, quoteAmountVol1d |
| `desc` | query | no | Sort descending (true) or ascending (false); default: true |

### getFarms

Get list of farming pools

- Endpoint: `GET /apiv2/farms`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `farmAddress` | query | no | Comma-separated farm address to filter |
| `pageNo` | query | no | Page number, starting from 1; default: 1 |
| `pageSize` | query | no | Page size; default: 10 |
| `sort` | query | no | Sort field: totalLockedUsd; default: "totalLockedUsd" |

### getFarmTransactions

Scan farming transactions

- Endpoint: `GET /apiv2/farms/transactions`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `userAddress` | query | no | User wallet address |
| `farmAddress` | query | no | Farm address to filter |
| `farmTxType` | query | no | Comma-separated farm transaction types to filter: STAKE, UNSTAKE, LOCK, UNLOCK, CLAIM_REWARD, CLAIM_REWARD_ACC |
| `startTime` | query | no | Start time (format: yyyy-MM-dd HH:mm:ss or yyyy-MM-dd) |
| `endTime` | query | no | End time (format: yyyy-MM-dd HH:mm:ss or yyyy-MM-dd) |
| `pageNo` | query | no | Page number, starting from 1; default: 1 |
| `pageSize` | query | no | Page size; default: 10 |
| `sort` | query | no | Sort field: txTime; default: "txTime" |

### getFarmPositions

Get user's farming positions

- Endpoint: `GET /apiv2/farms/positions/user`
- Risk: `read-only, idempotent, open-world`

| Parameter | Location | Required | Description / default behavior |
| --- | --- | --- | --- |
| `userAddress` | query | no | User wallet address |
| `farmAddress` | query | no | Comma-separated farm address to filter |
| `pageNo` | query | no | Page number, starting from 1; default: 1 |
| `pageSize` | query | no | Page size; default: 10 |
| `sort` | query | no | Sort field: positionUsd; default: "positionUsd" |

## Custom SUNSWAP Tools

Source of truth: `src/tools/sunswap.ts`. Parameter behavior, defaults, and MCP annotations are extracted directly from each registration.

### sunswap_get_wallet_address

Get the active TRON wallet address for SUN.IO/SUNSWAP interactions.

- Risk: `read-only, idempotent`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `network` | no | TRON network: mainnet, nile, or shasta (default: mainnet) |

### sunswap_v3_collect

Collect accrued fees from an existing SUNSWAP V3-style position. Before executing, estimates claimable fees via a read-only collect call.

- Risk: `write, destructive`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `network` | no | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `positionManagerAddress` | yes | SUNSWAP V3 NonfungiblePositionManager contract address. |
| `abi` | no | Optional position manager ABI; if omitted, TronWeb will attempt to infer it. |
| `tokenId` | yes | Token ID of the V3 position NFT. |
| `recipient` | no | Recipient of collected fees. If omitted, defaults to the active wallet address. |

### sunswap_get_balances

Get TRX and TRC20 balances for a wallet on TRON, useful for SUN.IO/SUNSWAP portfolio views.

- Risk: `read-only, idempotent`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `network` | no | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `ownerAddress` | no | Wallet address; if omitted, uses the active SUNSWAP wallet. |
| `tokens` | yes | Assets to query. Include at least one entry, e.g. [{ type: 'TRX' }] or TRC20 tokens. |

### sunswap_quote_exact_input

Estimate SUNSWAP smart router swap results (exact input) by calling its quote/view function.

- Risk: `read-only, idempotent`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `network` | no | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `routerAddress` | yes | Smart router contract address. |
| `functionName` | no | Quote function name on the router (default: quoteExactInput). You may override if router uses a different name, e.g. getAmountsOut. |
| `args` | yes | Arguments passed to the router quote function, in ABI order. |
| `abi` | no | Optional router ABI; if omitted, TronWeb will attempt to infer it. |

### sunswap_read_contract

Read data from a TRON smart contract used by SUN.IO/SUNSWAP (view/pure functions only).

- Risk: `read-only, idempotent`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `network` | no | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `address` | yes | Contract address in base58 or hex format. |
| `functionName` | yes | Name of the view/pure function to call. |
| `args` | no | Optional array of arguments to pass to the function. |
| `abi` | no | Optional contract ABI; if omitted, TronWeb will attempt to infer it. |

### sunswap_swap_exact_input

Execute SUNSWAP smart router swapExactInput (or equivalent) using the pattern: get params -> build unsigned tx -> wallet sign -> broadcast.

- Risk: `write, destructive`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `network` | no | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `routerAddress` | yes | Smart router contract address. |
| `functionName` | no | Swap function name on the router (default: swapExactInput). |
| `args` | yes | Arguments passed to the router swap function, in ABI order. |
| `value` | no | Optional TRX amount in Sun to attach as call value. |
| `abi` | no | Optional router ABI; if omitted, TronWeb will attempt to infer it. |

### sunswap_get_token_price

Get latest token prices from SUN.IO / SUNSWAP public API using token addresses and/or symbols.

- Risk: `read-only, idempotent, open-world`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `tokenAddress` | no | Comma-separated TRON token addresses, e.g. TR7N...,TXYZ... |
| `symbol` | no | Comma-separated token symbols, e.g. SUN,TRX,USDT |

### sunswap_v2_add_liquidity

Add liquidity to a SUNSWAP V2-style pool. If tokenA or tokenB is native TRX (T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb), addLiquidityETH is used automatically; otherwise addLiquidity(tokenA, tokenB, ...) is used.

- Risk: `write, destructive`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `network` | no | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `routerAddress` | yes | SUNSWAP V2 router contract address. |
| `abi` | no | Optional router ABI; if omitted, TronWeb will attempt to infer it. |
| `tokenA` | yes | Token A contract address. |
| `tokenB` | yes | Token B contract address. |
| `amountADesired` | yes | Desired amount of token A (raw units). |
| `amountBDesired` | yes | Desired amount of token B (raw units). |
| `amountAMin` | no | Minimum amount of token A to add. If omitted, defaults to amountADesired with a 5% slippage buffer. |
| `amountBMin` | no | Minimum amount of token B to add. If omitted, defaults to amountBDesired with a 5% slippage buffer. |
| `to` | no | Recipient address for LP tokens. If omitted, defaults to the active wallet address. |
| `deadline` | no | Unix timestamp deadline for the transaction. If omitted, defaults to now + 30 minutes. |

### sunswap_v2_remove_liquidity

Remove liquidity from a SUNSWAP V2-style pool. If tokenA or tokenB is native TRX (T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb), removeLiquidityETH is used automatically; otherwise removeLiquidity(...) is used.

- Risk: `write, destructive`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `network` | no | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `routerAddress` | yes | SUNSWAP V2 router contract address. |
| `abi` | no | Optional router ABI; if omitted, TronWeb will attempt to infer it. |
| `tokenA` | yes | Token A underlying contract address in the V2 pool (LP token is derived automatically from the factory). |
| `tokenB` | yes | Token B underlying contract address in the V2 pool (LP token is derived automatically from the factory). |
| `liquidity` | yes | Amount of LP tokens to burn. |
| `amountAMin` | no | Minimum amount of token A to receive. If omitted, it is computed from pool reserves based on the LP share with a 5% slippage buffer. |
| `amountBMin` | no | Minimum amount of token B to receive. If omitted, it is computed from pool reserves based on the LP share with a 5% slippage buffer. |
| `to` | no | Recipient of underlying tokens. If omitted, defaults to the active wallet address. |
| `deadline` | no | Unix timestamp deadline for the transaction. If omitted, defaults to now + 30 minutes. |

### sunswap_v3_mint_position

Mint a new SUNSWAP V3 concentrated liquidity position. Supports auto-compute: if fee is omitted, defaults to 3000; if tickLower/tickUpper are omitted, reads pool currentTick and sets ±50*tickSpacing; if only one of amount0Desired/amount1Desired is provided, calculates the other from V3 math.

- Risk: `write, destructive`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `network` | no | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `positionManagerAddress` | yes | SUNSWAP V3 NonfungiblePositionManager contract address. |
| `abi` | no | Optional position manager ABI; if omitted, TronWeb will attempt to infer it. |
| `token0` | yes | Token0 contract address. |
| `token1` | yes | Token1 contract address. |
| `fee` | no | Pool fee tier (e.g. 100, 500, 3000). Defaults to 3000 if omitted. |
| `tickLower` | no | Lower tick. If omitted, auto-set to currentTick - 50*tickSpacing. |
| `tickUpper` | no | Upper tick. If omitted, auto-set to currentTick + 50*tickSpacing. |
| `amount0Desired` | no | Desired amount of token0 (raw units). If only one side is provided, the other is auto-calculated. |
| `amount1Desired` | no | Desired amount of token1 (raw units). If only one side is provided, the other is auto-calculated. |
| `amount0Min` | no | Minimum amount of token0. Defaults to amount0Desired * 95%. |
| `amount1Min` | no | Minimum amount of token1. Defaults to amount1Desired * 95%. |
| `recipient` | no | Recipient of the position NFT. Defaults to active wallet. |
| `deadline` | no | Unix timestamp deadline. Defaults to now + 30 minutes. |

### sunswap_v3_increase_liquidity

Increase liquidity of an existing SUNSWAP V3 position. If only one of amount0Desired/amount1Desired is provided along with token0/token1/fee, the other is auto-calculated. amountMin defaults to 5% slippage; deadline defaults to now + 30 min.

- Risk: `write, destructive`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `network` | no | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `positionManagerAddress` | yes | SUNSWAP V3 NonfungiblePositionManager contract address. |
| `abi` | no | Optional position manager ABI. |
| `tokenId` | yes | Token ID of the V3 position NFT. |
| `token0` | no | Token0 address. Required for single-sided auto-compute and approval. |
| `token1` | no | Token1 address. Required for single-sided auto-compute and approval. |
| `fee` | no | Pool fee tier for pool lookup. Defaults to 3000. |
| `tickLower` | no | Lower tick override. If omitted, reads from the existing on-chain position. |
| `tickUpper` | no | Upper tick override. If omitted, reads from the existing on-chain position. |
| `amount0Desired` | no | Desired additional amount of token0. Auto-computed if only amount1Desired is given. |
| `amount1Desired` | no | Desired additional amount of token1. Auto-computed if only amount0Desired is given. |
| `amount0Min` | no | Minimum additional token0. Defaults to amount0Desired * 95%. |
| `amount1Min` | no | Minimum additional token1. Defaults to amount1Desired * 95%. |
| `deadline` | no | Unix timestamp deadline. Defaults to now + 30 minutes. |

### sunswap_v3_decrease_liquidity

Decrease liquidity of an existing SUNSWAP V3 position. If token0/token1/fee are provided, amount0Min/amount1Min are auto-calculated from V3 math with 5% slippage. deadline defaults to now + 30 min.

- Risk: `write, destructive`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `network` | no | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `positionManagerAddress` | yes | SUNSWAP V3 NonfungiblePositionManager contract address. |
| `abi` | no | Optional position manager ABI. |
| `tokenId` | yes | Token ID of the V3 position NFT. |
| `liquidity` | yes | Amount of liquidity to burn. |
| `token0` | no | Token0 address. Providing token0/token1/fee enables auto amountMin computation. |
| `token1` | no | Token1 address. |
| `fee` | no | Pool fee tier for pool lookup. Defaults to 3000. |
| `amount0Min` | no | Minimum token0 to receive. Auto-calculated with 5% slippage if omitted. |
| `amount1Min` | no | Minimum token1 to receive. Auto-calculated with 5% slippage if omitted. |
| `deadline` | no | Unix timestamp deadline. Defaults to now + 30 minutes. |

### sunswap_send_contract

Send a state-changing TRON contract transaction for SUN.IO/SUNSWAP, following the pattern: get params -> build unsigned tx -> wallet sign -> broadcast.

- Risk: `write, destructive`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `network` | no | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `address` | yes | Contract address in base58 or hex format. |
| `functionName` | yes | Name of the state-changing contract function to call (e.g. swap, addLiquidity). |
| `args` | no | Optional array of arguments to pass to the function. |
| `value` | no | Optional TRX amount in Sun to attach as call value. |
| `abi` | no | Optional contract ABI; if omitted, TronWeb will attempt to infer it. |

### sunswap_v4_mint_position

Mint a new SUNSWAP V4 concentrated liquidity position. Uses Permit2 for token authorization. If pool doesn't exist, provide sqrtPriceX96 to auto-create. Supports auto-compute: if tickLower/tickUpper are omitted, defaults to ±100*tickSpacing from current tick; if only one amount is provided, calculates the other.

- Risk: `write, destructive`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `network` | no | TRON network: mainnet or nile (default: mainnet) |
| `token0` | yes | Token0 contract address (base58). |
| `token1` | yes | Token1 contract address (base58). |
| `fee` | no | Pool fee tier (100, 500, 3000, 10000). Defaults to 500. |
| `tickLower` | no | Lower tick. If omitted, auto-set to currentTick - 100*tickSpacing. |
| `tickUpper` | no | Upper tick. If omitted, auto-set to currentTick + 100*tickSpacing. |
| `amount0Desired` | no | Desired amount of token0 (raw units). Auto-computed if only amount1 given. |
| `amount1Desired` | no | Desired amount of token1 (raw units). Auto-computed if only amount0 given. |
| `slippage` | no | Slippage tolerance (e.g. 0.005 for 0.5%). Defaults to 0.05 (5%). |
| `recipient` | no | Recipient of the position NFT. Defaults to active wallet. |
| `deadline` | no | Unix timestamp deadline. Defaults to now + 30 minutes. |
| `sqrtPriceX96` | no | Initial sqrtPriceX96 for pool creation. Required if pool doesn't exist. |
| `createPoolIfNeeded` | no | If true, auto-create pool if it doesn't exist (requires sqrtPriceX96). |

### sunswap_v4_increase_liquidity

Increase liquidity of an existing SUNSWAP V4 position. Uses Permit2 for token authorization. Requires token0/token1 for proper authorization. If only one amount is provided, calculates the other from position tick range.

- Risk: `write, destructive`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `network` | no | TRON network: mainnet or nile (default: mainnet) |
| `tokenId` | yes | Token ID of the V4 position NFT. |
| `token0` | yes | Token0 contract address (base58). Required for authorization. |
| `token1` | yes | Token1 contract address (base58). Required for authorization. |
| `fee` | no | Pool fee tier for lookup. Defaults to 500. |
| `amount0Desired` | no | Desired additional amount of token0 (raw units). |
| `amount1Desired` | no | Desired additional amount of token1 (raw units). |
| `slippage` | no | Slippage tolerance (e.g. 0.005 for 0.5%). Defaults to 0.05 (5%). |
| `deadline` | no | Unix timestamp deadline. Defaults to now + 30 minutes. |

### sunswap_v4_decrease_liquidity

Decrease liquidity of an existing SUNSWAP V4 position. Withdrawn tokens are sent to the caller via CLOSE_CURRENCY action.

- Risk: `write, destructive`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `network` | no | TRON network: mainnet or nile (default: mainnet) |
| `tokenId` | yes | Token ID of the V4 position NFT. |
| `liquidity` | yes | Amount of liquidity to burn (raw units). |
| `token0` | yes | Token0 contract address (base58). Required for pool lookup. |
| `token1` | yes | Token1 contract address (base58). Required for pool lookup. |
| `fee` | no | Pool fee tier for lookup. Defaults to 500. |
| `amount0Min` | no | Minimum token0 to receive. Defaults to 0 with slippage applied. |
| `amount1Min` | no | Minimum token1 to receive. Defaults to 0 with slippage applied. |
| `slippage` | no | Slippage tolerance (e.g. 0.005 for 0.5%). Defaults to 0.05 (5%). |
| `deadline` | no | Unix timestamp deadline. Defaults to now + 30 minutes. |

### sunswap_v4_collect

Collect accrued fees from an existing SUNSWAP V4 position. Uses CLOSE_CURRENCY to collect all accumulated fees.

- Risk: `write, destructive`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `network` | no | TRON network: mainnet or nile (default: mainnet) |
| `tokenId` | yes | Token ID of the V4 position NFT. |
| `token0` | no | Token0 contract address (base58). Optional, can be read from position. |
| `token1` | no | Token1 contract address (base58). Optional, can be read from position. |
| `fee` | no | Pool fee tier. Optional, can be read from position. |
| `deadline` | no | Unix timestamp deadline. Defaults to now + 30 minutes. |

### sunswap_swap

Execute a token swap on SUN.IO via the Universal Router. Automatically finds the best route, handles Permit2 approval/signing, and broadcasts the transaction. Only requires tokenIn, tokenOut, and amountIn.

- Risk: `write, destructive, open-world`

| Parameter | Required | Description / default behavior |
| --- | --- | --- |
| `tokenIn` | yes | Input token contract address (base58). Use TRX address for native TRX. |
| `tokenOut` | yes | Output token contract address (base58). |
| `amountIn` | yes | Amount of input token in raw units (e.g. '1000000' for 1 USDT with 6 decimals). |
| `network` | no | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `slippage` | no | Slippage tolerance as a decimal (e.g. 0.005 for 0.5%). Default: 0.005 |
