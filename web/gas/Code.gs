// ═══════════════════════════════════════════════════════════════════════
// HIN IELTS — Tracking & Student Lookup (Google Apps Script)
// Tạo script từ: Google Sheet → Extensions → Apps Script
// Sau đó: 1) Chạy setupSheets()  2) Deploy → Web app → Execute as Me → Anyone
// ═══════════════════════════════════════════════════════════════════════

const SHEETS = {
  STUDENTS: 'Students',
  ATTEMPTS: 'Attempts',
  ANSWERS:  'Answers',
  EVENTS:   'Events',
};

function ss() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── ROUTER: GET ───────────────────────────────────────────────────────
function doGet(e) {
  var action = String(e.parameter.action || '').trim();
  try {
    if (action === 'lookupStudent') {
      return json(lookupStudent(e.parameter.email, e.parameter.class));
    }
    if (action === 'ping') {
      return json({ ok: true, ts: Date.now(), version: '2.0' });
    }
    return json({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// ─── ROUTER: POST ──────────────────────────────────────────────────────
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = String(body.action || '').trim();
    if (action === 'submitAttempt') {
      return json(submitAttempt(body));
    }
    return json({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// lookupStudent — GET ?action=lookupStudent&email=...&class=...
// ═══════════════════════════════════════════════════════════════════════
function lookupStudent(email, klass) {
  if (!email || !klass) {
    return { ok: false, error: 'Thiếu email hoặc tên lớp' };
  }
  var e = String(email).trim().toLowerCase();
  var k = String(klass).trim().toLowerCase().replace(/\s+/g, '');

  var sheet = ss().getSheetByName(SHEETS.STUDENTS);
  if (!sheet) return { ok: false, error: 'Sheet Students không tồn tại. Chạy setupSheets() trước.' };

  var rows = sheet.getDataRange().getValues();
  var header = rows[0];
  var data = rows.slice(1);
  var idx = {
    email:  header.indexOf('email'),
    name:   header.indexOf('name'),
    class:  header.indexOf('class'),
    active: header.indexOf('active'),
  };

  var match = null;
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (!r[idx.email]) continue; // bỏ qua hàng trống
    var rowEmail = String(r[idx.email]).trim().toLowerCase();
    var rowClass = String(r[idx.class]).trim().toLowerCase().replace(/\s+/g, '');
    // Ô active trống = mặc định active; chỉ ghi rõ FALSE mới bị khoá
    var rawActive = idx.active < 0 ? '' : String(r[idx.active]).trim().toUpperCase();
    var isActive = rawActive === '' || rawActive === 'TRUE' || rawActive === '1' || r[idx.active] === true;
    if (rowEmail === e && rowClass === k && isActive) {
      match = r;
      break;
    }
  }

  if (!match) {
    return {
      ok: false,
      error: 'Email hoặc lớp không có trong danh sách. Liên hệ giáo viên để được thêm vào.',
    };
  }

  return {
    ok:    true,
    name:  String(match[idx.name]).trim(),
    class: String(match[idx.class]).trim(),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// submitAttempt — POST { action, attempt, answers, events }
// ═══════════════════════════════════════════════════════════════════════
function submitAttempt(body) {
  var attempt = body.attempt;
  var answers = body.answers;
  var events  = body.events;

  if (!attempt || !attempt.attemptId) {
    return { ok: false, error: 'Missing attemptId' };
  }

  // 1. Attempts
  ss().getSheetByName(SHEETS.ATTEMPTS).appendRow([
    attempt.attemptId,
    attempt.studentEmail,
    attempt.studentName,
    attempt.studentClass,
    attempt.quizId,
    attempt.quizTitle,
    attempt.skill,
    attempt.mode,
    attempt.startedAt,
    attempt.submittedAt,
    attempt.durationSec,
    (attempt.score && attempt.score.total)   || 0,
    (attempt.score && attempt.score.correct) || 0,
    (attempt.score && attempt.score.wrong)   || 0,
    (attempt.score && attempt.score.skipped) || 0,
    attempt.ip         || '',
    (attempt.userAgent || '').slice(0, 300),
  ]);

  // 2. Answers (bulk)
  if (answers && answers.length > 0) {
    var aRows = [];
    for (var i = 0; i < answers.length; i++) {
      var a = answers[i];
      aRows.push([
        attempt.attemptId,
        a.questionId,
        a.order,
        a.part,
        a.type,
        Array.isArray(a.userAnswer)    ? a.userAnswer.join('|')    : (a.userAnswer    || ''),
        Array.isArray(a.correctAnswer) ? a.correctAnswer.join('|') : (a.correctAnswer || ''),
        a.isCorrect,
        a.answered,
      ]);
    }
    var aSheet = ss().getSheetByName(SHEETS.ANSWERS);
    aSheet.getRange(aSheet.getLastRow() + 1, 1, aRows.length, aRows[0].length).setValues(aRows);
  }

  // 3. Events (bulk)
  if (events && events.length > 0) {
    var eRows = [];
    for (var j = 0; j < events.length; j++) {
      var ev = events[j];
      eRows.push([
        attempt.attemptId,
        ev.ts,
        ev.type,
        ev.questionId || '',
        typeof ev.data === 'object' ? JSON.stringify(ev.data) : (ev.data || ''),
      ]);
    }
    var eSheet = ss().getSheetByName(SHEETS.EVENTS);
    eSheet.getRange(eSheet.getLastRow() + 1, 1, eRows.length, eRows[0].length).setValues(eRows);
  }

  return { ok: true, attemptId: attempt.attemptId };
}

// ═══════════════════════════════════════════════════════════════════════
// SETUP — Chạy 1 lần để tạo 4 sheet với headers
// ═══════════════════════════════════════════════════════════════════════
function setupSheets() {
  var sp = ss();

  function ensure(name, headers) {
    var s = sp.getSheetByName(name);
    if (!s) s = sp.insertSheet(name);
    if (s.getLastRow() === 0) {
      s.appendRow(headers);
      var hRange = s.getRange(1, 1, 1, headers.length);
      hRange.setBackground('#1a1a1a').setFontColor('#F5F1E9').setFontWeight('bold');
      s.setFrozenRows(1);
    }
    return s;
  }

  ensure(SHEETS.STUDENTS, ['email', 'name', 'class', 'active']);
  ensure(SHEETS.ATTEMPTS, [
    'attemptId', 'studentEmail', 'studentName', 'studentClass',
    'quizId', 'quizTitle', 'skill', 'mode',
    'startedAt', 'submittedAt', 'durationSec',
    'total', 'correct', 'wrong', 'skipped',
    'ip', 'userAgent',
  ]);
  ensure(SHEETS.ANSWERS, [
    'attemptId', 'questionId', 'order', 'part', 'type',
    'userAnswer', 'correctAnswer', 'isCorrect', 'answered',
  ]);
  ensure(SHEETS.EVENTS, ['attemptId', 'ts', 'type', 'questionId', 'data']);

  Logger.log('✅ setupSheets() xong. 4 sheet đã sẵn sàng.');
}

// ═══════════════════════════════════════════════════════════════════════
// QUICK TEST — Chạy để kiểm tra lookupStudent
// ═══════════════════════════════════════════════════════════════════════
function testLookup() {
  Logger.log('Test 1 (email+lớp đúng):  ' + JSON.stringify(lookupStudent('summeriah98@gmail.com', 'K57.3')));
  Logger.log('Test 2 (lớp sai):         ' + JSON.stringify(lookupStudent('summeriah98@gmail.com', 'K57.99')));
  Logger.log('Test 3 (không tồn tại):   ' + JSON.stringify(lookupStudent('ghost@gmail.com', '10A1')));
}
