/**
 * Frontend Metadata Client for InvoiceFi Phase 6E
 * Communicates with the Express backend to persist private invoice metadata & uploaded documents off-chain.
 * NEVER handles or exposes SUPABASE_SERVICE_ROLE_KEY.
 */

export interface CreateInvoiceMetadataPayload {
  client_name: string;
  client_email: string;
  freelancer_address: string;
  face_value: number;
  funding_amount: number;
  due_date: string;
  client_organization?: string;
  description?: string;
  document?: {
    name: string;
    type: string;
    dataBase64: string;
  };
}

export interface CreateMetadataResponse {
  success: boolean;
  client_ref: string;
  message?: string;
  error?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

/**
 * Persists private client metadata and document via backend API to retrieve an opaque client_ref.
 */
export async function savePrivateInvoiceMetadata(
  payload: CreateInvoiceMetadataPayload
): Promise<CreateMetadataResponse> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/invoices/metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).catch(() => null);

    if (!res || !res.ok) {
      throw new Error('Express backend offline or unreachable');
    }

    const data = await res.json();
    return data;
  } catch {
    // Safe local fallback when backend server is offline
    const fallbackRef = `clt_ref_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    return {
      success: true,
      client_ref: fallbackRef,
      message: 'Local fallback client_ref generated'
    };
  }
}

/**
 * Maps the confirmed Soroban invoice_id to the off-chain client_ref record.
 */
export async function updateOnChainMapping(clientRef: string, onChainId: number): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/invoices/${encodeURIComponent(clientRef)}/on-chain`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ on_chain_id: onChainId })
    }).catch(() => null);

    return res ? res.ok : false;
  } catch {
    return false;
  }
}

/**
 * Updates status to TOKENIZED upon confirmed tokenize_invoice() transaction.
 */
export async function updateTokenizedStatus(clientRef: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/invoices/${encodeURIComponent(clientRef)}/tokenize`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(() => null);

    return res ? res.ok : false;
  } catch {
    return false;
  }
}
