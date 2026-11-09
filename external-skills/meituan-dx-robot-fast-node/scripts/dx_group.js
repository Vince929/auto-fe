#!/usr/bin/env node
/**
 * 大象群管理脚本（Node.js 版，无外部依赖）
 * 通过大象开放平台 HTTP API，以机器人身份管理大象群聊。
 *
 * 凭证配置文件：~/.catpaw/meituan-dx-robot-fast.config.json
 *
 * 用法:
 *   node dx_group.js create --uids 111111,222222 --owner 333333 [--name "群名"] [--bot-admin]
 *   node dx_group.js remove-members --gid 64014641136 --uids 111111,222222
 *   node dx_group.js info --gid 64014641136
 *   node dx_group.js in-group --gid 64014641136 --uid 111111
 *   node dx_group.js get-notice --gid 64014641136
 *   node dx_group.js set-notice --gid 64014641136 --content "公告内容"
 *   node dx_group.js update-info --gid 64014641136 --name "新群名" --intro "新简介"
 *   node dx_group.js set-role --gid 64014641136 --role ADMIN --uids 111111,222222
 *   node dx_group.js set-role-name --gid 64014641136 --user-roles '[{"id":111111,"roleName":"产品"}]'
 *   node dx_group.js --save-config --client_id <ID> --client_secret <KEY>
 *   node dx_group.js --save-config --bot ad-robot --client_id <ID> --client_secret <KEY>
 *   node dx_group.js --bot ad-robot create --uids 111111,222222 --owner 333333
 */

'use strict';

const crypto  = require('crypto');
const fs      = require('fs');
const http    = require('http');
const https   = require('https');
const os      = require('os');
const path    = require('path');

// ── 常量 ──────────────────────────────────────────────────

const TOKEN_URL   = 'https://ssosv.sankuai.com/sson/auth/oidc/v1/token';
const XOPEN_BASE  = 'https://xopen.sankuai.com/open-apis';
const CONFIG_PATH = path.join(os.homedir(), '.catpaw', 'meituan-dx-robot-fast.config.json');
const TOKEN_CACHE_DIR = path.join(os.tmpdir(), 'dx_robot_token_cache');

// ── 工具函数 ──────────────────────────────────────────────

function die(msg) {
  console.error(msg);
  process.exit(1);
}

/** 解析命令行参数，返回 { flags, positional } */
function parseArgs(argv) {
  const flags = {};
  const positional = [];
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        flags[key] = true; // boolean flag
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positional.push(arg);
    }
    i++;
  }
  return { flags, positional };
}

// ── HTTP 请求（零依赖）───────────────────────────────────

/**
 * 发送 HTTP/HTTPS 请求，返回 Promise<{ status, body }>。
 * @param {string} url
 * @param {object} options - method, headers, body (string|Buffer)
 */
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url);
    const lib     = parsed.protocol === 'https:' ? https : http;
    const bodyBuf = options.body
      ? (Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body))
      : null;

    const reqOptions = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   options.method || 'GET',
      headers:  options.headers || {},
    };
    if (bodyBuf) {
      reqOptions.headers['Content-Length'] = bodyBuf.length;
    }

    const req = lib.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    if (options.timeout) req.setTimeout(options.timeout, () => { req.destroy(new Error('Request timeout')); });
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

/** POST application/x-www-form-urlencoded */
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
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`HTTP ${res.status}: ${res.body}`);
  }
  return JSON.parse(res.body);
}

/** POST application/json，带大象鉴权 header */
async function postJson(url, token, payload, timeoutMs = 15000) {
  const body = JSON.stringify(payload);
  const res = await request(url, {
    method: 'POST',
    headers: {
      'Authorization':  token,
      'Content-Type':   'application/json; charset=utf-8',
    },
    body,
    timeout: timeoutMs,
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`HTTP ${res.status}: ${res.body}`);
  }
  const data = JSON.parse(res.body);
  const code = data?.status?.code;
  const msg  = data?.status?.msg || '';
  if (code !== 0) {
    throw new Error(`接口返回错误 code=${code}: ${msg}\n${JSON.stringify(data, null, 2)}`);
  }
  return data;
}

