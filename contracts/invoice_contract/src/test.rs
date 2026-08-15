#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup_test() -> (Env, InvoiceContractClient<'static>, Address, String, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoiceContract, ());
    let client = InvoiceContractClient::new(&env, &contract_id);
    let freelancer = Address::generate(&env);
    let token_address = Address::generate(&env);
    let client_ref = String::from_str(&env, "clt_7f3a1290b");
    (env, client, freelancer, client_ref, token_address)
}

#[test]
fn test_create_invoice_success_and_getters() {
    let (env, client, freelancer, client_ref, token_address) = setup_test();

    assert_eq!(client.get_invoice_count(), 0);

    let due_date = env.ledger().timestamp() + 86400;
    let id1 = client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address,
        &1000,
        &950,
        &1000,
        &due_date,
    );

    assert_eq!(id1, 1);
    assert_eq!(client.get_invoice_count(), 1);

    let inv1 = client.get_invoice(&1);
    assert_eq!(inv1.id, 1);
    assert_eq!(inv1.freelancer, freelancer);
    assert_eq!(inv1.client_ref, client_ref);
    assert_eq!(inv1.token_address, token_address);
    assert_eq!(inv1.face_value, 1000);
    assert_eq!(inv1.funding_amount, 950);
    assert_eq!(inv1.repayment_amount, 1000);
    assert_eq!(inv1.due_date, due_date);
    assert_eq!(inv1.status, InvoiceStatus::Created);
    assert_eq!(inv1.verification, VerificationStatus::None);
    assert_eq!(inv1.investor, None);

    let id2 = client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address,
        &2000,
        &1900,
        &2000,
        &due_date,
    );

    assert_eq!(id2, 2);
    assert_eq!(client.get_invoice_count(), 2);
}

#[test]
#[should_panic(expected = "face_value must be positive")]
fn test_create_invoice_invalid_face_value() {
    let (env, client, freelancer, client_ref, token_address) = setup_test();
    let due_date = env.ledger().timestamp() + 86400;
    client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address,
        &0,
        &950,
        &0,
        &due_date,
    );
}

#[test]
#[should_panic(expected = "funding_amount must be positive")]
fn test_create_invoice_invalid_funding_amount_zero() {
    let (env, client, freelancer, client_ref, token_address) = setup_test();
    let due_date = env.ledger().timestamp() + 86400;
    client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address,
        &1000,
        &0,
        &1000,
        &due_date,
    );
}

#[test]
#[should_panic(expected = "funding_amount must be less than face_value")]
fn test_create_invoice_invalid_funding_amount_greater_or_equal() {
    let (env, client, freelancer, client_ref, token_address) = setup_test();
    let due_date = env.ledger().timestamp() + 86400;
    client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address,
        &1000,
        &1000,
        &1000,
        &due_date,
    );
}

#[test]
#[should_panic(expected = "repayment_amount must equal face_value")]
fn test_create_invoice_invalid_repayment_amount() {
    let (env, client, freelancer, client_ref, token_address) = setup_test();
    let due_date = env.ledger().timestamp() + 86400;
    client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address,
        &1000,
        &950,
        &900,
        &due_date,
    );
}

#[test]
#[should_panic(expected = "due_date must be in the future")]
fn test_create_invoice_invalid_due_date_past() {
    let (env, client, freelancer, client_ref, token_address) = setup_test();
    let due_date = env.ledger().timestamp();
    client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address,
        &1000,
        &950,
        &1000,
        &due_date,
    );
}

#[test]
#[should_panic(expected = "due_date must be within 1 year")]
fn test_create_invoice_invalid_due_date_over_year() {
    let (env, client, freelancer, client_ref, token_address) = setup_test();
    let due_date = env.ledger().timestamp() + 31_536_000;
    client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address,
        &1000,
        &950,
        &1000,
        &due_date,
    );
}

#[test]
fn test_tokenize_invoice_success() {
    let (env, client, freelancer, client_ref, token_address) = setup_test();
    let due_date = env.ledger().timestamp() + 86400;
    let id = client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address,
        &1000,
        &950,
        &1000,
        &due_date,
    );

    client.tokenize_invoice(&id);

    let inv = client.get_invoice(&id);
    assert_eq!(inv.status, InvoiceStatus::Tokenized);
    assert_eq!(inv.verification, VerificationStatus::SelfAttested);
}

#[test]
#[should_panic(expected = "Invalid invoice state for tokenization")]
fn test_tokenize_invoice_already_tokenized() {
    let (env, client, freelancer, client_ref, token_address) = setup_test();
    let due_date = env.ledger().timestamp() + 86400;
    let id = client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address,
        &1000,
        &950,
        &1000,
        &due_date,
    );

    client.tokenize_invoice(&id);
    client.tokenize_invoice(&id);
}

#[test]
#[should_panic(expected = "Invoice does not exist")]
fn test_tokenize_invoice_nonexistent() {
    let (_env, client, _freelancer, _client_ref, _token_address) = setup_test();
    client.tokenize_invoice(&999);
}

