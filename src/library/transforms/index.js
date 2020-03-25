/**
 * Transforms読み込み用インデックス
 */
module.exports = {
    Mono2StereoConverter: require('./mono_2_stereo_converter'),
    StereoByteAdjuster: require('./stereo_byte_adjuster'),
    WaveFileHeaderTrimmmer: require('./wave_file_header_trimmer'),
};
