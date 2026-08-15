#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, String, Symbol};


#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum InvoiceStatus {
    Created = 0,
    Tokenized = 1,
    Funded = 2,
    Repaid = 3,
    Closed = 4,
    Cancelled = 5,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum VerificationStatus {
    None = 0,
    SelfAttested = 1,
    Verified = 2,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Invoice {
    pub id: u64,
    pub freelancer: Address,
    pub client_ref: String,
    pub token_address: Address,
    pub face_value: i128,
    pub funding_amount: i128,
    pub repayment_amount: i128,
    pub due_date: u64,
    pub status: InvoiceStatus,
    pub verification: VerificationStatus,
    pub investor: Option<Address>,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    InvoiceCounter,
    Invoice(u64),
}

const TTL_THRESHOLD: u32 = 2_073_600; // ~120 days minimum
const TTL_LIMIT: u32 = 3_110_400;     // ~180 days maximum

#[contract]
pub struct InvoiceContract;

#[contractimpl]
impl InvoiceContract {
    pub fn create_invoice(
        env: Env,
        freelancer: Address,
        client_ref: String,
        token_address: Address,
        face_value: i128,
        funding_amount: i128,
        repayment_amount: i128,
        due_date: u64,
    ) -> u64 {
        freelancer.require_auth();

        let now = env.ledger().timestamp();
        if face_value <= 0 {
            panic!("face_value must be positive");
        }
        if funding_amount <= 0 {
            panic!("funding_amount must be positive");
        }
        if funding_amount >= face_value {
            panic!("funding_amount must be less than face_value");
        }
        if repayment_amount != face_value {
            panic!("repayment_amount must equal face_value");
        }
        if due_date <= now {
            panic!("due_date must be in the future");
        }
        if due_date >= now + 31_536_000 {
            panic!("due_date must be within 1 year");
        }

        let counter: u64 = env
            .storage()
            .instance()
            .get(&DataKey::InvoiceCounter)
            .unwrap_or(0u64);
        let new_id = counter + 1;

        env.storage()
            .instance()
            .set(&DataKey::InvoiceCounter, &new_id);
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_LIMIT);

        let invoice = Invoice {
            id: new_id,
            freelancer,
            client_ref,
            token_address,
            face_value,
            funding_amount,
            repayment_amount,
            due_date,
            status: InvoiceStatus::Created,
            verification: VerificationStatus::None,
            investor: None,
        };

        let key = DataKey::Invoice(new_id);
        env.storage().persistent().set(&key, &invoice);
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_LIMIT);

        new_id
    }

    pub fn get_invoice(env: Env, invoice_id: u64) -> Invoice {
        let key = DataKey::Invoice(invoice_id);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("Invoice does not exist"))
    }

    pub fn get_invoice_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::InvoiceCounter)
            .unwrap_or(0u64)
    }

    pub fn tokenize_invoice(env: Env, invoice_id: u64) {
        let key = DataKey::Invoice(invoice_id);
        let mut invoice: Invoice = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("Invoice does not exist"));

        invoice.freelancer.require_auth();

        if invoice.status != InvoiceStatus::Created {
            panic!("Invalid invoice state for tokenization");
        }

        invoice.status = InvoiceStatus::Tokenized;
        invoice.verification = VerificationStatus::SelfAttested;

        env.storage().persistent().set(&key, &invoice);
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_LIMIT);
    }

    pub fn cancel_invoice(env: Env, invoice_id: u64) {
        let key = DataKey::Invoice(invoice_id);
        let mut invoice: Invoice = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("Invoice does not exist"));

        invoice.freelancer.require_auth();

        if invoice.status != InvoiceStatus::Created && invoice.status != InvoiceStatus::Tokenized {
            panic!("Invalid invoice state for cancellation");
        }

        invoice.status = InvoiceStatus::Cancelled;

        env.storage().persistent().set(&key, &invoice);
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_LIMIT);
    }

    pub fn invest(env: Env, investor: Address, invoice_id: u64) {
        let key = DataKey::Invoice(invoice_id);
        let mut invoice: Invoice = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("Invoice does not exist"));

        investor.require_auth();

        if invoice.status != InvoiceStatus::Tokenized {
            panic!("Invalid invoice state for funding");
        }

        if investor == invoice.freelancer {
            panic!("Freelancer cannot fund own invoice");
        }

        let token_client = token::Client::new(&env, &invoice.token_address);
        token_client.transfer(&investor, &invoice.freelancer, &invoice.funding_amount);

        invoice.investor = Some(investor.clone());
        invoice.status = InvoiceStatus::Funded;

        env.storage().persistent().set(&key, &invoice);
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_LIMIT);

        env.events().publish(
            (Symbol::new(&env, "invoice_funded"), invoice_id),
            (
                invoice.freelancer.clone(),
                investor,
                invoice.funding_amount,
                invoice.token_address.clone(),
            ),
        );
    }
}

mod test;