#[test]
fn test_cancel_created_invoice_success() {
    let (env, client, freelancer, client_ref, token_address) = setup_test();
    let due_date = env.ledger().timestamp() + 86400;
    let id = client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address,
        &1000,
        &950,
        &1000,
        &due_date,
    );

    client.cancel_invoice(&id);

    let inv = client.get_invoice(&id);
    assert_eq!(inv.status, InvoiceStatus::Cancelled);
}

#[test]
fn test_cancel_tokenized_invoice_success() {
    let (env, client, freelancer, client_ref, token_address) = setup_test();
    let due_date = env.ledger().timestamp() + 86400;
    let id = client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address,
        &1000,
        &950,
        &1000,
        &due_date,
    );

    client.tokenize_invoice(&id);
    client.cancel_invoice(&id);

    let inv = client.get_invoice(&id);
    assert_eq!(inv.status, InvoiceStatus::Cancelled);
}

#[test]
#[should_panic(expected = "Invalid invoice state for cancellation")]
fn test_cancel_already_cancelled_invoice() {
    let (env, client, freelancer, client_ref, token_address) = setup_test();
    let due_date = env.ledger().timestamp() + 86400;
    let id = client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address,
        &1000,
        &950,
        &1000,
        &due_date,
    );

    client.cancel_invoice(&id);
    client.cancel_invoice(&id);
}

#[test]
#[should_panic(expected = "Invoice does not exist")]
fn test_cancel_nonexistent_invoice() {
    let (_env, client, _freelancer, _client_ref, _token_address) = setup_test();
    client.cancel_invoice(&999);
}

#[test]
#[should_panic(expected = "Invoice does not exist")]
fn test_get_nonexistent_invoice() {
    let (_env, client, _freelancer, _client_ref, _token_address) = setup_test();
    client.get_invoice(&999);
}

#[test]
fn test_getters_are_pure_reads() {
    let (env, client, freelancer, client_ref, token_address) = setup_test();
    let due_date = env.ledger().timestamp() + 86400;
    let id = client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address,
        &1000,
        &950,
        &1000,
        &due_date,
    );

    let count1 = client.get_invoice_count();
    let inv1 = client.get_invoice(&id);
    let count2 = client.get_invoice_count();
    let inv2 = client.get_invoice(&id);

    assert_eq!(count1, count2);
    assert_eq!(inv1, inv2);
    assert_eq!(inv1.status, InvoiceStatus::Created);
}

#[test]
#[should_panic]
fn test_tokenize_invoice_unauthorized_caller() {
    use soroban_sdk::testutils::{MockAuth, MockAuthInvoke};
    use soroban_sdk::IntoVal;

    let env = Env::default();
    let contract_id = env.register(InvoiceContract, ());
    let client = InvoiceContractClient::new(&env, &contract_id);
    let freelancer_a = Address::generate(&env);
    let freelancer_b = Address::generate(&env);
    let token_address = Address::generate(&env);
    let client_ref = String::from_str(&env, "clt_7f3a1290b");
    let due_date = env.ledger().timestamp() + 86400;

    env.mock_auths(&[MockAuth {
        address: &freelancer_a,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "create_invoice",
            args: (
                &freelancer_a,
                &client_ref,
                &token_address,
                &1000i128,
                &950i128,
                &1000i128,
                &due_date,
            )
                .into_val(&env),
            sub_invokes: &[],
        },
    }]);
    let id = client.create_invoice(
        &freelancer_a,
        &client_ref,
        &token_address,
        &1000,
        &950,
        &1000,
        &due_date,
    );

    // Freelancer B attempts tokenization on Freelancer A's invoice -> must fail authorization
    env.mock_auths(&[MockAuth {
        address: &freelancer_b,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "tokenize_invoice",
            args: (&id,).into_val(&env),
            sub_invokes: &[],
        },
    }]);
    client.tokenize_invoice(&id);
}

#[test]
#[should_panic]
fn test_cancel_invoice_unauthorized_caller() {
    use soroban_sdk::testutils::{MockAuth, MockAuthInvoke};
    use soroban_sdk::IntoVal;

    let env = Env::default();
    let contract_id = env.register(InvoiceContract, ());
    let client = InvoiceContractClient::new(&env, &contract_id);
    let freelancer_a = Address::generate(&env);
    let freelancer_b = Address::generate(&env);
    let token_address = Address::generate(&env);
    let client_ref = String::from_str(&env, "clt_7f3a1290b");
    let due_date = env.ledger().timestamp() + 86400;

    env.mock_auths(&[MockAuth {
        address: &freelancer_a,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "create_invoice",
            args: (
                &freelancer_a,
                &client_ref,
                &token_address,
                &1000i128,
                &950i128,
                &1000i128,
                &due_date,
            )
                .into_val(&env),
            sub_invokes: &[],
        },
    }]);
    let id = client.create_invoice(
        &freelancer_a,
        &client_ref,
        &token_address,
        &1000,
        &950,
        &1000,
        &due_date,
    );

    // Freelancer B attempts cancellation on Freelancer A's invoice -> must fail authorization
    env.mock_auths(&[MockAuth {
        address: &freelancer_b,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "cancel_invoice",
            args: (&id,).into_val(&env),
            sub_invokes: &[],
        },
    }]);
    client.cancel_invoice(&id);
}



