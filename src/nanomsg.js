const Protocol = {
  REQ: 'rep.sp.nanomsg.org',
  PAIR: 'pair.sp.nanomsg.org',
  SUB: 'pub.sp.nanomsg.org',
  BUS: 'bus.sp.nanomsg.org',
};

class Socket {
  constructor(config) {
    this.config = Object.assign({
      protocol: null,
      debug: false,
      reconnectTime: 1000,
      receiveArrayBuffer: false,
      sendArrayBuffer: false,
    }, config);
    this.wss = new Map();
    this.reqIdHeader = null;
    this.promise = null;
    this.cbs = {
      data: [],
      end: [],
      error: [],
    };

    this.reqIdHeader = new Uint8Array(4);
    window.crypto.getRandomValues(this.reqIdHeader);
    // the first bit HAS TO BE one, in order to get a response
    this.reqIdHeader[0] |= 1 << 7;
  }

  connect(url) {
    return new Promise((resolve, reject) => {
      if (!this.wss.has(url)) {
        if (this.config.debug) {
          console.log('nanomsg connect to: ' + url);
        }

        const tryConnect = () => {
          try {
            this.__setupSocketConnection(url, resolve);
          } catch (e) {
            console.exception(e);
            this.wss.delete(url);

            setTimeout(tryConnect, this.config.reconnectTime);
          }
        };

        tryConnect();
      }
      else {
        resolve();
      }
    });
  }

  __setupSocketConnection(url, resolve) {
    const ws = new WebSocket(url, [this.config.protocol]);
    // evil hack of evilness, to access the original used url
    ws.initialUrl = url;

    if (this.config.receiveArrayBuffer) {
      ws.binaryType = 'arraybuffer';
    }

    this.wss.set(url, ws);

    ws.onopen = () => {
      if (this.config.debug) {
        console.log('nanomsg connected: ' + url);
      }

      resolve();
    };

    ws.onmessage = (e) => {
      let data = null;

      if (this.config.protocol === Protocol.REQ) {
        data = e.data.slice(4);
      } else {
        data = e.data;
      }

      if (this.config.receiveArrayBuffer) {
        this.__resolveNewData(data);
      } else {
        const reader = new FileReader();

        reader.onload = (event) => {
          this.__resolveNewData(event.target.result);
        };

        reader.readAsText(data);
      }
    };

    ws.onerror = (e) => {
      if (this.config.debug) {
        console.exception('nanomsg error', e);
      }

      this.cbs.error.forEach(cb => cb(e));
    };

    ws.onclose = () => {
      if (this.config.debug) {
        console.log('nanomsg close: ' + ws.initialUrl);
      }

      if (this.wss.has(ws.initialUrl)) {
        if (this.config.debug) {
          console.log('nanomsg reconnect: ' + ws.initialUrl);
        }

        this.wss.delete(ws.initialUrl);
        this.connect(ws.initialUrl);
      }

      this.cbs.end.forEach(cb => cb(ws.initialUrl));
    };
  }

  __resolveNewData(data) {
    if (data) {
      if (this.promise) {
        this.promise.resolve(data);
        this.promise = null;
      }

      this.cbs.data.forEach(cb => cb(data));
    }
  }

  disconnect(url) {
    const ws = this.wss.get(url);

    if (ws) {
      this.wss.delete(url);
      ws.close();
    }
  }

  bind() {
    throw new Error('WHOAAAA!!! Nice try, but NO, we do not support these!');
  }

  on(type, cb) {
    const cbs = this.cbs[type];

    if (cbs) {
      cbs.push(cb);
    }
  }

  send(msg) {
    if (this.config.protocol === Protocol.SUB) {
      throw new Exception('SUB socket can not send');
    }

    if (this.wss.size < 1) {
      throw new Exception('you are not connected to any socket');
    }

    if (this.config.sendArrayBuffer && (typeof msg === 'string' || msg instanceof String)) {

      if (typeof TextEncoder === 'undefined') {
        const view = new Uint8Array(msg.length);

        for (let i = 0; i < msg.length; ++i) {
          view[i] = msg.charCodeAt(i);
        }

        msg = view;
      }
      else {
        const encoder = new TextEncoder();
        msg = encoder.encode(msg);
      }
    }

    // this is a good one: https://www.freelists.org/post/nanomsg/WebSocket-test-case-not-working,3
    if (this.config.protocol === Protocol.REQ) {
      const length = msg.length || msg.byteLength;
      const data = new Uint8Array(length + 4);
      data.set(this.reqIdHeader, 0);
      data.set(msg, 4);

      msg = data;
    }

    if (this.config.debug) {
      console.log('nanomsg send =>', msg);
    }

    for (let ws of this.wss.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
      else if (ws.readyState > 1) {
        if (this.wss.has(ws.url)) {
          this.wss.delete(ws.url);
        }

        if (this.config.debug) {
          console.warn('nanomsg: could not send, because of closed connection (' + ws.url + ')');
        }
      }
    }

    if ([Protocol.REQ, Protocol.PAIR].indexOf(this.config.protocol) !== -1) {
      return new Promise((resolve, reject) => {
        this.promise = { resolve, reject };
      });
    }
  }
};

module.exports = {
  Protocol,
  Socket,
};
