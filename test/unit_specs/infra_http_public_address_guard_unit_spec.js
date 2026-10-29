require('chai').should();
const http = require('http');
const {
    isForbiddenAddress,
    downloadPublic,
    isForbiddenAddressError,
} = require('../../src/infra/http/public_address_guard');

/**
 * public_address_guard 単体スペック
 * 利用者が指定したURLの取得で、内部ネットワークへ接続させないこと（SSRF対策）
 */
describe('public_address_guard', () => {
    describe('isForbiddenAddress', () => {
        [
            '127.0.0.1',
            '10.1.2.3',
            '172.16.0.1',
            '172.31.255.255',
            '192.168.1.1',
            '169.254.169.254',
            '100.64.0.1',
            '0.0.0.0',
            '224.0.0.1',
            '255.255.255.255',
            '::1',
            '::',
            'fe80::1',
            'fd00::1',
            '::ffff:127.0.0.1',
            '::ffff:169.254.169.254',
        ].forEach((address) => {
            specify(`${address} は拒否する`, () => {
                isForbiddenAddress(address).should.be.true;
            });
        });

        ['8.8.8.8', '162.159.128.233', '172.32.0.1', '2606:4700::1111', '::ffff:8.8.8.8'].forEach((address) => {
            specify(`${address} は許可する`, () => {
                isForbiddenAddress(address).should.be.false;
            });
        });

        specify('IPアドレスでない文字列は対象外', () => {
            isForbiddenAddress('example.com').should.be.false;
        });
    });

    describe('downloadPublic', () => {
        /**
         * @param {string} url
         * @returns {Promise<any>} 失敗したときのエラー
         */
        async function downloadError(url) {
            try {
                await downloadPublic(url, { maxBytes: 1024 });
            } catch (e) {
                return e;
            }
            throw new Error('失敗するはずが成功した');
        }

        [
            'http://127.0.0.1:4090/api/v1/audiostream',
            'http://169.254.169.254/latest/meta-data/',
            'http://[::1]/',
            'http://[::ffff:127.0.0.1]/',
        ].forEach((url) => {
            specify(`IPアドレス直書きの内部アドレス ${url} は拒否する`, async () => {
                isForbiddenAddressError(await downloadError(url)).should.be.true;
            });
        });

        specify('http/https 以外のスキームは拒否する', async () => {
            isForbiddenAddressError(await downloadError('file:///etc/passwd')).should.be.true;
        });

        describe('実際の接続', () => {
            let server;
            let port;

            before((done) => {
                server = http.createServer((req, res) => res.end('secret'));
                server.listen(0, '127.0.0.1', () => {
                    port = server.address().port;
                    done();
                });
            });

            after((done) => {
                server.close(done);
            });

            specify('名前解決の結果が内部アドレス（localhost）なら接続前に拒否する', async () => {
                isForbiddenAddressError(await downloadError(`http://localhost:${port}/secret`)).should.be.true;
            });
        });
    });

    describe('isForbiddenAddressError', () => {
        specify('原因（cause）に包まれた拒否エラーも判定できる', async () => {
            let inner;
            try {
                await downloadPublic('http://127.0.0.1/', { maxBytes: 1024 });
            } catch (e) {
                inner = e;
            }
            isForbiddenAddressError(new Error('redirect failed', { cause: inner })).should.be.true;
        });

        specify('関係ないエラーは false', () => {
            isForbiddenAddressError(new Error('network error')).should.be.false;
            isForbiddenAddressError(Object.assign(new Error('x'), { code: 'ECONNRESET' })).should.be.false;
        });
    });
});
