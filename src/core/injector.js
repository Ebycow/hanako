const assert = require('assert').strict;

let resolvations = new Map();
let singletons = new Map();
let dependencies = null;

/**
 * @template T
 * @param {T} type
 * @returns {InstanceType<T> | null}
 */
function resolveSingleton(type) {
    assert(typeof type === 'function');

    if (!singletons.has(type)) {
        return null;
    }
    return singletons.get(type);
}

const Injector = {
    /**
     * @param {object} configs
     */
    configure(configs) {
        assert(typeof configs === 'object' && Array.isArray(configs));
        assert(configs.every(config => typeof config.interface === 'string'));
        assert(configs.every(config => typeof config.dependent === 'string'));

        if (dependencies !== null) {
            throw new TypeError('You may not configure dependencies twice.');
        }

        dependencies = configs.reduce((map, config) => map.set(config.interface, config.dependent), new Map());
    },

    /**
     * @param {Function} inf Interface Class
     * @param {Function} klass Concrete Class
     * @param {Function[]} [args=[]] Injectable arguments for klass constructor
     */
    register(inf, klass, args = []) {
        assert(typeof inf === 'function');
        assert(typeof klass === 'function');
        assert(args.every(arg => typeof arg === 'function'));

        if (resolvations.has(inf)) {
            const resolvation = resolvations.get(inf);
            if (resolvation.some(([K, _]) => K === klass)) {
                throw new TypeError(`${klass.name} was registered twice for ${inf.name}.`);
            }
            resolvation.push([klass, args]);
        } else {
            resolvations.set(inf, [[klass, args]]);
        }
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
        if (!dependencies.has(inf.name)) {
            throw new TypeError(`${inf.name} is not configured.`);
        }

        const dependantName = dependencies.get(inf.name);
        const resolvation = resolvations.get(inf);
        const dependency = resolvation.find(([K, _]) => K.name === dependantName);
        if (!dependency) {
            throw new TypeError(`No such implementation ${dependantName} registered for ${inf.name}.`);
        }

        const [C, args] = dependency;
        const resolvedArgs = args.map(x => resolveSingleton(x) || Injector.resolve(x));
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
};

module.exports = Injector;
