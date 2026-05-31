import Link from 'next/link'
import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/Navbar'

export const metadata: Metadata = {
  title:       'Về TCAPS — Nón Thời Trang Streetwear Việt Nam',
  description: 'TCAPS — thương hiệu nón thời trang streetwear sinh ra tại Việt Nam. Kho sỉ tận gốc chuyên nón thời trang khu vực Đông Nam Á. COD toàn quốc, bảo hành 30 ngày.',
}

const STATS = [
  { value: '150.000+', label: 'Nón đã bán' },
  { value: '59',       label: 'Mẫu nón'    },
  { value: '4.8/5',    label: 'Đánh giá'   },
  { value: '24/7',     label: 'Phục vụ'    },
]

const COLLECTIONS = [
  {
    title: 'Sói Series (Wolf)',
    desc:  'Dòng flagship của TCAPS — graphic sói/wolf in nổi, snapback streetwear. Bestseller liên tục trên TikTok Shop. Hai phiên bản: Sói thường và Sói DV (premium).',
    tags:  ['SNAPBACK', 'BESTSELLER', 'PREMIUM'],
  },
  {
    title: 'GCD Series',
    desc:  'Fitted low-profile, brim cong mềm — dành cho mặt vuông, oblong, heart. Bản icon: GCD Gold vàng đồng signature của TCAPS.',
    tags:  ['FITTED', 'LOW-PROFILE', 'ICONIC'],
  },
  {
    title: 'GCL2 Series',
    desc:  'Trucker mesh-back, crown cao cho thoáng và tạo chiều dài — phù hợp mặt tròn. Hai colorway: Bạc và Đen.',
    tags:  ['TRUCKER', 'MESH', 'HIGH-CROWN'],
  },
  {
    title: 'TC Collection (TC1–TC68+)',
    desc:  'Bộ sưu tập mới drop liên tục — Skeleton Crown, Spartan, Wukong, Samurai, Phoenix, Stallion, Motorcycle... mỗi mẫu một câu chuyện streetwear riêng.',
    tags:  ['NEW DROPS', 'LIMITED', 'STORYTELLING'],
  },
]

const CHANNELS = [
  {
    icon:  '🤖',
    name:  'TCAPS AI Try-On (Web)',
    badge: 'Khuyên dùng',
    desc:  'Upload selfie → AI đội nón TCAPS lên đầu bạn → chọn mẫu hợp nhất → đặt hàng ngay tại web. Nhanh nhất, không cần chat.',
    href:  '/try-on',
    cta:   'Mở Try-On',
    primary: true,
  },
  {
    icon:  '💬',
    name:  'Zalo (1-1 nhanh)',
    badge: null,
    desc:  'Inbox trực tiếp số 097 228 41 46. Tư vấn size, màu, ship — phản hồi trong vài phút trong giờ làm việc.',
    href:  'https://zalo.me/0972284146',
    cta:   'Mở Zalo',
    primary: false,
  },
  {
    icon:  '📱',
    name:  'Messenger (Facebook)',
    badge: null,
    desc:  'Chat thẳng với fanpage TCAPS qua Messenger. Gửi hình mẫu nón muốn mua, nhân viên báo size + chốt đơn.',
    href:  'https://m.me/61557869000489',
    cta:   'Mở Messenger',
    primary: false,
  },
  {
    icon:  '🛍️',
    name:  'TikTok Shop',
    badge: 'Mua trực tiếp',
    desc:  'Theo dõi @tcapsvn để xem livestream drop mới + đặt hàng qua TikTok Shop tích hợp. Áp dụng đầy đủ voucher TikTok.',
    href:  'https://www.tiktok.com/@tcapsvn',
    cta:   'Vào TikTok',
    primary: false,
  },
]

const ORDER_STEPS = [
  { n: '1', title: 'Chọn nón',         desc: 'Duyệt 59 mẫu nón TCAPS qua catalog hoặc thử AI để biết nón nào hợp mặt bạn.' },
  { n: '2', title: 'Đặt hàng',         desc: 'Điền họ tên, SĐT, địa chỉ qua web / nhắn Zalo / Messenger / TikTok Shop.' },
  { n: '3', title: 'TCAPS xác nhận',   desc: 'Nhân viên gọi xác nhận đơn trong vài phút — confirm size, màu, địa chỉ.' },
  { n: '4', title: 'Nhận hàng — COD',  desc: 'Ship toàn quốc 2-4 ngày. Thanh toán khi nhận hàng (COD). Bảo hành 30 ngày.' },
]

