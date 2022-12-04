import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ethers } from 'ethers';
import axios from 'axios';
import { Environments } from '../common/environment';

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
    try {
      const faucetUrl = Environments.faucet_url;
      const response = await axios.post(faucetUrl, {
        walletAddress: for_wallet,
      });
      return response.data;
    } catch (e) {
      throw new InternalServerErrorException(
        null,
        'Error requesting money from faucet',
      );
    }
  }
}
