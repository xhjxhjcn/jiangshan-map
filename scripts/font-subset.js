// 把 Ma Shan Zheng 的字符子集清单写成文件，供校验与重新生成字体时使用。
//
// 上游用 Google Fonts 的 &text= 参数做子集；本站改为自托管（assets/fonts/），
// 但字符覆盖必须与上游一致，否则标题里会出现缺字方框。
// 这份清单就是上游那串 &text= 解码后的结果。
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SUBSET = decodeURIComponent(
  '%20%26%27CDEFHJKMNPQRSTWYabcdefghilmnoprstuvxy' +
    '%E4%B8%89%E4%B8%9C%E4%B8%AD%E4%BA%94%E4%BA%BA%E4%BB%A3%E5%85%83%E5%85%AD%E5%85%B1%E5%8C%97' +
    '%E5%8D%81%E5%8D%8E%E5%8D%97%E5%92%8C%E5%94%90%E5%9B%BD%E5%AE%8B%E5%B1%B1%E5%BA%8F%E6%88%98' +
    '%E6%97%B6%E6%98%8E%E6%99%8B%E6%9C%9D%E6%B0%91%E6%B1%89%E6%B1%9F%E6%B8%85%E7%A7%A6%E8%A5%BF' +
    '%E9%9A%8B'
);

fs.writeFileSync(path.join(ROOT, 'assets/fonts/ma-shan-zheng.subset.txt'), SUBSET, 'utf8');
console.log('字符子集长度:', [...SUBSET].length, '个字符');
console.log('内容:', SUBSET);
