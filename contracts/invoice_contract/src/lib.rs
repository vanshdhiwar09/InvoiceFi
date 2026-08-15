#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Env, Symbol};

#[contract]
pub struct InvoiceContract;

#[contractimpl]
impl InvoiceContract {
    pub fn ping(_env: Env) -> Symbol {
        symbol_short!("pong")
    }
}

mod test;

