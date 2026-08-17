import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { FreighterModule, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { AlbedoModule, ALBEDO_ID } from '@creit.tech/stellar-wallets-kit/modules/albedo';
import { xBullModule, XBULL_ID } from '@creit.tech/stellar-wallets-kit/modules/xbull';

import { WalletId } from './types';
import { SUPPORTED_WALLETS, normalizeWalletError, formatAddress } from './walletUtils';

export { SUPPORTED_WALLETS, normalizeWalletError, formatAddress };

export const WALLET_KIT_ID_MAP: Record<WalletId, string> = {
  freighter: FREIGHTER_ID,
  albedo: ALBEDO_ID,
  xbull: XBULL_ID
};

let isInitialized = false;

export function ensureStellarWalletsKitInitialized(): typeof StellarWalletsKit {
  if (typeof window === 'undefined') {
    throw new Error('StellarWalletsKit can only be initialized on the client side');
  }

  if (!isInitialized) {
    StellarWalletsKit.init({
      network: Networks.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: [
        new FreighterModule(),
        new AlbedoModule(),
        new xBullModule()
      ]
    });
    isInitialized = true;
  }

  return StellarWalletsKit;
}
