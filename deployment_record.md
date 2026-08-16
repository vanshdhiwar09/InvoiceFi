# INVOICEFI — LEVEL 4 STELLAR TESTNET DEPLOYMENT & E2E RECORD

## 1. Scope & Verification Purpose
Phase 4 proves the Soroban contract and Testnet lifecycle end-to-end on the live Stellar Testnet network. It verifies contract compilation, deployment, interface matching, state machine transitions, authorization enforcement, token escrow, event emission, and storage TTL behavior.

> [!IMPORTANT]
> Phase 4 proves the Soroban contract and Testnet lifecycle. It does **NOT** mean the complete Level 4 product checklist is finished (off-chain backend ingestion, NoA daemon, and frontend UI remain to be implemented in subsequent phases).

## 2. Environment & Deployment Identifiers
- **Network**: Stellar Testnet (`Test SDF Network ; September 2015`)
- **Soroban Protocol Version**: Protocol 27
- **Stellar CLI Version**: `stellar 27.1.0`
- **WASM Hash**: `141adb115ef1827c091621be6fc8df9ca91de7c2daea9eca047238e88dbc147c`
- **Deployed Contract ID**: `CCG2BPR7NEQPV4XOLABSZOWSU24CBJXF4V7LEXIXMAMBPIL6P5CPO2YR`
- **Contract CLI Alias**: `invoicefi_level4`
- **Testnet Explorer Contract URL**: [StellarExpert Contract CCG2B...](https://stellar.expert/explorer/testnet/contract/CCG2BPR7NEQPV4XOLABSZOWSU24CBJXF4V7LEXIXMAMBPIL6P5CPO2YR)

## 3. Testnet Identities & Addresses
- **Deployer**: `GCE5CSESMWJBFGON2ZPO4LCYMVYY4S4ZNN7SHZ2RP6QXB2464KB7CDC2` (`invoicefi_deployer`)
- **Freelancer A**: `GAN5PGTFXO5ZVASEW5YTFB3F4324CDBXNNQ7GXHNHUL5C3IJVWZK2F3S` (`invoicefi_freelancer`)
- **Investor B**: `GBPXF53KX2AI2Y67TZCTC4N7XIRZ6QIIT7AJ4H52AOQWBA3B7BCNNJCF` (`invoicefi_investor`)
- **Simulated Repayer C**: `GBWNISPI7IIJDXKW3MKVPW74OD6S2PAJCAFDYGVWMYZITKIXHAGU5LEC` (`invoicefi_repayer`)

## 4. Testnet Token Contract (SAC)
- **Token Contract ID**: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- **Asset Type**: Native Stellar Lumens (XLM) accessed via its official Stellar Asset Contract (SAC) representation.
- **Asset Code**: `XLM`
- **Decimals**: 7
- **Note**: Native XLM/SAC was utilized for immediate liquidity and protocol testing during this initial contract verification phase.

## 5. End-to-End Testnet Invoice Lifecycle (Invoice ID 1)

| Step | Operation | Function | Caller Identity | Transaction Hash | Explorer URL |
|---|---|---|---|---|---|
| 0 | WASM Upload | `Upload WASM` | `invoicefi_deployer` | `ad495fd1f32f96a492b0380166e8415e7555a5d7d351e2bc5091d60a90d6ee0a` | [TX ad49...](https://stellar.expert/explorer/testnet/tx/ad495fd1f32f96a492b0380166e8415e7555a5d7d351e2bc5091d60a90d6ee0a) |
| 1 | Deployment | `Deploy Contract` | `invoicefi_deployer` | `b071bcd342dc60a1c9c5749c0b8df67c55e4b3064661a0a78354ae12fe10473e` | [TX b071...](https://stellar.expert/explorer/testnet/tx/b071bcd342dc60a1c9c5749c0b8df67c55e4b3064661a0a78354ae12fe10473e) |
| 2 | Creation | `create_invoice` | `invoicefi_freelancer` | `e587b2f83956746125e86feeb368fcaf7a82429bc5199331f9ccc0a9a8b894d7` | [TX e587...](https://stellar.expert/explorer/testnet/tx/e587b2f83956746125e86feeb368fcaf7a82429bc5199331f9ccc0a9a8b894d7) |
| 3 | Tokenization | `tokenize_invoice` | `invoicefi_freelancer` | `ce745cc5b709097e66d775b7e345ff7db1c71f5ef44c13d399a4c117471c996e` | [TX ce74...](https://stellar.expert/explorer/testnet/tx/ce745cc5b709097e66d775b7e345ff7db1c71f5ef44c13d399a4c117471c996e) |
| 4 | Investment | `invest` | `invoicefi_investor` | `73b23df82dbc1e293fc56c944061084b7f783ceb738f781bfb401f0d4ef35189` | [TX 73b2...](https://stellar.expert/explorer/testnet/tx/73b23df82dbc1e293fc56c944061084b7f783ceb738f781bfb401f0d4ef35189) |
| 5 | Repayment | `repay` | `invoicefi_repayer` | `066369ad0c7e8c86310ae74f803c861c0c6a57159a995b40225cb82c9551cdb6` | [TX 0663...](https://stellar.expert/explorer/testnet/tx/066369ad0c7e8c86310ae74f803c861c0c6a57159a995b40225cb82c9551cdb6) |
| 6 | Claim Returns | `claim_returns` | `invoicefi_investor` | `9bbc46392a353746d5bfd47a51cf3f7f585fc34315ae4ebfd1d897344b3641ec` | [TX 9bbc...](https://stellar.expert/explorer/testnet/tx/9bbc46392a353746d5bfd47a51cf3f7f585fc34315ae4ebfd1d897344b3641ec) |
| 7 | Maintenance | `extend_invoice_ttl` | `invoicefi_deployer` | `36530401eda26f3d17f93c564b5023188bfbb2ea8ea3905c1e5a318be529bcb6` | [TX 3653...](https://stellar.expert/explorer/testnet/tx/36530401eda26f3d17f93c564b5023188bfbb2ea8ea3905c1e5a318be529bcb6) |

## 6. Event Verification
- **Emitted Event Topic**: `("invoice_funded", 1)`
- **Emitted Event Payload**: `(GAN5PGTFXO5ZVASEW5YTFB3F4324CDBXNNQ7GXHNHUL5C3IJVWZK2F3S, GBPXF53KX2AI2Y67TZCTC4N7XIRZ6QIIT7AJ4H52AOQWBA3B7BCNNJCF, 950, CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC)`
- Verified observable on Testnet via RPC method `getEvents` and `stellar events`.

## 7. Final On-Chain State (Invoice ID 1)
```json
{
  "id": 1,
  "freelancer": "GAN5PGTFXO5ZVASEW5YTFB3F4324CDBXNNQ7GXHNHUL5C3IJVWZK2F3S",
  "client_ref": "test-client-level4-001",
  "token_address": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  "face_value": "1000",
  "funding_amount": "950",
  "repayment_amount": "1000",
  "due_date": 1789464228,
  "status": 4,
  "verification": 1,
  "investor": "GBPXF53KX2AI2Y67TZCTC4N7XIRZ6QIIT7AJ4H52AOQWBA3B7BCNNJCF"
}
```
* `status = 4` (`Closed`)
* `verification = 1` (`SelfAttested`)

## 8. Known Level 4 Limitations
- **Simulated Repayment**: Repayment is simulated manually on-chain at Level 4; real SEP-24/SEP-31 anchor settlement is deferred to later levels.
- **Self-Attested Verification**: Invoice verification is self-attested at Level 4; stronger client/document verification is deferred to later levels.
- **Test Asset Choice**: The Phase 4 E2E test used native XLM (via its SAC representation) as the test asset for immediate protocol execution; the final product demo should use the designated Testnet stablecoin/test asset once configured.
