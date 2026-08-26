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

function formatRpcErrorResult(errorResult: unknown): string {
  if (!errorResult) return 'Transaction submission failed on Soroban RPC.';
  try {
    if (typeof errorResult === 'string') return errorResult;
    if (typeof errorResult === 'object' && errorResult !== null) {
      if ('toXDR' in errorResult && typeof (errorResult as { toXDR: unknown }).toXDR === 'function') {
        return (errorResult as { toXDR: (f: string) => string }).toXDR('base64');
      }
      const errObj = errorResult as Record<string, unknown>;
      if (errObj.status) return String(errObj.status);
      if (errObj.code) return String(errObj.code);
      return Object.keys(errObj).join(', ');
    }
  } catch {
    // fallback
  }
  return 'Soroban RPC transaction submission error';
}

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
 * Performs RPC pre-flight check by calling get_invoice(invoiceId) on Soroban RPC.
 * Verifies invoice exists, status == Tokenized, and freelancer != investorAddress.
 */
export async function checkOnChainInvoiceStatus(
  invoiceId: number,
  investorAddress?: string
): Promise<{ valid: boolean; reason?: string; invoiceData?: unknown }> {
  try {
    const contract = new Contract(INVOICE_CONTRACT_ID);
    const server = new rpc.Server(STELLAR_RPC_URL);
    const dummyAccount = new Account('GAN5PGTFXO5ZVASEW5YTFB3F4324CDBXNNQ7GXHNHUL5C3IJVWZK2F3S', '0');

    const tx = new TransactionBuilder(dummyAccount, {
      fee: '100000',
      networkPassphrase: 'Test SDF Network ; September 2015'
    })
      .addOperation(contract.call('get_invoice', nativeToScVal(BigInt(invoiceId), { type: 'u64' })))
      .setTimeout(30)
      .build();

    const simRes = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(simRes) && simRes.result?.retval) {
      const invData = scValToNative(simRes.result.retval) as {
        id: bigint;
        freelancer: string;
        status: number | { name?: string } | string;
        investor?: string;
      };
      const freelancerStr = String(invData.freelancer || '');
      const rawStatus = typeof invData.status === 'number' ? invData.status : Number(invData.status);

      if (investorAddress && freelancerStr === investorAddress) {
        return { valid: false, reason: "You're the invoice owner. Connect a different wallet to fund.", invoiceData: invData };
      }

      if (rawStatus === 2 || String(invData.status) === 'Funded') {
        return { valid: false, reason: "This invoice is already funded on Stellar Testnet.", invoiceData: invData };
      }

      if (rawStatus !== 1 && String(invData.status) !== 'Tokenized') {
        return { valid: false, reason: `Invoice is not in Tokenized state on-chain (status code: ${invData.status}).`, invoiceData: invData };
      }

      return { valid: true, invoiceData: invData };
    }
  } catch (err) {
    console.error('[checkOnChainInvoiceStatus error]:', err);
  }
  return { valid: true };
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
      throw new Error('Soroban RPC submission error: ' + formatRpcErrorResult(sendRes.errorResult));
    }

    let getRes = await server.getTransaction(sendRes.hash);
    let attempts = 0;
    while (getRes.status === 'NOT_FOUND' && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      getRes = await server.getTransaction(sendRes.hash);
      attempts++;
    }

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
    console.error('[executeCreateInvoiceTx Error]:', err);
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
      throw new Error('Soroban RPC submission error: ' + formatRpcErrorResult(sendRes.errorResult));
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
    console.error('[executeTokenizeInvoiceTx Error]:', err);
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

/**
 * Simulates and executes Soroban invest(investor, invoice_id) transaction via connected Stellar Wallet.
 */
