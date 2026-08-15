#![cfg(test)]
extern crate std;

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
    let _freelancer_b = Address::generate(&env);
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

    client.cancel_invoice(&id);
}

fn setup_test_with_token() -> (
    Env,
    InvoiceContractClient<'static>,
    Address,
    String,
    Address,
    token::Client<'static>,
    token::StellarAssetClient<'static>,
    Address,
) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoiceContract, ());
    let client = InvoiceContractClient::new(&env, &contract_id);
    let freelancer = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin);
    let token_address = sac.address().clone();
    let token_client = token::Client::new(&env, &token_address);
    let stellar_asset_client = token::StellarAssetClient::new(&env, &token_address);
    let client_ref = String::from_str(&env, "clt_7f3a1290b");
    let investor = Address::generate(&env);
    (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        token_client,
        stellar_asset_client,
        investor,
    )
}

#[test]
fn test_invest_happy_path_and_event() {
    use soroban_sdk::testutils::Events;

    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        token_client,
        stellar_asset_client,
        investor,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&investor, &1000i128);
    assert_eq!(token_client.balance(&investor), 1000);
    assert_eq!(token_client.balance(&freelancer), 0);

    client.invest(&investor, &id);

    let events = env.events().all();
    assert_ne!(events, std::vec![]);

    assert_eq!(token_client.balance(&investor), 50);
    assert_eq!(token_client.balance(&freelancer), 950);

    let inv = client.get_invoice(&id);
    assert_eq!(inv.status, InvoiceStatus::Funded);
    assert_eq!(inv.investor, Some(investor.clone()));
}

#[test]
#[should_panic(expected = "Freelancer cannot fund own invoice")]
fn test_invest_freelancer_cannot_fund_own_invoice() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        stellar_asset_client,
        _investor,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&freelancer, &1000i128);
    client.invest(&freelancer, &id);
}

#[test]
#[should_panic]
fn test_invest_unauthorized_investor() {
    use soroban_sdk::testutils::{MockAuth, MockAuthInvoke};
    use soroban_sdk::IntoVal;

    let env = Env::default();
    let contract_id = env.register(InvoiceContract, ());
    let client = InvoiceContractClient::new(&env, &contract_id);
    let freelancer = Address::generate(&env);
    let investor_a = Address::generate(&env);
    let investor_b = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin);
    let token_address = sac.address().clone();
    let stellar_asset_client = token::StellarAssetClient::new(&env, &token_address);
    let client_ref = String::from_str(&env, "clt_7f3a1290b");
    let due_date = env.ledger().timestamp() + 86400;

    env.mock_auths(&[MockAuth {
        address: &freelancer,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "create_invoice",
            args: (
                &freelancer,
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
        &freelancer,
        &client_ref,
        &token_address,
        &1000,
        &950,
        &1000,
        &due_date,
    );

    env.mock_auths(&[MockAuth {
        address: &freelancer,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "tokenize_invoice",
            args: (&id,).into_val(&env),
            sub_invokes: &[],
        },
    }]);
    client.tokenize_invoice(&id);

    env.mock_auths(&[MockAuth {
        address: &token_address,
        invoke: &MockAuthInvoke {
            contract: &token_address,
            fn_name: "mint",
            args: (&investor_a, &1000i128).into_val(&env),
            sub_invokes: &[],
        },
    }]);
    stellar_asset_client.mint(&investor_a, &1000i128);

    env.mock_auths(&[MockAuth {
        address: &investor_b,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "invest",
            args: (&investor_a, &id).into_val(&env),
            sub_invokes: &[],
        },
    }]);
    client.invest(&investor_a, &id);
}

#[test]
#[should_panic(expected = "Invoice does not exist")]
fn test_invest_nonexistent_invoice() {
    let (
        _env,
        client,
        _freelancer,
        _client_ref,
        _token_address,
        _token_client,
        _stellar_asset_client,
        investor,
    ) = setup_test_with_token();
    client.invest(&investor, &999);
}

#[test]
#[should_panic(expected = "Invalid invoice state for funding")]
fn test_invest_before_tokenization_fails() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        stellar_asset_client,
        investor,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&investor, &1000i128);
    client.invest(&investor, &id);
}

#[test]
#[should_panic(expected = "Invalid invoice state for funding")]
fn test_invest_already_funded_invoice_fails() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        stellar_asset_client,
        investor,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&investor, &2000i128);
    client.invest(&investor, &id);

    client.invest(&investor, &id);
}

#[test]
#[should_panic(expected = "Invalid invoice state for funding")]
fn test_invest_cancelled_invoice_fails() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        stellar_asset_client,
        investor,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&investor, &1000i128);
    client.invest(&investor, &id);
}

