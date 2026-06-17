#!/usr/bin/env node
/**
 * 大象机器人消息发送脚本（Node.js 版，无外部依赖）
 * 支持文本消息和图片消息，发送图片时自动上传到 Venus 图片服务。
 *
 * 凭证配置文件：~/.catpaw/meituan-dx-robot-fast.config.json
 *
 * 用法:
 *   # 保存凭证（首次使用）
 *   node dx_robot_msg.js --save-config \
 *     --client_id <ID> --client_secret <KEY> \
 *     --venus_client_id <VCID> --venus_client_secret <VKEY> --venus_bucket <BUCKET>
 *
 *   # 发文本到群
 *   node dx_robot_msg.js --gid 69984970026 --type text --content "Hello"
 *
 *   # 发文本给个人
 *   node dx_robot_msg.js --mis zhangsan --type text --content "Hello"
 *
 *   # 发图片（自动上传 Venus）
 *   node dx_robot_msg.js --gid 69984970026 --type image --file /path/to/img.png
 *
 *   # 发图片（已有 URL，跳过上传）
 *   node dx_robot_msg.js --gid 69984970026 --type image --image_url "http://..."
 *
 *   # @ 人
 *   node dx_robot_msg.js --gid 69984970026 --type text --content "请查看" --at "zhangsan:张三,lisi"
 *
 *   # @ 所有人
 *   node dx_robot_msg.js --gid 69984970026 --type text --content "注意" --at all
 *
 *   # 多机器人场景
 *   node dx_robot_msg.js --bot ad-robot --gid 69984970026 --type text --content "Hello"
 */

'use strict';

const crypto = require('crypto');
const fs     = require('fs');
const http   = require('http');
const https  = require('https');
const os     = require('os');
const path   = require('path');

// ── 常量 ──────────────────────────────────────────────────

const TOKEN_URL      = 'https://ssosv.sankuai.com/sson/auth/oidc/v1/token';
const XOPEN_BASE     = 'https://xopen.sankuai.com/open-apis';
const CONFIG_PATH    = path.join(os.homedir(), '.catpaw', 'meituan-dx-robot-fast.config.json');
const TOKEN_CACHE_DIR = path.join(os.tmpdir(), 'dx_robot_token_cache');

const VENUS_HOSTS = {
  prod: 'https://pic-in.vip.sankuai.com',
  test: 'https://extrauploader.inf.test.sankuai.com',
};

// ── 工具函数 ──────────────────────────────────────────────

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function parseArgs(argv) {
  const flags = {};
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key  = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    }
    i++;
  }
  return flags;
}

// ── HTTP（零依赖）────────────────────────────────────────

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url);
    const lib     = parsed.protocol === 'https:' ? https : http;
    const bodyBuf = options.body
      ? (Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body, options.bodyEncoding || 'utf8'))
      : null;

    const reqOptions = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   options.method || 'GET',
      headers:  { ...(options.headers || {}) },
    };
    if (bodyBuf) reqOptions.headers['Content-Length'] = bodyBuf.length;

    const req = lib.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    if (options.timeout) req.setTimeout(options.timeout, () => req.destroy(new Error('timeout')));
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

async function postForm(url, params, timeoutMs = 10000) {
  const body = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const res = await request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    timeout: timeoutMs,
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}: ${res.body}`);
  return JSON.parse(res.body);
}

async function postJson(url, token, payload, timeoutMs = 15000) {
  const body = JSON.stringify(payload);
  const res  = await request(url, {
    method:  'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json; charset=utf-8' },
    body,
    timeout: timeoutMs,
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}: ${res.body}`);
  return JSON.parse(res.body);
}

/**
 * multipart/form-data 上传（用于 Venus 图片上传）
 * @param {string} url
 * @param {object} headers
 * @param {string} fieldName
 * @param {string} filename
 * @param {string} contentType
 * @param {Buffer} fileBuffer
 */
