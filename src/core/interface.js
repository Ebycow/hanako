const assert = require('assert').strict;

const interfaces = [];

const concretes = new Map();

function isMethod(desc) {
    if (!desc.value) return false;
    if (!desc.writable) return false;
    if (!desc.configurable) return false;
    return typeof desc.value === 'function';
}

function createHasInstance(iclass, methods) {
    /** @type {Array<[string, number]>} */
    const name_arity_s = Object.entries(methods).map(([name, desc]) => [name, desc.value.length]);
    function hasInstance(instance) {
        if (!instance) return false;
        if (!instance.constructor) return false;
        for (const [name, arity] of name_arity_s) {
            if (!instance[name]) return false;
            if (typeof instance[name] !== 'function') return false;
            if (instance[name].length !== arity) return false;
        }
        return true;
    }
    return hasInstance.bind(iclass);
}

/**
 * インターフェイス
 */
class Interface {
    /**
     * 必ずエラーになるコンストラクタ
     */
    constructor() {
        if (this.constructor === Interface) {
            throw new TypeError('Do never "new Interface()".');
        }
        const cname = this.constructor.name;
        const prop = Object.getPrototypeOf(this.constructor);
        if (prop === Interface) {
            throw new TypeError(`Interfaces shall never be instantiated. Got "new ${cname}()".`);
        }
        const iname = prop.name;
        throw new TypeError(`Do not "${cname} extends ${iname}". Use "${iname}.apply(${cname})" instead.`);
    }

    static [Symbol.hasInstance]() {
        throw new TypeError('unreachable');
    }

    /**
     * 対象がインターフェースを満たすことを保証する
     *
     * @param {Function} klass インターフェースを実装するクラス
     */
    static apply(klass) {
        // 初めて登録されるインターフェース（this）について
        if (!interfaces.includes(this)) {
            // インターフェース (this) に対する制約
            // 1. Interfaceを直接継承していること
            // 2. 一つ以上のメソッド宣言を含むこと
            // 3. メソッド宣言のみを含むこと
            const inherit = Object.getPrototypeOf(this);
            assert(inherit === Interface, `${this.name} must not have nested-inheritance.`);
            const descs = Object.getOwnPropertyDescriptors(this.prototype);
            delete descs['constructor'];
            assert(Object.values(descs).length > 0, `The interface "${this.name} must have at least one method.`);
            assert(Object.values(descs).every(isMethod), `The interface "${this.name}" must only have methods.`);

            // static [Symbol.hasInstance] を実装
            Object.defineProperty(this, Symbol.hasInstance, {
                value: createHasInstance(this, descs),
                writable: false,
                enumerable: false,
                configurable: false,
            });

            interfaces.push(this);
        }

        // 実装クラス (klass) に対する制約
        // 1. 関数であること
        // 2. Interfaceを継承していないこと
        // 3. Klass.prototypeがインターフェース（this）の [Symbol.hasInstance] に適合していること（isntanceof）
        assert(typeof klass === 'function', `${klass.name} must be a function.`);
        let tmp = klass;
        do {
            assert(tmp !== Interface, `${klass.name} must not be an interface.`);
        } while ((tmp = Object.getPrototypeOf(tmp)));
        assert(klass.prototype instanceof this, `${klass.name} must fulfill ${this.name}.`);

        // 実装クラスの登録
        if (concretes.has(klass)) {
            const ifs = concretes.get(klass);
            // applyを同じクラスに対して何度も使わないこと
            assert(!ifs.includes(this), 'Interface must apply only once to the same class.');
            ifs.push(this);
        } else {
            concretes.set(klass, [this]);
        }
    }
}

module.exports = Interface;