const POLICIES = [
  { icon: '🚚', title: 'Ship COD toàn quốc', desc: 'Phí 30.000đ. Miễn phí khi đơn từ 250.000đ. Nhận hàng kiểm tra xong mới trả tiền.' },
  { icon: '🔄', title: 'Đổi trả 30 ngày',     desc: 'Lỗi sản xuất TCAPS đổi ngay, không hỏi lý do. Khách chỉ trả phí ship chiều đi 1 lần.' },
  { icon: '💰', title: 'Bundle 2+ giá tốt',    desc: 'Mua 2 nón TCAPS chỉ 250.000đ + free ship. Giá lẻ 130k-160k tuỳ mẫu.' },
  { icon: '🏬', title: 'Kho sỉ tận gốc',      desc: 'TCAPS là kho sỉ chuyên nón thời trang khu vực Đông Nam Á. Sỉ lẻ đều có giá tốt nhất.' },
]

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-[#0A0A0A] text-[#F5F5F5]">
      <Navbar />

      <main className="pt-24 pb-20">

        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="px-4 max-w-4xl mx-auto text-center mb-20">
          <div className="inline-flex items-center gap-2 border border-[#C9A84C]/30 bg-[#C9A84C]/6 text-[#C9A84C] text-[10px] uppercase tracking-[.2em] px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
            Về thương hiệu
          </div>
          <h1
            className="font-black tracking-tight leading-[1.05] mb-6"
            style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}
          >
            <span className="block text-[#F5F5F5]">TCAPS</span>
            <span className="block shimmer">Streetwear. Born in Vietnam.</span>
          </h1>
          <p className="text-[#C8C8C8] text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Thương hiệu nón thời trang sinh ra ở Sài Gòn — phục vụ thế hệ trẻ Việt Nam và thị trường
            Đông Nam Á. Streetwear-native, tốc độ ra mẫu nhanh, giá tiếp cận được, chất lượng kho sỉ
            tận gốc.
          </p>
        </section>

        {/* ── Stats ─────────────────────────────────────────── */}
        <section className="px-4 max-w-4xl mx-auto mb-20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {STATS.map(s => (
              <div
                key={s.label}
                className="rounded-2xl border border-[#C9A84C]/20 bg-gradient-to-b from-[#C9A84C]/8 to-transparent p-4 sm:p-6 text-center"
              >
                <p className="text-[#C9A84C] font-black text-2xl sm:text-4xl font-mono tracking-tight">{s.value}</p>
                <p className="text-[10px] sm:text-xs uppercase tracking-[.18em] text-[#8A8A8A] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Story ─────────────────────────────────────────── */}
        <section className="px-4 max-w-3xl mx-auto mb-20">
          <p className="text-[10px] uppercase tracking-[.22em] text-[#C9A84C] mb-3 font-bold">Câu chuyện</p>
          <h2 className="text-3xl sm:text-4xl font-black mb-6 leading-tight">
            Một chiếc nón không chỉ để che nắng.
          </h2>
          <div className="text-[#C8C8C8] leading-relaxed space-y-4 text-[15px]">
            <p>
              TCAPS bắt đầu với một niềm tin đơn giản: streetwear Việt Nam xứng đáng có một
              thương hiệu nón của riêng mình — không phải bản sao của brand Mỹ hay Hàn, mà là
              <strong className="text-[#F5F5F5]"> bản sắc đường phố Sài Gòn — Hà Nội — Đà Nẵng</strong>,
              ngôn ngữ thiết kế táo bạo, giá tiếp cận được với bạn trẻ Việt.
            </p>
            <p>
              Mỗi mẫu nón TCAPS đều có một câu chuyện: Sói Wolf cho phong cách thủ lĩnh, Skeleton
              Crown cho tinh thần nổi loạn nhưng có vương quyền, Spartan cho chiến binh đời thường,
              Samurai cho người giữ kỷ luật, Wukong cho kẻ phá vỡ giới hạn. Khách hàng TCAPS
              không mua một chiếc nón — họ chọn một <strong className="text-[#F5F5F5]">câu chuyện</strong> để đội lên đầu.
            </p>
            <p>
              Chúng tôi vận hành như một <strong className="text-[#F5F5F5]">kho sỉ tận gốc</strong> —
              cung cấp nón thời trang cho cả thị trường khu vực Đông Nam Á. Điều này cho phép TCAPS
              giữ giá lẻ ở mức 130.000đ – 160.000đ/nón và bundle 2 nón chỉ 250.000đ — mà vẫn đảm bảo
              chất lượng vải, form, in ấn ngang ngửa các thương hiệu nhập khẩu giá gấp đôi, gấp ba.
            </p>
            <p>
              Năm 2026, TCAPS ra mắt <strong className="text-[#F5F5F5]">AI Virtual Try-On</strong> —
              công nghệ đầu tiên trong ngành nón Việt Nam: khách chỉ cần upload một selfie, AI sẽ phân
              tích khuôn mặt + đội nón TCAPS lên đầu bạn để xem trước trước khi mua. Mục tiêu duy nhất:
              khách không phải đoán "nón này có hợp mặt mình không".
            </p>
          </div>
        </section>

        {/* ── Collections ───────────────────────────────────── */}
        <section className="px-4 max-w-5xl mx-auto mb-20">
          <div className="text-center mb-10">
            <p className="text-[10px] uppercase tracking-[.22em] text-[#C9A84C] mb-2 font-bold">Bộ sưu tập</p>
            <h2 className="text-3xl sm:text-4xl font-black">Dòng sản phẩm TCAPS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {COLLECTIONS.map(c => (
              <div
                key={c.title}
                className="rounded-2xl border border-[#1E1E1E] bg-[#0D0D0D] hover:border-[#C9A84C]/40 transition-colors p-5"
              >
                <h3 className="text-lg font-black text-[#F5F5F5] mb-1.5">{c.title}</h3>
                <p className="text-[14px] text-[#C8C8C8] leading-relaxed mb-3">{c.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {c.tags.map(t => (
                    <span key={t} className="text-[9px] font-bold uppercase tracking-widest text-[#C9A84C] px-2 py-0.5 rounded-full border border-[#C9A84C]/30">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-[#C9A84C]/40 hover:bg-[#C9A84C]/10 text-[#C9A84C] text-xs font-bold uppercase tracking-widest transition-colors"
            >
              Xem toàn bộ 59 mẫu
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </section>

        {/* ── How to buy — 4 channels ───────────────────────── */}
        <section className="px-4 max-w-5xl mx-auto mb-20">
          <div className="text-center mb-10">
            <p className="text-[10px] uppercase tracking-[.22em] text-[#C9A84C] mb-2 font-bold">Mua hàng</p>
            <h2 className="text-3xl sm:text-4xl font-black mb-2">4 cách đặt nón TCAPS</h2>
            <p className="text-sm text-[#8A8A8A]">Chọn kênh bạn thích — tất cả đều cùng kho hàng, cùng giá, cùng chất lượng.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CHANNELS.map(ch => (
              <a
                key={ch.name}
                href={ch.href}
                target={ch.href.startsWith('http') ? '_blank' : undefined}
                rel={ch.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className={[
                  'group rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 block',
                  ch.primary
                    ? 'border-[#C9A84C]/60 bg-gradient-to-br from-[#C9A84C]/15 to-[#C9A84C]/5 hover:shadow-[0_12px_40px_rgba(201,168,76,.25)]'
                    : 'border-[#1E1E1E] bg-[#0D0D0D] hover:border-[#C9A84C]/40',
                ].join(' ')}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl shrink-0" aria-hidden>{ch.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-black text-[#F5F5F5] text-base">{ch.name}</span>
                      {ch.badge && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#C9A84C] text-black">
                          {ch.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#C8C8C8] leading-relaxed">{ch.desc}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end text-[#C9A84C] text-xs font-bold uppercase tracking-widest gap-1.5 group-hover:gap-2 transition-all">
                  {ch.cta}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── Order steps ────────────────────────────────────── */}
        <section className="px-4 max-w-5xl mx-auto mb-20">
          <div className="text-center mb-10">
            <p className="text-[10px] uppercase tracking-[.22em] text-[#C9A84C] mb-2 font-bold">Quy trình</p>
            <h2 className="text-3xl sm:text-4xl font-black">4 bước nhận nón TCAPS</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ORDER_STEPS.map(s => (
              <div key={s.n} className="rounded-2xl border border-[#1E1E1E] bg-[#0D0D0D] p-5">
                <div className="text-[#C9A84C] font-black text-5xl font-mono mb-2 leading-none opacity-25">{s.n}</div>
                <h3 className="font-black text-[#F5F5F5] text-sm mb-1.5">{s.title}</h3>
                <p className="text-[12.5px] text-[#8A8A8A] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Policies ───────────────────────────────────────── */}
        <section className="px-4 max-w-5xl mx-auto mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {POLICIES.map(p => (
              <div key={p.title} className="rounded-2xl border border-[#1E1E1E] bg-[#0A0A0A] p-4">
                <p className="text-2xl mb-2" aria-hidden>{p.icon}</p>
                <h3 className="font-bold text-[#F5F5F5] text-sm mb-1">{p.title}</h3>
                <p className="text-[12px] text-[#8A8A8A] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Contact ────────────────────────────────────────── */}
        <section className="px-4 max-w-3xl mx-auto mb-20">
          <div className="rounded-3xl border border-[#C9A84C]/25 bg-gradient-to-br from-[#C9A84C]/8 to-transparent p-6 sm:p-10">
            <div className="text-center mb-6">
              <p className="text-[10px] uppercase tracking-[.22em] text-[#C9A84C] mb-2 font-bold">Liên hệ</p>
              <h2 className="text-2xl sm:text-3xl font-black mb-2">Ghé TCAPS</h2>
              <p className="text-sm text-[#8A8A8A]">Showroom mở cửa 24/7 — bạn có thể đến thử trực tiếp.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href="https://maps.google.com/?q=332+Lê+Văn+Việt,+TP.+Hồ+Chí+Minh"
                target="_blank" rel="noopener noreferrer"
                className="block rounded-xl border border-[#2A2A2A] hover:border-[#C9A84C]/50 bg-[#0A0A0A] p-4 transition-colors"
              >
                <p className="text-[9px] uppercase tracking-widest text-[#C9A84C] font-bold mb-1">Địa chỉ</p>
                <p className="text-sm font-bold text-[#F5F5F5]">332 Lê Văn Việt</p>
                <p className="text-xs text-[#8A8A8A]">TP. Hồ Chí Minh · Mở 24/7</p>
              </a>
              <a
                href="tel:0972284146"
                className="block rounded-xl border border-[#2A2A2A] hover:border-[#C9A84C]/50 bg-[#0A0A0A] p-4 transition-colors"
              >
                <p className="text-[9px] uppercase tracking-widest text-[#C9A84C] font-bold mb-1">Hotline</p>
                <p className="text-sm font-bold text-[#F5F5F5] font-mono">097 228 41 46</p>
                <p className="text-xs text-[#8A8A8A]">Gọi trực tiếp · Zalo · Messenger</p>
              </a>
              <a
                href="https://www.tiktok.com/@tcapsvn"
                target="_blank" rel="noopener noreferrer"
                className="block rounded-xl border border-[#2A2A2A] hover:border-[#C9A84C]/50 bg-[#0A0A0A] p-4 transition-colors"
              >
                <p className="text-[9px] uppercase tracking-widest text-[#C9A84C] font-bold mb-1">TikTok</p>
                <p className="text-sm font-bold text-[#F5F5F5]">@tcapsvn</p>
                <p className="text-xs text-[#8A8A8A]">Livestream + Drop mới hằng tuần</p>
              </a>
              <Link
                href="/try-on"
                className="block rounded-xl border-2 border-[#C9A84C] bg-[#C9A84C]/10 hover:bg-[#C9A84C]/20 p-4 transition-colors"
              >
                <p className="text-[9px] uppercase tracking-widest text-[#C9A84C] font-bold mb-1">Khuyên dùng</p>
                <p className="text-sm font-bold text-[#F5F5F5]">AI Try-On</p>
                <p className="text-xs text-[#C9A84C]">Thử nón ngay tại web — Miễn phí</p>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Final CTA ──────────────────────────────────────── */}
        <section className="px-4 max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-3">Sẵn sàng chọn nón hợp bạn?</h2>
          <p className="text-sm text-[#8A8A8A] mb-6">
            Mất 30 giây để AI phân tích mặt + gợi ý mẫu nón TCAPS phù hợp nhất với bạn.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/try-on"
              className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-[#C9A84C] hover:bg-[#E8C96A] text-black font-bold text-sm transition-all shadow-[0_0_32px_rgba(201,168,76,.35)]"
            >
              Thử Nón AI — Miễn Phí
            </Link>
            <Link
              href="/catalog"
              className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl border border-[#222] hover:border-[#C9A84C]/50 text-[#F5F5F5]/70 hover:text-[#F5F5F5] text-sm transition-all"
            >
              Xem bộ sưu tập
            </Link>
          </div>
        </section>
      </main>

      {/* Footer (matches homepage style) */}
      <footer className="border-t border-[#161616] py-10 px-4 mt-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#3A3A3A]">
          <span className="inline-flex items-center gap-2 text-lg font-black tracking-widest text-[#C9A84C]">
            TCAPS
          </span>
          <span>332 Lê Văn Việt, TP. Hồ Chí Minh · 0972284146 · 24/7</span>
          <span>© 2026 TCAPS — Nón Thời Trang</span>
        </div>
      </footer>
    </div>
  )
}
