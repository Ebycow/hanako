const dns = require('dns');
const net = require('net');
const http = require('http');
const https = require('https');

/**
 * 利用者が指定したURLを取得するときに、接続を許さないアドレス帯
 * （ループバック・プライベート・リンクローカル・CGNAT・ドキュメント用・マルチキャスト等）
 * IPv4射影IPv6アドレス（::ffff:127.0.0.1 など）もIPv4の規則で判定される
 */
const FORBIDDEN_ADDRESSES = new net.BlockList();
[
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.88.99.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
].forEach(([address, prefix]) => FORBIDDEN_ADDRESSES.addSubnet(address, prefix, 'ipv4'));
[
    ['::', 128],
    ['::1', 128],
    ['64:ff9b::', 96],
    ['100::', 64],
    ['2001:db8::', 32],
    ['fc00::', 7],
    ['fe80::', 10],
    ['ff00::', 8],
].forEach(([address, prefix]) => FORBIDDEN_ADDRESSES.addSubnet(address, prefix, 'ipv6'));

/** 接続を拒否したときのエラーコード */
const FORBIDDEN_ADDRESS_CODE = 'EHANAKO_FORBIDDEN_ADDRESS';

/**
 * 接続を許さないアドレスかどうか
 *
 * @param {string} address IPアドレス
 * @returns {boolean}
 */
function isForbiddenAddress(address) {
    const family = net.isIP(address);
    if (family === 0) return false;
    return FORBIDDEN_ADDRESSES.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

/**
 * @param {string} target 拒否した接続先
 * @returns {Error}
 */
function forbiddenAddressError(target) {
    return Object.assign(new Error(`接続が許可されていないアドレス: ${target}`), { code: FORBIDDEN_ADDRESS_CODE });
}

/**
 * URLのスキームと、ホストがIPアドレスで直接書かれている場合のアドレスを検査する
 * （IPアドレス直書きの接続先は名前解決を経ないため、lookupでは検査できない）
 *
 * @param {string} protocol 'http:' など
 * @param {string} hostname ホスト名（IPv6は角括弧付きでもよい）
 */
function assertPublicTarget(protocol, hostname) {
    if (protocol !== 'http:' && protocol !== 'https:') {
        throw forbiddenAddressError(`${protocol}//${hostname}`);
    }
    const host = hostname.replace(/^\[(.*)\]$/, '$1');
    if (isForbiddenAddress(host)) {
        throw forbiddenAddressError(host);
    }
}

/**
 * 名前解決の結果が接続を許さないアドレスなら失敗させるlookup
 * 接続する瞬間の解決結果を検査するため、DNSの応答を差し替える攻撃（DNSリバインディング）にも効く
 *
 * @type {import('net').LookupFunction}
 */
function publicOnlyLookup(hostname, options, callback) {
    // net/http の lookup はコールバック形式の関数を要求するため、Promise版は使わない
    // eslint-disable-next-line n/prefer-promises/dns
    dns.lookup(hostname, options, (err, address, family) => {
        if (err) return callback(err);
        const entries = Array.isArray(address) ? address : [{ address }];
        const forbidden = entries.find((entry) => isForbiddenAddress(entry.address));
        if (forbidden) return callback(forbiddenAddressError(`${hostname} (${forbidden.address})`));
        return callback(null, address, family);
    });
}

const httpAgent = new http.Agent({ lookup: publicOnlyLookup });
const httpsAgent = new https.Agent({ lookup: publicOnlyLookup });

/**
 * 利用者が指定したURLを取得するためのaxios設定
 * 内部ネットワークへの接続（SSRF）を、初回の接続先・リダイレクト先の両方で拒否する
 *
 * @param {string} url 取得するURL
 * @returns {object} axiosのリクエスト設定に混ぜる値
 */
function publicOnlyRequestConfig(url) {
    const { protocol, hostname } = new URL(url);
    assertPublicTarget(protocol, hostname);

    return {
        httpAgent,
        httpsAgent,
        // 環境変数のプロキシを経由すると、接続先の検査がプロキシ側に移ってしまうため使わない
        proxy: false,
        maxRedirects: 5,
        beforeRedirect: (options) => assertPublicTarget(options.protocol, options.hostname),
    };
}

/**
 * 接続を拒否したことによるエラーかどうか（リダイレクト時のエラーは原因に包まれている）
 *
 * @param {any} err
 * @returns {boolean}
 */
function isForbiddenAddressError(err) {
    for (let e = err; e; e = e.cause) {
        if (e.code === FORBIDDEN_ADDRESS_CODE) return true;
    }
    return false;
}

module.exports = {
    isForbiddenAddress,
    publicOnlyRequestConfig,
    isForbiddenAddressError,
};
