# nanomsg-browser

This library is a convenient wrapper around a standart websocket, for
easier connection with nanomsg sockets.

Supported and testes are the following client side protocols:

+ REQ
+ PAIR
+ SUB
+ BUS

**Table of Content**

1. [install](#install)
2. [nng compatibility](#nng-compatibility)
3. [api](#api)
    1. [nanomsg](#nanomsg)
    2. [nanomsg.Socket](#nanomsgsocket)
4. [examples](#examples)
    1. [subscription](#subscription)
    2. [pair or req/rep](#pair-or-reqrep)
    3. [bus](#bus)

## install

Install via command line.

```sh
npm install nanomsg-browser
yarn add nanomsg-browser
```
**note:** This package is intended to be used with a bundler like WebPack, browserify or Rollup.

## nng compatibility

This package should work out of the box with **NNG** as well.

**note:** NNG demands two things, only ArrayBuffers for send and receive, and if there is no path specified it can occoure connection errors, at least with the Rust wrapper for NNG.

The following configuration should work :)
```js
import {Socket, Protocol} from 'nanomsg-browser';

const sock = new Socket({
  protocol: Protocol.REQ,
  sendArrayBuffer: true,
  receiveArrayBuffer: true,
});
sock.connect('ws://myhost:9000/req');
```

## api

### nanomsg

The root namespace for the nanomsg package.

### nanomsg.Protocol

+ **REQ** Enumeration option for a request socket.
+ **PAIR** Enumeration option for a pair socket.
+ **SUB** Enumeration option for a subscription socket.
+ **BUS** Enumeration option for a bus socket.

### nanomsg.Socket

The nanomsg socket, which can hold multiple connections to other
nanomsg sockets over the websocket protocol.

+ **constructor(config)**
  + *config* The configurations object, at least the protocol has to be defined.

  ```js
  const socket = new nanomsg.Socket({
    protocol: nanomsg.Protocol.REQ,
    reconnectTime: 1000,       // Milliseconds between reconnects.
    debug: true,               // Show some debug logging in the console.
    sendArrayBuffer: false,    // Sends ArrayBuffer objects instead of strings. Default is `false`.
    receiveArrayBuffer: false, // Receives ArrayBuffer objects instead of strings. Default is `false`.
  });
  ```
+ **connect(url)**

  Connects to another corresponding nanomsg websocket.
  Multiple connections are possible. But not very good testet :)
  + *url* The url to which will be connected. It has to be a    websocket url or it will simple NOT work!

  ```js
  sock.connect('ws://somehost:8080');
  sock.connect(`ws://${location.host}/api`);
  ```
+ **disconnect(url)**

  Disconnects from a url. I don't know why someone ever want this. But for the sake of a complete API, you can do it.

  + *url* The url to which has been connected.

  ```js
  sock.disconnect('ws://somehost:8080');
  ```

+ **send(msg)**

  Sends a message to all connected sockets.

  **note:** Subscription sockets will throw an error, if you attempt to send something,
    since sending to a publisher is not supported. Like

  + *msg* The message to be send. A string or buffer object.

  ```js
  const msg = 'some funky message';
  socke.send(msg);

  // for PAIR and REQ sockets, even this is possible
  socket
    .send(msg)
    .then((answer) => {
      console.log('got =>', answer);
    })

  // and we can send an ArrayBuffer
  const data = new Uint8Array(12);
  window.crypto.getRandomValues(data);

  socket.send(data);
  ```

+ **on(type, callback)**

  For a more streaming like api you can define callbacks.

  + *type* The type of callback. Which is one of => data | error | end .
  + *callback* A callback function.

  ```js
  sock.on('data', (msg) => {
    console.log('got =>', msg);
  });

  sock.on('error', (e) => {
    console.log('OH NO!!!', e);
  });

  sock.end('end', (url) => {
    console.log('goodbye,', url);
  });
  ```

## examples

### subscription

  ```js
  import {Socket, Protocol} from 'nanomsg-browser';

  const sub = new Socket({protocol: Protocol.SUB});
  sub.connect('ws://myhost:8080/');

  sub.on('data', (msg) => {
    console.log('got =>', msg);
  });
  ```

### pair or req/rep

  The behaviour of the API for pair or req/rep type of sockets
  is the same. That is the reason why there is only one combined example.

  ```js
  import {Socket, Protocol} from 'nanomsg-browser';

  const sock = new Socket({protocol: Protocol.REQ});
  // const sock = new Socket({protocol: Protocol.PAIR});

  // old school more streamy approach

  sock.on('data', (msg) => {
    console.log('got =>', msg);
  });

  sock
    .connect('ws://myhost:8080')
    .then(() => {
        sock.send('some cool msg')
        .then(msg => {
          console.log('got =>', msg);
        });
    });

  // be hippster, be async/await
  await sock.connect('ws://myhost:8080');
  const answer = await sock.send('some cool msg');
  console.log('got =>', answer);
  ```

### bus

  ```js
  import {Socket, Protocol} from 'nanomsg-browser';

  const sock = new Socket({protocol: Protocol.BUS});

  sock.send('some data', (data) => {
    console.log('got =>', data);
  });

  sock.on('data', msg => {
    console.log('got =>', msg);
  });
  ```
