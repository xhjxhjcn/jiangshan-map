// 生成 IndexNow key 文件（内容 = 文件名，UTF-8 无 BOM），并写一个推送脚本。
// IndexNow 是 Bing / Yandex / Seznam / Naver 共用的即时收录协议，一次推送即通知全部参与方。
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const KEY = process.env.INDEXNOW_KEY || crypto.randomBytes(16).toString('hex'); // 32 位 hex
const KEY_FILE = `${KEY}.txt`;

// 清掉旧的 key 文件，避免堆积
for (const f of fs.readdirSync(ROOT)) {
  if (/^[0-9a-f]{32}\.txt$/.test(f)) fs.unlinkSync(path.join(ROOT, f));
}

fs.writeFileSync(path.join(ROOT, KEY_FILE), KEY, 'utf8');
console.log('IndexNow key file:', KEY_FILE);
console.log('key:', KEY);
console.log('线上地址: https://map.xhja.cn/' + KEY_FILE);
