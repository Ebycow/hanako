const assert = require('assert').strict;

let resolvations = new Map();
let singletons = new Map();

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

    /**
     * @template T
     * @param {T} type Any type to register with a signleton instance
     * @param {InstanceType<T>} singleton singleton instance
     */
    registerSingleton(type, singleton) {
        assert(typeof type === 'function');
        assert(typeof singleton === 'object');

        if (singletons.has(type)) {
            throw new TypeError('Singleton dependency can only be registered once.');
        }

        singletons.set(type, singleton);
    },

    /**
     * @template T
     * @param {T} type
     * @returns {InstanceType<T>}
     */
    resolveSingleton(type) {
        assert(typeof type === 'function');

        if (!singletons.has(type)) {
            throw new TypeError(`No singleton found for ${type.name}`);
        }

        return singletons.get(type);
    },
};

module.exports = Injector;
