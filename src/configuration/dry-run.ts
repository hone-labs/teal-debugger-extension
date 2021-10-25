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
    txns: SignedTxn[];
    accounts: Account[];
    apps: Application[];
    "protocol-version": string;
    round: number;
    "latest-timestamp": number;
    sources: DryrunSource[];
}

export interface SignedTxn {
    xxn: Transaction;
}

/**
 * https://developer.algorand.org/docs/get-details/transactions/transactions
 */
export interface Transaction {

    //
    // Common fields:
    // https://developer.algorand.org/docs/get-details/transactions/transactions/#common-fields-header-and-type
    //

    /** TxType: Specifies the type of transaction. This value is automatically generated using any of the developer tools. */
    type: string;

    /** Sender: The address of the account that pays the fee and amount. */
    snd: string;

    /** Paid by the sender to the FeeSink to prevent denial-of-service. The minimum fee on Algorand is currently 1000 microAlgos. */
    fee: number;

    /** FirstValid: The first round for when the transaction is valid. If the transaction is sent prior to this round it will be rejected by the network. */
    fv: number;

    /** LastValid: The ending round for which the transaction is valid. After this round, the transaction will be rejected by the network. */
    lv: number;
    
    /** Note: Any data up to 1000 bytes.*/
    note: string;
    
    /** GenesisID: The human-readable string that identifies the network for the transaction. The genesis ID is found in the genesis block.  */
    gen: string;

    /** GenesisHash: The hash of the genesis block of the network for which the transaction is valid. */
    gh: number[];

    /** Group: The group specifies that the transaction is part of a group and, if so, specifies the hash of the transaction group. Assign a group ID to a transaction through the workflow described in the Atomic Transfers Guide. */
    grp: number[];

    /** Lease: A lease enforces mutual exclusion of transactions. If this field is nonzero, then once the transaction is confirmed, it acquires the lease identified by the (Sender, Lease) pair of the transaction until the LastValid round passes. While this transaction possesses the lease, no other transaction specifying this lease can be confirmed. A lease is often used in the context of Algorand Smart Contracts to prevent replay attacks. Read more about Algorand Smart Contracts and see the Delegate Key Registration TEAL template for an example implementation of leases. Leases can also be used to safeguard against unintended duplicate spends. For example, if I send a transaction to the network and later realize my fee was too low, I could send another transaction with a higher fee, but the same lease value. This would ensure that only one of those transactions ends up getting confirmed during the validity period. */
    lx: number[];

    /** RekeyTo: Specifies the authorized address. This address will be used to authorize all future transactions.  */
    rekey: number[];

    //
    // Key Registration Transaction
    // "type" === "keyreg"
    // 
    // https://developer.algorand.org/docs/get-details/transactions/transactions/#key-registration-transaction
    //

    /** VotePK: The root participation public key. */
    votekey: string;

    /** SelectionPK: The VRF public key. */
    selkey: string;

    /** VoteFirst: The first round that the participation key is valid. Not to be confused with the FirstValid round of the keyreg transaction. */
    votefst: number;

    /** VoteLast: The last round that the participation key is valid. Not to be confused with the LastValid round of the keyreg transaction. */
    votelst: number;

    /** VoteKeyDilution: This is the dilution for the 2-level participation key. */
    votekd: number;

    /** Nonparticipation: All new Algorand accounts are participating by default. This means that they earn rewards. Mark an account nonparticipating by setting this value to true and this account will no longer earn rewards. It is unlikely that you will ever need to do this and exists mainly for economic-related functions on the network. */
    nonpart: boolean;

    // 
    // Payment transaction.
    // "type" === "pay"
    //
    // https://developer.algorand.org/docs/get-details/transactions/transactions/#payment-transaction
    //

    /** Receiver: The address of the account that receives the amount. */    
    rcv: string;

    /** Amount: The total amount to be sent in microAlgos. */
    amt: number;

    /** CloseRemainderTo: When set, it indicates that the transaction is requesting that the Sender account should be closed, and all remaining funds, after the fee and amount are paid, be transferred to this address. */
    close: string;

    //
    // Asset Configuration Transaction
    // "type" === "acfg"
    //
    // https://developer.algorand.org/docs/get-details/transactions/transactions/#asset-configuration-transaction
    //

