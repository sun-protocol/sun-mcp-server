# API 参考

> 此文件由 `npm run docs:tools` 从实际工具定义生成，请勿手工修改。

目录包含 23 个 OpenAPI 动态工具和 18 个 SUNSWAP 自定义工具。

## OpenAPI 自动生成工具

事实源：`specs/sunio-open-api.json`。风险标记直接由 HTTP 方法推导。

### scanTransactions

Scan transactions

- 端点: `GET /apiv2/transactions/scan`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `protocol` | query | 否 | Protocol to filter: V1, V1_5, V2, V3, V4, CURVE, ALL |
| `tokenAddress` | query | 否 | Token address to filter, can not be used with poolAddress |
| `poolAddress` | query | 否 | Comma-separated pool address to filter, can not be used with tokenAddress |
| `type` | query | 否 | Transaction type to filter: add, withdraw, swap |
| `startTime` | query | 否 | Start time (format: yyyy-MM-dd HH:mm:ss or yyyy-MM-dd) |
| `endTime` | query | 否 | End time (format: yyyy-MM-dd HH:mm:ss or yyyy-MM-dd) |
| `pageSize` | query | 否 | Page size; 默认值: 10 |
| `offset` | query | 否 | Pagination offset from previous response |

### getTokens

Fetches a list of tokens based on token address or protocol.

- 端点: `GET /apiv2/tokens`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `tokenAddress` | query | 否 | Comma-separated token addresses |
| `protocol` | query | 否 | Protocol: V1, V1_5, V2, V3, V4, CURVE, ALL |
| `pageNo` | query | 否 | Page number, starting from 1; 默认值: 1 |
| `pageSize` | query | 否 | Page size; 默认值: 10 |
| `sort` | query | 否 | Sort field: reserveUsd, volumeUsd1d; 默认值: "reserveUsd" |
| `filterBlackList` | query | 否 | Whether to filter out results that are in the blacklist. Set to true to exclude blacklisted tokens.; 默认值: true |

### searchTokens

Searches tokens by a query string and protocol.

- 端点: `GET /apiv2/tokens/search`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `query` | query | 否 | Search query |
| `protocol` | query | 否 | Protocol: V1, V1_5, V2, V3, V4, CURVE, ALL; 默认值: "ALL" |
| `pageNo` | query | 否 | Page number, starting from 1; 默认值: 1 |
| `pageSize` | query | 否 | Page size; 默认值: 10 |
| `sort` | query | 否 | Sort field: reserveUsd, volumeUsd1d; 默认值: "reserveUsd" |
| `filterBlackList` | query | 否 | Whether to filter out results that are in the blacklist. Set to true to exclude blacklisted tokens.; 默认值: true |

### getProtocol

Fetch protocol details

- 端点: `GET /apiv2/protocols`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `protocol` | query | 否 | Protocol: V1, V1_5, V2, V3, V4, CURVE, ALL |

### getVolHistory

Fetch historical protocol volume data

- 端点: `GET /apiv2/protocols/history/vol`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `protocol` | query | 否 | Protocol: V1, V1_5, V2, V3, V4, CURVE, ALL; 默认值: "ALL" |
| `startDate` | query | 否 | Start date inclusive, format: yyyy-MM-dd |
| `endDate` | query | 否 | End date inclusive, format: yyyy-MM-dd |

### getUsersCountHistory

Fetch historical protocol users count data

- 端点: `GET /apiv2/protocols/history/usersCount`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `protocol` | query | 否 | Protocol: V1, V1_5, V2, V3, V4, CURVE, ALL; 默认值: "ALL" |
| `startDate` | query | 否 | Start date inclusive, format: yyyy-MM-dd |
| `endDate` | query | 否 | End date inclusive, format: yyyy-MM-dd |

### getTransactionsHistory

Fetch historical protocol transactions data

- 端点: `GET /apiv2/protocols/history/transactions`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `protocol` | query | 否 | Protocol: V1, V1_5, V2, V3, V4, CURVE, ALL; 默认值: "ALL" |
| `startDate` | query | 否 | Start date inclusive, format: yyyy-MM-dd |
| `endDate` | query | 否 | End date inclusive, format: yyyy-MM-dd |

