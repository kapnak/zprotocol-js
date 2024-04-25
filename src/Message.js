module.exports = class Message {
    /**
     * Represent a message that can be a request or a reply.
     * @property {Buffer<16>} id - The message id.
     * @property {Buffer} payload - The message payload.
     * @property {Buffer} content - An alias for message payload.
     * @property {boolean} isReply - true if the message is a reply.
     * @param {Buffer<16>} id
     * @param {Buffer} payload
     * @param {RemotePeer} remotePeer
     */
    constructor(id, payload, remotePeer) {
        this.id = id;
        this.payload = payload;
        this.content = payload;
        this.remotePeer = remotePeer;
        this.isReply = !!(id[3] & 1);
    }

    /**
     * Reply to the message.
     * @param {Buffer} payload - The message content.
     */
    reply(payload) {
        this.remotePeer.reply(this.id, payload);
    }
}
