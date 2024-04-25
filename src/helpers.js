const fs = require('fs');
const sodium = require('libsodium-wrappers-sumo');


/**
 * Generate and return an ED25519 key pair (sign).
 * @return {{sk: Uint8Array, pk: Uint8Array}} - The generated key pair.
 */
function generate_kp() {
    let kp = sodium.crypto_sign_keypair();
    return {
        'pk': kp.publicKey,
        'sk': kp.privateKey
    };
}


/**
 * Read key pair from the given file.
 * If the file doesn't exist, it will be generated with a new key pair.
 * @param {string} file - The file of the secret key (.sk).
 * @return {Promise<{pk: Uint8Array, sk: Uint8Array}>}
 */
async function read_kp(file) {
    try {
        let sk = await fs.promises.readFile(file);
        return {
            'pk': sodium.crypto_sign_ed25519_sk_to_pk(sk),
            'sk': Uint8Array.from(sk)
        };
    } catch (error) {
        let kp = generate_kp();
        await fs.promises.writeFile(file, kp.sk);
        return kp;
    }
}


module.exports = {
    generate_kp,
    read_kp
};
