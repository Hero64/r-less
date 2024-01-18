import crypto from 'node:crypto';

export const createMd5Hash = (value: string) => {
  return crypto.createHash('md5').update(value).digest('hex');
};
