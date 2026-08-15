#![cfg(test)]

use super::*;
use soroban_sdk::{symbol_short, Env};

#[test]
fn test_ping() {
    let env = Env::default();
    let contract_id = env.register(InvoiceContract, ());
    let client = InvoiceContractClient::new(&env, &contract_id);

    let result = client.ping();
    assert_eq!(result, symbol_short!("pong"));
}

