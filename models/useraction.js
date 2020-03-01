class UserAction {
    constructor(options) {
        this.type = options.type;
    }
}

class PagingAction extends UserAction {
    constructor(targetIndex) {
        super({ type: 'paging' });
        this.targetIndex = targetIndex;
    }
}

class TeachPagingAction extends PagingAction {
    constructor(targetIndex) {
        super(targetIndex);
    }
}

class SoundEffectPagingAction extends PagingAction {
    constructor(targetIndex) {
        super(targetIndex);
    }
}

class ActionResult {
    /**
     * @param {string?} text
     */
    constructor(text) {
        /**
         * @type {string?} 表示すべきテキスト内容
         */
        this.text = text;
    }
}

module.exports = {
    UserAction,
    PagingAction,
    TeachPagingAction,
    SoundEffectPagingAction,
    ActionResult,
};
