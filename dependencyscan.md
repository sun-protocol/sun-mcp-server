# sun-mcp-server 依赖扫描报告

## 修复进展（2026-11-11）

本次已升级可兼容修复的依赖，并封闭 MCP 超量工具参数和 overlay 合并的已复现入口。仓库锁文件的生产依赖命中从 **23 降至 3**，全量依赖从 **43 降至 9**；Critical 和 Moderate 均为 0。仍有两个上游根因未消除，不能将本次状态视为依赖漏洞清零。

| 范围 | Critical | High | Moderate | Low | 合计 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 修复后生产依赖 | 0 | 2 | 0 | 1 | 3 |
| 修复后全量依赖 | 0 | 2 | 0 | 7 | 9 |

这些数量仍是 npm audit 的包聚合口径。两个 High 包命中来自同一项 Zod 公告；七个 Low 包命中来自 deepmerge 本体及 Jest 工具链传播。未过滤公告、降低扫描阈值或将剩余项加入豁免清单。

### 已实施的修复

| 项目 | 改动 | 验证边界 |
| --- | --- | --- |
| MCP SDK / DEP-001 | 升至 `1.32.2`；HTTP 请求体上限 1 MiB，batch 上限由 SDK 限制为 100 条；HTTP 与 stdio 在 Zod 校验前限制参数集合总计 10,000 个元素/对象键 | 实际 HTTP Content-Length/chunked、101 条 batch、超量数组/嵌套对象；真实打包 CLI 的 stdio 超量输入拒绝和后续工具发现 |
| Axios / DEP-002 | 根依赖 `1.21.1`；定向覆盖 TronWeb 内的旧 Axios | 根 API client 与真实 TronWeb HttpProvider 通过本地 HTTP fixture 的 GET/POST |
| 对外 Zod / DEP-003 | 根依赖迁移到 `4.6.7`，配合 SDK 校验前的集合限制 | 正常工具参数、无效/超量集合、工具发现；agent-wallet 的 Zod 3 副本仍保留，见下文 |
| js-yaml / DEP-004 | 运行时 `4.3.2`，开发工具链 `3.15.2` | OpenAPI 与 overlay 既有解析回归、npm audit |
| Critical 包 / DEP-005、DEP-006 | `proxy-addr@2.0.8`、`handlebars@4.7.10` | 原始生产/全量 audit 均不再命中 |
| 其他传递依赖 | 刷新兼容版本；PancakeSwap 的 bn.js 定向升至 `5.2.5`；Solana 使用的 jayson 定向升至 `5.0.0`，移除旧 stream-json/uuid 链；开发工具使用 minimatch `11.0.7` | 实际 Solana JSON-RPC 成功与错误处理、金额精度测试、lint、完整测试与 `npm ls --all` |
| deepmerge 应用入口 | `OverlayApplier.apply()` 在克隆、JSONPath 和合并前，遍历 base 与 overlay，拒绝自有 `__proto__` 键；WeakSet 避免遍历循环引用时死循环 | 原型污染 fixture 修复前失败、修复后拒绝；覆盖 JSON/YAML、嵌套数组、正常合并和循环引用 |

