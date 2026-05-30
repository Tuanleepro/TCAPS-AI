# Google Sheet Order Backend — Setup Guide

TCAPS đặt hàng được lưu trực tiếp vào **một Google Sheet** (không Telegram,
không email, không database). Mỗi đơn = một dòng mới ở cuối sheet. Bạn chỉ
cần làm theo 5 bước dưới đây MỘT LẦN.

Thời gian setup: ~10 phút.

---

## Bước 1 — Tạo Google Sheet

1. Mở https://sheets.google.com → **Blank spreadsheet**.
2. Đổi tên file (góc trên trái): vd `TCAPS Đơn Hàng`.
3. Tạo **dòng tiêu đề** ở dòng 1 — copy nguyên đoạn này vào ô **A1** rồi
   Enter (Sheets tự tách 10 cột):

   ```
   Thời gian	Họ tên	Số điện thoại	Địa chỉ	Sản phẩm chính	Sản phẩm mua thêm	Tổng tiền	Ghi chú	Trạng thái	Nguồn
   ```

   *(Mỗi tab `\t` là một ô — paste là Sheets tự fill A1→J1.)*

4. **Format ô**:
   - Cột **C (Số điện thoại)**: chọn cột → Format → Number → **Plain text**
     *(giữ nguyên số 0 đầu, không bị parse thành 972284146)*
   - Cột **G (Tổng tiền)**: chọn cột → Format → Number → **Currency** →
     chọn VND nếu có, hoặc giữ Number để tự SUM được.
   - Dòng tiêu đề (hàng 1): bôi đậm + freeze (View → Freeze → 1 row).

5. **Copy Sheet ID** từ URL — giữ lại để dùng ở Bước 4:
   ```
   https://docs.google.com/spreadsheets/d/   1AbCdEfGhIjKlMnOpQrStUvWxYz   /edit#gid=0
                                            └────── đây là SHEET_ID ──────┘
   ```

---

## Bước 2 — Tạo Service Account trên Google Cloud

Service Account là "robot user" được cấp quyền ghi vào Sheet, không cần
bạn login mỗi lần đặt hàng.

1. Mở https://console.cloud.google.com — login Google.
2. Phía trên có dropdown chọn project: click → **New Project** → name
   `tcaps-orders` → Create.
3. Đợi vài giây project sẵn sàng → chuyển sang project mới.
4. Vào https://console.cloud.google.com/apis/library/sheets.googleapis.com
   → click **Enable** (kích hoạt Google Sheets API cho project).
5. Vào https://console.cloud.google.com/iam-admin/serviceaccounts → click
   **Create Service Account**.
   - Name: `tcaps-orders-writer`
   - ID: tự sinh, OK
   - Description: tuỳ chọn
   - **Create and Continue** → **Continue** → **Done** (skip role).
6. Sau khi tạo, click vào service account vừa tạo → tab **Keys** →
   **Add Key → Create new key** → chọn **JSON** → **Create**.
7. File JSON tự download. Mở file đó — bạn cần 2 trường:
   - `client_email` — dạng `tcaps-orders-writer@tcaps-orders.iam.gserviceaccount.com`
   - `private_key`  — bắt đầu bằng `-----BEGIN PRIVATE KEY-----\n...`

   Giữ file JSON này an toàn (đừng commit lên Git).

---

## Bước 3 — Share Sheet cho Service Account

Service account chỉ được ghi vào Sheet khi bạn share quyền **Editor** cho
email của nó.

1. Quay lại Sheet vừa tạo ở Bước 1.
2. Click nút **Share** (góc trên phải).
3. Paste `client_email` của service account (vd
   `tcaps-orders-writer@tcaps-orders.iam.gserviceaccount.com`).
4. Đặt quyền **Editor**.
5. **Bỏ tick** "Notify people" *(không gửi email cho robot làm gì)*.
6. **Share**.

---

## Bước 4 — Cấu hình Environment Variables trên Vercel

3 biến môi trường cần set trên Vercel:

| Tên                    | Giá trị                                       |
|------------------------|-----------------------------------------------|
| `GOOGLE_SHEET_ID`      | SHEET_ID copy ở Bước 1.5                      |
| `GOOGLE_CLIENT_EMAIL`  | `client_email` từ file JSON                   |
| `GOOGLE_PRIVATE_KEY`   | `private_key` từ file JSON — xem lưu ý dưới ↓ |

### Cách dán `GOOGLE_PRIVATE_KEY` đúng

Trong file JSON, private key trông như:

```
"private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgk...\n-----END PRIVATE KEY-----\n"
```

Khi paste vào Vercel env var:

- **Bao gồm cả `-----BEGIN PRIVATE KEY-----` và `-----END PRIVATE KEY-----`**.
- **Giữ nguyên `\n`** trong chuỗi — code đã có logic tự replace `\n` thành
  newline thật.
- **KHÔNG bọc dấu nháy kép** ở đầu/cuối — Vercel UI tự xử lý.
- Một dòng dài (không bấm Enter để xuống dòng).

### Set trên Vercel

1. Vào https://vercel.com → Project `tcaps-ai` → **Settings** →
   **Environment Variables**.
2. Add từng biến:
   - **Key**: `GOOGLE_SHEET_ID`, **Value**: …, **Environments**: tick cả
     Production + Preview + Development → Save.
   - Tương tự `GOOGLE_CLIENT_EMAIL` và `GOOGLE_PRIVATE_KEY`.
