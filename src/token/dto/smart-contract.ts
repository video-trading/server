import { z } from 'zod';

export const SmartContract = z.object({
  balanceOf: z.function(z.tuple([z.string()]), z.any().promise()),
  // function reward(address _to, uint256 _amount) public onlyOwner
  reward: z.function(z.tuple([z.string(), z.number()]), z.any()),
  // function purchase(address _to, uint256 _amount) public
  purchase: z.function(z.tuple([z.string(), z.number()]), z.any().promise()),
  //  function canPurchase(address _from, address _to, uint256 _amount) public view returns (bool)
  canPurchase: z.function(
    z.tuple([z.string(), z.string(), z.number()]),
    z.boolean().promise(),
  ),
});
