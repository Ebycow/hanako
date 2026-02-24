/**
 * レーベンシュタイン距離を計算する関数
 *
 * @param {string} a 比較する文字列1
 * @param {string} b 比較する文字列2
 * @returns {number} レーベンシュタイン距離
 */
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // 初期化
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // 距離計算
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // 置換
                    matrix[i][j - 1] + 1, // 挿入
                    matrix[i - 1][j] + 1 // 削除
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

module.exports = levenshteinDistance;
