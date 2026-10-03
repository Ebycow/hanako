require('chai').should();
const { AxiosError } = require('axios');
const log4js = require('log4js');
const { formatError, formatLogEvent, stripQuery } = require('../../src/core/logging');
const { dmessageBlueprint, commandInputBlueprint, wordDictionaryLineBlueprint } = require('../helpers/blueprints');
const ChatResponse = require('../../src/domain/entity/responses/chat_response');
const VoiceroidAudio = require('../../src/domain/entity/audios/voiceroid_audio');
const Plain = require('../../src/domain/entity/audios/plain');
const WordCreateAction = require('../../src/domain/entity/actions/word_create_action');

/************************************************************************
 * ログ出力のプライバシー単体スペック
 *
 * 期待動作：利用者の発言本文・入力文字列がログ出力に含まれない
 * 備考：SECRET をログに出てはいけない文字列の目印として使う
 ***********************************************************************/

const SECRET = 'ひみつの発言本文';

/**
 * Ebyroid への GET が 500 で失敗したときと同じ形の AxiosError を作る
 *
 * @returns {AxiosError}
 */
function ebyroidAxiosError() {
    const config = {
        method: 'get',
        url: 'http://localhost:4090/api/v1/audiostream',
        params: { text: SECRET, name: 'zundamon' },
        headers: {},
    };
    const request = { path: `/api/v1/audiostream?text=${encodeURIComponent(SECRET)}` };
    const response = { status: 500, statusText: 'Internal Server Error', data: { text: SECRET }, config, headers: {} };
    return new AxiosError('Request failed with status code 500', 'ERR_BAD_RESPONSE', config, request, response);
}

describe('ログ出力', () => {
    describe('formatError', () => {
        specify('AxiosError から発言本文を除き、原因特定に必要な情報は残す', () => {
            const output = formatError(ebyroidAxiosError());

            output.should.not.include(SECRET);
            output.should.not.include(encodeURIComponent(SECRET));
            output.should.include('Request failed with status code 500');
            output.should.include('code=ERR_BAD_RESPONSE');
            output.should.include('status=500');
            output.should.include('method=GET');
            output.should.include('url=http://localhost:4090/api/v1/audiostream');
        });

        specify('AggregateError は内包するエラーを要約する', () => {
            const inner = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:4090'), { code: 'ECONNREFUSED' });
            const err = new AggregateError([inner], '');

            const output = formatError(err);

            output.should.include('connect ECONNREFUSED 127.0.0.1:4090');
            output.should.include('code=ECONNREFUSED');
        });

        specify('cause を辿って要約する', () => {
            const cause = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET', secret: SECRET });
            const err = new Error('outer', { cause });

            const output = formatError(err);

            output.should.include('Caused by: Error: read ECONNRESET (code=ECONNRESET');
            output.should.not.include(SECRET);
        });

        specify('スタックトレースのフレームを残す', () => {
            formatError(new Error('boom')).should.match(/\n\s+at /);
        });
    });

    describe('formatLogEvent', () => {
        specify('タイムスタンプ・レベル・カテゴリ付きの1レコードに整形する', () => {
            const event = {
                startTime: new Date(2026, 8, 25, 20, 14, 3, 7),
                level: log4js.levels.ERROR,
                categoryName: 'application.js',
                data: ['予期しないエラーが発生。', ebyroidAxiosError()],
            };

            const output = formatLogEvent(event);

            output.should.match(
                /^\[2026-09-25T20:14:03\.007\] \[ERROR\] application\.js - 予期しないエラーが発生。 AxiosError/
            );
            output.should.not.include(SECRET);
        });
    });

    describe('stripQuery', () => {
        specify('クエリとフラグメントを取り除く', () => {
            stripQuery('http://example.com/a?text=x#y').should.equal('http://example.com/a');
            stripQuery('http://example.com/a').should.equal('http://example.com/a');
        });
    });

    describe('エンティティの toString', () => {
        specify('DiscordMessage は本文の代わりに文字数を出す', () => {
            const output = dmessageBlueprint({ content: SECRET }).toString();
            output.should.not.include(SECRET);
            output.should.include(`contentLength=${SECRET.length}`);
        });

        specify('CommandInput はコマンド引数を出さない', () => {
            commandInputBlueprint({ argc: 1, argv: [SECRET] })
                .toString()
                .should.not.include(SECRET);
        });

        specify('ChatResponse は本文を出さない', () => {
            const res = new ChatResponse({ id: 'id', content: SECRET, channelId: 'ch', code: 'simple' });
            res.toString().should.not.include(SECRET);
        });

        specify('VoiceroidAudio と Plain は読み上げ内容を出さない', () => {
            new VoiceroidAudio({ content: SECRET, speaker: 'default' }).toString().should.not.include(SECRET);
            new Plain({ content: SECRET }).toString().should.not.include(SECRET);
        });

        specify('教育単語は単語を出さない', () => {
            wordDictionaryLineBlueprint({ from: SECRET, to: SECRET }).toString().should.not.include(SECRET);
            new WordCreateAction({ id: 'id', serverId: 'sv', from: SECRET, to: SECRET })
                .toString()
                .should.not.include(SECRET);
        });
    });
});
