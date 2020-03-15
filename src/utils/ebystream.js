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
     * @param {Readable[]} streams
     */
    constructor(streams) {
        super();
        this.destroyed = false;
        this._drained = false;
        this._current = null;

        this._cue = streams.map(ensure);
        this._cue.forEach(stream => this._attachErrorListener(stream));

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

    destroy(err) {
        if (this.destroyed) return;
        this.destroyed = true;

        if (this._current && this._current.destroy) this._current.destroy();

        if (err) this.emit('error', err);
        this.emit('close');
    }

    _next() {
        this._current = null;
        var stream = this._cue.shift();
        this._gotNextStream(stream);
    }

    _gotNextStream(stream) {
        if (!stream) {
            this.push(null);
            this.destroy();
            return;
        }

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

        const onError = err => {
            stream.removeListener('error', onError);
            this.destroy(err);
        };

        stream.once('error', onError);
    }
}

module.exports = { EbyStream };