export async function executeInvestTx(
  params: { investorAddress: string; invoiceId: number },
  onStatusUpdate?: (status: 'Awaiting signature' | 'Broadcasting' | 'Confirmed' | 'Failed', msg?: string) => void
): Promise<TxExecutionResult> {
  const { investorAddress, invoiceId } = params;

  try {
    if (onStatusUpdate) onStatusUpdate('Awaiting signature');

    const contract = new Contract(INVOICE_CONTRACT_ID);
    const server = new rpc.Server(STELLAR_RPC_URL);

    const args = [
      new Address(investorAddress).toScVal(),
      nativeToScVal(BigInt(invoiceId), { type: 'u64' })
    ];

    const account = await server.getAccount(investorAddress);
    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: 'Test SDF Network ; September 2015'
    })
      .addOperation(contract.call('invest', ...args))
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
      throw new Error('Soroban RPC submission error: ' + formatRpcErrorResult(sendRes.errorResult));
    }

    let getRes = await server.getTransaction(sendRes.hash);
    let attempts = 0;
    while (getRes.status === 'NOT_FOUND' && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      getRes = await server.getTransaction(sendRes.hash);
      attempts++;
    }

    if (getRes.status === 'FAILED') {
      throw new Error('Soroban transaction failed on-chain execution.');
    }

    if (onStatusUpdate) onStatusUpdate('Confirmed');

    return {
      success: true,
      onChainId: invoiceId,
      txHash: sendRes.hash
    };
  } catch (err: unknown) {
    console.error('[executeInvestTx Error Details]:', err);
    const rawMsg = err instanceof Error ? err.message : String(err);
    let userMsg = 'Funding transaction failed on Stellar Testnet.';

    if (rawMsg.includes('User rejected') || rawMsg.includes('closed popup') || rawMsg.includes('declined')) {
      userMsg = 'Wallet funding request was declined by user.';
    } else if (rawMsg.includes('Insufficient balance') || rawMsg.includes('tx_insufficient_balance')) {
      userMsg = 'Insufficient Testnet XLM balance to fund invoice.';
    } else if (rawMsg.includes('Freelancer cannot fund own invoice')) {
      userMsg = "You're the invoice owner. Freelancer cannot fund own invoice.";
    } else if (rawMsg.includes('InvalidAction') || rawMsg.includes('UnreachableCodeReached') || rawMsg.includes('Invalid invoice state')) {
      userMsg = 'This invoice is already funded or not in tokenized state on-chain.';
    } else if (rawMsg) {
      userMsg = `Funding error: ${rawMsg.slice(0, 100)}`;
    }

    if (onStatusUpdate) onStatusUpdate('Failed', userMsg);

    return {
      success: false,
      errorMessage: userMsg
    };
  }
}

export interface RepayTxParams {
  repayerAddress: string;
  invoiceId: number;
}

export interface ClaimReturnsTxParams {
  investorAddress: string;
  invoiceId: number;
}

/**
 * Simulates and executes Soroban repay() transaction via connected Stellar Wallet.
 */