实现位置：`src/server.ts:111`、`src/server.ts:350`、`src/overlay-applier.ts:39`、`src/overlay-applier.ts:144`、`package.json:107`、`package.json:123`。MCP 的集合限制需要显式开启，单独升级 SDK 不会启用它，见[上游公告](https://github.com/advisories/GHSA-46jr-4wx8-v453)。

### 尚未消除的上游依赖

| 根因 | 剩余依赖路径 | 当前状态与后续动作 |
| --- | --- | --- |
| Zod / `GHSA-mrhx-c7xc-m3w5` | `@bankofai/agent-wallet@2.4.0 → zod@3.25.76` | 无兼容 Zod 3 修复版；扫描时 agent-wallet `3.0.0` 仍依赖 Zod 3。其公开类型绑定 Zod 3，未强制跨主版本覆盖。当前项目中该 schema 用于本地钱包配置，未发现 MCP 工具参数进入它的路径；这不等于依赖本身已修复。由 agent-wallet 上游提供兼容迁移后更新。 |
| deepmerge / `GHSA-gcqx-w48m-w2h4` | 运行时直接依赖 `deepmerge@4.3.1`；开发链 `jest-config → deepmerge` | [上游仍无补丁](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)。本项目 overlay 合并入口已拒绝恶意键，但库与 Jest 本地配置合并仍保留公告命中。后续采用修复版或经过兼容验证的替代实现；未按 audit 建议降级至旧版本。 |

Zod 3 当前路径依据：`node_modules/@bankofai/agent-wallet/dist/index.cjs:725` 至配置读取 `:774`；对应本仓库 `src/wallet.ts:16`。两个根因由本仓库维护者跟进上游，建议 2026-12-11 前复查；这不是风险接受或扫描豁免。

### npm 分发限制

**上述 3 / 9 个包统计只适用于本仓库的最终锁文件。** npm 不继承依赖包自身声明的 overrides。空消费项目默认安装仍解析到 TronWeb 内的 Axios `1.18.0`、bn.js `5.2.1`、jayson `4.3.0`、stream-json `1.9.1`、uuid `8.3.2`。

中英文安装指南已提供消费项目根 `package.json` 所需的三个生产覆盖规则：见 [Installation.md](docs/sun-mcp-server/Installation.md) 与 [安装指南](docs/sun-mcp-server/zh/Installation.md)。离线消费端解析对照确认，添加这些规则后 Axios 为 `1.21.1`、bn.js 为 `5.2.5`、jayson 为 `5.0.0`，旧 stream-json/uuid 链消失。全局安装或直接 `npx` 不具备相同的传递依赖修复保证；真实打包握手通过只证明运行功能，不代表默认消费安装的漏洞已清零。

### 验证记录

| 检查 | 结果 |
| --- | --- |
| 修复前基线 `npm test -- --runInBand --silent` | 24 个套件、192 项测试通过 |
| 新增安全回归在修复前执行 | overlay 恶意 base/overlay 未被拒绝；超量工具集合进入 handler；101 条 batch 被接受，回归断言失败 |
| `npm ci --ignore-scripts --no-audit --no-fund` | 干净安装成功；重新生成锁文件以消除 npm 保留旧 override 副本导致的 invalid 状态 |
| `npm run build`、`npm run lint` | 通过 |
| `npm run docs:check` | 通过，23 个 OpenAPI 工具、18 个自定义工具 |
| `npm ls --all --json` | 退出码 0，无 invalid 依赖 |
| `npm run security:node-baseline` | 通过 |
| Node `24.22.1` 完整测试（普通及 `--no-cache`） | 26 个套件、206 项测试通过 |
| Node `22.23.4` 完整测试（`--no-cache`） | 26 个套件、206 项测试通过 |
| Node `24.22.1` 的 `npm run test:package` | 通过：76 个文件、41 个 MCP 工具；空目录安装、导入/类型、stdio 握手、超限拒绝及后续恢复 |
| Node `22.23.4` 执行 `scripts/verify-package.cjs` | 通过：76 个文件、41 个 MCP 工具，完成相同的空消费者和 stdio 验证 |
| Docker 构建/运行 | 未执行：`docker info` 无法连接本机 Docker daemon（socket 不存在）；未启动或修改 Docker 服务 |
| 生产及全量 `npm audit --package-lock-only --json` | 都以退出码 1 完成；分别保留 3 / 9 个包命中，未宣称通过无漏洞门禁 |
| `npm sbom --sbom-format=cyclonedx --package-lock-only --include=dev --include=optional --include=peer` | 已生成并保留原始结果 |
| 独立只读补丁审查 | 未发现新增输入校验、overlay 或类型回归；确认上述 npm 分发限制 |

干净安装后的首次完整测试曾出现两项钱包 mock 断言异常；单独运行、冷缓存整套、默认命令整套重跑均通过，未为此修改钱包逻辑或放宽断言。新增回归由现有 CI 的 `npm test` / `test:package` 步骤执行；本地没有运行远端 CI，也未执行签名或链上广播。

最终锁文件 SHA-256：`834b4be35898657081794daf2377ed2f26471561aa578709975eb20932c325b0`。

复扫 JSON 与 SBOM 保留在本机：

`/Users/zhangliang02/.codex/state/plugins/codex-security/scans/sun-mcp-server/artifacts-9d4446ff3d6248c9dd7142312366ddd15a924a069b3bb9a148fa7f570122f132/artifacts/dependency-remediation-2026-11-11/`

- `audit-final-production.json`：`30e1d2081280989981a3dc7a9538dffc00cb2f298dade643d15e37dccddbde4f`
- `audit-final-all.json`：`83344efaae0e29e686125cf69014d1674fa32afc572ae273c174684dedd1dd6b`
- `sbom-final.cdx.json`：`9d52f2668a1d9e617d956ff36a9bcd753464b0f643b059ba8ad36c8b558aac53`

## 原始扫描记录（2026-11-10）

以下保留原始扫描结论和证据，不代表修复后的依赖状态。

上次扫描在全量依赖中发现 43 个受影响包，其中生产依赖 23 个；按公告 URL 去重后共 78 条漏洞公告。优先处理 MCP SDK、Axios、Zod 和 js-yaml。两项 Critical 包命中分别来自生产依赖 `proxy-addr` 和开发依赖 `handlebars`，原扫描均未确认本项目存在可利用的 Critical 攻击路径。

- 扫描时间：2026-11-10 11:45:25（Asia/Shanghai）。
- 扫描提交：`964eb8a4e81fc10eae8a335d5ecc0ad05c28aad0`。
- 范围：`package-lock.json` 中的生产、开发、可选及 peer 依赖，结合漏洞公告匹配和部分调用路径检查。
- 锁文件包条目：689。
- 本文导出既有扫描结果，保留当时的版本、修复建议和可达性判断；未重新扫描、升级依赖或执行漏洞利用。本文不涵盖完整源码审计、操作系统或容器镜像扫描。

## 扫描统计

| 范围 | Critical | High | Moderate | Low | 合计 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 全量依赖 | 2 | 12 | 22 | 7 | 43 |
| 生产依赖（omit=dev） | 1 | 11 | 10 | 1 | 23 |

以上是 npm audit 按受影响包聚合的数量，包含因下游依赖而被标记的上游包，不等同于独立漏洞数或已验证可利用漏洞数。原始公告记录共 90 条，同一公告可能按不同版本分支拆分；按 URL 去重后为 78 条。生产依赖已包含在全量统计内，两者不能相加。

## 重点依赖与可达性

以下结论和证据位置均来自原扫描；行号对应上述提交，`node_modules` 行号对应扫描时安装的版本。建议版本也是当时的扫描快照，尚未实施或完成兼容性验证。

### DEP-001 · MCP SDK：HTTP 请求和工具输入校验的资源消耗

High；`@modelcontextprotocol/sdk@1.27.1`，生产直接依赖。

项目使用 HTTP transport 和工具输入校验路径，但未配置请求体大小、批量请求数量及工具输入元素数量上限。不可信调用者能够访问 `streamable-http` 时，相关资源耗尽路径需要优先处理；仅使用 stdio 的部署具有不同的信任边界。原扫描未执行 OOM 攻击，也未将 SDK 的 OAuth、实验性任务等其他公告全部认定为本项目可利用。

证据：`src/server.ts:109`、`src/server.ts:344`、`src/server.ts:356`、`node_modules/@modelcontextprotocol/sdk/dist/cjs/server/webStandardStreamableHttp.js:399`。

原扫描修复建议：升级至 `1.32.2`，显式设置 `maxToolInputElements` 和适合业务的 `maxRequestBodySize`，补充超大请求体、批量请求和参数集合的边界验证。

### DEP-002 · Axios：直接依赖与 TronWeb 内嵌副本均命中公告

High；根依赖 `axios@1.18.1`，以及 `tronweb@6.5.1 → axios@1.18.0`。

项目确实使用 Axios 发起出站请求。各公告的利用条件不同，涉及不可信 URL 或重定向、代理配置、已有的原型污染以及 HTTP/2 或 fetch adapter 的使用；不能把所有命中公告都视为已确认可利用。

证据：`src/apiClient.ts:265`、`src/apiClient.ts:317`、`package-lock.json:8609`。

原扫描修复建议：根依赖升级至 `1.21.1`。扫描时 registry 中的 TronWeb `6.5.1` 仍固定使用 Axios `1.18.0`，需采用经过审查的定向 override 或等待上游修复，并完成回归验证。不要直接接受 npm audit 将 TronWeb 降级至 `6.3.0` 的建议。

### DEP-003 · Zod：外部工具参数进入受影响的集合校验路径

High；`zod@3.25.76`，生产直接依赖。

工具参数可进入 Zod 校验，token 数组未设置长度上限，安装版本位于公告影响范围。扫描时的 `@bankofai/agent-wallet@3.0.0` 仍要求 `zod@^3.22.0`，因此仅升级根 Zod 依赖会留下受影响的传递副本。

证据：`src/tools/sunswap.ts:145`、`node_modules/@modelcontextprotocol/sdk/dist/cjs/server/mcp.js:177`。

原扫描修复建议：完成兼容性检查后，将对外输入校验迁移至 Zod `>=4.6.6`，并在校验前限制输入规模。通过上游解决 agent-wallet 的 Zod 3 依赖，不应直接全局覆盖为新的主版本。

### DEP-004 · js-yaml：配置文档解析存在 CPU 消耗风险

High；生产副本 `js-yaml@4.3.0`，开发副本 `js-yaml@3.15.0`。

项目加载本地或远程 OpenAPI 规范及 overlay 时会解析 YAML。利用需要攻击者控制这些文档或其上游来源；普通工具参数并不直接进入该 YAML 解析器。

证据：`src/openapiProcessor.ts:77`、`src/openapiProcessor.ts:185`。

原扫描修复建议：运行时 4.x 副本升级至 `4.3.2` 或同分支后续版本，开发链中的 3.x 副本升级至 `3.15.2`。增加规模受控的畸形 YAML 回归用例。

### DEP-005 · proxy-addr：公告为 Critical，项目可利用性未确认

Critical（漏洞库评级）；`proxy-addr@2.0.7`，生产传递依赖。

依赖链为 `@modelcontextprotocol/sdk → express → proxy-addr`。项目直接使用 `node:http`；原扫描加载 MCP server/transport 模块时未加载 Express 或 proxy-addr，也未发现错误配置的 Express trust-proxy 路径。因此该包命中不能作为本服务器暴露 Critical 漏洞的证据。

证据：`package-lock.json:7753`、`src/server.ts:373`。

原扫描修复建议：将传递依赖更新至 `2.0.8`。使用 SDK Express helper 的下游消费者需单独核查。

### DEP-006 · Handlebars：Critical 命中位于开发工具链

Critical（漏洞库评级）；`handlebars@4.7.9`，仅开发依赖。

依赖链为 `ts-jest → handlebars`。已定位的用途是编译内置常量模板以生成 Jest 配置，未启用危险的原型选项；未找到不可信模板或 AST 输入路径。生产环境使用 `npm ci --omit=dev` 时不安装该开发依赖。

证据：`package-lock.json:5174`、`node_modules/ts-jest/dist/cli/config/init.js:101`。

原扫描修复建议：更新至 `4.7.10`，并继续保留开发依赖扫描。

## 后续处理建议

1. 优先修复上述生产调用路径，升级 MCP SDK、Axios、Zod 和 js-yaml，并处理 TronWeb 与 agent-wallet 固定或限制旧版本的问题。
2. 刷新兼容的传递依赖，包括 `follow-redirects`、`body-parser`、`fast-uri`、`brace-expansion`、`bn.js` 和开发工具链；具体影响范围见公告明细。
3. `minimatch`、`stream-json` 和 `uuid` 的跨主版本修复需要先确认上游兼容性。扫描时最新的 `deepmerge@4.3.1` 仍受影响，需检查 overlay 的信任边界，再决定替换或隔离其合并行为。
4. CI 增加独立的生产及全量依赖 audit 门禁，并归档 SBOM。原扫描指出，现有 CI 虽执行 `npm ci`，但未单独约束 audit 的退出状态。
5. 不直接执行 `npm audit fix --force`：原扫描中的自动建议包含降级 TronWeb、Jest、ESLint，不能等同于已验证的修复方案。

## 完整受影响包清单

评级保留原始 npm audit 结果。版本栏列出该命中包记录中的全部安装版本；“公告”指包自身的公告，“继承”表示由下游包传播的风险标记。

### 生产依赖：23 个包

| 包 | 安装版本 | 评级 | 依赖关系 | 命中来源 |
| --- | --- | --- | --- | --- |
| `proxy-addr` | `2.0.7` | critical | 传递 | 公告 1 条 |
| `@bankofai/agent-wallet` | `2.3.0` | high | 直接 | 继承：`zod` |
| `@modelcontextprotocol/sdk` | `1.27.1` | high | 直接 | 公告 6 条 |
| `axios` | `1.18.0`、`1.18.1` | high | 直接 | 公告 12 条 |
| `body-parser` | `2.3.0` | high | 传递 | 公告 1 条 |
| `brace-expansion` | `1.1.16`、`2.1.2`、`5.0.7` | high | 传递 | 公告 5 条 |
| `fast-uri` | `3.1.4` | high | 传递 | 公告 11 条 |
| `follow-redirects` | `1.16.0` | high | 传递 | 公告 3 条 |
| `ip-address` | `10.2.0` | high | 传递 | 公告 8 条 |
| `js-yaml` | `3.15.0`、`4.3.0` | high | 直接 | 公告 2 条 |
| `tronweb` | `6.5.1` | high | 直接 | 继承：`axios` |
| `zod` | `3.25.76` | high | 直接 | 公告 1 条 |
| `@hono/node-server` | `1.19.14` | moderate | 传递 | 公告 2 条 |
| `@pancakeswap/swap-sdk-core` | `1.6.0` | moderate | 传递 | 继承：`@solana/web3.js`、`bn.js` |
| `@solana/web3.js` | `1.98.4` | moderate | 传递 | 继承：`jayson` |
| `bn.js` | `5.2.1` | moderate | 传递 | 公告 1 条 |
| `hono` | `4.12.30` | moderate | 传递 | 公告 9 条 |
| `jayson` | `4.3.0` | moderate | 传递 | 继承：`stream-json`、`uuid` |
| `minimatch` | `10.2.4`、`9.0.9` | moderate | 直接 | 公告 1 条 |
| `qs` | `6.15.3` | moderate | 传递 | 公告 3 条 |
| `stream-json` | `1.9.1` | moderate | 传递 | 公告 3 条 |
| `uuid` | `8.3.2` | moderate | 传递 | 公告 1 条 |
| `deepmerge` | `4.3.1` | low | 直接 | 公告 1 条 |

### 仅开发依赖：20 个包

| 包 | 安装版本 | 评级 | 依赖关系 | 命中来源 |
| --- | --- | --- | --- | --- |
| `handlebars` | `4.7.9` | critical | 传递 | 公告 3 条 |
| `browserslist` | `4.28.6` | high | 传递 | 公告 2 条 |
| `@eslint/config-array` | `0.23.3` | moderate | 传递 | 继承：`minimatch` |
| `@eslint/js` | `10.0.1` | moderate | 直接 | 继承：`eslint` |
| `@humanfs/node` | `0.16.7` | moderate | 传递 | 公告 1 条 |
| `@typescript-eslint/eslint-plugin` | `8.57.0` | moderate | 直接 | 继承：`@typescript-eslint/type-utils`、`@typescript-eslint/utils` |
| `@typescript-eslint/parser` | `8.57.0` | moderate | 直接 | 继承：`@typescript-eslint/typescript-estree` |
| `@typescript-eslint/type-utils` | `8.57.0` | moderate | 传递 | 继承：`@typescript-eslint/typescript-estree`、`@typescript-eslint/utils` |
| `@typescript-eslint/typescript-estree` | `8.57.0` | moderate | 传递 | 继承：`minimatch` |
| `@typescript-eslint/utils` | `8.57.0` | moderate | 传递 | 继承：`@typescript-eslint/typescript-estree` |
| `baseline-browser-mapping` | `2.10.43` | moderate | 传递 | 公告 1 条 |
| `eslint` | `10.0.3` | moderate | 直接 | 继承：`@eslint/config-array`、`minimatch` |
| `nodemon` | `3.1.14` | moderate | 直接 | 继承：`minimatch` |
| `typescript-eslint` | `8.57.0` | moderate | 直接 | 继承：`@typescript-eslint/eslint-plugin`、`@typescript-eslint/parser`、`@typescript-eslint/typescript-estree`、`@typescript-eslint/utils` |
| `@jest/core` | `29.7.0` | low | 传递 | 继承：`jest-config` |
| `create-jest` | `29.7.0` | low | 传递 | 继承：`jest-config` |
| `jest` | `29.7.0` | low | 直接 | 继承：`@jest/core`、`jest-cli` |
| `jest-cli` | `29.7.0` | low | 传递 | 继承：`@jest/core`、`create-jest`、`jest-config` |
| `jest-config` | `29.7.0` | low | 传递 | 继承：`deepmerge` |
| `ts-jest` | `29.4.6` | low | 直接 | 继承：`jest` |

## 漏洞公告明细

以下标题、评级和影响版本范围均取自原始扫描结果。同一公告的不同版本分支合并展示，未追加新的可利用性判断。

| 包 | 公告 | 评级 | 影响版本范围 | 原始标题 |
| --- | --- | --- | --- | --- |
| `handlebars` | [GHSA-xw65-4hp5-5hc7](https://github.com/advisories/GHSA-xw65-4hp5-5hc7) | moderate | `>=4.0.0 <=4.7.9` | Handlebars: JavaScript Injection via Unsafe Inline Embedding of Precompiled Templates |
| `handlebars` | [GHSA-8r5x-fm3f-whwj](https://github.com/advisories/GHSA-8r5x-fm3f-whwj) | critical | `>=4.0.0 <=4.7.9` | Handlebars: JavaScript Injection via AST Type Confusion in compile (bypass of CVE-2026-33937) |
| `handlebars` | [GHSA-p8wg-vrv2-v86f](https://github.com/advisories/GHSA-p8wg-vrv2-v86f) | critical | `>=3.0.0 <=4.7.9` | Handlebars: JavaScript Injection via Own Property Check Bypass |
| `proxy-addr` | [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) | critical | `>=1.1.0 <2.0.8` | proxy-addr vulnerable to IP spoofing via IPv4-mapped IPv6 trust subnet |
| `@modelcontextprotocol/sdk` | [GHSA-6qxp-vccf-f47h](https://github.com/advisories/GHSA-6qxp-vccf-f47h) | high | `>=1.12.0 <1.31.0` | MCP TypeScript SDK: OAuth client could send credentials to an authorization server chosen by the MCP server |
| `@modelcontextprotocol/sdk` | [GHSA-22jm-h49p-29qw](https://github.com/advisories/GHSA-22jm-h49p-29qw) | high | `>=1.24.0 <1.32.0` | MCP TypeScript SDK: Experimental tasks were not tied to the session that created them |
| `@modelcontextprotocol/sdk` | [GHSA-46jr-4wx8-v453](https://github.com/advisories/GHSA-46jr-4wx8-v453) | high | `>=1.3.0 <1.32.0` | MCP TypeScript SDK: One HTTP request within the default size limit could exhaust server memory during validation |
| `@modelcontextprotocol/sdk` | [GHSA-rvq5-wwqv-78pq](https://github.com/advisories/GHSA-rvq5-wwqv-78pq) | moderate | `>=1.6.0 <1.32.0` | MCP TypeScript SDK: Server bearer authentication accepted tokens issued for another service |
| `@modelcontextprotocol/sdk` | [GHSA-f897-62hf-6gxq](https://github.com/advisories/GHSA-f897-62hf-6gxq) | high | `>=1.10.0 <1.30.1` | MCP TypeScript SDK: HTTP server transports and handlers did not limit request body size or JSON-RPC batch length |
| `@modelcontextprotocol/sdk` | [GHSA-6prh-2h8m-c8cw](https://github.com/advisories/GHSA-6prh-2h8m-c8cw) | moderate | `<1.32.0` | MCP TypeScript client SDK: HTTP client transports and OAuth requests followed cross-origin redirects and re-sent custom headers and request bodies |
| `axios` | [GHSA-vh66-26gq-q6x8](https://github.com/advisories/GHSA-vh66-26gq-q6x8) | moderate | `>=1.7.0 <1.20.0` | Axios: Prototype pollution gadget in fetch adapter can alter outbound requests |
| `axios` | [GHSA-9fr6-4gfg-395g](https://github.com/advisories/GHSA-9fr6-4gfg-395g) | moderate | `>=1.0.0 <1.20.0` | Axios: Prototype-Pollution Gadget in the Default Instance Allows Inherited Object.prototype.method to Override HTTP Method |
| `axios` | [GHSA-c29m-xwm3-cm6r](https://github.com/advisories/GHSA-c29m-xwm3-cm6r) | high | `>=1.16.1 <1.20.0` | Axios: ReDoS in fromDataURI data: URL parser freezes the Node event loop (DoS) |
| `axios` | [GHSA-mghh-pgcx-3jjj](https://github.com/advisories/GHSA-mghh-pgcx-3jjj) | high | `>=1.15.0 <1.20.0` | Axios: ReDoS (O(N²)) in shouldBypassProxy host normalization, reachable via untrusted redirect Location |
| `axios` | [GHSA-x97p-jq2g-jp4f](https://github.com/advisories/GHSA-x97p-jq2g-jp4f) | high | `>=1.15.1 <1.20.0` | Axios: Prototype Pollution Gadget in axios toFormData Options |
| `axios` | [GHSA-3pq3-5fj3-cg6v](https://github.com/advisories/GHSA-3pq3-5fj3-cg6v) | high | `>=1.13.0 <1.20.0` | Axios: HTTP/2 adapter bypasses configured DNS lookup and proxy controls |
| `axios` | [GHSA-542g-h47m-68v8](https://github.com/advisories/GHSA-542g-h47m-68v8) | high | `>=1.13.0 <1.20.0` | Axios: Denial of Service via Unhandled 'error' Event in HTTP/2 ClientHttp2Session Initialization |
| `axios` | [GHSA-j8rh-479h-cp32](https://github.com/advisories/GHSA-j8rh-479h-cp32) | moderate | `>=1.0.0 <1.20.0` | Axios: Header Injection via Inherited headers After Minimal Interceptor |
| `axios` | [GHSA-4hqw-qxg8-jxx2](https://github.com/advisories/GHSA-4hqw-qxg8-jxx2) | moderate | `>=1.12.0 <1.20.0` | Axios: Fetch Adapter Header Injection via Inherited FormData getHeaders |
| `axios` | [GHSA-m8m8-qj5v-23w3](https://github.com/advisories/GHSA-m8m8-qj5v-23w3) | high | `>=1.15.2 <1.20.0` | Axios: Node HTTP adapter prototype-pollution gadget allows request socket hijack via inherited createConnection |
| `axios` | [GHSA-44g4-m2mj-wpvx](https://github.com/advisories/GHSA-44g4-m2mj-wpvx) | moderate | `>=1.15.0 <1.20.0` | Axios: CIDR-form NO_PROXY entries are ignored, causing proxy exclusion bypass for internal IP ranges |
| `axios` | [GHSA-r4gj-5m52-g5wh](https://github.com/advisories/GHSA-r4gj-5m52-g5wh) | high | `>=1.17.0 <1.20.0` | Axios: maxRedirects: 0 is not enforced by the fetch adapter, allowing redirect-based SSRF |
| `body-parser` | [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828) | high | `>=2.0.0 <2.4.0` | body-parser vulnerable to Denial of Service via trailing bytes after a compressed request body |
| `brace-expansion` | [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) | high | `<1.1.17`<br>`>=2.0.0 <2.1.3`<br>`>=4.0.0 <5.0.8` | brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash |
| `brace-expansion` | [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | high | `>=4.0.0 <5.0.9`<br>`>=2.0.0 <2.1.4`<br>`<1.1.18` | brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation |
| `brace-expansion` | [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | moderate | `<1.1.21`<br>`>=2.0.0 <2.1.7`<br>`>=4.0.0 <5.0.12` | brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service |
| `brace-expansion` | [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | high | `<1.1.20`<br>`>=2.0.0 <2.1.6`<br>`>=4.0.0 <5.0.11` | brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion |
| `brace-expansion` | [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | high | `<1.1.19`<br>`>=2.0.0 <2.1.5`<br>`>=4.0.0 <5.0.10` | brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion |
| `browserslist` | [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) | high | `<=4.28.6` | Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM |
| `browserslist` | [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) | high | `<=4.28.6` | Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats) |
| `fast-uri` | [GHSA-7p8r-x3mc-p8w7](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7) | high | `>=3.0.0 <3.1.5` | fast-uri vulnerable to host confusion via backslash authority introducer |
| `fast-uri` | [GHSA-5jgf-p345-68v8](https://github.com/advisories/GHSA-5jgf-p345-68v8) | high | `>=3.1.3 <3.1.6` | fast-uri vulnerable to host confusion via skipped IDN canonicalization on scheme-relative references |
| `fast-uri` | [GHSA-f65p-4m7j-42xc](https://github.com/advisories/GHSA-f65p-4m7j-42xc) | high | `>=3.0.0 <3.1.6` | fast-uri vulnerable to server-side request forgery via malformed IPv6 normalization |
| `fast-uri` | [GHSA-fph4-wmhf-6fwf](https://github.com/advisories/GHSA-fph4-wmhf-6fwf) | high | `>=3.1.2 <3.1.6` | fast-uri vulnerable to server-side request forgery via repeated hostname percent-decoding |
| `fast-uri` | [GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp) | high | `>=3.0.0 <3.1.6` | fast-uri vulnerable to host confusion via percent-encoded scheme normalization |
| `fast-uri` | [GHSA-qw65-cvwx-89v3](https://github.com/advisories/GHSA-qw65-cvwx-89v3) | high | `>=3.0.0 <3.1.7` | fast-uri vulnerable to authority injection via an unvalidated port in serialize |
| `fast-uri` | [GHSA-hrr3-gc8f-f4qj](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj) | moderate | `>=3.0.0 <3.1.8` | fast-uri vulnerable to inconsistent host case normalization via percent-encoded octets |
| `fast-uri` | [GHSA-w74x-v6f9-j3xg](https://github.com/advisories/GHSA-w74x-v6f9-j3xg) | moderate | `>=3.0.0 <3.1.9` | fast-uri vulnerable to URI scheme spoofing via percent-encoded scheme decoding |
| `fast-uri` | [GHSA-xhq7-xmqj-769h](https://github.com/advisories/GHSA-xhq7-xmqj-769h) | low | `>=3.0.0 <3.1.9` | fast-uri vulnerable to improper path equivalence in relative reference normalization |
| `fast-uri` | [GHSA-wjr9-j795-jxcr](https://github.com/advisories/GHSA-wjr9-j795-jxcr) | moderate | `>=3.1.3 <3.1.9` | fast-uri vulnerable to host confusion via unchecked WHATWG host canonicalization |
| `fast-uri` | [GHSA-333x-w4r6-6crp](https://github.com/advisories/GHSA-333x-w4r6-6crp) | low | `>=3.0.0 <3.1.9` | fast-uri vulnerable to scheme injection via an unescaped first-segment colon in suffix references |
| `follow-redirects` | [GHSA-q3jh-wrc6-jgq8](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8) | high | `>=1.16.0 <1.16.1` | follow-redirects array-form headers bypass cross-origin credential stripping |
| `follow-redirects` | [GHSA-8r9p-f939-6h3c](https://github.com/advisories/GHSA-8r9p-f939-6h3c) | high | `>=1.16.0 <1.16.1` | follow-redirects sensitiveHeaders regex escaping can expose credential headers |
| `follow-redirects` | [GHSA-mrwp-f3q8-3g9p](https://github.com/advisories/GHSA-mrwp-f3q8-3g9p) | high | `>=1.16.0 <=1.16.1` | follow-redirects: Cross-realm sensitiveHeaders arrays are discarded and custom credentials can follow redirects |
| `ip-address` | [GHSA-mwp4-54f8-5fhr](https://github.com/advisories/GHSA-mwp4-54f8-5fhr) | high | `<=10.3.0` | ip-address: Address4 decodes leading-zero octets as decimal while resolvers decode them as octal, allowing SSRF and trust-boundary bypass |
| `ip-address` | [GHSA-4xrf-jv44-h6hh](https://github.com/advisories/GHSA-4xrf-jv44-h6hh) | moderate | `>=10.1.1 <=10.2.1` | ip-address: a CIDR suffix on the parsed address suppresses special-use classification and can bypass SSRF and trust-boundary checks |
| `ip-address` | [GHSA-22jq-vg5j-6vgg](https://github.com/advisories/GHSA-22jq-vg5j-6vgg) | moderate | `>=10.1.1 <=10.2.0` | ip-address: misclassification of IPv4-mapped/NAT64 IPv6 addresses can bypass SSRF and trust-boundary checks |
| `ip-address` | [GHSA-rpw4-54j3-4h4q](https://github.com/advisories/GHSA-rpw4-54j3-4h4q) | moderate | `<=10.5.0` | ip-address: Address6.isLinkLocal() recognizes fe80::/64 rather than fe80::/10, allowing SSRF and trust-boundary bypass to on-link hosts |
| `ip-address` | [GHSA-2vr4-cq9g-pvrc](https://github.com/advisories/GHSA-2vr4-cq9g-pvrc) | moderate | `>=10.2.0 <=10.5.0` | ip-address: no classifier recognizes the NAT64 local-use range 64:ff9b:1::/48, allowing SSRF and trust-boundary bypass |
| `ip-address` | [GHSA-j6r3-76f7-8jcv](https://github.com/advisories/GHSA-j6r3-76f7-8jcv) | moderate | `<=10.7.0` | ip-address: isInSubnet() and isHostInSubnet() compare addresses of different families as if they shared an address space, allowing an allowlist check to admit an address outside its range |
| `ip-address` | [GHSA-h3mg-xc3c-68pw](https://github.com/advisories/GHSA-h3mg-xc3c-68pw) | moderate | `<=10.7.0` | ip-address: Address6 builds a parse diagnostic proportional to the input with no length bound, allowing a single long string to stall or crash the process |
| `ip-address` | [GHSA-rxp7-6hxx-x8q5](https://github.com/advisories/GHSA-rxp7-6hxx-x8q5) | moderate | `<=10.7.3` | ip-address: Address6 matches a zone identifier in quadratic time ahead of its length limit, allowing a single long string to stall the process |
| `js-yaml` | [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) | high | `>=3.0.0 <3.15.1`<br>`>=4.0.0 <4.3.1` | JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported |
| `js-yaml` | [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | high | `>=3.0.0 <3.15.2`<br>`>=4.0.0 <4.3.2` | js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources |
| `zod` | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | high | `<4.6.6` | Zod can exhaust memory while validating oversized constrained collections |
| `@hono/node-server` | [GHSA-frvp-7c67-39w9](https://github.com/advisories/GHSA-frvp-7c67-39w9) | moderate | `<1.19.15` | Node.js Adapter for Hono: Path traversal in `serve-static` on Windows via encoded backslash (`%5C`) |
| `@hono/node-server` | [GHSA-rmxm-3fg6-px4f](https://github.com/advisories/GHSA-rmxm-3fg6-px4f) | moderate | `>=1.19.10 <2.1.3` | @hono/node-server: `serveStatic` decodes the request path a second time, leading to bypass of middleware on static paths |
| `@humanfs/node` | [GHSA-p498-v437-472g](https://github.com/advisories/GHSA-p498-v437-472g) | moderate | `<0.16.8` | humanfs: Recursive copy follows symlinked files and copies data from outside the source tree |
| `baseline-browser-mapping` | [GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) | moderate | `>=2.0.0 <2.11.0` | baseline-browser-mapping process termination on invalid input causes denial of service |
| `bn.js` | [GHSA-378v-28hj-76wf](https://github.com/advisories/GHSA-378v-28hj-76wf) | moderate | `>=5.0.0 <5.2.3` | bn.js affected by an infinite loop |
| `hono` | [GHSA-8j4g-w8fx-2239](https://github.com/advisories/GHSA-8j4g-w8fx-2239) | moderate | `<4.12.34` | Hono: ReDoS in CORS middleware via Access-Control-Request-Headers |
| `hono` | [GHSA-f23p-vx2j-j53r](https://github.com/advisories/GHSA-f23p-vx2j-j53r) | moderate | `>=3.8.0 <4.12.34` | Hono: `memo()` retains SSR output across requests, leading to cross-user data disclosure |
| `hono` | [GHSA-79qm-7rj5-m7r9](https://github.com/advisories/GHSA-79qm-7rj5-m7r9) | low | `>=4.7.0 <4.12.34` | Hono: Proxy Helper does not remove response headers listed in the `Connection` header |
| `hono` | [GHSA-54fx-42gc-7vw4](https://github.com/advisories/GHSA-54fx-42gc-7vw4) | moderate | `>=4.12.0 <4.12.34` | Hono: Algorithmic Complexity DoS in Language Middleware |
| `hono` | [GHSA-gqvv-2mrq-wpjv](https://github.com/advisories/GHSA-gqvv-2mrq-wpjv) | moderate | `<4.13.5` | Hono: Incomplete fix for CVE-2026-39408: `toSSG()` still writes files outside the output directory |
| `hono` | [GHSA-g6gw-c38x-mqfc](https://github.com/advisories/GHSA-g6gw-c38x-mqfc) | moderate | `<4.13.5` | Hono: Unbounded dot-notation nesting in `parseBody()` can cause memory exhaustion |
| `hono` | [GHSA-crvj-82cr-hjcx](https://github.com/advisories/GHSA-crvj-82cr-hjcx) | moderate | `<4.13.5` | Hono: Query parser reads parameters after the URL fragment, causing cache-key and proxy interpretation differentials |
| `hono` | [GHSA-hxh3-vqpv-xpqv](https://github.com/advisories/GHSA-hxh3-vqpv-xpqv) | moderate | `<4.13.7` | hono/jsx renders plain strings unescaped in boundary components, leading to XSS |
| `hono` | [GHSA-5r4p-p66f-jhc7](https://github.com/advisories/GHSA-5r4p-p66f-jhc7) | moderate | `>=4.12.4 <4.13.11` | Hono: `serveStatic` decodes the request path a second time, leading to bypass of middleware on static paths |
| `minimatch` | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | moderate | `>=7.0.0 <11.0.1` | minimatch has potential denial of service via globparts amplification |
| `qs` | [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx) | moderate | `>=6.14.2 <=6.15.3` | qs array-limit bypass via bracket-key comma parsing |
| `qs` | [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) | moderate | `>=2.2.5 <6.16.0` | qs: Denial of Service via Attacker Controlled isBuffer |
| `qs` | [GHSA-6pq8-jhm2-2vcw](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw) | moderate | `>=6.7.0 <=6.16.0` | qs : qs.stringify with arrayFormat 'comma' throws an uncaught TypeError on array elements carrying a non-callable own toString (DoS) |
| `stream-json` | [GHSA-528h-pc64-c93x](https://github.com/advisories/GHSA-528h-pc64-c93x) | moderate | `<=3.4.0` | stream-json: pick/ignore/filter/replace filters are O(depth²) on nested input — small crafted JSON blocks the event loop for seconds→minutes (DoS) |
| `stream-json` | [GHSA-hqr4-qq8f-hg3x](https://github.com/advisories/GHSA-hqr4-qq8f-hg3x) | moderate | `<=3.5.0` | stream-json: JSONC parser and verifier re-scan the whole accumulated comment on every input chunk |
| `stream-json` | [GHSA-mjw6-4jj6-33hc](https://github.com/advisories/GHSA-mjw6-4jj6-33hc) | moderate | `<3.6.0` | stream-json has a prototype pollution issue: Assembler writes this.current[this.key] on plain objects |
| `uuid` | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | moderate | `<11.1.1` | uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided |
| `deepmerge` | [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | low | `>=4.2.0 <=4.3.1` | deepmerge mergeObject() allows prototype poisoning of returned objects |

## 依赖路径与安装位置

路径按原扫描记录保留，用于定位重复安装的副本；这里只列出扫描记录保存的路径，不代表穷举所有父依赖。

| 包 | 原扫描依赖路径 | 安装位置 | 仅开发 |
| --- | --- | --- | --- |
| `@bankofai/agent-wallet` | `@bankofai/agent-wallet@2.3.0` | `node_modules/@bankofai/agent-wallet` | 否 |
| `@eslint/config-array` | `eslint@10.0.3` → `@eslint/config-array@0.23.3` | `node_modules/@eslint/config-array` | 是 |
| `@eslint/js` | `@eslint/js@10.0.1` | `node_modules/@eslint/js` | 是 |
| `@hono/node-server` | `@modelcontextprotocol/sdk@1.27.1` → `@hono/node-server@1.19.14` | `node_modules/@modelcontextprotocol/sdk/node_modules/@hono/node-server` | 否 |
| `@humanfs/node` | `eslint@10.0.3` → `@humanfs/node@0.16.7` | `node_modules/@humanfs/node` | 是 |
| `@jest/core` | `jest@29.7.0` → `@jest/core@29.7.0` | `node_modules/@jest/core` | 是 |
| `@modelcontextprotocol/sdk` | `@modelcontextprotocol/sdk@1.27.1` | `node_modules/@modelcontextprotocol/sdk` | 否 |
| `@pancakeswap/swap-sdk-core` | `@sun-protocol/sun-kit@1.2.0` → `@sun-protocol/universal-router-sdk@1.0.1` → `@pancakeswap/swap-sdk-core@1.6.0` | `node_modules/@pancakeswap/swap-sdk-core` | 否 |
| `@solana/web3.js` | `@sun-protocol/sun-kit@1.2.0` → `@sun-protocol/universal-router-sdk@1.0.1` → `@pancakeswap/swap-sdk-core@1.6.0` → `@solana/web3.js@1.98.4` | `node_modules/@solana/web3.js` | 否 |
| `@typescript-eslint/eslint-plugin` | `@typescript-eslint/eslint-plugin@8.57.0` | `node_modules/@typescript-eslint/eslint-plugin` | 是 |
| `@typescript-eslint/parser` | `@typescript-eslint/parser@8.57.0` | `node_modules/@typescript-eslint/parser` | 是 |
| `@typescript-eslint/type-utils` | `@typescript-eslint/eslint-plugin@8.57.0` → `@typescript-eslint/type-utils@8.57.0` | `node_modules/@typescript-eslint/type-utils` | 是 |
| `@typescript-eslint/typescript-estree` | `@typescript-eslint/parser@8.57.0` → `@typescript-eslint/typescript-estree@8.57.0` | `node_modules/@typescript-eslint/typescript-estree` | 是 |
| `@typescript-eslint/utils` | `@typescript-eslint/eslint-plugin@8.57.0` → `@typescript-eslint/utils@8.57.0` | `node_modules/@typescript-eslint/utils` | 是 |
| `axios` | `axios@1.18.1` | `node_modules/axios` | 否 |
| `axios` | `tronweb@6.5.1` → `axios@1.18.0` | `node_modules/tronweb/node_modules/axios` | 否 |
| `baseline-browser-mapping` | `ts-jest@29.4.6` → `@babel/core@7.29.7` → `@babel/helper-compilation-targets@7.29.7` → `browserslist@4.28.6` → `baseline-browser-mapping@2.10.43` | `node_modules/baseline-browser-mapping` | 是 |
| `bn.js` | `@sun-protocol/sun-kit@1.2.0` → `@sun-protocol/universal-router-sdk@1.0.1` → `@pancakeswap/swap-sdk-core@1.6.0` → `bn.js@5.2.1` | `node_modules/@pancakeswap/swap-sdk-core/node_modules/bn.js` | 否 |
| `body-parser` | `@modelcontextprotocol/sdk@1.27.1` → `express@5.2.1` → `body-parser@2.3.0` | `node_modules/body-parser` | 否 |
| `brace-expansion` | `eslint@10.0.3` → `@eslint/config-array@0.23.3` → `minimatch@10.2.4` → `brace-expansion@5.0.7` | `node_modules/@eslint/config-array/node_modules/brace-expansion` | 是 |
| `brace-expansion` | `@typescript-eslint/parser@8.57.0` → `@typescript-eslint/typescript-estree@8.57.0` → `minimatch@10.2.4` → `brace-expansion@5.0.7` | `node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion` | 是 |
| `brace-expansion` | `minimatch@9.0.9` → `brace-expansion@2.1.2` | `node_modules/brace-expansion` | 否 |
| `brace-expansion` | `eslint@10.0.3` → `minimatch@10.2.4` → `brace-expansion@5.0.7` | `node_modules/eslint/node_modules/brace-expansion` | 是 |
| `brace-expansion` | `jest@29.7.0` → `@jest/core@29.7.0` → `@jest/reporters@29.7.0` → `glob@7.2.3` → `minimatch@3.1.5` → `brace-expansion@1.1.16` | `node_modules/glob/node_modules/brace-expansion` | 是 |
| `brace-expansion` | `nodemon@3.1.14` → `minimatch@10.2.4` → `brace-expansion@5.0.7` | `node_modules/nodemon/node_modules/brace-expansion` | 是 |
| `brace-expansion` | `ts-jest@29.4.6` → `@jest/transform@29.7.0` → `babel-plugin-istanbul@6.1.1` → `test-exclude@6.0.0` → `minimatch@3.1.5` → `brace-expansion@1.1.16` | `node_modules/test-exclude/node_modules/brace-expansion` | 是 |
| `browserslist` | `ts-jest@29.4.6` → `@babel/core@7.29.7` → `@babel/helper-compilation-targets@7.29.7` → `browserslist@4.28.6` | `node_modules/browserslist` | 是 |
| `create-jest` | `jest@29.7.0` → `jest-cli@29.7.0` → `create-jest@29.7.0` | `node_modules/create-jest` | 是 |
| `deepmerge` | `deepmerge@4.3.1` | `node_modules/deepmerge` | 否 |
| `eslint` | `eslint@10.0.3` | `node_modules/eslint` | 是 |
| `fast-uri` | `@apidevtools/swagger-parser@10.1.1` → `ajv@8.18.0` → `fast-uri@3.1.4` | `node_modules/fast-uri` | 否 |
| `follow-redirects` | `axios@1.18.1` → `follow-redirects@1.16.0` | `node_modules/follow-redirects` | 否 |
| `handlebars` | `ts-jest@29.4.6` → `handlebars@4.7.9` | `node_modules/handlebars` | 是 |
| `hono` | `@modelcontextprotocol/sdk@1.27.1` → `hono@4.12.30` | `node_modules/hono` | 否 |
| `ip-address` | `@modelcontextprotocol/sdk@1.27.1` → `express-rate-limit@8.5.2` → `ip-address@10.2.0` | `node_modules/ip-address` | 否 |
| `jayson` | `@sun-protocol/sun-kit@1.2.0` → `@sun-protocol/universal-router-sdk@1.0.1` → `@pancakeswap/swap-sdk-core@1.6.0` → `@solana/web3.js@1.98.4` → `jayson@4.3.0` | `node_modules/jayson` | 否 |
| `jest` | `jest@29.7.0` | `node_modules/jest` | 是 |
| `jest-cli` | `jest@29.7.0` → `jest-cli@29.7.0` | `node_modules/jest-cli` | 是 |
| `jest-config` | `jest@29.7.0` → `@jest/core@29.7.0` → `jest-config@29.7.0` | `node_modules/jest-config` | 是 |
| `js-yaml` | `ts-jest@29.4.6` → `@jest/transform@29.7.0` → `babel-plugin-istanbul@6.1.1` → `@istanbuljs/load-nyc-config@1.1.0` → `js-yaml@3.15.0` | `node_modules/@istanbuljs/load-nyc-config/node_modules/js-yaml` | 是 |
| `js-yaml` | `js-yaml@4.3.0` | `node_modules/js-yaml` | 否 |
| `minimatch` | `eslint@10.0.3` → `@eslint/config-array@0.23.3` → `minimatch@10.2.4` | `node_modules/@eslint/config-array/node_modules/minimatch` | 是 |
| `minimatch` | `@typescript-eslint/parser@8.57.0` → `@typescript-eslint/typescript-estree@8.57.0` → `minimatch@10.2.4` | `node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch` | 是 |
| `minimatch` | `eslint@10.0.3` → `minimatch@10.2.4` | `node_modules/eslint/node_modules/minimatch` | 是 |
| `minimatch` | `minimatch@9.0.9` | `node_modules/minimatch` | 否 |
| `minimatch` | `nodemon@3.1.14` → `minimatch@10.2.4` | `node_modules/nodemon/node_modules/minimatch` | 是 |
| `nodemon` | `nodemon@3.1.14` | `node_modules/nodemon` | 是 |
| `proxy-addr` | `@modelcontextprotocol/sdk@1.27.1` → `express@5.2.1` → `proxy-addr@2.0.7` | `node_modules/proxy-addr` | 否 |
| `qs` | `@modelcontextprotocol/sdk@1.27.1` → `express@5.2.1` → `qs@6.15.3` | `node_modules/qs` | 否 |
| `stream-json` | `@sun-protocol/sun-kit@1.2.0` → `@sun-protocol/universal-router-sdk@1.0.1` → `@pancakeswap/swap-sdk-core@1.6.0` → `@solana/web3.js@1.98.4` → `jayson@4.3.0` → `stream-json@1.9.1` | `node_modules/stream-json` | 否 |
| `tronweb` | `tronweb@6.5.1` | `node_modules/tronweb` | 否 |
| `ts-jest` | `ts-jest@29.4.6` | `node_modules/ts-jest` | 是 |
| `typescript-eslint` | `typescript-eslint@8.57.0` | `node_modules/typescript-eslint` | 是 |
| `uuid` | `@sun-protocol/sun-kit@1.2.0` → `@sun-protocol/universal-router-sdk@1.0.1` → `@pancakeswap/swap-sdk-core@1.6.0` → `@solana/web3.js@1.98.4` → `jayson@4.3.0` → `uuid@8.3.2` | `node_modules/jayson/node_modules/uuid` | 否 |
| `zod` | `zod@3.25.76` | `node_modules/zod` | 否 |

## 执行记录与原始证据

下表是原扫描执行记录，本次导出未重新运行这些命令。`npm audit` 的退出码 `1` 表示发现已知漏洞，原扫描已完成。

| 命令 | 退出码 |
| --- | ---: |
| `npm audit --json --package-lock-only --include=dev --include=optional --include=peer` | 1 |
| `npm audit --json --package-lock-only --omit=dev` | 1 |
| `npm ls --all --json` | 0 |
| `npm sbom --sbom-format=cyclonedx --package-lock-only --include=dev --include=optional --include=peer` | 0 |

原始文件位于本机临时目录，后续可能被清理。本文已收录受影响包、公告、依赖路径和重点分析；下列 SHA-256 用于核对导出来源。

| 文件 | 本机路径 | SHA-256 |
| --- | --- | --- |
| `dependency-findings.json` | `/private/tmp/sun-mcp-dependency-audit-20261110.RNWvQ4/dependency-findings.json` | `cab465d6b6aae09e001462fe0758afa4c3c53a249b447c7835f65adb5b4c8566` |
| `audit-all.json` | `/private/tmp/sun-mcp-dependency-audit-20261110.RNWvQ4/audit-all.json` | `f7aabebd6261f481050cbb5a22dcc30ad8c52f655e9081701587152d06ecdd7f` |
| `audit-production.json` | `/private/tmp/sun-mcp-dependency-audit-20261110.RNWvQ4/audit-production.json` | `696f14679823ad041a502e775442057b92cbd70e9a370c25ccc457c5ad0290f4` |
| `registry-latest.json` | `/private/tmp/sun-mcp-dependency-audit-20261110.RNWvQ4/registry-latest.json` | `f6edc7a6f85affed466ccc42cfa6860ceb0b6f96f30fb9c26e8ce6d517fca19f` |
| `sbom.cdx.json` | `/private/tmp/sun-mcp-dependency-audit-20261110.RNWvQ4/sbom.cdx.json` | `651e57dd0a0b6c456cf172245ec1183fe08cff54616e2255bcf41c162fe52083` |
| `sun-mcp-dependency-tree-20261110.json` | `/private/tmp/sun-mcp-dependency-tree-20261110.json` | `33871ffa14d4ec6f584e892da2643225298da7be3ec2ea9e342498cfbf4228e1` |
