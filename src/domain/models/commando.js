const commands = require('./commands');

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
    constructor() {
        /** @type {[(name:string) => import('./commands/command')]} */
        this.resolvers = [];
        for (const K of Object.values(commands)) {
            const I = new K();
            const F = name => (K.names.includes(name) ? I : null);
            this.resolvers.push(F);
        }
    }

    /**
     * 引数からコマンドを解決
     *
     * @param  {...string} args
     * @returns {[import('./commands/command'), number]} コマンドインスタンスと引数消費量のペア 見つからない場合Commandはnull
     */
    resolve(...args) {
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

        return go(1, ...args);
    }
}

module.exports = Commando;