export async function executeRepayTx(
  params: RepayTxParams,
  onStatusUpdate?: (status: 'Awaiting signature' | 'Broadcasting' | 'Confirmed' | 'Failed', msg?: string) => void
): Promise<TxExecutionResult> {
  const { repayerAddress, invoiceId } = params;

  try {
    if (onStatusUpdate) onStatusUpdate('Awaiting signature');

    const server = new rpc.Server(STELLAR_RPC_URL);
    const contract = new Contract(INVOICE_CONTRACT_ID);

    const account = await server.getAccount(repayerAddress);

    const args = [
      new Address(repayerAddress).toScVal(),
      nativeToScVal(BigInt(invoiceId), { type: 'u64' })
    ];

    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: 'Test SDF Network ; September 2015'
    })
      .addOperation(contract.call('repay', ...args))
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
      throw new Error('Soroban RPC submission error: ' + formatRpcErrorResult(sendRes.errorResult));
    }

    let getRes = await server.getTransaction(sendRes.hash);
    let attempts = 0;
    while (getRes.status === 'NOT_FOUND' && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      getRes = await server.getTransaction(sendRes.hash);
      attempts++;
    }

    if (getRes.status === 'FAILED') {
      throw new Error('Soroban transaction failed on-chain execution.');
    }

    if (onStatusUpdate) onStatusUpdate('Confirmed');

    return {
      success: true,
      onChainId: invoiceId,
      txHash: sendRes.hash
    };
  } catch (err: unknown) {
    console.error('[executeRepayTx Error Details]:', err);
    const rawMsg = err instanceof Error ? err.message : String(err);
    let userMsg = 'Repayment transaction failed on Stellar Testnet.';

    if (rawMsg.includes('User rejected') || rawMsg.includes('closed popup') || rawMsg.includes('declined')) {
      userMsg = 'Wallet repayment request was declined by user.';
    } else if (rawMsg.includes('Insufficient balance') || rawMsg.includes('tx_insufficient_balance')) {
      userMsg = 'Insufficient Testnet XLM balance to repay invoice.';
    } else if (rawMsg.includes('Invalid invoice state for repayment') || rawMsg.includes('InvalidAction') || rawMsg.includes('UnreachableCodeReached')) {
      userMsg = 'This invoice is not in Funded state on-chain or is already repaid.';
    } else if (rawMsg) {
      userMsg = `Repayment error: ${rawMsg.slice(0, 100)}`;
    }

    if (onStatusUpdate) onStatusUpdate('Failed', userMsg);

    return {
      success: false,
      errorMessage: userMsg
    };
  }
}

/**
 * Simulates and executes Soroban claim_returns() transaction via connected Stellar Wallet.
 */
export async function executeClaimReturnsTx(
  params: ClaimReturnsTxParams,
  onStatusUpdate?: (status: 'Awaiting signature' | 'Broadcasting' | 'Confirmed' | 'Failed', msg?: string) => void
): Promise<TxExecutionResult> {
  const { investorAddress, invoiceId } = params;

  try {
    if (onStatusUpdate) onStatusUpdate('Awaiting signature');

    const server = new rpc.Server(STELLAR_RPC_URL);
    const contract = new Contract(INVOICE_CONTRACT_ID);

    const account = await server.getAccount(investorAddress);

    const args = [
      new Address(investorAddress).toScVal(),
      nativeToScVal(BigInt(invoiceId), { type: 'u64' })
    ];

    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: 'Test SDF Network ; September 2015'
    })
      .addOperation(contract.call('claim_returns', ...args))
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
      throw new Error('Soroban RPC submission error: ' + formatRpcErrorResult(sendRes.errorResult));
    }

    let getRes = await server.getTransaction(sendRes.hash);
    let attempts = 0;
    while (getRes.status === 'NOT_FOUND' && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      getRes = await server.getTransaction(sendRes.hash);
      attempts++;
    }

    if (getRes.status === 'FAILED') {
      throw new Error('Soroban transaction failed on-chain execution.');
    }

    if (onStatusUpdate) onStatusUpdate('Confirmed');

    return {
      success: true,
      onChainId: invoiceId,
      txHash: sendRes.hash
    };
  } catch (err: unknown) {
    console.error('[executeClaimReturnsTx Error Details]:', err);
    const rawMsg = err instanceof Error ? err.message : String(err);
    let userMsg = 'Claim returns transaction failed on Stellar Testnet.';

    if (rawMsg.includes('User rejected') || rawMsg.includes('closed popup') || rawMsg.includes('declined')) {
      userMsg = 'Wallet claim request was declined by user.';
    } else if (rawMsg.includes('Caller is not the recorded investor')) {
      userMsg = 'Only the recorded investor wallet can claim returns for this invoice.';
    } else if (rawMsg.includes('Invalid invoice state for claim') || rawMsg.includes('InvalidAction') || rawMsg.includes('UnreachableCodeReached')) {
      userMsg = 'This invoice is not in Repaid state on-chain or returns have already been claimed.';
    } else if (rawMsg) {
      userMsg = `Claim returns error: ${rawMsg.slice(0, 100)}`;
    }

    if (onStatusUpdate) onStatusUpdate('Failed', userMsg);

    return {
      success: false,
      errorMessage: userMsg
    };
  }
}
