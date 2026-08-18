import {
  Contract,
  Address,
  nativeToScVal,
  scValToNative,
  xdr,
  TransactionBuilder,
  rpc,
  Account
} from '@stellar/stellar-sdk';
import { ensureStellarWalletsKitInitialized } from '../wallet/walletAdapter';

export const APPROVED_XLM_SAC_TOKEN = process.env.NEXT_PUBLIC_STELLAR_TOKEN_ADDRESS || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
export const INVOICE_CONTRACT_ID = process.env.NEXT_PUBLIC_INVOICE_CONTRACT_ID || 'CCG2BPR7NEQPV4XOLABSZOWSU24CBJXF4V7LEXIXMAMBPIL6P5CPO2YR';
export const STELLAR_RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';

/**
 * Converts standard XLM decimal amount into 7-decimal integer Stroops (1 XLM = 10,000,000 Stroops).
 */
export function xlmToStroops(xlmAmount: number): bigint {
  return BigInt(Math.round(xlmAmount * 10_000_000));
}

/**
 * Converts ISO date string into 64-bit Unix timestamp seconds.
 */
export function dateToUnixTimestamp(dateString: string): bigint {
  const ms = new Date(dateString).getTime();
  return BigInt(Math.floor(ms / 1000));
}

export interface CreateInvoiceTxParams {
  freelancerAddress: string;
  clientRef: string;
  faceValueXlm: number;
  fundingAmountXlm: number;
  dueDateIso: string;
}

export interface TxExecutionResult {
  success: boolean;
  onChainId?: number;
  txHash?: string;
  errorMessage?: string;
}

/**
 * Simulates get_invoice_count() on Soroban smart contract to fetch true total on-chain invoice counter.
 */
export async function fetchContractInvoiceCount(): Promise<number> {
  try {
    const contract = new Contract(INVOICE_CONTRACT_ID);
    const server = new rpc.Server(STELLAR_RPC_URL);
    const dummyAccount = new Account('GAN5PGTFXO5ZVASEW5YTFB3F4324CDBXNNQ7GXHNHUL5C3IJVWZK2F3S', '0');

    const tx = new TransactionBuilder(dummyAccount, {
      fee: '100000',
      networkPassphrase: 'Test SDF Network ; September 2015'
    })
      .addOperation(contract.call('get_invoice_count'))
      .setTimeout(30)
      .build();

    const simRes = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(simRes) && simRes.result?.retval) {
      return Number(scValToNative(simRes.result.retval));
    }
  } catch {
    // Return fallback 1 if RPC simulation fails
  }
  return 1;
}

/**
 * Simulates and executes Soroban create_invoice() transaction via connected Stellar Wallet.
 */