### getPoolsCountHistory

Fetch historical protocol pools count data

- 端点: `GET /apiv2/protocols/history/poolsCount`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `protocol` | query | 否 | Protocol: V1, V1_5, V2, V3, V4, CURVE, ALL; 默认值: "ALL" |
| `startDate` | query | 否 | Start date inclusive, format: yyyy-MM-dd |
| `endDate` | query | 否 | End date inclusive, format: yyyy-MM-dd |

### getLiqHistory

Fetch historical protocol liquidity data

- 端点: `GET /apiv2/protocols/history/liq`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `protocol` | query | 否 | Protocol: V1, V1_5, V2, V3, V4, CURVE, ALL; 默认值: "ALL" |
| `startDate` | query | 否 | Start date inclusive, format: yyyy-MM-dd |
| `endDate` | query | 否 | End date inclusive, format: yyyy-MM-dd |

### getPrice

Get token price

- 端点: `GET /apiv2/price`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `tokenAddress` | query | 否 | Token address list, separated by comma |
| `symbol` | query | 否 | Token symbol or address list, separated by comma |

### getUserPositions

Fetch user positions

- 端点: `GET /apiv2/positions/user`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `userAddress` | query | 否 | User wallet address |
| `poolAddress` | query | 否 | Pool address to filter |
| `protocol` | query | 否 | Protocol to filter: V1, V1_5, V2, V3, V4, CURVE, ALL |
| `query` | query | 否 | Search keyword (fuzzy match) |
| `pageNo` | query | 否 | Page number, starting from 1; 默认值: 1 |
| `pageSize` | query | 否 | Page size; 默认值: 10 |
| `sort` | query | 否 | Sort field: lpBalanceUsd, lastActiveBlockTime; 默认值: "lpBalanceUsd" |

### getPoolUserPositionTick

Fetch pool all user positions tick liquidity

- 端点: `GET /apiv2/positions/tick`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `poolAddress` | query | 是 | Pool address to filter |
| `pageNo` | query | 否 | Page number, starting from 1; 默认值: 1 |
| `pageSize` | query | 否 | Page size; 默认值: 10 |

### getPools

Fetch pools by pool address, token address, or protocol

- 端点: `GET /apiv2/pools`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `poolAddress` | query | 否 | Comma-separated pool address to filter, can not be used with tokenAddress |
| `tokenAddress` | query | 否 | Token address to filter, can not be used with poolAddress |
| `protocol` | query | 否 | Protocol to filter: V1, V1_5, V2, V3, V4, CURVE, ALL |
| `pageNo` | query | 否 | Page number, starting from 1; 默认值: 1 |
| `pageSize` | query | 否 | Page size; 默认值: 10 |
| `sort` | query | 否 | Sort field: reserveUsd, volumeUsd1d, feeUsd1d, totalApr; 默认值: "reserveUsd" |
| `desc` | query | 否 | Sort order, true for descending, false for ascending; 默认值: true |
| `filterBlackList` | query | 否 | Whether to filter out results that are in the blacklist. Set to true to exclude blacklisted pools.; 默认值: true |

### getTopApyPoolList

Retrieves a paginated list of liquidity pools with the highest Annual Percentage Yield (APY)

- 端点: `GET /apiv2/pools/top_apy_list`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `pageNo` | query | 否 | Page number, starting from 1; 默认值: 1 |
| `pageSize` | query | 否 | Page size; 默认值: 10 |

### searchPools

Search pools by query string

- 端点: `GET /apiv2/pools/search`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `query` | query | 否 | Search query (pool address, token address, or token name/symbol) |
| `protocol` | query | 否 | Protocol to filter: V1, V1_5, V2, V3, V4, CURVE, ALL |
| `pageNo` | query | 否 | Page number, starting from 1; 默认值: 1 |
| `pageSize` | query | 否 | Page size; 默认值: 10 |
| `sort` | query | 否 | Sort field: reserveUsd, volumeUsd1d, feeUsd1d, totalApr; 默认值: "reserveUsd" |
| `desc` | query | 否 | Sort order, true for descending, false for ascending; 默认值: true |
| `filterBlackList` | query | 否 | Whether to filter out results that are in the blacklist. Set to true to exclude blacklisted pools.; 默认值: true |

