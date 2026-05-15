# PLAN: Fix lỗi 401 "Token expired" khi tra từ vựng

## 1. Chẩn đoán

**Triệu chứng**: Popup tra từ hiện "Lỗi: upstream error", DevTools báo `GET /api/vocab?...` → **401 Unauthorized**.

**Test trực tiếp endpoint cho ra:**
```json
{"error":"upstream error","status":401,
 "detail":"{\"code\":401,\"message\":\"Token expired\",\"error_detail\":\"TokenUnAuthorized\"}"}
```

**Nguyên nhân gốc**:
- File `data/sessions/storage-state.json` được lưu **2026-05-09**, hôm nay **2026-05-14** → cookie/`auth_token` YouPass đã hết hạn (TTL chỉ vài ngày).
- Code proxy (`web/app/api/vocab/route.ts`) chỉ đọc cookie từ file một lần rồi cache trong RAM 1 giờ; nó **không biết** token đã expired ở phía YouPass.
- Toàn bộ pipeline FE → `/api/vocab` → YouPass cookies đều đang chạy đúng — chỉ thiếu **cookie tươi**.

---

## 2. Giải pháp (3 bước)

### Bước A — Refresh session (BẮT BUỘC, làm ngay)

Chạy script đã có sẵn:

```powershell
cd D:\YouPassClone
node src\login-and-sniff-vocab.js
```

Script này sẽ:
1. Mở **Chrome thật** (channel `chrome`) với profile riêng `data/sessions/chrome-profile-real`.
2. Tự navigate tới `https://e-learning.youpass.vn/practice/listening/10462?...`.
3. Bạn **đăng nhập** YouPass nếu hiện form login (lần sau profile nhớ rồi không cần login lại).
4. Click vào nút **"Tra từ vựng"** (phím **T**) → click thử **1 từ bất kỳ** trong transcript để xác nhận sniffer bắt được call.
5. **Đóng browser** → script tự ghi đè `data/sessions/storage-state.json` với cookie mới.

> ✅ Sau khi đóng browser, kiểm tra timestamp:
> ```powershell
> Get-Item D:\YouPassClone\data\sessions\storage-state.json | Select Name, LastWriteTime
> ```
> Phải là giờ vừa rồi.

### Bước B — Restart dev server để xoá cache cookie cũ trong RAM

`route.ts` cache cookie trong biến module-scope (`cachedCookies`, `cachedAt`) với TTL 1 giờ. Sau khi refresh storage-state, **phải restart** dev server, nếu không Next sẽ vẫn dùng cookie cũ trong RAM:

```powershell
# Tại terminal đang chạy dev server: Ctrl+C
cd D:\YouPassClone\web
npx next dev --port 3001
```

### Bước C — Test lại

1. Mở http://localhost:3001/thi-thu/listening/8517?type=review
2. Bấm phím **T** (mở vocab tool).
3. Click một từ trong transcript → popup phải hiện IPA / nghĩa VN / examples.
4. DevTools Network: `/api/vocab?...` phải **200 OK**, response header `X-Cache: MISS` (lần đầu), `HIT` (lần thứ 2 cùng từ).

---

## 3. Cải thiện bổ sung (NÊN làm để không gặp lại)

### 3.1 Cải tiến error message trong `route.ts`

Phát hiện 401 → reset cache cookie + trả message rõ ràng:

**File**: `web/app/api/vocab/route.ts`

Sau `if (!res.ok) {` (dòng 88), sửa thành:

```ts
if (!res.ok) {
  const detail = await res.text().catch(() => "");
  // Invalidate cookie cache khi gặp 401 để lần sau đọc lại từ file
  if (res.status === 401) {
    cachedCookies = null;
    cachedAuthToken = null;
    cachedAt = 0;
    return NextResponse.json(
      { error: "session_expired",
        message: "Session YouPass hết hạn. Chạy: node src/login-and-sniff-vocab.js rồi restart dev server.",
        status: 401, detail },
      { status: 401 }
    );
  }
  return NextResponse.json({ error: "upstream error", status: res.status, detail }, { status: res.status });
}
```

Đồng thời áp dụng tương tự cho `web/app/api/vocab/pronunciation/route.ts`.

### 3.2 Hiển thị message thân thiện trong `VocabPopup.tsx`

**File**: `web/components/listening/VocabPopup.tsx`

Dòng 79, sửa từ:
```ts
setError(res.message || res.error || "Không tìm thấy từ");
```
thành:
```ts
if (res.error === "session_expired") {
  setError("⚠️ Session YouPass hết hạn — chủ project cần chạy lại login script.");
} else {
  setError(res.message || res.error || "Không tìm thấy từ");
}
```

### 3.3 Tạo helper script kiểm tra nhanh session còn sống

**File mới**: `src/check-vocab-session.js`

```js
const fs = require('fs');
const path = require('path');

const SESSION = path.join(__dirname, '../data/sessions/storage-state.json');
const state = JSON.parse(fs.readFileSync(SESSION, 'utf8'));
const cookies = state.cookies.filter(c => /youpass\.vn$/.test(c.domain || ''));
const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
const authToken = cookies.find(c => c.name === 'auth_token')?.value;

(async () => {
  const res = await fetch('https://api.youpass.vn/v1/vocabs?parent_id=625&word=inspired', {
    headers: {
      Cookie: cookieHeader,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      Accept: 'application/json',
      Origin: 'https://e-learning.youpass.vn',
      Referer: 'https://e-learning.youpass.vn/',
    },
  });
  console.log('Status:', res.status);
  console.log('Body:', (await res.text()).slice(0, 300));
  if (res.status === 401) {
    console.log('\n❌ Session HẾT HẠN — chạy: node src/login-and-sniff-vocab.js');
    process.exit(1);
  } else if (res.ok) {
    console.log('\n✅ Session còn sống.');
  }
})();
```

Cách dùng:
```powershell
node src\check-vocab-session.js
```

### 3.4 (Optional) NPM script cho tiện

**File**: `package.json` (root)

Thêm vào `"scripts"`:
```json
"vocab:refresh": "node src/login-and-sniff-vocab.js",
"vocab:check": "node src/check-vocab-session.js"
```

Dùng:
```powershell
npm run vocab:check      # kiểm tra
npm run vocab:refresh    # mở Chrome refresh
```

---

## 4. Checklist thực thi

- [ ] **Bước A**: `node src\login-and-sniff-vocab.js` → đăng nhập → đóng browser
- [ ] **Bước B**: Restart `npx next dev --port 3001`
- [ ] **Bước C**: Test phím T → click từ trong transcript → popup có data
- [ ] **3.1**: Edit `web/app/api/vocab/route.ts` xử lý 401 + invalidate cache
- [ ] **3.1**: Edit `web/app/api/vocab/pronunciation/route.ts` tương tự
- [ ] **3.2**: Edit `web/components/listening/VocabPopup.tsx` message rõ ràng
- [ ] **3.3**: Tạo `src/check-vocab-session.js`
- [ ] **3.4**: Thêm npm scripts vào `package.json`

## 5. Lưu ý dài hạn

- YouPass `auth_token` JWT có TTL ngắn → cứ vài ngày phải refresh 1 lần.
- Không có refresh-token endpoint public → bắt buộc login lại bằng Chrome thật.
- Cache vocab `data/api/vocab/cache.json` giữ mãi — các từ đã tra rồi vẫn dùng được kể cả khi session expired (X-Cache: HIT không gọi upstream).
