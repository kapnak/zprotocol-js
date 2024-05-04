const Peer = require('./Peer');
const RemotePeer = require('./RemotePeer');
const helpers = require('./helpers');
const _sodium = require('libsodium-wrappers-sumo');

ready = _sodium.ready;

module.exports = {
    ready,
    Peer,
    RemotePeer,
    ...helpers
};
