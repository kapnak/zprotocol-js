const {randomBytes} = require('crypto');
const {EventEmitter} = require('events');
const {Mutex} = require('async-mutex');
const Message = require('./Message');


module.exports = class RemotePeer extends EventEmitter {
    /**
     * @event connection - When the connection is initialized.
     * @event message - When a message is received (request & reply).
     * @event request - When a request is received.
     * @event reply - When a reply is received.
     * @event disconnection - When the connection end.
     *
     * @property {Uint8Array<32>} pk - The remote peer public key.
     */
    constructor(socket, pk, push_state, pull_state) {
        super();

        this.socket = socket;
        this.pk = pk;
        this.push_state = push_state
        this.pull_state = pull_state;
        this.replyListeners = {};
        /** @type {{id: Buffer<16>, length: number}|null}*/
        this.metadata = null;
        let mutex = new Mutex();

        this.socket.on('readable', () => {
            mutex.runExclusive(this._receive.bind(this));
        });
        this.socket.emit('readable');

        this.socket.on('close', () => {
            this.emit('disconnection');
        });
    }

    async _receive() {
        // Loop until every condition did not change the state.
        while (true) {

            // If we're not waiting for a message, and we have enough bytes to read metadata (id + length).
            if (this.metadata == null && this.socket.readableLength >= 20) {
                this.metadata = {
                    id: this.socket.read(16),
                    length: this.socket.read(4).readUInt32LE()
                };
                continue;
            }

            // If we are waiting for a message and all the bytes are available.
            if (this.metadata != null && this.socket.readableLength >= this.metadata.length) {
                let chunk = this.socket.read(this.metadata.length);
                let payload = global.sodium.crypto_secretstream_xchacha20poly1305_pull(this.pull_state, chunk);
                let message = new Message(this.metadata.id, Buffer.from(payload.message), this);

                /* Handle message */
                if (message.isReply) {
                    if (message.id in this.replyListeners)
                        this.replyListeners[message.id](message.content);
                    this.emit('reply', message);
                } else {
                    this.emit('request', message);
                }
                this.emit('message', message);

                this.metadata = null;
                continue;
            }
            break;
        }
    }

    /**
     * Send a message and wait for the reply.
     * @param {Buffer} payload - The content of the message.
     * @param {number|null} [timeout=null] - The timeout in seconds, by default there is no timeout.
     * @return {Promise<Buffer>} - A promise that will resolve when the reply is received.
     */
    request(payload, timeout=null) {
        return new Promise((resolve, reject) => {
            let id = this.send(payload);
            id[3] |= 1; // Set as reply.
            this.replyListeners[id] = resolve;      // The promise is resolve in this._received (When a message id received).
            if (timeout !== null) {
                setTimeout(() => {
                    delete this.replyListeners[id];
                    reject();
                }, timeout*1000);
            }
        });
    }

    /**
     * Reply to a message.
     * @param {Buffer<16>} id - The ID of the message to reply to.
     * @param {Buffer} payload - The reply content.
     */
    reply(id, payload) {
        id[3] |= 1;
        this.send(payload, id);
    }

    /**
     * Send a message.
     * @param {Buffer} payload
     * @param {Buffer<16>} [id=undefined]
     * @return {Buffer<16>} - The ID of the message sent.
     */
    send(payload, id=undefined) {
        let messageEncrypted = global.sodium.crypto_secretstream_xchacha20poly1305_push(
            this.push_state, payload, null, global.sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE
        );
        if (!id) {
            id = randomBytes(16);
            id[3] &= ~1;
        }
        let length = Buffer.alloc(4);
        length.writeUint32LE(messageEncrypted.length);
        this.socket.write(Buffer.concat([id, length, messageEncrypted]));
        return id;
    }

    /**
     * Disconnect from the remote peer.
     */
    disconnect() {
        this.socket.destroy();
    }
}
