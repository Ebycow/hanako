const assert = require('assert').strict;

let resolvations = new Map();

const Injector = {
    /**
     * @param {Function} inf Interface Class
     * @param {Function} klass Concrete Class
     * @param {...Function} args Injectable arguments for klass constructor
     */
    register(inf, klass, ...args) {
        assert(typeof inf === 'function');
        assert(typeof klass === 'function');
        for (const arg of args) {
            assert(typeof arg === 'function');
        }

        if (resolvations.has(inf)) {
            // TODO 実装切り替えをコンフィグできるようにする（マスト）
            //      とりあえず複数実装検出したら死ぬようにしておく
            throw new Error('not implemented yet');
        }

        resolvations.set(inf, [klass, args]);
    },

    /**
     * @template T
     * @param {T} inf Interface Class (must be a function)
     * @returns {InstanceType<T>}
     */
    resolve(inf) {
        assert(typeof inf === 'function');

        if (!resolvations.has(inf)) {
            throw new TypeError(`No implementation found for ${inf.name}.`);
        }

        const [C, args] = resolvations.get(inf);
        const resolvedArgs = args.map(x => Injector.resolve(x));
        return new C(...resolvedArgs);
    },
};

module.exports = Injector;