#[test]
fn test_invest_insufficient_token_balance_fails_and_atomicity() {
    use soroban_sdk::testutils::Events;

    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        token_client,
        stellar_asset_client,
        investor,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&investor, &500i128);
    assert_eq!(token_client.balance(&investor), 500);

    let res = client.try_invest(&investor, &id);
    assert!(res.is_err());
    assert_eq!(env.events().all(), std::vec![]);

    let inv = client.get_invoice(&id);
    assert_eq!(inv.status, InvoiceStatus::Tokenized);
    assert_eq!(inv.investor, None);
    assert_eq!(token_client.balance(&investor), 500);
    assert_eq!(token_client.balance(&freelancer), 0);
}

#[test]
fn test_repay_happy_path() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        token_client,
        stellar_asset_client,
        investor,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&investor, &1000i128);
    client.invest(&investor, &id);

    let repayer = Address::generate(&env);
    stellar_asset_client.mint(&repayer, &1000i128);
    assert_eq!(token_client.balance(&repayer), 1000);
    assert_eq!(token_client.balance(&client.address), 0);

    client.repay(&repayer, &id);

    assert_eq!(token_client.balance(&repayer), 0);
    assert_eq!(token_client.balance(&client.address), 1000);

    let inv = client.get_invoice(&id);
    assert_eq!(inv.status, InvoiceStatus::Repaid);
}

#[test]
#[should_panic]
fn test_repay_unauthorized_repayer() {
    use soroban_sdk::testutils::{MockAuth, MockAuthInvoke};
    use soroban_sdk::IntoVal;

    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        stellar_asset_client,
        investor,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&investor, &1000i128);
    client.invest(&investor, &id);

    let repayer_a = Address::generate(&env);
    let repayer_b = Address::generate(&env);
    stellar_asset_client.mint(&repayer_a, &1000i128);

    // Disable mock_all_auths to test explicit auth check
    env.mock_auths(&[MockAuth {
        address: &repayer_b,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "repay",
            args: (&repayer_a, &id).into_val(&env),
            sub_invokes: &[],
        },
    }]);

    client.repay(&repayer_a, &id);
}

#[test]
#[should_panic(expected = "Invoice does not exist")]
fn test_repay_nonexistent_invoice() {
    let (
        _env,
        client,
        _freelancer,
        _client_ref,
        _token_address,
        _token_client,
        _stellar_asset_client,
        investor,
    ) = setup_test_with_token();

    client.repay(&investor, &999);
}

#[test]
#[should_panic(expected = "Invalid invoice state for repayment")]
fn test_repay_created_invoice_fails() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        stellar_asset_client,
        repayer,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&repayer, &1000i128);
    client.repay(&repayer, &id);
}

#[test]
#[should_panic(expected = "Invalid invoice state for repayment")]
fn test_repay_tokenized_invoice_fails() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        stellar_asset_client,
        repayer,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&repayer, &1000i128);
    client.repay(&repayer, &id);
}

#[test]
#[should_panic(expected = "Invalid invoice state for repayment")]
fn test_repay_cancelled_invoice_fails() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        stellar_asset_client,
        repayer,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&repayer, &1000i128);
    client.repay(&repayer, &id);
}

#[test]
#[should_panic(expected = "Invalid invoice state for repayment")]
fn test_repay_already_repaid_invoice_fails() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        stellar_asset_client,
        investor,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&investor, &1000i128);
    client.invest(&investor, &id);

    let repayer = Address::generate(&env);
    stellar_asset_client.mint(&repayer, &2000i128);
    client.repay(&repayer, &id);

    // Second repayment attempt -> must panic
    client.repay(&repayer, &id);
}

#[test]
fn test_repay_insufficient_balance_and_atomicity() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        token_client,
        stellar_asset_client,
        investor,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&investor, &1000i128);
    client.invest(&investor, &id);

    let repayer = Address::generate(&env);
    // Mint ONLY $500 to repayer (repayment_amount is $1000)
    stellar_asset_client.mint(&repayer, &500i128);

    let res = client.try_repay(&repayer, &id);
    assert!(res.is_err());

    // ATOMICITY ASSERTIONS
    let inv = client.get_invoice(&id);
    assert_eq!(inv.status, InvoiceStatus::Funded);
    assert_eq!(token_client.balance(&repayer), 500);
    assert_eq!(token_client.balance(&client.address), 0);
}