    /** ConfigAsset: For re-configure or destroy transactions, this is the unique asset ID. On asset creation, the ID is set to zero. */
    caid: number;

    /** AssetParams: See AssetParams table for all available fields. */
    apar: AssetParams;

    //
    // Asset Transfer Transaction
    // "type" === "axfer"
    //
    // https://developer.algorand.org/docs/get-details/transactions/transactions/#asset-transfer-transaction
    //
    
    /** XferAsset: The unique ID of the asset to be transferred. */
    xaid: number;

    /** AssetAmount: The amount of the asset to be transferred. A zero amount transferred to self allocates that asset in the account's Asset map. */
    aamt: number;

    /** AssetSender: The sender of the transfer. The regular sender field should be used and this one set to the zero value for regular transfers between accounts. If this value is nonzero, it indicates a clawback transaction where the sender is the asset's clawback address and the asset sender is the address from which the funds will be withdrawn. */
    asnd: string;

    /** AssetReceiver: The recipient of the asset transfer. */
    arcv: string;

    /** AssetCloseTo: Specify this field to remove the asset holding from the sender account and reduce the account's minimum balance (i.e. opt-out of the asset). */
    aclose: string;

    // 
    // Asset Freeze Transaction
    // "type" === "afrz"
    // 
    // https://developer.algorand.org/docs/get-details/transactions/transactions/#asset-freeze-transaction
    //

    /** FreezeAccount: The address of the account whose asset is being frozen or unfrozen. */
    fadd: string;

    /** FreezeAsset: The asset ID being frozen or unfrozen. */
    faid: number;

    /** AssetFrozen: True to freeze the asset. */
    afrz: boolean;

    //
    // Application Call transaction:
    // "type" === "appl"
    //
    // https://developer.algorand.org/docs/get-details/transactions/transactions/#application-call-transaction
    //

    /** Application ID: ID of the application being configured or empty if creating. */
    apid: number; 

    /** OnCompletion: Defines what additional actions occur with the transaction. */
    apan: number; 

    /** ApplicationArgs: Transaction specific arguments accessed from the application's approval-program and clear-state-program. */
    apaa: string[]; 

    /** Accounts: List of accounts in addition to the sender that may be accessed from the application's approval-program and clear-state-program. */
    apat: string[]; 

    /** ForeignApps: Lists the applications in addition to the application-id whose global states may be accessed by this application's approval-program and clear-state-program. */
    apfa: string[]; 

    /** ForeignAssets: Lists the assets whose AssetParams may be accessed by this application's approval-program and clear-state-program. */
    apas: string[];

    /** LocalStateSchema: Holds the maximum number of local state values defined within a StateSchema object. */
    apls: StateSchema;

    /** GlobalStateSchema: Holds the maximum number of global state values defined within a StateSchema object. */
    apgs: StateSchema;

    /** ApprovalProgram: Logic executed for every application transaction, except when on-completion is set to "clear". It can read and write global state for the application, as well as account-specific local state. Approval programs may reject the transaction. */
    apap: string; 

    /** ClearStateProgram: Logic executed for application transactions with on-completion set to "clear". It can read and write global state for the application, as well as account-specific local state. Clear state programs cannot reject the transaction. */
    apsu: string;

    /*** ExtraProgramPages: Number of additional pages allocated to the application's approval and clear state programs. Each ExtraProgramPages is 2048 bytes. The sum of ApprovalProgram and ClearStateProgram may not exceed 2048*(1+ExtraProgramPages) bytes. */
    apep: number;

    //TODO: Where do these come from?
    CertRound: number;
    CertType: number;
    Cert: Cert;
}

//fio:
// export interface MicroAlgos {
//     Raw: number;
// }

/**
 * https://developer.algorand.org/docs/get-details/transactions/transactions/#asset-parameters
 */
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

/**
 * https://developer.algorand.org/docs/get-details/transactions/transactions/#storage-state-schema
 */
export interface StateSchema {

    /** NumUint: Maximum number of integer values that may be stored in the [global || local] application key/value store. */
    nui: number; 

    /** NumByteSlice: Maximum number of byte slices values that may be stored in the [global || local] application key/value store. */
    nbs: number;
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
