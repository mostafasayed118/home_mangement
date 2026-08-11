import crypto from 'crypto';

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'jwk'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'jwk'
  }
});

console.log("PRIVATE KEY JWK:");
console.log(JSON.stringify(privateKey, null, 2));
console.log("\nPUBLIC KEY JWK:");
console.log(JSON.stringify(publicKey, null, 2));
