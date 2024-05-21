const Peer = require('./Peer');
const RemotePeer = require('./RemotePeer');
const helpers = require('./helpers');
const _sodium = require('libsodium-wrappers-sumo');


let ready = new Promise(async (resolve) => {
    await _sodium.ready;
    global.sodium = _sodium;
    resolve();
});


/**
 * Connect to a remote peer.
 * @param {string} host - The server host.
 * @param {number} port - The server port.
 * @param {Uint8Array<32>|string} pk - The server public key or its representation in base 32.
 * @param {{pk: Uint8Array<32>, sk: Uint8Array<64>}} local_kp - The local key pair to use.
 * @return {Promise<RemotePeer>}
 */
async function connect(host, port, pk, local_kp) {
    if (typeof pk === 'string')
        pk = helpers.bs32toBytes(pk);

    let peer = new Peer(local_kp);
    return await peer.connect(host, port, pk);
}

/**
 * Host a peer that listen on given address.
 * @param {string} host - The server host.
 * @param {number} port - The server port.
 * @param {{pk: Uint8Array<32>, sk: Uint8Array<64>}} local_kp - The server key pair.
 * @return {Promise<{stop: function, socket: net.Server}>}
 */
async function host(host, port, local_kp) {
    let peer = new Peer(local_kp);
    return await peer.listen(host, port);
}


module.exports = {
    ready,
    Peer,
    RemotePeer,
    connect,
    host,
    ...helpers
};
