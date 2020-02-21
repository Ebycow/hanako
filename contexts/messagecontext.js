/**
 * メッセージコンテキストクラス
 * 
 * @description
 * `on('message')`イベントでメッセージを受け取った実行単位において共有されるコンテキストです。
 * `discord.Client`や`discord.Message`の持つプロパティまたは`Hanako`のトップレベルオブジェクトの中から
 * 実行単位の全体を通して利用される必要最低限の情報を必要最低限の形式で持っています。
 * これは他のモデルクラスやコマンドクラスが上位の実装に依存してしまうのを避けるためです。
 */
class MessageContext {

    /**
     * @param {Object} options 
     * @param {boolean} options.isMainChannel
     * @param {boolean} options.isAuthorInVC
     * @param {function():boolean} options.isJoined
     * @param {function():boolean} options.isSpeaking
     * @param {function():number} options.queueLength
     * @param {function():void} options.queuePurge
     * @param {function():Promise<string>} options.voiceJoin
     * @param {function():void} options.voiceLeave
     * @param {function(string):Promise<void>} options.voiceCancel
     * @param {function(string):string} options.resolveRoleName
     * @param {function(string):string} options.resolveUserName
     * @param {function(string):string} options.resolveChannelName
     */
    constructor(options) {
        
        /**
         * @type {boolean}
         * @description 当該メッセージの送信元テキストチャンネルが花子を呼び出したときのテキストチャンネルと同じか否か。
         */
        this.isMainChannel = (typeof options.isMainChannel !== 'undefined') ? options.isMainChannel : null;

        /**
         * @type {boolean}
         * @description 当該メッセージの送信者がメッセージ送信時点においてVCに参加中か否か。
         */
        this.isAuthorInVC = (typeof options.isAuthorInVC !== 'undefined') ? options.isAuthorInVC : null;

        /**
         * @type {function():boolean}
         * @returns 任意の時点（関数の呼び出し時点）において、当該メッセージの送信元サーバーで花子がVC参加中か否か。
         */
        this.isJoined = (typeof options.isJoined !== 'undefined') ? options.isJoined : null;

        /**
         * @type {function():boolean} 
         * @returns 任意の時点（関数の呼び出し時点）において、当該メッセージの送信元サーバーに対し花子が音声ストリームを送信中か否か。
         * @description 送信中の定義は、音声ストリーム待ち行列長が0である場合も含む。
         */
        this.isSpeaking = (typeof options.isSpeaking !== 'undefined') ? options.isSpeaking : null;
        
        /**
         * @type {function():number}
         * @returns 任意の時点（関数の呼び出し時点）における音声ストリーム待ち行列長。
         */
        this.queueLength = (typeof options.queueLength !== 'undefined') ? options.queueLength : null;

        /**
         * @type {function():void}
         * @description 当該メッセージの送信元サーバーに対応する音声ストリーム待ち行列を初期化する処理（同期）。
         */
        this.queuePurge = (typeof options.queuePurge !== 'undefined') ? options.queuePurge : null;

        /**
         * @type {function():Promise<string>}
         * @returns 当該メッセージが送信されたチャンネルへのリンク文字列。
         * @description 当該メッセージの送信者が参加しているVCに花子を参加させる処理（非同期）。
         */
        this.voiceJoin = (typeof options.voiceJoin !== 'undefined') ? options.voiceJoin : null;

        /**
         * @type {function():void}
         * @description 当該メッセージの送信元サーバーにおいてVC参加中の花子をVCから退出させる処理（同期）。
         */
        this.voiceLeave = (typeof options.voiceLeave !== 'undefined') ? options.voiceLeave : null;

        /**
         * @type {function(string):Promise<void>}
         * @description 花子が送信中の音声ストリームを中止する処理（非同期）。キューが残っていれば続けて再生される。引数は中止する理由。
         */
        this.voiceCancel = (typeof options.voiceCancel !== 'undefined') ? options.voiceCancel : null;

        /**
         * @type {function(string):string}
         * @returns ユーザー名の文字列。
         * @description ユーザーID文字列からユーザー名文字列を解決する処理（同期）。
         */
        this.resolveUserName = (typeof options.resolveUserName !== 'undefined') ? options.resolveUserName : null;

        /**
         * @type {function(string):string}
         * @returns ロール名の文字列。
         * @description ロールID文字列からロール名文字列を解決する処理（同期）。
         */
        this.resolveRoleName = (typeof options.resolveRoleName !== 'undefined') ? options.resolveRoleName : null;

        /**
         * @type {function(string):string}
         * @returns チャンネル名の文字列。
         * @description チャンネルID文字列からチャンネル名文字列を解決する処理（同期）。
         */
        this.resolveChannelName = (typeof options.resolveChannelName !== 'undefined') ? options.resolveChannelName : null;

    }

}

module.exports = {
    MessageContext
};