// ── 配置文件 ──────────────────────────────────────────────

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveConfig(data, botName = null) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const existing = loadConfig();

  if (!botName) {
    Object.entries(data).forEach(([k, v]) => { if (v != null) existing[k] = v; });
  } else {
    const botCreds = {};
    const topLevel = {};
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

function loadBotConfig(cfg, botName) {
  if (!botName) return [cfg.client_id, cfg.client_secret];
  const bot = (cfg.bots || {})[botName];
  if (!bot) {
    const available = Object.keys(cfg.bots || {});
    die(`ERROR: 找不到机器人 '${botName}'。${available.length ? '可用机器人: ' + available.join(', ') : '尚未配置任何具名机器人'}\n` +
        `请先运行 --save-config --bot ${botName} --client_id ... --client_secret ... 保存凭证。`);
  }
  return [bot.client_id, bot.client_secret];
}

// ── Token 缓存 ────────────────────────────────────────────

function getCachePath(clientId, audience) {
  const key = crypto.createHash('md5').update(`${clientId}:${audience}`).digest('hex');
  return path.join(TOKEN_CACHE_DIR, `${key}.json`);
}

function readCachedToken(clientId, audience) {
  try {
    const data = JSON.parse(fs.readFileSync(getCachePath(clientId, audience), 'utf8'));
    if (data.expires_at > Date.now() / 1000 + 60) return data.access_token;
  } catch { /* 缓存不存在或已失效 */ }
  return null;
}

function writeCachedToken(clientId, audience, accessToken, expiresIn) {
  if (!fs.existsSync(TOKEN_CACHE_DIR)) fs.mkdirSync(TOKEN_CACHE_DIR, { recursive: true });
  fs.writeFileSync(getCachePath(clientId, audience), JSON.stringify({
    access_token: accessToken,
    expires_at:   Date.now() / 1000 + expiresIn,
  }));
}

function clearCachedToken(clientId, audience) {
  try { fs.unlinkSync(getCachePath(clientId, audience)); } catch { /* 忽略 */ }
}

// ── JWT（零依赖 HS256）───────────────────────────────────

function base64urlEncode(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function makeJwt(clientId, clientSecret) {
  const now  = Math.floor(Date.now() / 1000);
  const skew = 5; // 时钟偏差容忍（秒），防止本机时间略快于服务器导致 401
  const header  = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: clientId,
    sub: clientId,
    aud: TOKEN_URL,
    iat: now - skew,
    nbf: now - skew,
    exp: now + 300,
    jti: crypto.randomUUID(),
  };
  const headerB64  = base64urlEncode(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(Buffer.from(JSON.stringify(payload)));
  const signing    = `${headerB64}.${payloadB64}`;
  const sig        = base64urlEncode(
    crypto.createHmac('sha256', clientSecret).update(signing).digest()
  );
  return `${signing}.${sig}`;
}

// ── 大象鉴权 ──────────────────────────────────────────────

async function getDxToken(clientId, clientSecret, audience = 'xm-xai') {
  const cached = readCachedToken(clientId, audience);
  if (cached) {
    console.log('🔑 使用缓存的大象 token');
    return cached;
  }

  console.log('🔑 获取大象 token（取票 + 换票）...');

  try {
    // 取票
    const d1 = await postForm(TOKEN_URL, {
      grant_type:            'client_credentials',
      client_id:             clientId,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion:      makeJwt(clientId, clientSecret),
      scope:                 'client_id:' + audience,
    });
    if (!d1.access_token) throw new Error('取票失败: ' + JSON.stringify(d1));

    // 换票
    const d2 = await postForm(TOKEN_URL, {
      grant_type:             'urn:ietf:params:oauth:grant-type:token-exchange',
      client_id:              clientId,
      client_assertion_type:  'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion:       makeJwt(clientId, clientSecret),
      subject_token:          d1.access_token,
      subject_token_type:     'urn:ietf:params:oauth:token-type:access_token',
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

// ── 通用 API 调用 ─────────────────────────────────────────

async function call(token, apiPath, payload) {
  return postJson(XOPEN_BASE + apiPath, token, payload);
}

// ── 子命令 ────────────────────────────────────────────────

async function cmdCreate(flags, token, cfg) {
  const ownerUid = flags.owner || cfg.ownerUid;
  if (!ownerUid) die('ERROR: 必须指定群主 uid（--owner）或在配置文件中设置 ownerUid 字段。\n严禁让机器人当群主（会导致群死锁，无法解散/转让）。');

  const uids = (flags.uids || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!uids.length) die('ERROR: 请通过 --uids 提供成员 uid 列表（逗号分隔）');

  const payload = {
    owner: Number(ownerUid),
    users: uids,
  };
  if (flags.name) payload.name = flags.name;

  // --bot-admin：建群时将机器人加入群聊
  // 大象建群接口用 bots 字段传入机器人 client_id 列表，作用是把机器人拉进群
  // 注意：此操作不会赋予机器人管理员权限，仅是将机器人作为成员加入群聊
  if (flags['bot-admin']) {
    const botClientId = cfg.client_id;
    if (botClientId) {
      payload.bots = [String(botClientId)];
      console.log('ℹ️  已将机器人加入群聊（bots 字段，非管理员权限）');
    } else {
      console.log('⚠️  --bot-admin：配置文件中未找到 client_id，跳过设置');
    }
  }

  const body = await call(token, '/dx-group/createGroup', payload);
  const gid  = body?.data?.gid ?? body?.gid;
  console.log(`✅ 建群成功，gid=${gid}`);
  console.log(JSON.stringify(body, null, 2));
}

async function cmdRemoveMembers(flags, token) {
  const uids = (flags.uids || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!uids.length) die('ERROR: 请通过 --uids 提供要踢出的成员 uid 列表');
  const body = await call(token, '/dx-group/removeGroupMember', { gid: Number(flags.gid), users: uids });
  console.log('✅ 踢出成员成功');
  console.log(JSON.stringify(body, null, 2));
}

async function cmdInfo(flags, token) {
  const body = await call(token, '/dx-group/getGroupInfo', { gid: Number(flags.gid) });
  console.log(JSON.stringify(body, null, 2));
}

async function cmdInGroup(flags, token) {
  const body = await call(token, '/dx-group/isGroupMember', { gid: Number(flags.gid), uid: Number(flags.uid) });
  const inGroup = body?.data?.inGroup;
  console.log(inGroup ? '✅ 在群里' : '❌ 不在群里');
  console.log(JSON.stringify(body, null, 2));
}

async function cmdGetNotice(flags, token) {
  const body = await call(token, '/dx-group/getGroupNotice', { gid: Number(flags.gid) });
  console.log(JSON.stringify(body, null, 2));
}

async function cmdSetNotice(flags, token) {
  if (!flags.content) die('ERROR: 请通过 --content 提供公告内容');
  const body = await call(token, '/dx-group/updateGroupNotice', { gid: Number(flags.gid), content: flags.content });
  console.log('✅ 群公告更新成功');
  console.log(JSON.stringify(body, null, 2));
}

async function cmdUpdateInfo(flags, token) {
  const payload = { gid: Number(flags.gid) };
  if (flags.name)  payload.name = flags.name;
  if (flags.intro) payload.info = flags.intro;
  if (Object.keys(payload).length === 1) die('ERROR: 请至少提供 --name 或 --intro 之一');
  const body = await call(token, '/dx-group/updateGroupInfo', payload);
  console.log('✅ 群信息更新成功');
  console.log(JSON.stringify(body, null, 2));
}

async function cmdSetRole(flags, token) {
  const uids = (flags.uids || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!uids.length) die('ERROR: 请通过 --uids 提供成员 uid 列表');
  const role = (flags.role || '').toUpperCase();
  if (role !== 'ADMIN' && role !== 'NORMAL') die('ERROR: --role 只能是 ADMIN 或 NORMAL');
  const body = await call(token, '/dx-group/setGroupMemberRole', { gid: Number(flags.gid), role, users: uids });
  console.log(`✅ 设置角色成功（${role}）`);
  console.log(JSON.stringify(body, null, 2));
}

async function cmdSetRoleName(flags, token) {
  let userRoles;
  try {
    userRoles = JSON.parse(flags['user-roles'] || '');
  } catch {
    die('ERROR: --user-roles 不是合法 JSON');
  }
  const body = await call(token, '/dx-group/setGroupMemberRoleName', { gid: Number(flags.gid), userRoles });
  console.log('✅ 角色名设置成功');
  console.log(JSON.stringify(body, null, 2));
}

// ── main ──────────────────────────────────────────────────

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const cmd = positional[0];

  const cfg = loadConfig();

  // --save-config
  if (flags['save-config']) {
    const data = {};
    if (flags.client_id)     data.client_id     = flags.client_id;
    if (flags.client_secret) data.client_secret  = flags.client_secret;
    if (flags.owner_uid)     data.ownerUid       = Number(flags.owner_uid);
    saveConfig(data, flags.bot || null);
    if (!cmd) return;
  }

  // 凭证解析
  const [cfgClientId, cfgClientSecret] = loadBotConfig(cfg, flags.bot || null);
  const clientId     = flags.client_id     || cfgClientId;
  const clientSecret = flags.client_secret || cfgClientSecret;

  if (!clientId || !clientSecret) {
    die(`ERROR: 缺少大象机器人凭证。请通过 --client_id / --client_secret 传入，或先运行 --save-config 保存到 ${CONFIG_PATH}`);
  }

  if (!cmd) {
    console.log(`用法: node dx_group.js <子命令> [选项]

子命令:
  create         建群
  remove-members 踢出群成员
  info           获取群信息
  in-group       判断用户是否在群里
  get-notice     获取群公告
  set-notice     更新群公告
  update-info    更新群名称/简介
  set-role       设置/取消管理员
  set-role-name  设置成员自定义角色名

全局选项:
  --save-config               保存凭证到配置文件
  --client_id <ID>            大象机器人 App ID
  --client_secret <KEY>       大象机器人 App Secret
  --bot <名称>                多机器人场景，指定机器人别名
  --owner_uid <UID>           群主 uid（配合 --save-config 使用）
`);
    process.exit(1);
  }

  const token = await getDxToken(clientId, clientSecret);

  const dispatch = {
    'create':         () => cmdCreate(flags, token, cfg),
    'remove-members': () => cmdRemoveMembers(flags, token),
    'info':           () => cmdInfo(flags, token),
    'in-group':       () => cmdInGroup(flags, token),
    'get-notice':     () => cmdGetNotice(flags, token),
    'set-notice':     () => cmdSetNotice(flags, token),
    'update-info':    () => cmdUpdateInfo(flags, token),
    'set-role':       () => cmdSetRole(flags, token),
    'set-role-name':  () => cmdSetRoleName(flags, token),
  };

  const fn = dispatch[cmd];
  if (!fn) die(`ERROR: 未知子命令 '${cmd}'`);
  await fn();
}

main().catch((e) => { console.error('❌', e.message || e); process.exit(1); });