### searchCountPools

Search pools by query string

- 端点: `GET /apiv2/pools/search/count`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `query` | query | 否 | Search query (pool address, token address, or token name/symbol) |
| `protocol` | query | 否 | Protocol to filter: V1, V1_5, V2, V3, V4, CURVE, ALL |
| `filterBlackList` | query | 否 | Whether to filter out results that are in the blacklist. Set to true to exclude blacklisted pools.; 默认值: true |

### getPoolHooks

Fetches a list of pool hooks

- 端点: `GET /apiv2/pools/hooks`
- 风险: `read-only, idempotent, open-world`

无参数。

### getPoolVolHistory

Fetch historical pool volume data

- 端点: `GET /apiv2/pools/history/vol`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `poolAddress` | query | 是 | Pool address |
| `startDate` | query | 否 | Start date inclusive, format: yyyy-MM-dd |
| `endDate` | query | 否 | End date inclusive, format: yyyy-MM-dd |

### getPoolLiqHistory

Fetch historical pool liquidity data

- 端点: `GET /apiv2/pools/history/liq`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `poolAddress` | query | 是 | Pool address |
| `startDate` | query | 否 | Start date inclusive, format: yyyy-MM-dd |
| `endDate` | query | 否 | End date inclusive, format: yyyy-MM-dd |

### getPairs

Fetch token pairs from pair_info table (direct entity query)

- 端点: `GET /apiv2/pairs`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `protocols` | query | 否 | Comma-separated protocols to filter: V1, V1_5, V2, CURVE (V3 excluded) |
| `protocol` | query | 否 | Comma-separated protocols to filter: V1, V1_5, V2, CURVE (V3 excluded) |
| `tokenAddress` | query | 否 | Token address to filter (matches base_id or quote_id) |
| `pageNo` | query | 否 | Page number, starting from 1; 默认值: 1 |
| `pageSize` | query | 否 | Page size; 默认值: 10 |
| `sort` | query | 否 | Sort field: price, updateTime, baseAmountVol1d, quoteAmountVol1d |
| `desc` | query | 否 | Sort descending (true) or ascending (false); 默认值: true |

### getFarms

Get list of farming pools

- 端点: `GET /apiv2/farms`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `farmAddress` | query | 否 | Comma-separated farm address to filter |
| `pageNo` | query | 否 | Page number, starting from 1; 默认值: 1 |
| `pageSize` | query | 否 | Page size; 默认值: 10 |
| `sort` | query | 否 | Sort field: totalLockedUsd; 默认值: "totalLockedUsd" |

### getFarmTransactions

Scan farming transactions

- 端点: `GET /apiv2/farms/transactions`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `userAddress` | query | 否 | User wallet address |
| `farmAddress` | query | 否 | Farm address to filter |
| `farmTxType` | query | 否 | Comma-separated farm transaction types to filter: STAKE, UNSTAKE, LOCK, UNLOCK, CLAIM_REWARD, CLAIM_REWARD_ACC |
| `startTime` | query | 否 | Start time (format: yyyy-MM-dd HH:mm:ss or yyyy-MM-dd) |
| `endTime` | query | 否 | End time (format: yyyy-MM-dd HH:mm:ss or yyyy-MM-dd) |
| `pageNo` | query | 否 | Page number, starting from 1; 默认值: 1 |
| `pageSize` | query | 否 | Page size; 默认值: 10 |
| `sort` | query | 否 | Sort field: txTime; 默认值: "txTime" |

### getFarmPositions

Get user's farming positions

- 端点: `GET /apiv2/farms/positions/user`
- 风险: `read-only, idempotent, open-world`

| 参数 | 位置 | 必填 | 说明 / 默认行为 |
| --- | --- | --- | --- |
| `userAddress` | query | 否 | User wallet address |
| `farmAddress` | query | 否 | Comma-separated farm address to filter |
| `pageNo` | query | 否 | Page number, starting from 1; 默认值: 1 |
| `pageSize` | query | 否 | Page size; 默认值: 10 |
| `sort` | query | 否 | Sort field: positionUsd; 默认值: "positionUsd" |

