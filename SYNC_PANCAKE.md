# Sync Pancake POS → TCAPS App

Đồng bộ **tồn kho** (stock) và **ảnh sản phẩm** từ Pancake POS về app,
**CHỈ cho những sản phẩm đã có trong `constants/products.ts`** — không thêm
sản phẩm mới, không động đến nội dung curated (line, style, faceShapes,
priceBundle, badge, description, tags...).

Đây là chế độ **SYNC_ONLY**, khác với chế độ FULL của
`scripts/pancake-scrape.mjs` (FULL = import all + auto-add new + prune ignored).

---

## TL;DR — chạy 1 lệnh

Một lần đầu (setup login):
```bash
npx tsx scripts/pancake-login.ts     # log vào Pancake POS một lần
# đóng cửa sổ Playwright khi đã login
```

Mỗi lần muốn đồng bộ stock/images:
```bash
SYNC_ONLY=1 node scripts/pancake-scrape.mjs
```

Sau đó commit + push như bình thường:
```bash
git add constants/products.ts
git commit -m "sync: refresh stock + images from Pancake"
git push
```

---

## Chính xác cái gì được sync?

Mỗi sản phẩm app match được với Pancake (theo SKU hoặc tên), **chỉ những
field này được ghi đè**:

| Field                 | Sync? | Ghi chú |
|-----------------------|-------|---------|
| `stock` (parent)      | ✅   | Tổng tồn kho |
| `pancakeId`           | ✅   | ID Pancake (để re-match lần sau) |
| `imageUrl` (parent)   | ✅\* | Chỉ nếu hiện tại KHÔNG phải local `/...` path |
| `images[]` (parent)   | ✅\* | Chỉ nếu hiện tại KHÔNG phải local `/...` path |
| `variants[].stock`    | ✅   | Match variant theo SKU → name → index |
| `variants[].image`    | ✅\* | Chỉ nếu hiện tại KHÔNG phải local `/...` path |
| `variants[].price`    | ❌   | Giữ nguyên giá curated |
| `name`                | ❌   | Tên curated (vd "TC68 - NÓN SPARTAN ĐEN") không bị Pancake code name ghi đè |
| `price` / `priceBundle` | ❌ | Giá curated giữ nguyên |
| `line` / `style` / `color` | ❌ | Curated |
| `faceShapes` / `topFor` | ❌ | Curated |
| `badge` / `description` / `tags` | ❌ | Curated |

\* **Local image protection**: Ảnh đang trỏ tới `public/` (vd `/tc68.jpg`) sẽ
được **giữ nguyên** không bị Pancake URL ghi đè. Đây là cách bảo vệ 6 ảnh local
TCAPS đã upload thủ công (TC68 / TC63 / TC61 / Nón TC59 / TC45 / TC42).

## Cái gì KHÔNG được làm trong SYNC mode?

- ❌ **Không thêm sản phẩm mới** từ Pancake vào app. Nếu Pancake có SKU mà
  app chưa có → log "sync-only: not in app" và bỏ qua.
- ❌ **Không xoá sản phẩm** đã có trong app, kể cả khi Pancake không còn
  bán nữa (giúp giữ trang `/product/<SKU>` hiện active).
- ❌ **Không prune ignored entries** (combo / quà / bật lửa...) — full mode
  mới xoá, sync mode giữ y nguyên list.

---

## So sánh 2 mode

| | FULL mode (default) | SYNC mode |
|---|---|---|
| Command | `node scripts/pancake-scrape.mjs` | `SYNC_ONLY=1 node scripts/pancake-scrape.mjs` |
| Add new products from Pancake | ✅ tự thêm | ❌ skip + log |
| Prune ignored items | ✅ xoá khỏi catalog | ❌ giữ nguyên |
| Update name | ❌ giữ tên curated | ❌ giữ tên curated |
| Update price | ✅ ghi đè | ❌ giữ giá curated |
| Update stock | ✅ | ✅ |
| Update images | ✅ ghi đè (kể cả local) | ✅ **chỉ nếu chưa local** |
| Khi nên dùng | Khi shop drop nhiều SKU mới, build lại catalog | Daily refresh stock + ảnh |

---

## Quy trình daily — chạy tay

```bash
# 1. Sync
SYNC_ONLY=1 node scripts/pancake-scrape.mjs

# 2. Xem diff
git diff constants/products.ts

# 3. Commit nếu có thay đổi
git add constants/products.ts
git commit -m "sync: daily refresh stock + images"
git push

# 4. Vercel auto-deploy
```

---

## Quy trình daily — auto qua Windows Task Scheduler

