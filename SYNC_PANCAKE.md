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

## Quy trình daily

Khuyến nghị mỗi sáng:

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

Hoặc setup cron job trên máy local (Linux/Mac):
```cron
0 8 * * * cd /path/to/tcaps-app && SYNC_ONLY=1 node scripts/pancake-scrape.mjs && git add constants/products.ts && git commit -m "sync: daily $(date +%F)" && git push
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