#[test]
fn test_repay_uses_invoice_token_address() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address_1,
        token_client_1,
        stellar_asset_client_1,
        investor,
    ) = setup_test_with_token();

    // Create second token
    let token_admin_2 = Address::generate(&env);
    let sac_2 = env.register_stellar_asset_contract_v2(token_admin_2);
    let token_address_2 = sac_2.address().clone();
    let token_client_2 = token::Client::new(&env, &token_address_2);
    let stellar_asset_client_2 = token::StellarAssetClient::new(&env, &token_address_2);

    let due_date = env.ledger().timestamp() + 86400;

    // Invoice 1 uses Token 1
    let id1 = client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address_1,
        &1000,
        &950,
        &1000,
        &due_date,
    );

    // Invoice 2 uses Token 2
    let id2 = client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address_2,
        &1000,
        &950,
        &1000,
        &due_date,
    );

    client.tokenize_invoice(&id1);
    client.tokenize_invoice(&id2);

    stellar_asset_client_1.mint(&investor, &1000i128);
    stellar_asset_client_2.mint(&investor, &1000i128);

    client.invest(&investor, &id1);
    client.invest(&investor, &id2);

    let repayer = Address::generate(&env);
    stellar_asset_client_1.mint(&repayer, &1000i128);
    stellar_asset_client_2.mint(&repayer, &1000i128);

    // Repay Invoice 1 -> must transfer Token 1 to contract address
    client.repay(&repayer, &id1);

    assert_eq!(token_client_1.balance(&client.address), 1000);
    assert_eq!(token_client_2.balance(&client.address), 0);
    assert_eq!(client.get_invoice(&id1).status, InvoiceStatus::Repaid);
    assert_eq!(client.get_invoice(&id2).status, InvoiceStatus::Funded);
}

#[test]
fn test_claim_returns_happy_path() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        token_client,
        stellar_asset_client,
        investor,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&investor, &1000i128);
    client.invest(&investor, &id);

    let repayer = Address::generate(&env);
    stellar_asset_client.mint(&repayer, &1000i128);
    client.repay(&repayer, &id);

    assert_eq!(token_client.balance(&investor), 50);
    assert_eq!(token_client.balance(&client.address), 1000);

    client.claim_returns(&investor, &id);

    assert_eq!(token_client.balance(&investor), 1050);
    assert_eq!(token_client.balance(&client.address), 0);

    let inv = client.get_invoice(&id);
    assert_eq!(inv.status, InvoiceStatus::Closed);
}

#[test]
#[should_panic(expected = "Caller is not the recorded investor")]
fn test_claim_returns_wrong_investor_fails() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        stellar_asset_client,
        investor_a,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&investor_a, &1000i128);
    client.invest(&investor_a, &id);

    let repayer = Address::generate(&env);
    stellar_asset_client.mint(&repayer, &1000i128);
    client.repay(&repayer, &id);

    let investor_b = Address::generate(&env);
    client.claim_returns(&investor_b, &id);
}

#[test]
#[should_panic]
fn test_claim_returns_unauthorized_investor() {
    use soroban_sdk::testutils::{MockAuth, MockAuthInvoke};
    use soroban_sdk::IntoVal;

    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        stellar_asset_client,
        investor_a,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&investor_a, &1000i128);
    client.invest(&investor_a, &id);

    let repayer = Address::generate(&env);
    stellar_asset_client.mint(&repayer, &1000i128);
    client.repay(&repayer, &id);

    let investor_b = Address::generate(&env);

    env.mock_auths(&[MockAuth {
        address: &investor_b,
        invoke: &MockAuthInvoke {
            contract: &client.address,
            fn_name: "claim_returns",
            args: (&investor_a, &id).into_val(&env),
            sub_invokes: &[],
        },
    }]);

    client.claim_returns(&investor_a, &id);
}

#[test]
#[should_panic(expected = "Invoice does not exist")]
fn test_claim_returns_nonexistent_invoice() {
    let (
        _env,
        client,
        _freelancer,
        _client_ref,
        _token_address,
        _token_client,
        _stellar_asset_client,
        investor,
    ) = setup_test_with_token();

    client.claim_returns(&investor, &999);
}

#[test]
#[should_panic(expected = "Invalid invoice state for claim")]
fn test_claim_returns_created_invoice_fails() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        _stellar_asset_client,
        investor,
    ) = setup_test_with_token();

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

    client.claim_returns(&investor, &id);
}

#[test]
#[should_panic(expected = "Invalid invoice state for claim")]
fn test_claim_returns_tokenized_invoice_fails() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        _stellar_asset_client,
        investor,
    ) = setup_test_with_token();

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

    client.claim_returns(&investor, &id);
}

#[test]
#[should_panic(expected = "Invalid invoice state for claim")]
fn test_claim_returns_funded_invoice_fails() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        stellar_asset_client,
        investor,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&investor, &1000i128);
    client.invest(&investor, &id);

    client.claim_returns(&investor, &id);
}

