# nanomsg-browser

This library is a convinient wrapper around a standart websocket, for
easier connection with nanomsg sockets.

## Supported Protocols

+ REQ
+ PAIR
+ SUB

## Examples

### Subscription

```js
const sub = new nanomsg.Socket(nanomsg.SUB);
sub.connect('ws://myhost:8080/');
sub.on('data', (msg) => {
  console.log('got =>', msg);
});
```

### Req/Rep

```js
const req = new nanomsg.Socket(nanomsg.REQ);
req.connect('ws://myhost:8080');
req.on('data', (msg) => {
  console.log('got =>', msg);
});

req.send('some cool msg');
```

### Pair

```js
const pair = new nanomsg.Socket(nanomsg.PAIR);
pair.connect('ws://myhost:8080');
pair.on('data', (msg) => {
  console.log('got =>', msg);
});

pair.send('some cool msg');
```
