/**
 * 婚礼回执接收脚本：把宾客提交的回执写进 Google 表格。
 *
 * 部署步骤：
 * 1. 新建一张 Google 表格（sheets.new），名字随意，例如“婚礼回执”。
 * 2. 菜单：扩展程序 → Apps Script，删掉默认代码，把本文件全部内容粘贴进去，保存。
 * 3. 右上角：部署 → 新建部署 → 类型选“Web 应用”：
 *      执行身份：我
 *      谁可以访问：任何人
 *    点“部署”，按提示授权（会提示“Google 尚未验证此应用”，点“高级”→“转至…（不安全）”即可，
 *    这是你自己写的脚本，只访问这张表）。
 * 4. 复制生成的“Web 应用网址”（以 /exec 结尾），填到网站 script.js 的 RSVP_ENDPOINT。
 *
 * 以后如果修改了本脚本：部署 → 管理部署 → 编辑（铅笔）→ 版本选“新版本”→ 部署，网址不变。
 */

/** @OnlyCurrentDoc  只申请访问这一张表格的权限，而不是你所有的 Google 表格 */

const SHEET_NAME = "回执";
const HEADERS = ["提交时间", "嘉宾类别", "姓名", "出席人数", "人数（数字）", "祝福", "显示"];
// “显示”列：新留言默认“是”。把某条改成“否”，它就不会出现在网站的祝福墙上。
const WALL_LIMIT = 50;
const SIDES = ["新郎嘉宾", "新娘嘉宾", "新郎父母嘉宾", "新娘父母嘉宾"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = (e && e.parameter) || {};
    const side = String(p.side || "").trim();
    const name = String(p.name || "").trim().slice(0, 50);
    const guests = String(p.guests || "").trim().slice(0, 20);
    const wish = String(p.wish || "").trim().slice(0, 200);

    if (!SIDES.includes(side) || !name || !guests) {
      return json({ ok: false, error: "missing fields" });
    }

    const sheet = getSheet();
    // “出席3人”→ 3，“待定”→ 留空，方便直接用 SUM 统计人数
    const m = guests.match(/\d+/);
    sheet.appendRow([
      new Date(), side, safe(name), guests, m ? Number(m[0]) : "",
      wish ? safe(wish) : "", wish ? "是" : "",
    ]);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// ?action=wishes：返回祝福墙要显示的留言（最新的在前）
// 不带参数：在浏览器里直接打开网址时显示，用来确认部署成功
function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action === "wishes") {
    const sheet = getSheet();
    const rows = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues()
      : [];
    const wishes = rows
      .filter((r) => String(r[5]).trim() && String(r[6]).trim() === "是")
      .slice(-WALL_LIMIT)
      .reverse()
      .map((r) => ({ side: String(r[1]), name: String(r[2]), wish: String(r[5]) }));
    return json({ ok: true, wishes: wishes });
  }
  return json({ ok: true, message: "回执接收服务运行中" });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  } else {
    // 旧版表格只有前 5 列表头，这里补齐新增的列，已有数据不受影响
    const head = sheet.getRange(1, 1, 1, HEADERS.length);
    const current = head.getValues()[0];
    if (HEADERS.some((h, i) => current[i] !== h)) head.setValues([HEADERS]).setFontWeight("bold");
    return sheet;
  }
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  return sheet;
}

// 防止有人提交以 = + - @ 开头的内容被表格当成公式执行
function safe(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