export async function executeCreateInvoiceTx(
  params: CreateInvoiceTxParams,
  onStatusUpdate?: (status: 'Awaiting signature' | 'Broadcasting' | 'Confirmed' | 'Failed', msg?: string) => void
): Promise<TxExecutionResult> {
  const { freelancerAddress, clientRef, faceValueXlm, fundingAmountXlm, dueDateIso } = params;

  try {
    if (onStatusUpdate) onStatusUpdate('Awaiting signature');

    const faceStroops = xlmToStroops(faceValueXlm);
    const fundStroops = xlmToStroops(fundingAmountXlm);
    const repayStroops = faceStroops; // Invariant: repayment_amount == face_value
    const dueUnix = dateToUnixTimestamp(dueDateIso);

    const contract = new Contract(INVOICE_CONTRACT_ID);
    const server = new rpc.Server(STELLAR_RPC_URL);

    // Build operation arguments matching lib.rs contract signature
    const args = [
      new Address(freelancerAddress).toScVal(),
      nativeToScVal(clientRef, { type: 'string' }),
      new Address(APPROVED_XLM_SAC_TOKEN).toScVal(),
      nativeToScVal(faceStroops, { type: 'i128' }),
      nativeToScVal(fundStroops, { type: 'i128' }),
      nativeToScVal(repayStroops, { type: 'i128' }),
      nativeToScVal(dueUnix, { type: 'u64' })
    ];

    const account = await server.getAccount(freelancerAddress);
    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: 'Test SDF Network ; September 2015'
    })
      .addOperation(contract.call('create_invoice', ...args))
      .setTimeout(30)
      .build();

    const Kit = ensureStellarWalletsKitInitialized();
    const simulatedTx = await server.prepareTransaction(tx);

    const { signedTxXdr } = await Kit.signTransaction(simulatedTx.toXDR(), {
      networkPassphrase: 'Test SDF Network ; September 2015'
    });

    if (onStatusUpdate) onStatusUpdate('Broadcasting');

    const sendRes = await server.sendTransaction(
      TransactionBuilder.fromXDR(signedTxXdr, 'Test SDF Network ; September 2015')
    );

    if (sendRes.status === 'ERROR') {
      throw new Error('Soroban RPC submission error: ' + JSON.stringify(sendRes.errorResult));
    }

    // Wait for confirmation
    let getRes = await server.getTransaction(sendRes.hash);
    let attempts = 0;
    while (getRes.status === 'NOT_FOUND' && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      getRes = await server.getTransaction(sendRes.hash);
      attempts++;
    }

    // Extract return value or fetch exact invoice counter from contract
    let generatedId = 1;
    if (getRes.status === 'SUCCESS') {
      const getResRecord = getRes as unknown as { returnValue?: xdr.ScVal; resultMetaXdr?: string | xdr.TransactionMeta };
      if (getResRecord.returnValue) {
        try {
          generatedId = Number(scValToNative(getResRecord.returnValue));
        } catch {
          // fallback
        }
      } else if (getResRecord.resultMetaXdr) {
        try {
          const meta = typeof getResRecord.resultMetaXdr === 'string'
            ? xdr.TransactionMeta.fromXDR(getResRecord.resultMetaXdr, 'base64')
            : getResRecord.resultMetaXdr;
          const v3 = meta.v3();
          const retVal = v3.sorobanMeta()?.returnValue();
          if (retVal) {
            generatedId = Number(scValToNative(retVal));
          }
        } catch {
          // fallback
        }
      }

      if (generatedId <= 1) {
        const trueCounter = await fetchContractInvoiceCount();
        if (trueCounter > 0) {
          generatedId = trueCounter;
        }
      }
    }

    if (onStatusUpdate) onStatusUpdate('Confirmed');

    return {
      success: true,
      onChainId: generatedId,
      txHash: sendRes.hash
    };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    let userMsg = 'Transaction was rejected or failed on Stellar Testnet.';

    if (rawMsg.includes('User rejected') || rawMsg.includes('closed popup') || rawMsg.includes('declined')) {
      userMsg = 'Wallet transaction request was declined by user.';
    } else if (rawMsg.includes('Insufficient balance') || rawMsg.includes('tx_insufficient_balance')) {
      userMsg = 'Insufficient XLM testnet balance to submit transaction.';
    } else if (rawMsg.includes('Network') || rawMsg.includes('wrong network')) {
      userMsg = 'Wallet is on wrong network. Please switch to Stellar Testnet.';
    }

    if (onStatusUpdate) onStatusUpdate('Failed', userMsg);

    return {
      success: false,
      errorMessage: userMsg
    };
  }
}

/**
 * Simulates and executes Soroban tokenize_invoice() transaction via connected Stellar Wallet.
 */
export async function executeTokenizeInvoiceTx(
  params: { freelancerAddress: string; invoiceId: number },
  onStatusUpdate?: (status: 'Awaiting signature' | 'Broadcasting' | 'Confirmed' | 'Failed', msg?: string) => void
): Promise<TxExecutionResult> {
  const { freelancerAddress, invoiceId } = params;

  try {
    if (onStatusUpdate) onStatusUpdate('Awaiting signature');

    const contract = new Contract(INVOICE_CONTRACT_ID);
    const server = new rpc.Server(STELLAR_RPC_URL);

    const args = [
      nativeToScVal(BigInt(invoiceId), { type: 'u64' })
    ];

    const account = await server.getAccount(freelancerAddress);
    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: 'Test SDF Network ; September 2015'
    })
      .addOperation(contract.call('tokenize_invoice', ...args))
      .setTimeout(30)
      .build();

    const Kit = ensureStellarWalletsKitInitialized();
    const simulatedTx = await server.prepareTransaction(tx);

    const { signedTxXdr } = await Kit.signTransaction(simulatedTx.toXDR(), {
      networkPassphrase: 'Test SDF Network ; September 2015'
    });

    if (onStatusUpdate) onStatusUpdate('Broadcasting');

    const sendRes = await server.sendTransaction(
      TransactionBuilder.fromXDR(signedTxXdr, 'Test SDF Network ; September 2015')
    );

    if (sendRes.status === 'ERROR') {
      throw new Error('Soroban RPC submission error: ' + JSON.stringify(sendRes.errorResult));
    }

    let getRes = await server.getTransaction(sendRes.hash);
    let attempts = 0;
    while (getRes.status === 'NOT_FOUND' && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      getRes = await server.getTransaction(sendRes.hash);
      attempts++;
    }

    if (onStatusUpdate) onStatusUpdate('Confirmed');

    return {
      success: true,
      onChainId: invoiceId,
      txHash: sendRes.hash
    };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    let userMsg = 'Tokenization transaction failed on Stellar Testnet.';

    if (rawMsg.includes('User rejected') || rawMsg.includes('closed popup')) {
      userMsg = 'Tokenization signature declined by user.';
    }

    if (onStatusUpdate) onStatusUpdate('Failed', userMsg);

    return {
      success: false,
      errorMessage: userMsg
    };
  }
}
