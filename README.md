# nanomsg-browser

This library is a convenient wrapper around a standart websocket, for
easier connection with nanomsg sockets.

Supported and testes are the following client side protocols:

+ REQ
+ PAIR
+ SUB

**Table of Content**

1. [install](#install)
2. [configuration](#configuration)
3. [api](#api)
    1. [nanomsg](#nanomsg)
    2. [nanomsg.Socket](#nanomsgsocket)
4. [examples](#examples)
    1. [subscription](#subscription)
    2. [pair or req/rep](#pair-or-reqrep)

## install

Install via command line.

```sh
npm install nanomsg-browser
```

And include the module in your html.

```html
<script src="node_modules/nanomsg-browser/dist/nanomsg.js" charset="utf-8"></script>
```

## configurataion
```html
<script type="text/javascript">
  // Milliseconds between reconnects.
  nanomsg.reconnectTime = 10 * 1000;
  // Show some debug logging in the console.
  nanomsg.debug = true;
  // Receives ArrayBuffer objects instead of strings. Default is `false`.
  nanomsg.receiveArrayBuffer = false;
</script>
```

## api

### nanomsg

The root namespace for the nanomsg package.

+ **nanomsg.debug** Show or not show debugging information.
+ **nanomsg.reconnectTime** The delay between reconnect attempts. Default = 1000ms.
+ **nanomsg.receiveArrayBuffer** Set to `true` to receive ArrayBuffer objects instead of String.
+ **REQ** Enumeration option for a request socket.
+ **PAIR** Enumeration option for a pair socket.
+ **SUB** Enumeration option for a subscription socket.

### nanomsg.Socket

The nanomsg socket, which can hold multiple connections to other
nanomsg sockets over the websocket protocol.

+ **constructor(protocol)**
  + *protocol* The type of socket protocol to use.

  ```js
  const sock = new nanomsg.Socket(nanomsg.REQ);
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
  const sub = new nanomsg.Socket(nanomsg.SUB);
  sub.connect('ws://myhost:8080/');

  sub.on('data', (msg) => {
    console.log('got =>', msg);
  });
  ```

### pair or req/rep

  The behaviour of the API for pair or req/rep type of sockets
  is the same. That is the reason why there is only one combined example.

  ```js
  const sock = new nanomsg.Socket(nanomsg.REQ);
  // const sock = new nanomsg.Socket(nanomsg.PAIR);

  // old school more streamy approach

  sock.on('data', (msg) => {
    console.log('got =>', msg);
  });

  sock
    .connect('ws://myhost:8080')
    .then(() => {
        sock.send('some cool msg');
    });

  // be hippster, be promise
  sock
    .connect('ws://myhost:8080')
    .then(() => {
        sock
          .send('some cool msg')
          .then((msg) => {
            console.log('got =>', msg);
          });
    });
  ```
