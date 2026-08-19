import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeWalletError,
  formatAddress,
  SUPPORTED_WALLETS
} from '../walletUtils.ts';

test('Wallet Abstraction Unit Tests', async (t) => {
  await t.test('1. Initial Disconnected & Provider Setup', () => {
    assert.equal(SUPPORTED_WALLETS.length, 3);
    assert.equal(SUPPORTED_WALLETS[0].id, 'freighter');
    assert.equal(SUPPORTED_WALLETS[1].id, 'albedo');
    assert.equal(SUPPORTED_WALLETS[2].id, 'xbull');
  });

  await t.test('2. Public Key Address Formatting', () => {
    assert.equal(formatAddress(null), '');
    assert.equal(formatAddress(''), '');
    assert.equal(
      formatAddress('CCG2BPR7NEQPV4XOLABSZOWSU24CBJXF4V7LEXIXMAMBPIL6P5CPO2YR'),
      'CCG2…O2YR'
    );
  });

  await t.test('3. User Rejection Error Normalization', () => {
    const errFreighter = normalizeWalletError('User rejected request', 'freighter');
    assert.equal(errFreighter.category, 'USER_REJECTED');
    assert.equal(errFreighter.walletId, 'freighter');
    assert.equal(errFreighter.message, 'Freighter request was rejected. You can try again.');

    const errAlbedo = normalizeWalletError({ message: 'User closed the window' }, 'albedo');
    assert.equal(errAlbedo.category, 'USER_REJECTED');
    assert.equal(errAlbedo.walletId, 'albedo');
    assert.equal(errAlbedo.message, 'Albedo request was rejected. You can try again.');

    const errXbull = normalizeWalletError('Operation canceled by user', 'xbull');
    assert.equal(errXbull.category, 'USER_REJECTED');
    assert.equal(errXbull.walletId, 'xbull');
    assert.equal(errXbull.message, 'xBull request was rejected. You can try again.');
  });

  await t.test('4. Network Mismatch Error Normalization', () => {
    const errNetwork = normalizeWalletError('Wallet is configured for Mainnet', 'freighter');
    assert.equal(errNetwork.category, 'NETWORK_MISMATCH');
    assert.equal(errNetwork.walletId, 'freighter');
    assert.equal(errNetwork.message, 'Switch your wallet to Stellar Testnet to continue.');

    const errPublicNet = normalizeWalletError('Public Global Stellar Network', 'albedo');
    assert.equal(errPublicNet.category, 'NETWORK_MISMATCH');
    assert.equal(errPublicNet.walletId, 'albedo');
    assert.equal(errPublicNet.message, 'Switch your wallet to Stellar Testnet to continue.');
  });

  await t.test('5. Wallet Not Found Error Normalization', () => {
    const errMissing = normalizeWalletError('Freighter is not installed in window', 'freighter');
    assert.equal(errMissing.category, 'WALLET_NOT_FOUND');
    assert.match(errMissing.message, /Freighter is not installed/);
  });

  await t.test('6. Insufficient Balance Error Normalization', () => {
    const errBalance = normalizeWalletError('Insufficient balance to submit op', 'albedo');
    assert.equal(errBalance.category, 'INSUFFICIENT_BALANCE');
    assert.match(errBalance.message, /Insufficient XLM balance/);
  });
});