async function postMultipart(url, headers, fieldName, filename, contentType, fileBuffer) {
  const boundary = `----Boundary${crypto.randomBytes(16).toString('hex')}`;
  const CRLF     = '\r\n';
  const head     = Buffer.from(
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"${CRLF}` +
    `Content-Type: ${contentType}${CRLF}${CRLF}`
  );
  const tail = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
  const body = Buffer.concat([head, fileBuffer, tail]);

  const res = await request(url, {
    method:  'POST',
    headers: {
      ...headers,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
    timeout: 120000,
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}: ${res.body}`);
  return JSON.parse(res.body);
}

// ── 配置文件 ──────────────────────────────────────────────

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch { return {}; }
}

function loadBotConfig(cfg, botName) {
  if (!botName) return [cfg.client_id, cfg.client_secret];
  const bot = (cfg.bots || {})[botName];
  if (!bot) {
    const available = Object.keys(cfg.bots || {});
    die(`ERROR: 找不到机器人 '${botName}'。${available.length ? '可用: ' + available.join(', ') : '尚未配置任何具名机器人'}\n` +
        `请先运行 --save-config --bot ${botName} --client_id ... --client_secret ...`);
  }
  return [bot.client_id, bot.client_secret];
}

function saveConfig(data, botName = null) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const existing = loadConfig();
  if (!botName) {
    Object.entries(data).forEach(([k, v]) => { if (v != null) existing[k] = v; });
  } else {
    const botCreds = {}, topLevel = {};
    Object.entries(data).forEach(([k, v]) => {
      if (v == null) return;
      if (k === 'client_id' || k === 'client_secret') botCreds[k] = v;
      else topLevel[k] = v;
    });
    if (Object.keys(botCreds).length) {
      existing.bots = existing.bots || {};
      existing.bots[botName] = { ...(existing.bots[botName] || {}), ...botCreds };
    }
    Object.assign(existing, topLevel);
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(existing, null, 2), 'utf8');
  try { fs.chmodSync(CONFIG_PATH, 0o600); } catch { /* Windows 不支持 */ }
  console.log(botName
    ? `✅ 机器人 '${botName}' 凭证已保存到 ${CONFIG_PATH}`
    : `✅ 配置已保存到 ${CONFIG_PATH}`);
}

// ── Token 缓存 ────────────────────────────────────────────

function getCachePath(clientId, audience) {
  const key = crypto.createHash('md5').update(`${clientId}:${audience}`).digest('hex');
  return path.join(TOKEN_CACHE_DIR, `${key}.json`);
}

function readCachedToken(clientId, audience) {
  try {
    const d = JSON.parse(fs.readFileSync(getCachePath(clientId, audience), 'utf8'));
    if (d.expires_at > Date.now() / 1000 + 60) return d.access_token;
  } catch { /* 无效或不存在 */ }
  return null;
}

function writeCachedToken(clientId, audience, token, expiresIn) {
  if (!fs.existsSync(TOKEN_CACHE_DIR)) fs.mkdirSync(TOKEN_CACHE_DIR, { recursive: true });
  fs.writeFileSync(getCachePath(clientId, audience), JSON.stringify({
    access_token: token,
    expires_at:   Date.now() / 1000 + expiresIn,
  }));
}

function clearCachedToken(clientId, audience) {
  try { fs.unlinkSync(getCachePath(clientId, audience)); } catch { /* 忽略 */ }
}

// ── JWT（零依赖 HS256）───────────────────────────────────

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function makeJwt(clientId, clientSecret) {
  const now  = Math.floor(Date.now() / 1000);
  const skew = 5;
  const h = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const p = b64url(Buffer.from(JSON.stringify({
    iss: clientId, sub: clientId, aud: TOKEN_URL,
    iat: now - skew, nbf: now - skew, exp: now + 300,
    jti: crypto.randomUUID(),
  })));
  const sig = b64url(crypto.createHmac('sha256', clientSecret).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}

// ── 大象鉴权 ──────────────────────────────────────────────

async function getDxToken(clientId, clientSecret, audience = 'xm-xai') {
  const cached = readCachedToken(clientId, audience);
  if (cached) { console.log('🔑 使用缓存的大象 token'); return cached; }

  console.log('🔑 获取大象 token（取票 + 换票）...');
  try {
    const d1 = await postForm(TOKEN_URL, {
      grant_type:            'client_credentials',
      client_id:             clientId,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion:      makeJwt(clientId, clientSecret),
      scope:                 'client_id:' + audience,
    });
    if (!d1.access_token) throw new Error('取票失败: ' + JSON.stringify(d1));

    const d2 = await postForm(TOKEN_URL, {
      grant_type:            'urn:ietf:params:oauth:grant-type:token-exchange',
      client_id:             clientId,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion:      makeJwt(clientId, clientSecret),
      subject_token:         d1.access_token,
      subject_token_type:    'urn:ietf:params:oauth:token-type:access_token',
      audience,
    });
    if (!d2.access_token) throw new Error('换票失败: ' + JSON.stringify(d2));

    writeCachedToken(clientId, audience, d2.access_token, d2.expires_in || 3600);
    return d2.access_token;
  } catch (e) {
    clearCachedToken(clientId, audience);
    throw e;
  }
}

// ── mis -> uid 查询 ──────────────────────────────────────

async function resolveMis(token, misList) {
  const r = await postJson(
    XOPEN_BASE + '/dx/queryEmpIdentityByMisList',
    token,
    { misList },
  );
  if (r?.status?.code !== 0) throw new Error('查询 mis 失败: ' + JSON.stringify(r));
  return r.data.data; // { mis: { uid, empId, mis } }
}

// ── @ 人辅助 ──────────────────────────────────────────────

function buildAtText(atInfoList) {
  return atInfoList.map(({ uid, name }) =>
    `[@${name}|mtdaxiang://www.meituan.com/profile?uid=${uid}&isAt=true]`
  ).join(' ');
}

function buildAtExtension(atInfoList) {
  return JSON.stringify({ at: atInfoList.map(i => i.uid) });
}

// ── Venus 图片上传 ────────────────────────────────────────

async function uploadImageToVenus(filePath, venusCid, venusSec, venusBucket, venusEnv = 'prod') {
  const host       = VENUS_HOSTS[venusEnv] || VENUS_HOSTS.prod;
  const requestUri = `/storage/${venusBucket}`;
  // RFC 2822 日期
  const dateStr    = new Date().toUTCString();

  const stringToSign = `POST ${requestUri}\n${dateStr}`;
  const sig = crypto
    .createHmac('sha1', venusSec)
    .update(stringToSign)
    .digest('base64');
  const authorization = `MWS ${venusCid}:${sig}`;

  const fileBuffer  = fs.readFileSync(filePath);
  const filename    = path.basename(filePath);
  const ext         = path.extname(filename).toLowerCase();
  const mimeMap     = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
  const contentType = mimeMap[ext] || 'image/jpeg';

  const fileSize = fileBuffer.length;
  console.log(`📤 尝试原图上传 (${(fileSize / 1024 / 1024).toFixed(1)}MB)...`);

  const result = await postMultipart(
    host + requestUri,
    { Date: dateStr, Authorization: authorization },
    'file',
    filename,
    contentType,
    fileBuffer,
  );

  if (!result.success) throw new Error('Venus 上传失败: ' + JSON.stringify(result));
  const url = result.data.originalLink;
  console.log('✅ Venus 上传成功:', url);
  return url;
}

// ── 发送消息 ──────────────────────────────────────────────

async function sendGroupMsg(token, gid, msgType, bodyDict, extension) {
  const sendMsgInfo = {
    isDynamicMsg: false,
    type:         msgType,
    body:         JSON.stringify(bodyDict),
  };
  if (extension) sendMsgInfo.extension = extension;
  const r = await postJson(
    XOPEN_BASE + '/dx-msg/sendGroupMsgByRobot',
    token,
    { gid: Number(gid), sendMsgInfo },
  );
  return r;
}

async function sendChatMsg(token, uidList, msgType, bodyDict) {
  const r = await postJson(
    XOPEN_BASE + '/dx-msg/sendChatMsgByRobot',
    token,
    { receiverIds: uidList, sendMsgInfo: { isDynamicMsg: false, type: msgType, body: JSON.stringify(bodyDict) } },
  );
  return r;
}

// ── main ──────────────────────────────────────────────────

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const cfg   = loadConfig();

  function get(argVal, cfgKey, defaultVal) {
    return argVal !== undefined ? argVal : (cfg[cfgKey] !== undefined ? cfg[cfgKey] : defaultVal);
  }

  const [cfgClientId, cfgClientSecret] = loadBotConfig(cfg, flags.bot || null);
  const clientId     = flags.client_id     || cfgClientId;
  const clientSecret = flags.client_secret || cfgClientSecret;
  const venusCid     = get(flags.venus_client_id,     'venus_client_id');
  const venusSec     = get(flags.venus_client_secret, 'venus_client_secret');
  const venusBucket  = get(flags.venus_bucket,        'venus_bucket');
  const venusEnv     = get(flags.venus_env,           'venus_env', 'prod');

  // --save-config
  if (flags['save-config']) {
    const data = {};
    if (clientId)     data.client_id           = clientId;
    if (clientSecret) data.client_secret        = clientSecret;
    if (venusCid)     data.venus_client_id      = venusCid;
    if (venusSec)     data.venus_client_secret  = venusSec;
    if (venusBucket)  data.venus_bucket         = venusBucket;
    if (venusEnv)     data.venus_env            = venusEnv;
    if (flags.owner_uid) data.ownerUid          = Number(flags.owner_uid);
    saveConfig(data, flags.bot || null);
    if (!flags.mis && !flags.gid) return;
  }

  // 参数校验
  if (!clientId || !clientSecret) die(`ERROR: 缺少大象机器人凭证。请通过 --client_id / --client_secret 传入，或先运行 --save-config 保存到 ${CONFIG_PATH}`);
  if (!flags.mis && !flags.gid)   die('ERROR: 请至少提供 --mis 或 --gid 之一');
  if (flags.at && !flags.gid)     die('ERROR: --at 只能在群聊消息（--gid）中使用');
  if (!flags.type)                die('ERROR: 请提供 --type text 或 --type image');
  if (flags.type === 'text' && !flags.content) die('ERROR: 文本消息需要提供 --content');
  if (flags.type === 'image') {
    if (!flags.file && !flags.image_url) die('ERROR: 图片消息需要提供 --file 或 --image_url');
    if (flags.file && !flags.image_url && (!venusCid || !venusSec || !venusBucket)) {
      die(`ERROR: 上传图片需要 --venus_client_id, --venus_client_secret, --venus_bucket（或先运行 --save-config 保存到 ${CONFIG_PATH}）`);
    }
  }

  const misList = flags.mis ? flags.mis.split(',').map(s => s.trim()).filter(Boolean) : [];
  const gidList = flags.gid ? flags.gid.split(',').map(s => s.trim()).filter(Boolean) : [];

  // 解析 --at
  let atAll = false;
  let atMisList = [];
  const atNameMap = {};
  if (flags.at) {
    if (flags.at.trim().toLowerCase() === 'all') {
      atAll = true;
    } else {
      for (const item of flags.at.split(',')) {
        const t = item.trim();
        if (!t) continue;
        const idx = t.indexOf(':');
        if (idx !== -1) {
          const mis  = t.slice(0, idx).trim();
          const name = t.slice(idx + 1).trim();
          atMisList.push(mis);
          if (name) atNameMap[mis] = name;
        } else {
          atMisList.push(t);
        }
      }
    }
  }

  const allMisToResolve = [...new Set([...misList, ...atMisList])];

  // 并行：token + 图片上传
  let imageUrl = flags.image_url || null;
  let token, identityMap = {};

  const tokenPromise  = getDxToken(clientId, clientSecret);
  const uploadPromise = (flags.type === 'image' && flags.file && !imageUrl)
    ? (console.log('📤 并行启动图片上传...'), uploadImageToVenus(flags.file, venusCid, venusSec, venusBucket, venusEnv))
    : Promise.resolve(null);

  // token 就绪后立即查询 mis
  token = await tokenPromise;

  const misPromise = allMisToResolve.length
    ? (console.log(`🔍 查询 mis: ${JSON.stringify(allMisToResolve)}`), resolveMis(token, allMisToResolve))
    : Promise.resolve({});

  // 等待图片上传和 mis 查询
  const [uploadedUrl, resolvedMis] = await Promise.all([uploadPromise, misPromise]);
  if (uploadedUrl) imageUrl = uploadedUrl;
  identityMap = resolvedMis;

  for (const mis of allMisToResolve) {
    if (!identityMap[mis]) die(`ERROR: 找不到 mis: ${mis}`);
  }

  // 构建 at_info_list
  let atInfoList = null;
  if (atAll) {
    atInfoList = [{ uid: '-1', name: '所有人' }];
  } else if (atMisList.length) {
    atInfoList = atMisList.map(mis => ({
      uid:  String(identityMap[mis].uid),
      name: atNameMap[mis] || mis,
    }));
  }

  // 构建消息体
  let bodyDict, msgType, extension;
  if (flags.type === 'text') {
    // 将字面量 \n 转为真正的换行符（Windows cmd/PowerShell 不会自动转义）
    let text = flags.content.replace(/\\n/g, '\n');
    if (atInfoList) text = buildAtText(atInfoList) + ' ' + text;
    bodyDict  = { text };
    msgType   = 'text';
    extension = atInfoList ? buildAtExtension(atInfoList) : undefined;
  } else {
    bodyDict  = { thumbnail: imageUrl, normal: imageUrl, original: imageUrl };
    msgType   = 'image';
  }

  const results = [];

  // 发给个人
  if (misList.length) {
    const uids = misList.map(m => identityMap[m].uid);
    console.log(`📤 发送 ${msgType} 消息给个人 → uids=${JSON.stringify(uids)}`);
    const r = await sendChatMsg(token, uids, msgType, bodyDict);
    results.push(['个人消息', r]);
  }

  // 发到群（多群并行）
  if (gidList.length > 1) {
    console.log(`📤 并行发送 ${msgType} 消息到 ${gidList.length} 个群聊...`);
    const settled = await Promise.allSettled(
      gidList.map(gid => sendGroupMsg(token, gid, msgType, bodyDict, extension))
    );
    gidList.forEach((gid, i) => {
      if (settled[i].status === 'fulfilled') results.push([`群聊 ${gid}`, settled[i].value]);
      else results.push([`群聊 ${gid}`, { status: { code: -1, msg: String(settled[i].reason) } }]);
    });
  } else if (gidList.length === 1) {
    const gid = gidList[0];
    console.log(`📤 发送 ${msgType} 消息到群聊 → gid=${gid}`);
    const r = await sendGroupMsg(token, gid, msgType, bodyDict, extension);
    results.push([`群聊 ${gid}`, r]);
  }

  // 输出结果
  for (const [label, result] of results) {
    const code = result?.status?.code;
    const msg  = result?.status?.msg || '';
    console.log(code === 0 ? `✅ ${label} 成功: ${msg}` : `❌ ${label} 失败 (code=${code}): ${msg}`);
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(e => { console.error('❌', e.message || e); process.exit(1); });
