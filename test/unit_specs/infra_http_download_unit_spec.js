require('chai').should();
const http = require('http');
const { download, isContentTooLargeError } = require('../../src/infra/http/download');
const { HttpStatusError } = require('../../src/infra/http/fetch_ok');

/************************************************************************
 * download 単体スペック
 *
 * 期待動作：リダイレクトを辿り、どの接続先も検査し、サイズの上限・中断を守ってダウンロードする
 * 備考：ローカルのHTTPサーバを立てる
 ***********************************************************************/

/**
 * @param {Promise<any>} promise
 * @returns {Promise<any>} 失敗したときのエラー
 */
async function rejection(promise) {
    try {
        await promise;
    } catch (e) {
        return e;
    }
    throw new Error('失敗するはずが成功した');
}

describe('download', () => {
    let server;
    let base;
    let routes;

    beforeEach(async () => {
        routes = {
            '/ok': (req, res) => res.end('audio'),
            '/redirect': (req, res) => res.writeHead(302, { Location: '/ok' }).end(),
            '/loop': (req, res) => res.writeHead(301, { Location: '/loop' }).end(),
            '/not-found': (req, res) => res.writeHead(404).end('not found'),
            '/error': (req, res) => res.writeHead(503).end(),
        };
        server = http.createServer((req, res) => {
            const route = routes[new URL(req.url, 'http://localhost').pathname];
            if (route) route(req, res);
            else res.writeHead(404).end();
        });
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        base = `http://127.0.0.1:${server.address().port}`;
    });

    afterEach(async () => {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
    });

    specify('本文を Buffer で返す', async () => {
        const res = await download(`${base}/ok`, { maxBytes: 1024 });
        res.status.should.equal(200);
        res.data.should.deep.equal(Buffer.from('audio'));
    });

    specify('リダイレクトを辿り、どの接続先も検査する', async () => {
        const targets = [];
        const res = await download(`${base}/redirect`, {
            maxBytes: 1024,
            assertTarget: (target) => targets.push(target.pathname),
        });
        res.data.should.deep.equal(Buffer.from('audio'));
        targets.should.deep.equal(['/redirect', '/ok']);
    });

    specify('リダイレクト先が検査で拒否されたら接続しない', async () => {
        const requested = [];
        routes['/ok'] = (req, res) => {
            requested.push(req.url);
            res.end('audio');
        };
        const err = await rejection(
            download(`${base}/redirect`, {
                maxBytes: 1024,
                assertTarget: (target) => {
                    if (target.pathname === '/ok') throw new Error('forbidden');
                },
            })
        );
        err.message.should.equal('forbidden');
        requested.should.be.empty;
    });

    specify('リダイレクトが多すぎたら失敗する', async () => {
        const err = await rejection(download(`${base}/loop`, { maxBytes: 1024 }));
        err.code.should.equal('EHANAKO_TOO_MANY_REDIRECTS');
    });

    specify('2xx 以外は HttpStatusError で失敗する', async () => {
        const err = await rejection(download(`${base}/not-found?secret=1`, { maxBytes: 1024 }));
        err.should.be.an.instanceOf(HttpStatusError);
        err.status.should.equal(404);
        err.url.should.equal(`${base}/not-found`);
    });

    specify('Content-Length が上限を超えていたら本文を読まずに失敗する', async () => {
        routes['/big'] = (req, res) => res.writeHead(200, { 'Content-Length': 2048 }).end(Buffer.alloc(2048));
        isContentTooLargeError(await rejection(download(`${base}/big`, { maxBytes: 1024 }))).should.be.true;
    });

    specify('Content-Length がなくても、上限を超えた時点で失敗する', async () => {
        routes['/chunked'] = (req, res) => {
            res.write(Buffer.alloc(1000));
            res.write(Buffer.alloc(1000));
            // 上限を超えたら残りは送られなくても失敗する
        };
        isContentTooLargeError(await rejection(download(`${base}/chunked`, { maxBytes: 1024 }))).should.be.true;
    });

    specify('上限ちょうどなら受け付ける', async () => {
        routes['/exact'] = (req, res) => res.end(Buffer.alloc(1024));
        (await download(`${base}/exact`, { maxBytes: 1024 })).data.length.should.equal(1024);
    });

    specify('応答が始まる前に中断されたら、中断の理由で失敗する', async () => {
        routes['/hang'] = () => {};
        const err = await rejection(download(`${base}/hang`, { maxBytes: 1024, signal: AbortSignal.timeout(50) }));
        err.name.should.equal('TimeoutError');
    });

    specify('本文の受信中に中断されても、中断の理由で失敗する', async () => {
        routes['/stall'] = (req, res) => res.write('partial');
        const err = await rejection(download(`${base}/stall`, { maxBytes: 1024, signal: AbortSignal.timeout(50) }));
        err.name.should.equal('TimeoutError');
    });
});
