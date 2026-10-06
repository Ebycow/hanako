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
 *
 * 構築しただけでは取得を始めない。読み取りが始まるか start() を呼んだときに取得を始めるため、
 * 再生待ちに並んでいる間は音声生成のリクエストを送らない。
 * start() だけでは先頭のストリームしか取得せず、読み取りが始まってから lookahead 個先まで取得する。
 */
class EbyStream extends Readable {
    /**
     * @param {Array<Readable|function(AbortSignal):Promise<Readable>>} streams
     *   生成関数には中断の合図を渡す。EbyStreamが破棄されると中断される。
     * @param {object} [options={}]
     * @param {number} [options.lookahead=1] 読み取り中に、再生中のものより先に取得しておくストリームの数
     */
    constructor(streams, { lookahead = 1 } = {}) {
        super();
        this._drained = false;
        this._current = null;
        this._pendings = [];
        this._lookahead = Math.max(1, lookahead);
        this._reading = false;
        this._started = false;
        this._abortController = new AbortController();

        this._cue = streams;
    }

    /**
     * 取得を始める（何度呼んでもよい）
     * 再生の直前に先読みとして呼ぶ。読み取りが始まったときにも呼ばれる。
     */
    start() {
        if (this._started || this.destroyed) return;
        this._started = true;
        this._prefetch(1);
        this._next();
    }

    _read() {
        if (!this._reading) {
            this._reading = true;
            this.start();
            this._prefetch();
        }
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
        // 取得中のリクエストを中断する
        this._abortController.abort();
        // まだ取り出していないストリームも破棄する（生成関数は呼ばずに捨てる）
        for (const candidate of this._cue) {
            if (typeof candidate !== 'function' && candidate.destroy) candidate.destroy();
        }
        this._cue = [];
        const pendings = this._pendings;
        this._pendings = [];

        if (this._current && this._current.destroy) this._current.destroy();
        for (const pending of pendings) {
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
        if (this._pendings.length === 0) this._prefetch(1);
        const pending = this._pendings.shift();
        // 読み取り中なら、取り出した分を補って lookahead 個先まで取得しておく
        if (this._reading) this._prefetch();
        if (!pending) {
            this.push(null);
            return;
        }
        const activate = (stream) => {
            if (this.destroyed) {
                stream.destroy();
                return;
            }
            this._gotNextStream(stream);
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

    /**
     * 取得済み（取得中を含む）のストリームが limit 個になるまで取得を始める
     *
     * @param {number} [limit=this._lookahead]
     */
    _prefetch(limit = this._lookahead) {
        while (this._pendings.length < limit && this._cue.length > 0 && !this.destroyed) {
            this._pendings.push(this._fetch(this._cue.shift()));
        }
    }

    _fetch(candidate) {
        // 先読みしたストリームのエラーは、再生の順番が来る前でも受ける。
        // 受け手がいないと、中断や通信エラーで uncaughtException になる。
        if (typeof candidate !== 'function') {
            const stream = ensure(candidate);
            this._attachErrorListener(stream);
            return { stream, promise: Promise.resolve(stream) };
        }
        const promise = Promise.resolve(candidate(this._abortController.signal))
            .then(ensure)
            .then((stream) => {
                this._attachErrorListener(stream);
                return stream;
            });
        // 失敗は _next で拾うが、それまでは処理が付かないため unhandledRejection にならないよう印を付けておく
        promise.catch(() => {});
        return { stream: null, promise };
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

        // 中断時は同じストリームから複数回errorが出ることがあるため、onceではなく受け続ける。
        // 2回目以降はEbyStreamが破棄済みなので何もしない。
        stream.on('error', (err) => this.destroy(err));
    }
}

module.exports = EbyStream;