3. Vào tab **Deployments** → deployment mới nhất → ⋯ → **Redeploy**
   *(env mới chỉ áp dụng khi redeploy)*.

### Test ở local

Tạo / cập nhật file `.env.local` (không commit):

```env
GOOGLE_SHEET_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
GOOGLE_CLIENT_EMAIL=tcaps-orders-writer@tcaps-orders.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQI...\n-----END PRIVATE KEY-----\n"
```

Restart dev server (`Ctrl+C` → `npm run dev`) để env mới load.

---

## Bước 5 — Test đơn hàng

1. Mở https://tcaps-ai.vercel.app/try-on?sku=TC67 *(hoặc localhost:3000)*.
2. Upload selfie → chọn nón → AI Try-On.
3. Bấm **MUA NGAY**.
4. Điền form:
   - Họ tên: `Test Khách`
   - Số điện thoại: `0972284146`
   - Địa chỉ: `123 Test`
   - Tỉnh/Thành: `TP. Hồ Chí Minh`
   - Ghi chú: `Đơn test`
5. (Optional) Tick 1-2 nón mua thêm.
6. Bấm **🛒 XÁC NHẬN ĐẶT HÀNG**.

**Thành công**: thấy popup `🎉 Đặt hàng thành công` → mở Google Sheet ra,
dòng mới xuất hiện ngay (auto-refresh).

**Thất bại**: thấy popup `❌ Không thể gửi đơn hàng` →
xem [Troubleshooting](#troubleshooting) dưới.

---

## Cấu trúc cột

| Cột | Tên              | Format       | Ví dụ                                       |
|-----|------------------|--------------|---------------------------------------------|
| A   | Thời gian        | DateTime     | `30/05/2026 20:15:32`                       |
| B   | Họ tên           | Text         | `Nguyễn Văn A`                              |
| C   | Số điện thoại    | **Plain text** | `0972284146`                              |
| D   | Địa chỉ          | Text         | `123 Lê Văn Việt, TP. Hồ Chí Minh`          |
| E   | Sản phẩm chính   | Text         | `TC67 - NÓN SKELETON CROWN TRẮNG × 1 (160.000₫)` |
| F   | Sản phẩm mua thêm | Text        | `TC68 × 1 (160.000₫); TC66 × 1 (160.000₫)`  |
| G   | Tổng tiền        | Number       | `350000` *(số, để SUM được)*                |
| H   | Ghi chú          | Text         | `Giao buổi tối`                             |
| I   | Trạng thái       | Text         | `Chưa xử lý` *(mặc định, bạn sửa thủ công)* |
| J   | Nguồn            | Text         | `TCAPS AI`                                  |

---

## Troubleshooting

### `❌ Không thể gửi đơn hàng. Vui lòng thử lại.`

Mở Vercel logs (tab **Deployments** → deployment mới → **Functions** →
`/api/order`) → tìm dòng `[order] ✗ ...` để xem lỗi cụ thể:

| Lỗi log thấy gì                                       | Nguyên nhân                                            | Fix                                                 |
|--------------------------------------------------------|--------------------------------------------------------|-----------------------------------------------------|
| `Google Sheets env vars missing`                       | Thiếu 1 trong 3 env var                                | Set lại env trên Vercel → Redeploy                  |
| `error:invalid_grant ... Invalid JWT signature`        | `GOOGLE_PRIVATE_KEY` paste sai (mất `\n` hoặc dư ký tự) | Copy lại từ file JSON gốc, giữ nguyên `\n`         |
| `The caller does not have permission`                  | Service account chưa được share Editor vào Sheet       | Bước 3                                              |
| `Requested entity was not found` / sheet ID sai        | `GOOGLE_SHEET_ID` sai                                  | Copy lại ID từ URL                                  |
| `Google Sheets API has not been used in project ...`   | Chưa enable Sheets API cho project                     | Bước 2.4                                            |

### Số điện thoại bị mất số 0 đầu

Cột C chưa format **Plain text**. Mở Sheet → chọn cột C → Format → Number
→ Plain text. Đơn cũ bị mất số 0: gõ tay lại với dấu `'` ở đầu (vd
`'0972284146`) để Sheets giữ làm text.

### Đơn ghi đè dòng tiêu đề

Bạn dùng range cứng (vd `A2`) thay vì `A:J`. Code đã dùng `A:J` +
`insertDataOption: 'INSERT_ROWS'` nên không xảy ra trên prod.
Nếu test ở dev mà thấy: kiểm tra lại `app/api/order/route.ts`.

### Format đơn vị tiền

Cột G là **số thuần** (vd `350000`). Để hiển thị `350.000₫`, format cột G:
Format → Number → More formats → Custom number format → `#,##0₫`.

---

## Bảo mật

- **Private key KHÔNG bao giờ commit lên Git**. Chỉ ở `.env.local`
  (đã trong `.gitignore`) và Vercel env (encrypted).
- Service account chỉ có quyền vào **đúng Sheet bạn share**. Nếu lỡ lộ
  key, vào Google Cloud → IAM → Service Accounts → tab Keys → Delete
  key cũ + tạo key mới + update env Vercel.
- Nếu muốn revoke quyền: vào Sheet → Share → remove email service
  account. Sheet API ngay lập tức trả 403.
