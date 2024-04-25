# zprotocol-js

Here is a Javascript implementation of ZProtocol.

This implementation does not support non-encrypted communication for now.

## Usage

### Create local peer
From a local peer, you can connect to multiple peers and listen multiple IP/port.

```JS
const zprotocol = require('src/zprotocol');

let kp = zprotocol.generate_kp();
let peer = new Peer(kp);        // If not provided the kp will be generated.
```

### Listen for connection or connect to other peers
Listen for connections (Server) :
```JS

let server = await peer.listen('127.0.0.1', 1234);
server.on('connection', (remotePeer) => {
    console.log(`The peer ${remotePeer.pk} just connected.`);
});
```

Connect to another peer (Client) :
```JS
let remotePeer = await peer.connect('127.0.0.1', 1234, remotePk);
```

### RemotePeer
Once you get a `RemotePeer` object, you can communicate with the following methods / events :
```JS
/* Events listeners */
remotePeer.on('message', (message) => {
    // Trigger for requests & replies.
    if (message.isReply) {} // This message is a reply.
});

remotePeer.on('request', (message) => {
    console.log(message.content);
    message.reply('OK');
});

remotePeer.on('reply', (message) => {
    console.log(message.content);
});

remotePeer.on('disconnection', () => {
    // Trigger when the connection is terminated.
});


// Send a message.
remotePeer.send('Hi!');

// Send a message and wait for the reply.
let reply = await remotePeer.request('Hi!');
console.log('Reply : ' + reply.content);

// Disconnect
remotePeer.disconnect();
```

## Contact and donation

Don't hesiate to contact me :
> Mail : kapnak.mail@gmail.com  
> Discord : kapnak


Monero (XMR) :
```
444DEqjmWnuiiyuzxAPYwdQgcujJU1UYFAomsdS77wRE9ooPLcmEyqsLtNC11C5bMWPif5gcc7o6gMFXvvQQEbVVN6CNnBT
```
