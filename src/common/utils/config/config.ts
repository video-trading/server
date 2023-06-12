export const config = {
  defaultStartingPage: 1,
  numberOfItemsPerPage: 10,
  // 24 hours
  preSignedUrlExpiration: 60 * 60 * 24,
  // 7 days
  jwtTokenExpiration: 60 * 60 * 24 * 7,
  // 30 minutes,
  videoLockForSaleDuration: 1,
  // 10 of videos returned when searching
  searchVideoLimit: 10,
  // 10% of the price
  tokenRewardRatio: 1,
  // mfa expiration time (300 seconds)
  mfaExpiration: 5 * 60,
  // token cache expiration time (3 minutes)
  tokenExpirationTime: 60 * 3,
};
