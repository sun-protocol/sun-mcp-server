# API 参考

> 此文件由 `npm run docs:tools` 从实际工具定义生成，请勿手工修改。

目录包含 20 个 OpenAPI 动态工具和 16 个 SUNSWAP 自定义工具。

## OpenAPI 自动生成工具

事实源：`specs/sunio-open-api.json`。风险标记直接由 HTTP 方法推导。

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


### sunswap_get_token_price

Get latest token prices from SUN.IO / SUNSWAP public API using token addresses and/or symbols.

- 风险: `read-only, idempotent, open-world`

| 参数 | 必填 | 说明 / 默认行为 |
| --- | --- | --- |
| `tokenAddress` | 否 | Comma-separated TRON token addresses, e.g. TR7N...,TXYZ... |
| `symbol` | 否 | Comma-separated token symbols, e.g. SUN,TRX,USDT |