Setup 1 lần ~5 phút. Sau đó mỗi sáng 8h máy bạn tự chạy sync + commit +
push, không cần can thiệp.

### Files trong repo

| File | Mục đích |
|---|---|
| `scripts/sync-and-push.bat` | Batch chạy: sync → git add → commit → push → ghi log |
| `TCAPS-Sync-Daily.xml` | Task Scheduler import (chạy 8h sáng hàng ngày) |
| `logs/sync-YYYY-MM-DD.log` | Log của mỗi run (đã gitignore) |

### Bước 1 — Test batch chạy được

Mở **Command Prompt** (cmd) hoặc PowerShell:

```cmd
cd "c:\APP AI\tcaps-app"
scripts\sync-and-push.bat
```

Sau khi chạy xong, mở `logs\sync-YYYY-MM-DD.log` xem có dòng
`OK Pushed to GitHub.` hoặc `OK No changes to commit.` — nghĩa là OK.

Nếu lỗi: thường do (a) Pancake login expire — chạy lại
`npx tsx scripts/pancake-login.ts`, hoặc (b) git credential — kiểm tra
`git push` từ command line có cần nhập mật khẩu không.

### Bước 2 — Import Task vào Windows Task Scheduler

1. Mở **Task Scheduler** (Win+R → `taskschd.msc` → Enter).
2. Cột phải → **Import Task...**
3. Chọn file `c:\APP AI\tcaps-app\TCAPS-Sync-Daily.xml`.
4. Trong cửa sổ Properties hiện ra:
   - Tab **General**: tick **Run with highest privileges**, chọn **Configure for**: Windows 10/11.
   - Tab **Triggers**: thấy "Daily" → mở ra, sửa giờ chạy nếu muốn (mặc định 08:00).
   - Tab **Actions**: confirm Command đúng path:
     ```
     c:\APP AI\tcaps-app\scripts\sync-and-push.bat
     ```
     Start in (working directory):
     ```
     c:\APP AI\tcaps-app
     ```
   - Tab **Conditions**: bỏ tick "Start the task only if the computer is on AC power" (nếu xài laptop).
   - Tab **Settings**: tick **Run task as soon as possible after a scheduled start is missed** (catch up khi máy off vào giờ chạy).
5. OK → nhập password Windows account → Done.

### Bước 3 — Test ngay (không đợi 8h sáng)

Trong Task Scheduler → chọn task **TCAPS Pancake Sync** → cột phải **Run**.

Sau ~30s xem `logs\sync-...log`. Nếu thấy push success → setup xong.

### Bước 4 — Theo dõi log thỉnh thoảng

```cmd
type logs\sync-YYYY-MM-DD.log
```

Xem có lỗi gì lặp lại không. Nếu Pancake login hết hạn → log sẽ báo
`0 products scraped`. Khi đó chạy lại `npx tsx scripts/pancake-login.ts`
để refresh session.

### Nếu di chuyển folder dự án

Path trong cả batch và XML đều hardcoded `c:\APP AI\tcaps-app`. Nếu di
chuyển folder:
1. Sửa batch: dòng `set "PROJECT_DIR=..."`
2. Sửa XML: 2 chỗ `<Command>` và `<WorkingDirectory>`
3. Re-import vào Task Scheduler (Delete task cũ → Import lại).

### Cron job trên Linux/Mac (alternative)

```cron
0 8 * * * cd /path/to/tcaps-app && SYNC_ONLY=1 node scripts/pancake-scrape.mjs && git add constants/products.ts && (git commit -m "sync: daily $(date +%F)" && git push) || echo "no changes"
```

---

## Troubleshooting

### "0 products scraped"

Profile Pancake bị logout. Chạy lại login:
```bash
npx tsx scripts/pancake-login.ts
```

### "UNABLE_TO_VERIFY_LEAF_SIGNATURE" (corporate TLS intercept)

```bash
NODE_OPTIONS="--use-system-ca" SYNC_ONLY=1 node scripts/pancake-scrape.mjs
```

### Stock variant không update

Match logic: SKU → Name → Index. Nếu variant SKU trong app ≠ Pancake VÀ name
khác hẳn → có thể match nhầm theo index. Kiểm tra `git diff` trước commit.

### Muốn rollback một sync

```bash
git checkout HEAD~1 constants/products.ts
git commit -m "revert sync"
git push
```

---

## Khi nào dùng FULL mode thay vì SYNC?

Chỉ chạy FULL khi:
- Drop một loạt SKU mới muốn import luôn vào app
- Reset toàn bộ catalog từ Pancake
- Lần đầu setup app

Sau khi FULL xong, đổi sang SYNC daily để giữ tính ổn định của catalog.
