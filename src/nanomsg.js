const nanomsg = {
  debug: false,
  reconnectTime: 1000,
  REQ: 'rep.sp.nanomsg.org',
  PAIR: 'pair.sp.nanomsg.org',
  SUB: 'pub.sp.nanomsg.org',
}

nanomsg.Socket = class {
  constructor(protocol) {
    this.protocol = protocol;
    this.wss = new Map();
    this.reqIdHeader = null;
    this.promise = null;
    this.cbs = {
      data: [],
      end: [],
      error: [],
    };

    if (this.protocol == nanomsg.REQ) {
      this.reqIdHeader = new Uint8Array(4);
      window.crypto.getRandomValues(this.reqIdHeader);
      // the first bit HAS TO BE one, in order to get a response
      this.reqIdHeader[0] |= 1 << 7;
    }
  }

  connect(url) {
    if (!this.wss.has(url)) {
      return new Promise((resolve, reject) => {
        if (nanomsg.debug) {
          console.log('nanomsg connect to: ' + url);
        }

        const ws = new WebSocket(url, [this.protocol]);
        ws.initialUrl = url; // evil hack of evilness, to access the original used url

        this.wss.set(url, ws);

        ws.onopen = () => {
          if (nanomsg.debug) {
            console.log('nanomsg connected: ' + url);
          }

          resolve();
        };

        ws.onmessage = (e) => {
          const reader = new FileReader();

          reader.addEventListener('loadend', () => {
            const data = reader.result;

            if (this.promise) {
              this.promise.resolve(data);
              this.promise = null;
            }

            this.cbs.data.forEach(cb => cb(data));
          });

          if (this.protocol == nanomsg.REQ) {
            reader.readAsText(e.data.slice(4));
          } else {
            reader.readAsText(e.data);
          }
        };

        ws.onerror = (e) => {
          if (nanomsg.debug) {
            console.log('nanomsg error', e);
          }

          this.cbs.error.forEach(cb => cb(e));
        };

        ws.onclose = () => {
          if (nanomsg.debug) {
            console.log('nanomsg close: ' + ws.initialUrl);
          }

          if (this.wss.has(ws.initialUrl)) {
            setTimeout(() => {
              if (nanomsg.debug) {
                console.log('nanomsg reconnect: ' + ws.initialUrl);
              }

              this.wss.delete(ws.initialUrl);
              this.connect(ws.initialUrl);
            }, nanomsg.reconnectTime);
          }

          this.cbs.end.forEach(cb => cb(ws.initialUrl));
        };
      });
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
    if (this.protocol === nanomsg.SUB) {
      throw new Exception('SUB socket can not send');
    }

    // this is a good one: https://www.freelists.org/post/nanomsg/WebSocket-test-case-not-working,3
    if (this.protocol === nanomsg.REQ) {
      const data = new Uint8Array(msg.length + 4);
      data.set(this.reqIdHeader, 0);

      for (let i = 4; i < msg.length + 4; ++i) {
        data[i] = msg.charCodeAt(i - 4);
      }

      msg = data;
    }

    if (nanomsg.debug) {
      console.log('nanomsg send =>', msg);
    }

    for (let ws of this.wss.values()) {
      if (ws.readyState === 1) {
        ws.send(msg);
      } else if (ws.readyState > 1) {
        if (this.wss.has(ws.url)) {
          this.wss.delete(ws.url);
        }

        if (nanomsg.debug) {
          console.log('nanomsg: could not send, because of closed connection (' + ws.url + ')');
        }
      }
    }

    if (this.protocol === nanomsg.REQ || this.protocol === nanomsg.PAIR) {
      return new Promise((resolve, reject) => {
        this.promise = { resolve, reject };
      });
    }
  }
};
