import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import axios from 'axios';

@Injectable()
export class BlockchainService {
  /**
   * Create a new wallet
   */
  createWallet() {
    const wallet = ethers.Wallet.createRandom();
    return wallet;
  }

  /**
   * Request money from faucet
   * @param for_wallet
   */
  async requestMoney(for_wallet: string) {
    const faucetUrl = 'https://faucet.debugchain.net/api/request_money';
    const response = await axios.post(faucetUrl, {
      walletAddress: for_wallet,
    });
    return response.data;
  }
}
