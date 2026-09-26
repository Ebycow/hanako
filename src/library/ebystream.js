const { Readable } = require('stream');

function ensure(s) {
    if (s._readableState) return s;
    const wrap = new Readable().wrap(s);
    if (s.destroy) {
        wrap.destroy = s.destroy.bind(s);
    }
    return wrap;
}

/**
 * えびストリーム
 */
class EbyStream extends Readable {
    /**
     * @param {Array<Readable|function():Promise<Readable>>} streams
     */
    constructor(streams) {
        super();
        this._drained = false;
        this._current = null;
        this._pending = null;

        this._cue = streams;

        this._prefetch();
        this._next();
    }

    _read() {
        this._drained = true;
        this._forward();
    }

    _forward() {
        if (!this._drained || !this._current) return;

        var chunk;
        while (this._drained && (chunk = this._current.read()) !== null) {
            this._drained = this.push(chunk);
        }
    }

    _destroy(err, callback) {
        this._cue = [];
        const pending = this._pending;
        this._pending = null;

        if (this._current && this._current.destroy) this._current.destroy();
        if (pending) {
            if (pending.stream) {
                pending.stream.destroy();
            } else {
                pending.promise.then((stream) => stream.destroy()).catch(() => {});
            }
        }
        callback(err);
    }

    _next() {
        this._current = null;
        const pending = this._pending;
        this._pending = null;
        if (!pending) {
            this.push(null);
            return;
        }
        const activate = (stream) => {
            if (this.destroyed) {
                stream.destroy();
                return;
            }
            this._attachErrorListener(stream);
            this._gotNextStream(stream);
            this._prefetch();
        };
        if (pending.stream) {
            activate(pending.stream);
            return;
        }
        pending.promise
            .then((stream) => {
                activate(stream);
            })
            .catch((err) => this.destroy(err));
    }

    _prefetch() {
        if (this._pending || this._cue.length === 0 || this.destroyed) return;
        const candidate = this._cue.shift();
        if (typeof candidate !== 'function') {
            const stream = ensure(candidate);
            this._pending = { stream, promise: Promise.resolve(stream) };
            return;
        }
        const promise = Promise.resolve(candidate()).then(ensure);
        // 失敗は _next で拾うが、それまでは処理が付かないため unhandledRejection にならないよう印を付けておく
        promise.catch(() => {});
        this._pending = { stream: null, promise };
    }

    _gotNextStream(stream) {
        this._current = stream;
        this._forward();

        const onReadable = () => {
            this._forward();
        };

        const onClose = () => {
            if (!stream._readableState.ended) {
                this.destroy();
            }
        };

        const onEnd = () => {
            this._current = null;
            stream.removeListener('readable', onReadable);
            stream.removeListener('end', onEnd);
            stream.removeListener('close', onClose);
            this._next();
        };

        stream.on('readable', onReadable);
        stream.once('end', onEnd);
        stream.once('close', onClose);
    }

    _attachErrorListener(stream) {
        if (!stream) return;

        const onError = (err) => {
            stream.removeListener('error', onError);
            this.destroy(err);
        };

        stream.once('error', onError);
    }
}

module.exports = EbyStream;
