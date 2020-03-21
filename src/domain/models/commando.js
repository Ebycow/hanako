const commands = require('./commands');

/** @typedef {import('./commands/_command.js')} Command */
/** @typedef {import('../entities/command_input')} CommandInput */
/** @typedef {import('../entities/server_status')} ServerStatus */

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
     * @param {ServerStatus} status コマンド実行下のサーバー状態
     */
    constructor(status) {
        /** @type {Array<(name:string) => Command>} */
        this.resolvers = [];
        for (const K of Object.values(commands)) {
            const I = new K(status);
            const F = name => (K.names.includes(name) ? I : null);
            this.resolvers.push(F);
        }
    }

    /**
     * 入力からコマンドを解決
     *
     * @param  {CommandInput} input コマンド引数
     * @returns {[Command, CommandInput]} コマンドインスタンスと消費済みコマンド引数のペア（コマンドが見つからない場合インスタンスはnull）
     */
    resolve(input) {
        const go = (c, name, ...rest) => {
            for (const F of this.resolvers) {
                const I = F(name);
                if (I) return [I, c];
            }
            if (rest.length > 0) {
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
