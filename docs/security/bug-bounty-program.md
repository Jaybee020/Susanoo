---
description: How to report security vulnerabilities in Susanoo.
icon: bug
---

# Bug Bounty Program

{% hint style="info" %}
A formal bug bounty program with defined rewards is planned for launch alongside the mainnet deployment. In the meantime, we welcome responsible disclosure of any security issues.
{% endhint %}

## Scope

The following are in scope for security reports:

| Component | In Scope |
|-----------|----------|
| `Susanoo.sol` | Yes |
| `Queue.sol` | Yes |
| Deployment scripts | No |
| Frontend application | No (unless it leads to on-chain vulnerability) |
| Third-party dependencies (OpenZeppelin, Uniswap V4) | No (report to upstream) |

## What to Report

- Smart contract vulnerabilities (reentrancy, access control, logic errors)
- FHE integration flaws (incorrect encrypted comparisons, access control bypasses)
- Economic attacks (order manipulation, griefing, fund extraction)
- Issues that could cause loss of user funds or unintended order execution

## How to Report

1. **Do not** disclose the vulnerability publicly before it has been addressed
2. Send a detailed report to the project maintainers via GitHub (create a private security advisory in the repository)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if any)

## Response Timeline

| Stage | Target |
|-------|--------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 1 week |
| Fix deployed (if applicable) | Within 2 weeks |
| Public disclosure (coordinated) | After fix is deployed |

## Out of Scope

- Issues already documented in [Known Risks & Mitigations](known-risks-and-mitigations.md)
- Issues requiring physical access to a user's machine
- Social engineering attacks
- Denial-of-service attacks that only affect the reporter
