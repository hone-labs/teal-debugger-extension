//
// This code originally generated like this:
//  Go-algorand code > Go/jsonschema > JsonSchema/TypeScript > TypeScript code
//
// Go/jsonschema: https://github.com/alecthomas/jsonschema
// JsonSchema/TypeScript: https://www.npmjs.com/package/json-schema-to-typescript
//
// This code has been exported directly from Go-algorand.
// Go-algorand code repo: https://github.com/algorand/go-algorand/
// DryRunSchema Go type:  https://github.com/algorand/go-algorand/blob/b93ad645403beaf33c979de3b4a3771738e278b2/daemon/algod/api/server/v2/dryrun.go#L41
//

export interface DryRunSchema {
    Txns: SignedTxn[];
    Accounts: Account[];
    Apps: Application[];
    ProtocolVersion: string;
    Round: number;
    LatestTimestamp: number;
    Sources: DryrunSource[];
}

export interface SignedTxn {
    Sig: number[];
    Msig: MultisigSig;
    Lsig: LogicSig;
    Txn: Transaction;
    AuthAddr: number[];
}

export interface MultisigSig {
    Version: number;
    Threshold: number;
    Subsigs: MultisigSubsig[];
}

export interface MultisigSubsig {
    Key: number[];
    Sig: number[];
}

export interface LogicSig {
    Logic: string;
    Sig: number[];
    Msig: MultisigSig;
    Args: string[];
}

export interface Transaction {
    Type: string;
    Sender: number[];
    Fee: MicroAlgos;
    FirstValid: number;
    LastValid: number;
    Note: string;
    GenesisID: string;
    GenesisHash: number[];
    Group: number[];
    Lease: number[];
    RekeyTo: number[];
    VotePK: number[];
    SelectionPK: number[];
    VoteFirst: number;
    VoteLast: number;
    VoteKeyDilution: number;
    Nonparticipation: boolean;
    Receiver: number[];
    Amount: MicroAlgos;
    CloseRemainderTo: number[];
    ConfigAsset: number;
    AssetParams: AssetParams;
    XferAsset: number;
    AssetAmount: number;
    AssetSender: [];
    AssetReceiver: [];
    AssetCloseTo: [];
    FreezeAccount: [];
    FreezeAsset: number;
    AssetFrozen: boolean;
    ApplicationID: number;
    OnCompletion: number;
    ApplicationArgs: string[];
    Accounts: number[][];
    ForeignApps: number[];
    ForeignAssets: number[];
    LocalStateSchema: StateSchema;
    GlobalStateSchema: StateSchema;
    ApprovalProgram: string;
    ClearStateProgram: string;
    ExtraProgramPages: number;
    CertRound: number;
    CertType: number;
    Cert: Cert;
}

export interface MicroAlgos {
    Raw: number;
}

export interface AssetParams {
    clawback?: string;
    creator: string;
    decimals: number;
    "default-frozen"?: boolean;
    freeze?: string;
    manager?: string;
    "metadata-hash"?: string;
    name?: string;
    "name-b64"?: string;
    reserve?: string;
    total: number;
    "unit-name"?: string;
    "unit-name-b64"?: string;
    url?: string;
    "url-b64"?: string;
}

export interface StateSchema {
    NumUint: number;
    NumByteSlice: number;
}
export interface Cert {
    SigCommit: number[];
    SignedWeight: number;
    SigProofs: number[][];
    PartProofs: number[][];
    Reveals: {
        [k: string]: Reveal;
    };
}

export interface Reveal {
    SigSlot: SigslotCommit;
    Part: Participant;
}
export interface SigslotCommit {
    Sig: CompactOneTimeSignature;
    L: number;
}

export interface CompactOneTimeSignature {
    Sig: number[];
    PK: number[];
    PKSigOld: number[];
    PK2: number[];
    PK1Sig: number[;
    PK2Sig: number[];
}

export interface Participant {
    PK: number[];
    Weight: number;
    KeyDilution: number;
}

export interface Account {
    address: string;
    amount: number;
    "amount-without-pending-rewards": number;
    "apps-local-state"?: ApplicationLocalState[];
    "apps-total-extra-pages"?: number;
    "apps-total-schema"?: ApplicationStateSchema;
    assets?: AssetHolding[];
    "auth-addr"?: string;
    "created-apps"?: Application[];
    "created-assets"?: Asset[];
    participation?: AccountParticipation;
    "pending-rewards": number;
    "reward-base"?: number;
    rewards: number;
    round: number;
    "sig-type"?: string;
    status: string;
}

export interface ApplicationLocalState {
    id: number;
    "key-value"?: TealKeyValue[];
    schema: ApplicationStateSchema;
}

export interface TealKeyValue {
    key: string;
    value: TealValue;
}

export interface TealValue {
    bytes: string;
    type: number;
    uint: number;
}
export interface ApplicationStateSchema {
    "num-byte-slice": number;
    "num-uint": number;
}
export interface AssetHolding {
    amount: number;
    "asset-id": number;
    creator: string;
    "is-frozen": boolean;
}
export interface Application {
    id: number;
    params: ApplicationParams;
}
export interface ApplicationParams {
    "approval-program": string;
    "clear-state-program": string;
    creator: string;
    "extra-program-pages"?: number;
    "global-state"?: TealKeyValue[];
    "global-state-schema"?: ApplicationStateSchema;
    "local-state-schema"?: ApplicationStateSchema;
}

export interface Asset {
    index: number;
    params: AssetParams;
}

export interface AccountParticipation {
    "selection-participation-key": string;
    "vote-first-valid": number;
    "vote-key-dilution": number;
    "vote-last-valid": number;
    "vote-participation-key": string;
}

export interface DryrunSource {
    "app-index": number;
    "field-name": string;
    source: string;
    "txn-index": number;
}