## SUNSWAP 自定义工具

事实源：`src/tools/sunswap.ts`。参数说明、默认行为与 MCP annotations 直接从注册定义提取。

### sunswap_get_wallet_address

Get the active TRON wallet address for SUN.IO/SUNSWAP interactions.

- 风险: `read-only, idempotent`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `network` | 否 | TRON network: mainnet, nile, or shasta (default: mainnet) |

### sunswap_v3_collect

Collect accrued fees from an existing SUNSWAP V3-style position. Before executing, estimates claimable fees via a read-only collect call.

- 风险: `write, destructive`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `network` | 否 | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `positionManagerAddress` | 是 | SUNSWAP V3 NonfungiblePositionManager contract address. |
| `abi` | 否 | Optional position manager ABI; if omitted, TronWeb will attempt to infer it. |
| `tokenId` | 是 | Token ID of the V3 position NFT. |
| `recipient` | 否 | Recipient of collected fees. If omitted, defaults to the active wallet address. |

### sunswap_get_balances

Get TRX and TRC20 balances for a wallet on TRON, useful for SUN.IO/SUNSWAP portfolio views.

- 风险: `read-only, idempotent`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `network` | 否 | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `ownerAddress` | 否 | Wallet address; if omitted, uses the active SUNSWAP wallet. |
| `tokens` | 是 | Assets to query. Include at least one entry, e.g. [{ type: 'TRX' }] or TRC20 tokens. |

### sunswap_quote_exact_input

Estimate SUNSWAP smart router swap results (exact input) by calling its quote/view function.

- 风险: `read-only, idempotent`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `network` | 否 | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `routerAddress` | 是 | Smart router contract address. |
| `functionName` | 否 | Quote function name on the router (default: quoteExactInput). You may override if router uses a different name, e.g. getAmountsOut. |
| `args` | 是 | Arguments passed to the router quote function, in ABI order. |
| `abi` | 否 | Optional router ABI; if omitted, TronWeb will attempt to infer it. |

### sunswap_read_contract

Read data from a TRON smart contract used by SUN.IO/SUNSWAP (view/pure functions only).

- 风险: `read-only, idempotent`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `network` | 否 | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `address` | 是 | Contract address in base58 or hex format. |
| `functionName` | 是 | Name of the view/pure function to call. |
| `args` | 否 | Optional array of arguments to pass to the function. |
| `abi` | 否 | Optional contract ABI; if omitted, TronWeb will attempt to infer it. |

### sunswap_swap_exact_input

Execute SUNSWAP smart router swapExactInput (or equivalent) using the pattern: get params -> build unsigned tx -> wallet sign -> broadcast.

- 风险: `write, destructive`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `network` | 否 | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `routerAddress` | 是 | Smart router contract address. |
| `functionName` | 否 | Swap function name on the router (default: swapExactInput). |
| `args` | 是 | Arguments passed to the router swap function, in ABI order. |
| `value` | 否 | Optional TRX amount in Sun to attach as call value. |
| `abi` | 否 | Optional router ABI; if omitted, TronWeb will attempt to infer it. |

### sunswap_get_token_price

Get latest token prices from SUN.IO / SUNSWAP public API using token addresses and/or symbols.

- 风险: `read-only, idempotent, open-world`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `tokenAddress` | 否 | Comma-separated TRON token addresses, e.g. TR7N...,TXYZ... |
| `symbol` | 否 | Comma-separated token symbols, e.g. SUN,TRX,USDT |

### sunswap_v2_add_liquidity

Add liquidity to a SUNSWAP V2-style pool. If tokenA or tokenB is native TRX (T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb), addLiquidityETH is used automatically; otherwise addLiquidity(tokenA, tokenB, ...) is used.

