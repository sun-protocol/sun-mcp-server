# Production Dependency Security

Owner: SUN Protocol Security  
Last reviewed: 2026-07-22<br>
Mandatory re-review: 2026-10-20

## Policy

- `npm audit --omit=dev --audit-level=moderate` must report zero High, Critical, or Moderate
  production advisories. Network or registry failures fail the CI job closed.
- Security overrides are temporary remediations, not advisory exceptions. Each override must name its
  owner, advisory, reachability conclusion, exact fixed version, removal condition, and review date in
  `security/dependency-overrides.json`.
- `npm run security:overrides` rejects an expired review, a changed package resolution, missing
  evidence, or incompatible runtime imports.
- This repository currently has no accepted High/Moderate exceptions. A future exception requires a
  dedicated policy change with an advisory ID, owner, reachability evidence, mitigation, and expiry;
  lowering `audit-level` is prohibited.
- CI always runs the fail-closed production audit and publishes a CycloneDX production SBOM artifact.
  GitHub dependency review runs at Moderate severity only when the repository has Dependency
  Graph/Code Security available and `DEPENDENCY_REVIEW_ENABLED=true` is configured as a repository
  variable. Release image builds already emit SBOM/provenance attestations.

## Reachability Conclusions

| Package | Runtime path | Conclusion | Resolution |
| --- | --- | --- | --- |
| `@hono/node-server` | MCP SDK -> Streamable HTTP transport | `getRequestListener()` is reachable for every HTTP MCP request; the vulnerable `serve-static` path is not imported. | Force fixed 2.0.11; verify the used API, HTTP initialization/tool calls, and all declared Node majors. |
| `fast-uri` | Swagger Parser/MCP SDK -> AJV | URI validation is reachable from OpenAPI parsing and MCP schemas. | Force fixed 3.1.4 within AJV's declared range. |
| `ws` | viem; TronWeb -> ethers; Universal Router -> Solana -> jayson | No inbound WebSocket transport is exposed, but optional wallet/RPC clients load the package. | Force fixed 7.x/8.x releases and test imports/JSON-RPC generation. |
| `bn.js` | SunKit -> Universal Router -> PancakeSwap/Solana | Route/math utility code is potentially reachable. | Force patched 5.2.3 and run SUNSWAP regression tests. |
| `uuid` | Universal Router -> Solana -> jayson | jayson only calls `uuid.v4()` without a buffer; the vulnerable v3/v5/v6 buffer API is unreachable. | Still force 11.1.1 and test automatic request IDs. |
| `body-parser` | MCP SDK -> Express | HTTP middleware is reachable. | Force fixed 2.3.0 and test middleware construction. |

The direct `@sun-protocol/permit2-sdk` and `@sun-protocol/universal-router-sdk` declarations were
removed because production code imports only `@sun-protocol/sun-kit`; SunKit owns those transitive
versions and the server no longer declares redundant direct dependencies.