#[test]
#[should_panic(expected = "Invalid invoice state for claim")]
fn test_claim_returns_cancelled_invoice_fails() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        _stellar_asset_client,
        investor,
    ) = setup_test_with_token();

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

    client.claim_returns(&investor, &id);
}

#[test]
#[should_panic(expected = "Invalid invoice state for claim")]
fn test_claim_returns_double_claim_closed_fails() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        stellar_asset_client,
        investor,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&investor, &1000i128);
    client.invest(&investor, &id);

    let repayer = Address::generate(&env);
    stellar_asset_client.mint(&repayer, &1000i128);
    client.repay(&repayer, &id);

    client.claim_returns(&investor, &id);
    client.claim_returns(&investor, &id);
}

#[test]
fn test_claim_returns_insufficient_contract_escrow_and_atomicity() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        token_client,
        stellar_asset_client,
        investor,
    ) = setup_test_with_token();

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

    stellar_asset_client.mint(&investor, &1000i128);
    client.invest(&investor, &id);

    // Manually transition invoice to Repaid without funding contract escrow
    env.as_contract(&client.address, || {
        let key = DataKey::Invoice(id);
        let mut inv: Invoice = env.storage().persistent().get(&key).unwrap();
        inv.status = InvoiceStatus::Repaid;
        env.storage().persistent().set(&key, &inv);
    });

    // Contract address has 0 tokens (insufficient for 1000 repayment_amount)
    assert_eq!(token_client.balance(&client.address), 0);

    let res = client.try_claim_returns(&investor, &id);
    assert!(res.is_err());

    // ATOMICITY ASSERTIONS
    let inv = client.get_invoice(&id);
    assert_eq!(inv.status, InvoiceStatus::Repaid);
    assert_eq!(inv.investor, Some(investor.clone()));
    assert_eq!(token_client.balance(&investor), 50);
}

#[test]
fn test_claim_returns_shared_contract_balance_multi_invoice() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        token_client,
        stellar_asset_client,
        investor_a,
    ) = setup_test_with_token();

    let investor_b = Address::generate(&env);
    let due_date = env.ledger().timestamp() + 86400;

    let id_a = client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address,
        &1000,
        &950,
        &1000,
        &due_date,
    );
    let id_b = client.create_invoice(
        &freelancer,
        &client_ref,
        &token_address,
        &2000,
        &1800,
        &2000,
        &due_date,
    );

    client.tokenize_invoice(&id_a);
    client.tokenize_invoice(&id_b);

    stellar_asset_client.mint(&investor_a, &1000i128);
    stellar_asset_client.mint(&investor_b, &2000i128);

    client.invest(&investor_a, &id_a);
    client.invest(&investor_b, &id_b);

    let repayer = Address::generate(&env);
    stellar_asset_client.mint(&repayer, &3000i128);

    client.repay(&repayer, &id_a);
    client.repay(&repayer, &id_b);

    assert_eq!(token_client.balance(&client.address), 3000);

    client.claim_returns(&investor_a, &id_a);

    assert_eq!(token_client.balance(&investor_a), 1050);
    assert_eq!(token_client.balance(&client.address), 2000);

    assert_eq!(client.get_invoice(&id_a).status, InvoiceStatus::Closed);
    assert_eq!(client.get_invoice(&id_b).status, InvoiceStatus::Repaid);
}

#[test]
fn test_extend_invoice_ttl_success() {
    let (
        env,
        client,
        freelancer,
        client_ref,
        token_address,
        _token_client,
        _stellar_asset_client,
        _investor,
    ) = setup_test_with_token();

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

    let inv_before = client.get_invoice(&id);

    client.extend_invoice_ttl(&id);

    let inv_after = client.get_invoice(&id);

    assert_eq!(inv_before.id, inv_after.id);
    assert_eq!(inv_before.freelancer, inv_after.freelancer);
    assert_eq!(inv_before.client_ref, inv_after.client_ref);
    assert_eq!(inv_before.token_address, inv_after.token_address);
    assert_eq!(inv_before.face_value, inv_after.face_value);
    assert_eq!(inv_before.funding_amount, inv_after.funding_amount);
    assert_eq!(inv_before.repayment_amount, inv_after.repayment_amount);
    assert_eq!(inv_before.due_date, inv_after.due_date);
    assert_eq!(inv_before.status, inv_after.status);
    assert_eq!(inv_before.verification, inv_after.verification);
    assert_eq!(inv_before.investor, inv_after.investor);
}

#[test]
#[should_panic(expected = "Invoice does not exist")]
fn test_extend_invoice_ttl_nonexistent_fails() {
    let (
        _env,
        client,
        _freelancer,
        _client_ref,
        _token_address,
        _token_client,
        _stellar_asset_client,
        _investor,
    ) = setup_test_with_token();

    client.extend_invoice_ttl(&999);
}






