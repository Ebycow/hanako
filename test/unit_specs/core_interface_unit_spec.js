const should = require('chai').should();
const Interface = require('../../src/core/interface');

describe('Interface', () => {
    specify('インターフェースの宣言ができる', () => {
        class IDisposable extends Interface {
            dispose() {}
        }

        IDisposable.should.be.a('function');
    });

    describe('#apply', () => {
        context('正常系', () => {
            specify('正しく実装されていれば適用できる', () => {
                class IDisposable extends Interface {
                    dispose() {}
                }

                class Cat {
                    dispose() {
                        this.dead = true;
                    }
                }

                (() => IDisposable.apply(Cat)).should.not.throw();
            });

            specify('ねこは IDisposable のインスタンスになる', () => {
                class IDisposable extends Interface {
                    dispose() {}
                }

                class Cat {
                    dispose() {
                        this.dead = true;
                    }
                }

                class Dog {}

                IDisposable.apply(Cat);

                const neko = new Cat();
                (neko instanceof Cat).should.be.true;
                (neko instanceof IDisposable).should.be.true;

                const inu = new Dog();
                (inu instanceof IDisposable).should.be.false;
            });

            specify('ねこは IAnimal のインスタンスにもなる', () => {
                class IDisposable extends Interface {
                    dispose() {}
                }

                class IAnimal extends Interface {
                    defecate(quantity) {}
                }

                class Cat {
                    dispose() {
                        this.dead = true;
                    }
                    defecate(quantity) {
                        this.shit += quantity;
                    }
                }

                IDisposable.apply(Cat);
                IAnimal.apply(Cat);

                const neko = new Cat();
                (neko instanceof Cat).should.be.true;
                (neko instanceof IDisposable).should.be.true;
                (neko instanceof IAnimal).should.be.true;
            });
        });

        context('異常系', () => {
            specify('正しく実装されていなければ失敗する', () => {
                class IDisposable extends Interface {
                    dispose() {}
                    revive(reason) {}
                }

                class Cat {
                    dispose() {
                        this.dead = true;
                    }
                    // reasonがない
                    revive() {
                        console.log('生き返ったのにゃ！');
                    }
                }

                (() => IDisposable.apply(Cat)).should.throw();
            });

            specify('同じクラスに２回適用すると失敗する', () => {
                class IDisposable extends Interface {
                    dispose() {}
                    revive(reason) {}
                }

                class Cat {
                    dispose() {
                        this.dead = true;
                    }
                    revive(reason) {
                        console.log(`${reason}で生き返ったのにゃ！`);
                    }
                }

                (() => IDisposable.apply(Cat)).should.not.throw();
                (() => IDisposable.apply(Cat)).should.throw();
            });

            specify('空の定義は失敗する', () => {
                class IDisposable extends Interface {}

                class Cat {}

                (() => IDisposable.apply(Cat)).should.throw();
            });

            specify('extendsは失敗する', () => {
                class IDisposable extends Interface {
                    dispose() {}
                }

                class Cat extends IDisposable {
                    dispose() {
                        this.dead = true;
                    }
                }

                (() => new Cat()).should.throw();
            });

            specify('間接継承は失敗する', () => {
                class IBase extends Interface {
                    base() {}
                }

                class IDisposable extends IBase {
                    dispose() {}
                }

                class Cat {
                    dispose() {
                        this.dead = true;
                    }
                    base() {
                        this.dead = false;
                    }
                }

                (() => IDisposable.apply(Cat)).should.throw();
            });

            specify('対象がインターフェースだと失敗する', () => {
                class IDisposable extends Interface {
                    dispose() {}
                }

                class Cat extends Interface {
                    dispose() {
                        this.dead = true;
                    }
                }

                (() => IDisposable.apply(Cat)).should.throw();
            });

            specify('対象もインターフェースだと失敗する', () => {
                class IDisposable extends Interface {
                    dispose() {}
                }

                class Cat extends Interface {
                    dispose() {
                        this.dead = true;
                    }
                }

                (() => IDisposable.apply(Cat)).should.throw();
            });

            specify('メソッド以外を宣言すると失敗する', () => {
                class IDisposable extends Interface {
                    dispose() {}
                    get age() {
                        return NaN;
                    }
                }

                class Cat {
                    dispose() {
                        this.dead = true;
                    }
                    get age() {
                        return 'ひみつにゃ';
                    }
                }

                (() => IDisposable.apply(Cat)).should.throw();
            });
        });
    });
});