- 风险: `write, destructive`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `network` | 否 | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `routerAddress` | 是 | SUNSWAP V2 router contract address. |
| `abi` | 否 | Optional router ABI; if omitted, TronWeb will attempt to infer it. |
| `tokenA` | 是 | Token A contract address. |
| `tokenB` | 是 | Token B contract address. |
| `amountADesired` | 是 | Desired amount of token A (raw units). |
| `amountBDesired` | 是 | Desired amount of token B (raw units). |
| `amountAMin` | 否 | Minimum amount of token A to add. If omitted, defaults to amountADesired with a 5% slippage buffer. |
| `amountBMin` | 否 | Minimum amount of token B to add. If omitted, defaults to amountBDesired with a 5% slippage buffer. |
| `to` | 否 | Recipient address for LP tokens. If omitted, defaults to the active wallet address. |
| `deadline` | 否 | Unix timestamp deadline for the transaction. If omitted, defaults to now + 30 minutes. |

### sunswap_v2_remove_liquidity

Remove liquidity from a SUNSWAP V2-style pool. If tokenA or tokenB is native TRX (T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb), removeLiquidityETH is used automatically; otherwise removeLiquidity(...) is used.

- 风险: `write, destructive`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `network` | 否 | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `routerAddress` | 是 | SUNSWAP V2 router contract address. |
| `abi` | 否 | Optional router ABI; if omitted, TronWeb will attempt to infer it. |
| `tokenA` | 是 | Token A underlying contract address in the V2 pool (LP token is derived automatically from the factory). |
| `tokenB` | 是 | Token B underlying contract address in the V2 pool (LP token is derived automatically from the factory). |
| `liquidity` | 是 | Amount of LP tokens to burn. |
| `amountAMin` | 否 | Minimum amount of token A to receive. If omitted, it is computed from pool reserves based on the LP share with a 5% slippage buffer. |
| `amountBMin` | 否 | Minimum amount of token B to receive. If omitted, it is computed from pool reserves based on the LP share with a 5% slippage buffer. |
| `to` | 否 | Recipient of underlying tokens. If omitted, defaults to the active wallet address. |
| `deadline` | 否 | Unix timestamp deadline for the transaction. If omitted, defaults to now + 30 minutes. |

### sunswap_v3_mint_position

Mint a new SUNSWAP V3 concentrated liquidity position. Supports auto-compute: if fee is omitted, defaults to 3000; if tickLower/tickUpper are omitted, reads pool currentTick and sets ±50*tickSpacing; if only one of amount0Desired/amount1Desired is provided, calculates the other from V3 math.

- 风险: `write, destructive`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `network` | 否 | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `positionManagerAddress` | 是 | SUNSWAP V3 NonfungiblePositionManager contract address. |
| `abi` | 否 | Optional position manager ABI; if omitted, TronWeb will attempt to infer it. |
| `token0` | 是 | Token0 contract address. |
| `token1` | 是 | Token1 contract address. |
| `fee` | 否 | Pool fee tier (e.g. 100, 500, 3000). Defaults to 3000 if omitted. |
| `tickLower` | 否 | Lower tick. If omitted, auto-set to currentTick - 50*tickSpacing. |
| `tickUpper` | 否 | Upper tick. If omitted, auto-set to currentTick + 50*tickSpacing. |
| `amount0Desired` | 否 | Desired amount of token0 (raw units). If only one side is provided, the other is auto-calculated. |
| `amount1Desired` | 否 | Desired amount of token1 (raw units). If only one side is provided, the other is auto-calculated. |
| `amount0Min` | 否 | Minimum amount of token0. Defaults to amount0Desired * 95%. |
| `amount1Min` | 否 | Minimum amount of token1. Defaults to amount1Desired * 95%. |
| `recipient` | 否 | Recipient of the position NFT. Defaults to active wallet. |
| `deadline` | 否 | Unix timestamp deadline. Defaults to now + 30 minutes. |

### sunswap_v3_increase_liquidity

Increase liquidity of an existing SUNSWAP V3 position. If only one of amount0Desired/amount1Desired is provided along with token0/token1/fee, the other is auto-calculated. amountMin defaults to 5% slippage; deadline defaults to now + 30 min.

