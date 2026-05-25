# Blockchain Contract Verification — Immutable Legal Records

**Created:** 2026-03-23
**Priority:** Low (Future Enhancement)
**Requested By:** Leo Knight
**Context:** Guardian should store legal contracts on blockchain for immutability and verification.

---

## The Vision

For critical legal documents, Guardian should provide:
1. **Immutable storage** — Document cannot be altered after signing
2. **Timestamped execution** — Provable when agreement was made
3. **Version control** — Clear record of which version is authoritative
4. **Universal verification** — Anyone can verify authenticity

## Why Blockchain?

| Problem | Blockchain Solution |
|---------|---------------------|
| "They changed the contract!" | Immutable hash on-chain |
| "When was this signed?" | Block timestamp |
| "Is this the real version?" | Hash comparison |
| "Prove we agreed to this" | On-chain record + signatures |

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 Contract Signing Flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Document Created                                             │
│        │                                                         │
│        ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Guardian Document Storage (existing)                        ││
│  │  • PDF stored in secure bucket                               ││
│  │  • Checksum generated (SHA-256)                              ││
│  └─────────────────────────────────────────────────────────────┘│
│        │                                                         │
│        ▼                                                         │
│  2. Parties Sign (e-signature flow)                              │
│        │                                                         │
│        ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Blockchain Registration                                     ││
│  │                                                              ││
│  │  • Document hash (SHA-256)                                   ││
│  │  • Signer identities (wallet addresses or DIDs)              ││
│  │  • Timestamp (block time)                                    ││
│  │  • Contract metadata (type, parties, expiry)                 ││
│  └─────────────────────────────────────────────────────────────┘│
│        │                                                         │
│        ▼                                                         │
│  3. On-Chain Record Created                                      │
│        │                                                         │
│        ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Verification Available                                      ││
│  │                                                              ││
│  │  "Is document X authentic?"                                  ││
│  │  → Hash document → Compare to on-chain hash → Yes/No         ││
│  │                                                              ││
│  │  "When was contract Y signed?"                               ││
│  │  → Look up transaction → Return block timestamp              ││
│  │                                                              ││
│  │  "What's the original version?"                              ││
│  │  → Return link to verified original in Guardian storage      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Technology Options

### Option A: Ethereum (or L2)
- **Pros:** Most established, widely recognized
- **Cons:** Gas fees, slower, environmental concerns

### Option B: Polygon
- **Pros:** Low fees, Ethereum-compatible, fast
- **Cons:** Less decentralized

### Option C: Arweave
- **Pros:** Permanent storage, pay-once model
- **Cons:** Different paradigm, less adoption

### Option D: Hedera Hashgraph
- **Pros:** Enterprise-friendly, fast, governed
- **Cons:** Less decentralized, newer

**Recommendation:** Start with **Polygon** for low cost and Ethereum compatibility. Can add other chains later.

## Data Model

### On-Chain (Minimal)
```solidity
struct ContractRecord {
    bytes32 documentHash;      // SHA-256 of PDF
    address[] signers;         // Wallet addresses
    uint256 signedAt;          // Block timestamp
    string contractType;       // "NDA", "Service Agreement", etc.
    string metadataUri;        // IPFS link to extended metadata
}
```

### Off-Chain (in Guardian)
```sql
-- Add to document_archive
ALTER TABLE document_archive ADD COLUMN blockchain_tx_hash TEXT;
ALTER TABLE document_archive ADD COLUMN blockchain_network TEXT;
ALTER TABLE document_archive ADD COLUMN blockchain_verified_at TIMESTAMPTZ;
```

## User Experience

### Signing Flow
```
1. User uploads contract PDF
2. Guardian stores + creates checksum
3. User invites signers (via email or wallet)
4. Each signer reviews + signs (e-signature)
5. Guardian registers on blockchain
6. All parties receive confirmation with tx hash
```

### Verification Flow
```
User: "Is this the real contract?"
        │
        ▼
Guardian: "Let me verify..."
        │
        ▼
[Hash document] → [Compare to blockchain] → [Return result]
        │
        ▼
"✅ Verified. This document matches the version signed on 
March 15, 2026 at 2:30 PM UTC. Transaction: 0x123...

View on Polygonscan: [link]"
```

## Security Considerations

1. **Private keys:** Guardian never holds user signing keys
2. **Document privacy:** Only hash goes on-chain, not content
3. **Identity verification:** Signers must prove wallet ownership
4. **Revocation:** Consider how to handle voided contracts

## Integration with Guardian

- Part of document_archive workflow
- Optional feature (not all documents need blockchain)
- Flag: `blockchain_verified: true/false`
- Additional column: `blockchain_tx_hash`

## Success Criteria

- [ ] Contract hash can be registered on blockchain
- [ ] Multiple signers supported
- [ ] Verification endpoint works
- [ ] Links to original document work
- [ ] Transaction visible on block explorer
- [ ] Cost per registration < $1

---

## Implementation Priority

**Low for now** — Focus on core document storage first. Blockchain adds trust layer but isn't required for MVP.

Revisit when:
- Legal contracts become core use case
- Client requests immutability guarantees
- Compliance requirements emerge
