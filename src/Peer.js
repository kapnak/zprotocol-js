const net = require('net');
const {EventEmitter} = require('events');
const RemotePeer = require('./RemotePeer');
const {generate_kp} = require('./helpers');


module.exports = class Peer extends EventEmitter {
    /**
     * @event connection
     * @event disconnection
     *
     * @property {{pk: Uint8Array, sk: Uint8Array}} kp - The local key pair.
     *
     * @param {{pk: Uint8Array, sk: Uint8Array}} [kp=generate_kp()] - The local key pair.
     */
    constructor(kp=generate_kp()) {
        super();
        this.kp = kp;
        this.curve25519kp = {
            pk: global.sodium.crypto_sign_ed25519_pk_to_curve25519(this.kp.pk),
            sk: global.sodium.crypto_sign_ed25519_sk_to_curve25519(this.kp.sk)
        };
    }

    /**
     * Connect to a remote peer.
     * @param {string} host - The host.
     * @param {number} port - The port.
     * @param {Uint8Array} remotePk - The remote public key.
     * @return {Promise<RemotePeer>}
     */
    connect(host, port, remotePk) {
        return new Promise((resolve) => {
            let remoteCurve25519pk = global.sodium.crypto_sign_ed25519_pk_to_curve25519(remotePk);
            let sharedKeys = global.sodium.crypto_kx_client_session_keys(this.curve25519kp.pk, this.curve25519kp.sk, remoteCurve25519pk);
            let stream = global.sodium.crypto_secretstream_xchacha20poly1305_init_push(sharedKeys.sharedTx);
            let push_state = stream.state;

            let socket = net.createConnection({host, port}, () => {
                // Send initialization message.
                let initMessage = Buffer.concat(
                    [Buffer.from('\0'), remotePk, this.kp.pk, stream.header]
                );
                socket.write(initMessage);

                let getServerHeader = () => {
                    if (socket.readableLength >= 24) {
                        socket.off('readable', getServerHeader);
                        // Get header from the server & generate the decryption cipher.
                        let header = socket.read(24);
                        let pull_state = global.sodium.crypto_secretstream_xchacha20poly1305_init_pull(header, sharedKeys.sharedRx);
                        resolve(new RemotePeer(socket, remotePk, push_state, pull_state));
                    }
                }
                socket.on('readable', getServerHeader);
            });
        });
    }

    /**
     * Listen for connection.
     * @param {string} [host='0.0.0.0']
     * @param {number} [port=0]
     * @return {Promise<{stop: function, socket: net.Server}>}
     */
    listen(host='0.0.0.0', port=0) {
        return new Promise((resolve) => {
            let server = net.createServer((socket) => {
                let remotePeer = undefined;
                let initializeConnection = () => {
                    if (socket.readableLength < 89) {   // 89 is the length of client initialization message.
                        socket.once('readable', initializeConnection);
                        return;
                    }
                    socket.read(1);     // First null char
                    let serverPk = socket.read(32);
                    if (!serverPk.equals(this.kp.pk)) {
                        socket.destroy();
                        return;
                    }
                    let clientPk = socket.read(32);
                    let header = socket.read(24);

                    // Generate shared keys.
                    let remoteCurve25519pk = global.sodium.crypto_sign_ed25519_pk_to_curve25519(clientPk);
                    let sharedKeys = global.sodium.crypto_kx_server_session_keys(this.curve25519kp.pk, this.curve25519kp.sk, remoteCurve25519pk);
                    let stream = global.sodium.crypto_secretstream_xchacha20poly1305_init_push(sharedKeys.sharedTx);
                    let pull_state = global.sodium.crypto_secretstream_xchacha20poly1305_init_pull(header, sharedKeys.sharedRx);

                    // Send header
                    socket.write(stream.header);

                    remotePeer = new RemotePeer(socket, clientPk, stream.state, pull_state);
                    obj.emit('connection', remotePeer);
                    this.emit('connection', remotePeer);
                }

                initializeConnection();

                socket.on('end', () => {
                    if (remotePeer) {
                        obj.emit('disconnection', remotePeer);
                        this.emit('disconnection', remotePeer);
                    }
                });
            });

            let obj = new EventEmitter();
            obj.stop = server.close;
            obj.socket = server;

            server.on('listening', () => resolve(obj));
            server.listen(port, host);
        });
    }
}