- 风险: `write, destructive`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `network` | 否 | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `positionManagerAddress` | 是 | SUNSWAP V3 NonfungiblePositionManager contract address. |
| `abi` | 否 | Optional position manager ABI. |
| `tokenId` | 是 | Token ID of the V3 position NFT. |
| `token0` | 否 | Token0 address. Required for single-sided auto-compute and approval. |
| `token1` | 否 | Token1 address. Required for single-sided auto-compute and approval. |
| `fee` | 否 | Pool fee tier for pool lookup. Defaults to 3000. |
| `tickLower` | 否 | Lower tick override. If omitted, reads from the existing on-chain position. |
| `tickUpper` | 否 | Upper tick override. If omitted, reads from the existing on-chain position. |
| `amount0Desired` | 否 | Desired additional amount of token0. Auto-computed if only amount1Desired is given. |
| `amount1Desired` | 否 | Desired additional amount of token1. Auto-computed if only amount0Desired is given. |
| `amount0Min` | 否 | Minimum additional token0. Defaults to amount0Desired * 95%. |
| `amount1Min` | 否 | Minimum additional token1. Defaults to amount1Desired * 95%. |
| `deadline` | 否 | Unix timestamp deadline. Defaults to now + 30 minutes. |

### sunswap_v3_decrease_liquidity

Decrease liquidity of an existing SUNSWAP V3 position. If token0/token1/fee are provided, amount0Min/amount1Min are auto-calculated from V3 math with 5% slippage. deadline defaults to now + 30 min.

- 风险: `write, destructive`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `network` | 否 | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `positionManagerAddress` | 是 | SUNSWAP V3 NonfungiblePositionManager contract address. |
| `abi` | 否 | Optional position manager ABI. |
| `tokenId` | 是 | Token ID of the V3 position NFT. |
| `liquidity` | 是 | Amount of liquidity to burn. |
| `token0` | 否 | Token0 address. Providing token0/token1/fee enables auto amountMin computation. |
| `token1` | 否 | Token1 address. |
| `fee` | 否 | Pool fee tier for pool lookup. Defaults to 3000. |
| `amount0Min` | 否 | Minimum token0 to receive. Auto-calculated with 5% slippage if omitted. |
| `amount1Min` | 否 | Minimum token1 to receive. Auto-calculated with 5% slippage if omitted. |
| `deadline` | 否 | Unix timestamp deadline. Defaults to now + 30 minutes. |

### sunswap_send_contract

Send a state-changing TRON contract transaction for SUN.IO/SUNSWAP, following the pattern: get params -> build unsigned tx -> wallet sign -> broadcast.

- 风险: `write, destructive`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `network` | 否 | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `address` | 是 | Contract address in base58 or hex format. |
| `functionName` | 是 | Name of the state-changing contract function to call (e.g. swap, addLiquidity). |
| `args` | 否 | Optional array of arguments to pass to the function. |
| `value` | 否 | Optional TRX amount in Sun to attach as call value. |
| `abi` | 否 | Optional contract ABI; if omitted, TronWeb will attempt to infer it. |

### sunswap_v4_mint_position

Mint a new SUNSWAP V4 concentrated liquidity position. Uses Permit2 for token authorization. If pool doesn't exist, provide sqrtPriceX96 to auto-create. Supports auto-compute: if tickLower/tickUpper are omitted, defaults to ±100*tickSpacing from current tick; if only one amount is provided, calculates the other.

- 风险: `write, destructive`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `network` | 否 | TRON network: mainnet or nile (default: mainnet) |
| `token0` | 是 | Token0 contract address (base58). |
| `token1` | 是 | Token1 contract address (base58). |
| `fee` | 否 | Pool fee tier (100, 500, 3000, 10000). Defaults to 500. |
| `tickLower` | 否 | Lower tick. If omitted, auto-set to currentTick - 100*tickSpacing. |
| `tickUpper` | 否 | Upper tick. If omitted, auto-set to currentTick + 100*tickSpacing. |
| `amount0Desired` | 否 | Desired amount of token0 (raw units). Auto-computed if only amount1 given. |
| `amount1Desired` | 否 | Desired amount of token1 (raw units). Auto-computed if only amount0 given. |
| `slippage` | 否 | Slippage tolerance (e.g. 0.005 for 0.5%). Defaults to 0.05 (5%). |
| `recipient` | 否 | Recipient of the position NFT. Defaults to active wallet. |
| `deadline` | 否 | Unix timestamp deadline. Defaults to now + 30 minutes. |
| `sqrtPriceX96` | 否 | Initial sqrtPriceX96 for pool creation. Required if pool doesn't exist. |
| `createPoolIfNeeded` | 否 | If true, auto-create pool if it doesn't exist (requires sqrtPriceX96). |

