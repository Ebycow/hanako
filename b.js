
const R = new RegExp('[\.\?\(\)\{\^]+', 'g');
const SilentRegexp = new RegExp('[\s　,\.\?!\^\(\)`:\'"`;\{\}\\[\\]。、，．‥・…ー～~]+', 'g');
const a = 'お^^^^ま[]()えな???～～～、、、、'.replace(SilentRegexp, '');

console.log(a);
