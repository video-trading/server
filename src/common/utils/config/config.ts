export const config = {
  defaultStartingPage: 1,
  numberOfItemsPerPage: 10,
  preSignedUrlExpiration: 60 * 60 * 24, // 24 hours
  jwtTokenExpiration: 60 * 60 * 24 * 7, // 7 days
  videoLockForSaleDuration: 1, // 30 minutes,
  searchVideoLimit: 10, // number of videos returned when searching
};
