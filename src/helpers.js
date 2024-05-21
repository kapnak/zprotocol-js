const fs = require('fs');
const {base32} = require('rfc4648');


/**
 * Generate and return an ED25519 key pair (sign).
 * @return {{sk: Uint8Array, pk: Uint8Array}} - The generated key pair.
 */
function generate_kp() {
    let kp = global.sodium.crypto_sign_keypair();
    return {
        'pk': kp.publicKey,
        'sk': kp.privateKey
    };
}


/**
 * Read key pair from the given file.
 * If the file doesn't exist, it will be generated with a new key pair.
 * @param {string} file - The file of the secret key (.sk).
 * @param {boolean} [createFile=true] - If set to false and the file doesn't exist, it will throw an error.
 * @return {Promise<{pk: Uint8Array, sk: Uint8Array}>}
 */
async function read_kp(file, createFile=true) {
    try {
        let sk = await fs.promises.readFile(file);
        return {
            'pk': global.sodium.crypto_sign_ed25519_sk_to_pk(sk),
            'sk': Uint8Array.from(sk)
        };
    } catch (error) {
        if (error.code === 'ENOENT' && createFile) {
            let kp = generate_kp();
            await fs.promises.writeFile(file, kp.sk);
            return kp;
        }
        throw error;
    }
}


/**
 * Encode bytes to a base32 string.
 * It uses the RFC 4648 alphabet but in **lower case** and without padding.
 * @param {ArrayLike} bytes - The bytes.
 * @return {string} - The base 32 string.
 */
function bytesToBs32(bytes){
    return base32.stringify(bytes, {pad: false}).toLowerCase();
}


/**
 * Decode a base 32 string to byte array.
 * The string needs to follow the RFC 4648.
 * @param {string} string - The base 32 string.
 * @return {Uint8Array}
 */
function bs32toBytes(string) {
    return base32.parse(string, {loose: true});
}


module.exports = {
    generate_kp,
    read_kp,
    bytesToBs32,
    bs32toBytes
};
