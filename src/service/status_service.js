const Injector = require('../core/injector');
const AppSettings = require('../core/app_settings');
const IVoiceStatusRepo = require('../domain/repo/i_voice_status_repo');

/**
 * アプリケーションサービス
 * ボットステータスに表示する文言の生成
 */
class StatusService {
    /**
     * @param {null} voiceStatusRepo DI
     * @param {null} appSettings DI
     */
    constructor(voiceStatusRepo = null, appSettings = null) {
        this.voiceStatusRepo = voiceStatusRepo || Injector.resolve(IVoiceStatusRepo);
        this.appSettings = appSettings || Injector.resolve(AppSettings);
    }

    /**
     * ボットステータスに表示する文言を生成
     *
     * @returns {Promise<string>} ステータス文言
     */
    async serve() {
        // TODO: 起動後の読み上げ回数は再起動で消え意味が薄い。参加中VC数など価値のある表示への差し替えを検討
        const readCount = await this.voiceStatusRepo.loadReadCount();
        return `${this.appSettings.defaultCommandPrefix}help | ${readCount}回読んだ！`;
    }
}

module.exports = StatusService;
