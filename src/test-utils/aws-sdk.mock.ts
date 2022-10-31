export const S3 = jest.fn().mockImplementation(() => ({
  getSignedUrlPromise: jest.fn().mockResolvedValue('https://example.com'),
}));