### sunswap_v4_increase_liquidity

Increase liquidity of an existing SUNSWAP V4 position. Uses Permit2 for token authorization. Requires token0/token1 for proper authorization. If only one amount is provided, calculates the other from position tick range.

- 风险: `write, destructive`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `network` | 否 | TRON network: mainnet or nile (default: mainnet) |
| `tokenId` | 是 | Token ID of the V4 position NFT. |
| `token0` | 是 | Token0 contract address (base58). Required for authorization. |
| `token1` | 是 | Token1 contract address (base58). Required for authorization. |
| `fee` | 否 | Pool fee tier for lookup. Defaults to 500. |
| `amount0Desired` | 否 | Desired additional amount of token0 (raw units). |
| `amount1Desired` | 否 | Desired additional amount of token1 (raw units). |
| `slippage` | 否 | Slippage tolerance (e.g. 0.005 for 0.5%). Defaults to 0.05 (5%). |
| `deadline` | 否 | Unix timestamp deadline. Defaults to now + 30 minutes. |

### sunswap_v4_decrease_liquidity

Decrease liquidity of an existing SUNSWAP V4 position. Withdrawn tokens are sent to the caller via CLOSE_CURRENCY action.

- 风险: `write, destructive`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `network` | 否 | TRON network: mainnet or nile (default: mainnet) |
| `tokenId` | 是 | Token ID of the V4 position NFT. |
| `liquidity` | 是 | Amount of liquidity to burn (raw units). |
| `token0` | 是 | Token0 contract address (base58). Required for pool lookup. |
| `token1` | 是 | Token1 contract address (base58). Required for pool lookup. |
| `fee` | 否 | Pool fee tier for lookup. Defaults to 500. |
| `amount0Min` | 否 | Minimum token0 to receive. Defaults to 0 with slippage applied. |
| `amount1Min` | 否 | Minimum token1 to receive. Defaults to 0 with slippage applied. |
| `slippage` | 否 | Slippage tolerance (e.g. 0.005 for 0.5%). Defaults to 0.05 (5%). |
| `deadline` | 否 | Unix timestamp deadline. Defaults to now + 30 minutes. |

### sunswap_v4_collect

Collect accrued fees from an existing SUNSWAP V4 position. Uses CLOSE_CURRENCY to collect all accumulated fees.

- 风险: `write, destructive`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `network` | 否 | TRON network: mainnet or nile (default: mainnet) |
| `tokenId` | 是 | Token ID of the V4 position NFT. |
| `token0` | 否 | Token0 contract address (base58). Optional, can be read from position. |
| `token1` | 否 | Token1 contract address (base58). Optional, can be read from position. |
| `fee` | 否 | Pool fee tier. Optional, can be read from position. |
| `deadline` | 否 | Unix timestamp deadline. Defaults to now + 30 minutes. |

### sunswap_swap

Execute a token swap on SUN.IO via the Universal Router. Automatically finds the best route, handles Permit2 approval/signing, and broadcasts the transaction. Only requires tokenIn, tokenOut, and amountIn.

- 风险: `write, destructive, open-world`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `tokenIn` | 是 | Input token contract address (base58). Use TRX address for native TRX. |
| `tokenOut` | 是 | Output token contract address (base58). |
| `amountIn` | 是 | Amount of input token in raw units (e.g. '1000000' for 1 USDT with 6 decimals). |
| `network` | 否 | TRON network: mainnet, nile, or shasta (default: mainnet) |
| `slippage` | 否 | Slippage tolerance as a decimal (e.g. 0.005 for 0.5%). Default: 0.005 |
