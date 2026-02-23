const commands = require('./commands');

/** @typedef {import('./commands').CommandT} CommandT */
/** @typedef {import('../entity/command_input')} CommandInput */
/** @typedef {import('../model/hanako')} Hanako */

/**
 * ドメインモデル
 * コマンドー
 *
 * 😌「ただのカカシですな。俺達なら瞬きする間に皆殺しにできる。忘れないことだ」
 * 😤「勿論です、プロですから」
 *
 * 😸「来いよベネット 銃なんか捨ててかかって来い」
 * 😠「ガキなんて必要ねぇ、へへへ…… ガキにはもう用はねぇ！へへへへ…… 誰がテメェなんか……テメェなんか恐かねぇ！」
 * 😡「野郎ぶっ殺してやらぁ！！」
 */
class Commando {
    /**
     * コマンドーを構築
     *
     * @param {Hanako} hanako コマンド実行下の読み上げ花子モデル
     */
    constructor(hanako) {
        const classes = Array.from(Object.values(commands));
        this.resolvers = classes.map((K) => (name) => (K.names.includes(name) ? new K(hanako) : null));
    }

    /**
     * 入力からコマンドを解決
     *
     * @param  {CommandInput} input コマンド引数
     * @returns {[CommandT, CommandInput]} コマンドインスタンスと消費済みコマンド引数のペア（コマンドが見つからない場合インスタンスはnull）
     */
    resolve(input) {
        const max = 10;
        const go = (c, name, ...rest) => {
            const maybeInstance = this.resolvers.reduce((maybeInstance, f) => maybeInstance || f(name), null);
            if (maybeInstance) return [maybeInstance, c];
            if (rest.length > 0 && c <= max) {
                return go(c + 1, `${name}-${rest[0]}`, ...rest.slice(1));
            } else {
                return [null, 0];
            }
        };

        // コマンド名を解決
        const [cmd, consumed] = go(1, ...input.argv);
        if (!cmd) {
            return [null, input];
        }

        // コマンド名で消費した分の引数をCommandInputでも消費させる
        let output = input;
        for (let i = 0; i < consumed; i++) output = output.consume();

        return [cmd, output];
    }
}

module.exports = Commando;
