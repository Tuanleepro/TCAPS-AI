import type { FaceShape } from '@/types'

export interface ProductVariant {
  sku?:   string
  name?:  string
  price?: number
  stock?: number
  /** Single canonical photo (used as first ref / colour authority). */
  image?: string
  /**
   * All photos uploaded to this variant in Pancake (v.images array).
   * Includes `image` as position 0 + additional angles. STRICT_VARIANT_MODE
   * in useTryOn sends ALL of these to Gemini so each variant gets multi-
   * angle coverage without leaking sibling-variant photos.
   */
  images?: string[]
}

export interface Product {
  sku:         string
  name:        string
  line:        string             // curated: 'soi' | 'gcl2' | 'gcd' — widened for imports
  style:       string             // curated: 'snapback' | 'trucker' | 'fitted' — widened for imports
  color:       string
  price:       number
  priceBundle: number
  badge:       string | null      // 'BEST SELLER' | 'TRENDING' | 'ICONIC' | 'NEW' | null
  description: string
  faceShapes:  FaceShape[]
  topFor:      FaceShape[]        // primary recommendation
  imageUrl:    string             // product thumbnail
  overlayUrl:  string             // transparent PNG overlay
  tags:        string[]
  images?:     string[]           // full image gallery from Pancake POS
  variants?:   ProductVariant[]   // Pancake variations (color/size)
  stock?:      number             // Pancake stock quantity
  pancakeId?:  string | number    // Pancake POS product id — import match key
  metadataSource?:     'manual' | 'inferred'        // how style/faceShapes were set
  metadataConfidence?: 'high' | 'medium' | 'low'    // confidence of inferred metadata
}

export const PRODUCTS: Product[] = [
  {
    sku: "TC68",
    name: "TC68 - NÓN SPARTAN",
    line: "", style: "sport", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["square", "diamond", "oval"],
    topFor: ["square"],
    imageUrl: "https://content.pancake.vn/2-2606/2026/6/6/520af687d787cb08cb66bd8c625908a6e6ce0dc0.png", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2606/2026/6/6/520af687d787cb08cb66bd8c625908a6e6ce0dc0.png", "https://content.pancake.vn/2-2606/2026/6/6/b4d2a44f12a14d581740e578cdd2f137b9e56746.png"],
    variants: [
      { sku: "TC68CONGDEN", name: "CONG / ĐEN", price: 130000, stock: 796, image: "https://content.pancake.vn/2-2606/2026/6/6/520af687d787cb08cb66bd8c625908a6e6ce0dc0.png", images: ["https://content.pancake.vn/2-2606/2026/6/6/520af687d787cb08cb66bd8c625908a6e6ce0dc0.png", "https://content.pancake.vn/2-2606/2026/6/6/b4d2a44f12a14d581740e578cdd2f137b9e56746.png"] }
    ],
    stock: 796,
    pancakeId: "dfa08c84-9bb6-421d-a62b-103bd54246b9",
  },
  {
    sku: "TC67",
    name: "TC67 - NÓN SKELETON",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["round", "oval", "diamond"],
    topFor: ["round"],
    imageUrl: "https://content.pancake.vn/2-2606/2026/6/6/515345e8a8f178afe100145c70f386591d3efc4e.png", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2606/2026/6/6/515345e8a8f178afe100145c70f386591d3efc4e.png", "https://content.pancake.vn/2-2605/2026/5/31/ca8e8bf7c0682d19b40daac54c25001fb229fe89.jpg", "https://content.pancake.vn/2-2605/2026/5/20/6ad92817552e211955abfdc6db3f92188fbf4480.jpg", "https://content.pancake.vn/2-2605/2026/5/31/c086b972960c6d046d56c373785d603f971a370d.png", "https://content.pancake.vn/2-2606/2026/6/6/3075a3bedcbc32436c3b778ce0bbfafd79aba6ef.png", "https://content.pancake.vn/2-2606/2026/6/6/498076801ff207babf9990318fc1a1b16cac3759.png"],
    variants: [
      { sku: "TC67NGANGTRANG", name: "NGANG / TRẮNG", price: 130000, stock: -37, image: "https://content.pancake.vn/2-2606/2026/6/6/515345e8a8f178afe100145c70f386591d3efc4e.png", images: ["https://content.pancake.vn/2-2606/2026/6/6/515345e8a8f178afe100145c70f386591d3efc4e.png", "https://content.pancake.vn/2-2605/2026/5/31/ca8e8bf7c0682d19b40daac54c25001fb229fe89.jpg"] },
      { sku: "TC67NGANGDEN", name: "NGANG / ĐEN", price: 130000, stock: 46, image: "https://content.pancake.vn/2-2605/2026/5/20/6ad92817552e211955abfdc6db3f92188fbf4480.jpg", images: ["https://content.pancake.vn/2-2605/2026/5/20/6ad92817552e211955abfdc6db3f92188fbf4480.jpg", "https://content.pancake.vn/2-2605/2026/5/31/c086b972960c6d046d56c373785d603f971a370d.png"] },
      { sku: "TC67CONGTRANG", name: "CONG / TRẮNG", price: 130000, stock: -5, image: "https://content.pancake.vn/2-2606/2026/6/6/3075a3bedcbc32436c3b778ce0bbfafd79aba6ef.png", images: ["https://content.pancake.vn/2-2606/2026/6/6/3075a3bedcbc32436c3b778ce0bbfafd79aba6ef.png", "https://content.pancake.vn/2-2606/2026/6/6/498076801ff207babf9990318fc1a1b16cac3759.png"] }
    ],
    stock: 4,
    pancakeId: "5f39279c-9415-46c3-b87a-f963f5087c08",
  },
  {
    sku: "CB TC66",
    name: "TC66 - NÓN MONOGRAM HỌA TIẾT",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["square", "diamond", "oval"],
    topFor: ["square"],
    imageUrl: "https://content.pancake.vn/2-2605/2026/5/12/9b931f92837da87934922fef5ff63aba2d2bcfb4.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2605/2026/5/12/9b931f92837da87934922fef5ff63aba2d2bcfb4.jpg", "https://content.pancake.vn/2-2605/2026/5/31/6adf93b9017c3fb3f4671e4894fc2ddcfd4cb5e7.png", "https://content.pancake.vn/2-2605/2026/5/12/ca67e36e2ac8df9a4e1f625cce8935cd704ead71.jpg", "https://content.pancake.vn/2-2605/2026/5/12/0d8ecb4ca9a2f38f84c73ad67de3d51b699f4d95.jpg"],
    variants: [
      { sku: "CBTC66 KẾT ĐEN", name: "KẾT ĐEN", price: 130000, stock: -17, image: "https://content.pancake.vn/2-2605/2026/5/12/9b931f92837da87934922fef5ff63aba2d2bcfb4.jpg", images: ["https://content.pancake.vn/2-2605/2026/5/12/9b931f92837da87934922fef5ff63aba2d2bcfb4.jpg", "https://content.pancake.vn/2-2605/2026/5/31/6adf93b9017c3fb3f4671e4894fc2ddcfd4cb5e7.png"] },
      { sku: "CBTC66 BO ĐEN", name: "BO ĐEN", price: 130000, stock: 51, image: "https://content.pancake.vn/2-2605/2026/5/12/ca67e36e2ac8df9a4e1f625cce8935cd704ead71.jpg" },
      { sku: "CBTC66 COMBO ĐEN", name: "COMBO ĐEN", price: 130000, stock: -8, image: "https://content.pancake.vn/2-2605/2026/5/12/0d8ecb4ca9a2f38f84c73ad67de3d51b699f4d95.jpg" }
    ],
    stock: 26,
    pancakeId: "b8c0b4a8-36d6-426e-a5f1-60535240de80",
  },
  {
    sku: "TC65",
    name: "TC65 - NÓN TCAPS AERIE",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["oval", "round", "heart"],
    topFor: ["oval"],
    imageUrl: "https://content.pancake.vn/2-2605/2026/5/3/7de9ef63d8d8a821f430c71dab10dc7f807cbd02.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2605/2026/5/3/7de9ef63d8d8a821f430c71dab10dc7f807cbd02.jpg", "https://content.pancake.vn/2-2605/2026/5/31/5453266a1342755307e1c422065c6f68c00f19b8.png", "https://content.pancake.vn/2-2605/2026/5/3/f240cb384bf7c961c0699dc907321d8f21e9c1e5.jpg", "https://content.pancake.vn/2-2605/2026/5/31/899798e6be262abdc92873be1ced7f051b82b9aa.png"],
    variants: [
      { sku: "TC65NGANGDEN", name: "NGANG / Đen", price: 130000, stock: -6, image: "https://content.pancake.vn/2-2605/2026/5/3/7de9ef63d8d8a821f430c71dab10dc7f807cbd02.jpg", images: ["https://content.pancake.vn/2-2605/2026/5/3/7de9ef63d8d8a821f430c71dab10dc7f807cbd02.jpg", "https://content.pancake.vn/2-2605/2026/5/31/5453266a1342755307e1c422065c6f68c00f19b8.png"] },
      { sku: "TC65CONGDEN", name: "CONG / Đen", price: 130000, stock: -2, image: "https://content.pancake.vn/2-2605/2026/5/3/f240cb384bf7c961c0699dc907321d8f21e9c1e5.jpg", images: ["https://content.pancake.vn/2-2605/2026/5/3/f240cb384bf7c961c0699dc907321d8f21e9c1e5.jpg", "https://content.pancake.vn/2-2605/2026/5/31/899798e6be262abdc92873be1ced7f051b82b9aa.png"] }
    ],
    stock: -8,
    pancakeId: "64a6dbec-0f85-4fc9-9982-6e870b396597",
  },
  {
    sku: "TC63",
    name: "TC63 - NÓN SAMURAI",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["square", "diamond", "oval"],
    topFor: ["square"],
    imageUrl: "https://content.pancake.vn/2-2605/2026/5/31/e9f5a0f0b242aef54db45976256ee6f071e9fd2b.png", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2605/2026/5/31/e9f5a0f0b242aef54db45976256ee6f071e9fd2b.png", "https://content.pancake.vn/2-2605/2026/5/31/236faecab33dd825f2d4d08bce0015517b75c5f4.png"],
    variants: [
      { sku: "Tc63 Cong Đen", name: "ĐEN / Cong", price: 130000, stock: -37, image: "https://content.pancake.vn/2-2605/2026/5/31/e9f5a0f0b242aef54db45976256ee6f071e9fd2b.png", images: ["https://content.pancake.vn/2-2605/2026/5/31/e9f5a0f0b242aef54db45976256ee6f071e9fd2b.png", "https://content.pancake.vn/2-2605/2026/5/31/236faecab33dd825f2d4d08bce0015517b75c5f4.png"] }
    ],
    stock: -37,
    pancakeId: "0ca51326-ff1a-4803-8ed2-1fd75ef3508d",
  },
  {
    sku: "NÓN TC62",
    name: "TC62 - NÓN REAL MAN",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["oval", "round", "heart"],
    topFor: ["oval"],
    imageUrl: "https://content.pancake.vn/2-2606/2026/6/6/1b1499d67356ef35032155812503cf99d150721a.png", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2606/2026/6/6/1b1499d67356ef35032155812503cf99d150721a.png", "https://content.pancake.vn/2-2603/2026/3/16/fad02bc8ac84c3fe3d3fb933ef61e43c5aae77c2.jpg", "https://content.pancake.vn/2-2603/2026/3/16/edffbe9bae8f29744ba6db6eb47a15b9cde1e7ba.jpg", "https://content.pancake.vn/2-2606/2026/6/6/f3051c22e972db5a46f17b7cc5ff88b3bb2e9cc6.png"],
    variants: [
      { sku: "NONTC62NGANGDEN", name: "NGANG / ĐEN", price: 130000, stock: 134, image: "https://content.pancake.vn/2-2606/2026/6/6/1b1499d67356ef35032155812503cf99d150721a.png", images: ["https://content.pancake.vn/2-2606/2026/6/6/1b1499d67356ef35032155812503cf99d150721a.png", "https://content.pancake.vn/2-2603/2026/3/16/fad02bc8ac84c3fe3d3fb933ef61e43c5aae77c2.jpg"] },
      { sku: "NONTC62CONGDEN", name: "CONG / ĐEN", price: 130000, stock: 209, image: "https://content.pancake.vn/2-2603/2026/3/16/edffbe9bae8f29744ba6db6eb47a15b9cde1e7ba.jpg", images: ["https://content.pancake.vn/2-2603/2026/3/16/edffbe9bae8f29744ba6db6eb47a15b9cde1e7ba.jpg", "https://content.pancake.vn/2-2606/2026/6/6/f3051c22e972db5a46f17b7cc5ff88b3bb2e9cc6.png"] }
    ],
    stock: 343,
    pancakeId: "8fa01731-e859-44bf-9f56-2f786cd012d1",
  },
  {
    sku: "Combo CT3",
    name: "CT3 - NÓN TCAPS SPARTAN",
    line: "", style: "luxury", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["square", "diamond", "oval"],
    topFor: ["square"],
    imageUrl: "https://content.pancake.vn/2-2602/2026/2/1/209470012663a51dc61a4df6dfa6347a4b8b353a.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2602/2026/2/1/209470012663a51dc61a4df6dfa6347a4b8b353a.jpg", "https://content.pancake.vn/2-2606/2026/6/6/d6945d31c0c274362ee2694e26ac439daa517a06.png", "https://content.pancake.vn/2-2606/2026/6/6/40ed7b6b07a89f21410be09a5418f27743510fda.png", "https://content.pancake.vn/2-2602/2026/2/1/e84adbb5e5f71d6b15fae695962f1b931188d650.jpg"],
    variants: [
      { sku: "CT3NONKETDEN", name: "Nón Kết / Đen", price: 130000, stock: -50, image: "https://content.pancake.vn/2-2602/2026/2/1/209470012663a51dc61a4df6dfa6347a4b8b353a.jpg", images: ["https://content.pancake.vn/2-2602/2026/2/1/209470012663a51dc61a4df6dfa6347a4b8b353a.jpg", "https://content.pancake.vn/2-2606/2026/6/6/d6945d31c0c274362ee2694e26ac439daa517a06.png"] },
      { sku: "CT3NONBODEN", name: "Nón Bo / Đen", price: 130000, stock: 71, image: "https://content.pancake.vn/2-2606/2026/6/6/40ed7b6b07a89f21410be09a5418f27743510fda.png" },
      { sku: "CT3COMBODEN", name: "Combo / Đen", price: 130000, stock: -10, image: "https://content.pancake.vn/2-2602/2026/2/1/e84adbb5e5f71d6b15fae695962f1b931188d650.jpg" }
    ],
    stock: 11,
    pancakeId: "ca2ed353-4c55-40c1-b7ac-afc9d5e5428b",
  },
  {
    sku: "TC61",
    name: "TC61 - NÓN BÍNH NGỌ",
    line: "", style: "sport", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["square", "diamond", "oval"],
    topFor: ["square"],
    imageUrl: "https://content.pancake.vn/2-2601/2026/1/24/6c4bcd380a1eba95c7c2e631eee2e960464ca98a.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2601/2026/1/24/6c4bcd380a1eba95c7c2e631eee2e960464ca98a.jpg", "https://content.pancake.vn/2-2601/2026/1/24/85290c30bef6306885b40f4b8946efd36d8e2bba.jpg"],
    variants: [
      { sku: "TC61LUOICONG", name: "Lưỡi Cong", price: 130000, stock: 161, image: "https://content.pancake.vn/2-2601/2026/1/24/6c4bcd380a1eba95c7c2e631eee2e960464ca98a.jpg", images: ["https://content.pancake.vn/2-2601/2026/1/24/6c4bcd380a1eba95c7c2e631eee2e960464ca98a.jpg", "https://content.pancake.vn/2-2601/2026/1/24/85290c30bef6306885b40f4b8946efd36d8e2bba.jpg"] }
    ],
    stock: 161,
    pancakeId: "20ce8853-3700-4c3d-8b25-fe7e47a5b711",
  },
  {
    sku: "Nón TC59",
    name: "TC59 - NÓN LẠC VIỆT",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["square", "diamond", "oval"],
    topFor: ["square"],
    imageUrl: "https://content.pancake.vn/2-2601/2026/1/11/7e4a0cc9c74ff6572c716faf8a33969219ab2b87.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2601/2026/1/11/7e4a0cc9c74ff6572c716faf8a33969219ab2b87.jpg", "https://content.pancake.vn/2-2601/2026/1/11/508d528af7b66dd053e234886e6159fdf49ad1e9.jpg", "https://content.pancake.vn/2-2601/2026/1/4/c9f0a6a0a2d57e94483087a0e9f9dead541ee62c.jpg", "https://content.pancake.vn/2-2605/2026/5/31/4be997e50309d6e5bde21492fa9981683d164008.png"],
    variants: [
      { sku: "NONTC59SNAPBACK", name: "Snapback", price: 130000, stock: 127, image: "https://content.pancake.vn/2-2601/2026/1/11/7e4a0cc9c74ff6572c716faf8a33969219ab2b87.jpg", images: ["https://content.pancake.vn/2-2601/2026/1/11/7e4a0cc9c74ff6572c716faf8a33969219ab2b87.jpg", "https://content.pancake.vn/2-2601/2026/1/11/508d528af7b66dd053e234886e6159fdf49ad1e9.jpg"] },
      { sku: "NONTC59LUOICONG", name: "Lưỡi Cong", price: 130000, stock: 440, image: "https://content.pancake.vn/2-2601/2026/1/4/c9f0a6a0a2d57e94483087a0e9f9dead541ee62c.jpg", images: ["https://content.pancake.vn/2-2601/2026/1/4/c9f0a6a0a2d57e94483087a0e9f9dead541ee62c.jpg", "https://content.pancake.vn/2-2605/2026/5/31/4be997e50309d6e5bde21492fa9981683d164008.png"] }
    ],
    stock: 567,
    pancakeId: "83f2ecb4-ab71-4646-bdc8-4bc909b08222",
  },
  {
    sku: "NÓN TC58",
    name: "TC58 - NÓN KINGGOAT",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["square", "diamond", "oval"],
    topFor: ["square"],
    imageUrl: "https://content.pancake.vn/2-2601/2026/1/15/d5ce1d5f29d922fc488e9371cf3cd2628c419ea3.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2601/2026/1/15/d5ce1d5f29d922fc488e9371cf3cd2628c419ea3.jpg", "https://content.pancake.vn/2-2606/2026/6/6/80bedc70c5778c0cac62dace951a569ba299ce33.png", "https://content.pancake.vn/2-2512/2025/12/23/edce7582be55687fbdab8084a75b4659b129ba45.jpg"],
    variants: [
      { sku: "NONTC58CONGDEN", name: "CONG / Đen", price: 130000, stock: -7, image: "https://content.pancake.vn/2-2601/2026/1/15/d5ce1d5f29d922fc488e9371cf3cd2628c419ea3.jpg", images: ["https://content.pancake.vn/2-2601/2026/1/15/d5ce1d5f29d922fc488e9371cf3cd2628c419ea3.jpg", "https://content.pancake.vn/2-2606/2026/6/6/80bedc70c5778c0cac62dace951a569ba299ce33.png"] },
      { sku: "NONTC58NGANGDEN", name: "NGANG / Đen", price: 130000, stock: 183, image: "https://content.pancake.vn/2-2512/2025/12/23/edce7582be55687fbdab8084a75b4659b129ba45.jpg", images: ["https://content.pancake.vn/2-2512/2025/12/23/edce7582be55687fbdab8084a75b4659b129ba45.jpg", "https://content.pancake.vn/2-2606/2026/6/6/80bedc70c5778c0cac62dace951a569ba299ce33.png"] }
    ],
    stock: 176,
    pancakeId: "5a74ab80-6c42-4160-81f9-06e3cf49d042",
  },
  {
    sku: "NÓN TC57",
    name: "TC57 - NÓN TCAPS",
    line: "", style: "sport", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["square", "diamond", "oval"],
    topFor: ["square"],
    imageUrl: "https://content.pancake.vn/2-2512/2025/12/18/dfe0c3fa4c469d4b01c3b429b226d478edea04a5.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2512/2025/12/18/dfe0c3fa4c469d4b01c3b429b226d478edea04a5.jpg", "https://content.pancake.vn/2-2605/2026/5/31/9f62b8de37afcbaca6491bcb174c91ec8b85e0f9.png", "https://content.pancake.vn/2-2512/2025/12/18/da78183b3f46d2da44654e179aa1dbcf830e08ff.jpg", "https://content.pancake.vn/2-2512/2025/12/15/c50128e53db89d4a0b54421838bdb2808c9a0963.jpg"],
    variants: [
      { sku: "NONTC57CONGDEN", name: "CONG / Đen", price: 130000, stock: -2, image: "https://content.pancake.vn/2-2512/2025/12/18/dfe0c3fa4c469d4b01c3b429b226d478edea04a5.jpg", images: ["https://content.pancake.vn/2-2512/2025/12/18/dfe0c3fa4c469d4b01c3b429b226d478edea04a5.jpg", "https://content.pancake.vn/2-2605/2026/5/31/9f62b8de37afcbaca6491bcb174c91ec8b85e0f9.png"] },
      { sku: "NONTC57NGANGDEN", name: "NGANG / Đen", price: 130000, stock: -40, image: "https://content.pancake.vn/2-2512/2025/12/18/da78183b3f46d2da44654e179aa1dbcf830e08ff.jpg", images: ["https://content.pancake.vn/2-2512/2025/12/18/da78183b3f46d2da44654e179aa1dbcf830e08ff.jpg", "https://content.pancake.vn/2-2512/2025/12/15/c50128e53db89d4a0b54421838bdb2808c9a0963.jpg"] }
    ],
    stock: -42,
    pancakeId: "d7eaa97c-20b8-44e7-85f3-842065c27084",
  },
  {
    sku: "TC56",
    name: "TC56 - NÓN TCAPS FOR LIFE",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["oval", "round", "heart"],
    topFor: ["oval"],
    imageUrl: "https://content.pancake.vn/2-2512/2025/12/9/2885bd2d36cb7662511409a25a6f235114b71ac0.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2512/2025/12/9/2885bd2d36cb7662511409a25a6f235114b71ac0.jpg", "https://content.pancake.vn/2-2512/2025/12/10/c497f72d308a5fba83a46536d918796e30234190.jpg", "https://content.pancake.vn/2-2512/2025/12/10/15ec42e8b1875f3363b6b1a98e6c9974ecba825f.jpg", "https://content.pancake.vn/2-2606/2026/6/6/9f22e8400fa3aaf0b820b3ee866b5c19c50ed271.png"],
    variants: [
      { sku: "TC56DENNGANG", name: "ĐEN / NGANG", price: 130000, stock: 515, image: "https://content.pancake.vn/2-2512/2025/12/9/2885bd2d36cb7662511409a25a6f235114b71ac0.jpg", images: ["https://content.pancake.vn/2-2512/2025/12/9/2885bd2d36cb7662511409a25a6f235114b71ac0.jpg", "https://content.pancake.vn/2-2512/2025/12/10/c497f72d308a5fba83a46536d918796e30234190.jpg"] },
      { sku: "TC56DENCONG", name: "ĐEN / CONG", price: 130000, stock: -11, image: "https://content.pancake.vn/2-2512/2025/12/10/15ec42e8b1875f3363b6b1a98e6c9974ecba825f.jpg", images: ["https://content.pancake.vn/2-2512/2025/12/10/15ec42e8b1875f3363b6b1a98e6c9974ecba825f.jpg", "https://content.pancake.vn/2-2606/2026/6/6/9f22e8400fa3aaf0b820b3ee866b5c19c50ed271.png"] }
    ],
    stock: 504,
    pancakeId: "2d4dd7db-6982-4cf2-9092-0bc51f9ebe5a",
  },
  {
    sku: "NÓN TC55",
    name: "TC55 - NÓN WUKONG",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["square", "diamond", "oval"],
    topFor: ["square"],
    imageUrl: "https://content.pancake.vn/2-2603/2026/3/19/507421313ad59b85dd72f4afeee4cbeb07b0183b.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2603/2026/3/19/507421313ad59b85dd72f4afeee4cbeb07b0183b.jpg", "https://content.pancake.vn/2-2606/2026/6/6/bd01f2fbe6aee66b95ad2b74d4aa405a466a9b68.png", "https://content.pancake.vn/2-2512/2025/12/6/71cbbaa5d3bd9eab823ed4f5e6f6d016b0fdf9d5.jpg"],
    variants: [
      { sku: "NONTC55CONGDEN", name: "CONG / ĐEN", price: 130000, stock: -10, image: "https://content.pancake.vn/2-2603/2026/3/19/507421313ad59b85dd72f4afeee4cbeb07b0183b.jpg", images: ["https://content.pancake.vn/2-2603/2026/3/19/507421313ad59b85dd72f4afeee4cbeb07b0183b.jpg", "https://content.pancake.vn/2-2606/2026/6/6/bd01f2fbe6aee66b95ad2b74d4aa405a466a9b68.png"] },
      { sku: "NONTC55NGANGDEN", name: "NGANG / ĐEN", price: 130000, stock: 139, image: "https://content.pancake.vn/2-2512/2025/12/6/71cbbaa5d3bd9eab823ed4f5e6f6d016b0fdf9d5.jpg", images: ["https://content.pancake.vn/2-2512/2025/12/6/71cbbaa5d3bd9eab823ed4f5e6f6d016b0fdf9d5.jpg", "https://content.pancake.vn/2-2606/2026/6/6/bd01f2fbe6aee66b95ad2b74d4aa405a466a9b68.png"] }
    ],
    stock: 129,
    pancakeId: "a912e4a8-4495-4e54-94f2-683841cf0db4",
  },
  {
    sku: "NÓN TC52",
    name: "TC52 - NÓN KỴ SĨ",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["square", "diamond", "oval"],
    topFor: ["square"],
    imageUrl: "https://content.pancake.vn/2-2511/2025/11/21/21ccfe3bbdf0a016133f011d6655a3745a1e42db.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2511/2025/11/21/21ccfe3bbdf0a016133f011d6655a3745a1e42db.jpg", "https://content.pancake.vn/2-2511/2025/11/21/c34542632737e67c6f5af801af0146c73597a87c.jpg", "https://content.pancake.vn/2-2511/2025/11/21/8f1694e838d536e981ce3b68a2f67908f784f92a.jpg", "https://content.pancake.vn/2-2512/2025/12/17/fdaedf87cdedd6adebbf1333352c4fbf4e3b73e8.jpg", "https://content.pancake.vn/2-2511/2025/11/21/798d94c5cfd6f75c68b53df0455d9f36d1893899.jpg", "https://content.pancake.vn/2-2511/2025/11/21/741533dc612bb7aa9a6c1b99803bf20d969b1946.jpg", "https://content.pancake.vn/2-2511/2025/11/21/153c232e20e81eb9a08ee2f631f8f2357d56b962.jpg"],
    variants: [
      { sku: "NONTC52DENVANG", name: "ĐEN VÀNG", price: 130000, stock: -4, image: "https://content.pancake.vn/2-2511/2025/11/21/21ccfe3bbdf0a016133f011d6655a3745a1e42db.jpg" },
      { sku: "NONTC52DENXANHLA", name: "ĐEN XANH LÁ", price: 130000, stock: 0, image: "https://content.pancake.vn/2-2511/2025/11/21/c34542632737e67c6f5af801af0146c73597a87c.jpg" },
      { sku: "NONTC52DENXANHDUONG", name: "ĐEN XANH DƯƠNG", price: 130000, stock: -2, image: "https://content.pancake.vn/2-2511/2025/11/21/8f1694e838d536e981ce3b68a2f67908f784f92a.jpg" },
      { sku: "NONTC52DENBAC", name: "ĐEN BẠC", price: 130000, stock: 0, image: "https://content.pancake.vn/2-2512/2025/12/17/fdaedf87cdedd6adebbf1333352c4fbf4e3b73e8.jpg" },
      { sku: "NONTC52DENDO", name: "ĐEN ĐỎ", price: 130000, stock: 0, image: "https://content.pancake.vn/2-2511/2025/11/21/798d94c5cfd6f75c68b53df0455d9f36d1893899.jpg" },
      { sku: "NONTC52DENCAM", name: "ĐEN CAM", price: 130000, stock: -1, image: "https://content.pancake.vn/2-2511/2025/11/21/741533dc612bb7aa9a6c1b99803bf20d969b1946.jpg" },
      { sku: "NONTC52DENTIM", name: "ĐEN TÍM", price: 130000, stock: -1, image: "https://content.pancake.vn/2-2511/2025/11/21/153c232e20e81eb9a08ee2f631f8f2357d56b962.jpg" }
    ],
    stock: -8,
    pancakeId: "6eb9836a-c71e-4f39-842e-2943d1fb2c63",
  },
  {
    sku: "TC51",
    name: "TC51 - NÓN MOTORCYCLE",
    line: "", style: "biker", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["oval", "square", "diamond", "heart", "round"],
    topFor: ["oval"],
    imageUrl: "https://content.pancake.vn/2-2511/2025/11/7/b1a69bbf08989e3cf76f4b59ca5a04344be6e3f2.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2511/2025/11/7/b1a69bbf08989e3cf76f4b59ca5a04344be6e3f2.jpg", "https://content.pancake.vn/2-2606/2026/6/6/bb20ca6ea2f4f3defbc9bda63a29f966c99efe4c.png", "https://content.pancake.vn/2-2606/2026/6/6/0c270c6b67162fe5a80035bd9a93fcc6c4f2d35d.png", "https://content.pancake.vn/2-2605/2026/5/19/1aea8ec7b6f13be9a02bd5d45f35a75728cecebc.jpg", "https://content.pancake.vn/2-2606/2026/6/6/171494eeb992dfb6e55fa63815d5e8d8b3da1f3d.png", "https://content.pancake.vn/2-2605/2026/5/19/9074dc8d4a448dee8f663b099940f5ccbe9bf933.jpg", "https://content.pancake.vn/2-2606/2026/6/6/416e44862ab2257b8ac1f1d406d673fd83606353.png", "https://content.pancake.vn/2-2606/2026/6/6/a3bf9eefbb627483d81a01c975bc96eba37d71d3.png", "https://content.pancake.vn/2-2511/2025/11/7/17efaadf8d3913c48a3506087c04165f1257bda9.jpg", "https://content.pancake.vn/2-2605/2026/5/19/ed2b5c4250c0421929ce581be335af2d5d638e83.jpg", "https://content.pancake.vn/2-2606/2026/6/6/3f65721c01d26ce3fbb07c7aaf4f57daed82a650.png"],
    variants: [
      { sku: "TC51NGANGDEN", name: "NGANG / Đen", price: 130000, stock: 181, image: "https://content.pancake.vn/2-2511/2025/11/7/b1a69bbf08989e3cf76f4b59ca5a04344be6e3f2.jpg", images: ["https://content.pancake.vn/2-2511/2025/11/7/b1a69bbf08989e3cf76f4b59ca5a04344be6e3f2.jpg", "https://content.pancake.vn/2-2606/2026/6/6/bb20ca6ea2f4f3defbc9bda63a29f966c99efe4c.png", "https://content.pancake.vn/2-2606/2026/6/6/0c270c6b67162fe5a80035bd9a93fcc6c4f2d35d.png"] },
      { sku: "TC51NGANGVANG", name: "NGANG / VÀNG", price: 130000, stock: 66, image: "https://content.pancake.vn/2-2605/2026/5/19/1aea8ec7b6f13be9a02bd5d45f35a75728cecebc.jpg", images: ["https://content.pancake.vn/2-2605/2026/5/19/1aea8ec7b6f13be9a02bd5d45f35a75728cecebc.jpg", "https://content.pancake.vn/2-2606/2026/6/6/171494eeb992dfb6e55fa63815d5e8d8b3da1f3d.png"] },
      { sku: "TC51NGANGBAC", name: "NGANG / BẠC", price: 130000, stock: 82, image: "https://content.pancake.vn/2-2605/2026/5/19/9074dc8d4a448dee8f663b099940f5ccbe9bf933.jpg", images: ["https://content.pancake.vn/2-2605/2026/5/19/9074dc8d4a448dee8f663b099940f5ccbe9bf933.jpg", "https://content.pancake.vn/2-2606/2026/6/6/416e44862ab2257b8ac1f1d406d673fd83606353.png", "https://content.pancake.vn/2-2606/2026/6/6/a3bf9eefbb627483d81a01c975bc96eba37d71d3.png"] },
      { sku: "TC51CONGDEN", name: "CONG / Đen", price: 130000, stock: 43, image: "https://content.pancake.vn/2-2511/2025/11/7/17efaadf8d3913c48a3506087c04165f1257bda9.jpg", images: ["https://content.pancake.vn/2-2511/2025/11/7/17efaadf8d3913c48a3506087c04165f1257bda9.jpg", "https://content.pancake.vn/2-2606/2026/6/6/bb20ca6ea2f4f3defbc9bda63a29f966c99efe4c.png"] },
      { sku: "TC51CONGVANG", name: "CONG / VÀNG", price: 130000, stock: 167, image: "https://content.pancake.vn/2-2605/2026/5/19/ed2b5c4250c0421929ce581be335af2d5d638e83.jpg", images: ["https://content.pancake.vn/2-2605/2026/5/19/ed2b5c4250c0421929ce581be335af2d5d638e83.jpg", "https://content.pancake.vn/2-2606/2026/6/6/171494eeb992dfb6e55fa63815d5e8d8b3da1f3d.png"] },
      { sku: "TC51CONGBAC", name: "CONG / BẠC", price: 130000, stock: 203, image: "https://content.pancake.vn/2-2606/2026/6/6/3f65721c01d26ce3fbb07c7aaf4f57daed82a650.png", images: ["https://content.pancake.vn/2-2606/2026/6/6/3f65721c01d26ce3fbb07c7aaf4f57daed82a650.png", "https://content.pancake.vn/2-2606/2026/6/6/416e44862ab2257b8ac1f1d406d673fd83606353.png"] }
    ],
    stock: 742,
    pancakeId: "2ef800d2-ebeb-412d-ace7-93b047f8b3ca",
  },
  {
    sku: "CB TC49",
    name: "TC49 - NÓN MONOGRAM HỌA TIẾT",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["square", "diamond", "oval"],
    topFor: ["square"],
    imageUrl: "https://content.pancake.vn/2-2512/2025/12/15/3577a5ba1af32de19a0b8f3a42fe4399453f3f3a.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2512/2025/12/15/3577a5ba1af32de19a0b8f3a42fe4399453f3f3a.jpg", "https://content.pancake.vn/2-2605/2026/5/31/ebba5aba2dfd80a41b552c71c11ad5798848b83a.png", "https://content.pancake.vn/2-2604/2026/4/15/df8054adcce2fb5464c621bd5b10e3e64f4ea529.jpg", "https://content.pancake.vn/2-2602/2026/2/24/c68b096f45d7a7ec215a2f0d7a24a90eb3b572d1.jpg", "https://content.pancake.vn/2-2512/2025/12/15/1527c5198c491d49f393f03539fa2d9a3a477573.jpg", "https://content.pancake.vn/2-2604/2026/4/15/607e8688fdc93238c78e7afdd6d76c96a089884a.jpg", "https://content.pancake.vn/2-2602/2026/2/24/639aee8c7b8fda51c1fe70d0e649c56546d02425.jpg", "https://content.pancake.vn/2-2602/2026/2/24/6f4781f2fcb774486585b8ab7e21d74cc21ce39a.jpg", "https://content.pancake.vn/2-2512/2025/12/15/35cf5ef9436e87df3984b1826abe02882fcaaaa4.jpg", "https://content.pancake.vn/2-2604/2026/4/15/a9fb01492032d72e7acad1b9186aacfca18042e0.jpg"],
    variants: [
      { sku: "TC49 Kết ĐEN", name: "Nón Kết / Đen", price: 130000, stock: 441, image: "https://content.pancake.vn/2-2512/2025/12/15/3577a5ba1af32de19a0b8f3a42fe4399453f3f3a.jpg", images: ["https://content.pancake.vn/2-2512/2025/12/15/3577a5ba1af32de19a0b8f3a42fe4399453f3f3a.jpg", "https://content.pancake.vn/2-2605/2026/5/31/ebba5aba2dfd80a41b552c71c11ad5798848b83a.png"] },
      { sku: "TC49 KẾT CAM", name: "Nón Kết / CAM", price: 130000, stock: -17, image: "https://content.pancake.vn/2-2604/2026/4/15/df8054adcce2fb5464c621bd5b10e3e64f4ea529.jpg" },
      { sku: "TC49 KẾT VÀNG", name: "Nón Kết / VÀNG", price: 130000, stock: 0 },
      { sku: "TC49 KẾT ĐỎ", name: "Nón Kết / ĐỎ", price: 130000, stock: -52, image: "https://content.pancake.vn/2-2602/2026/2/24/c68b096f45d7a7ec215a2f0d7a24a90eb3b572d1.jpg" },
      { sku: "TC49 BO ĐEN", name: "Nón Bo / Đen", price: 130000, stock: -47, image: "https://content.pancake.vn/2-2512/2025/12/15/1527c5198c491d49f393f03539fa2d9a3a477573.jpg" },
      { sku: "TC49 BO CAM", name: "Nón Bo / CAM", price: 130000, stock: -12, image: "https://content.pancake.vn/2-2604/2026/4/15/607e8688fdc93238c78e7afdd6d76c96a089884a.jpg" },
      { sku: "TC49 BO VÀNG", name: "Nón Bo / VÀNG", price: 130000, stock: 0 },
      { sku: "TC49 Bo ĐỎ", name: "Nón Bo / ĐỎ", price: 130000, stock: 74, image: "https://content.pancake.vn/2-2602/2026/2/24/639aee8c7b8fda51c1fe70d0e649c56546d02425.jpg" },
      { sku: "TC49 COMBO ĐỎ", name: "COMBO ĐỎ", price: 130000, stock: -41, image: "https://content.pancake.vn/2-2602/2026/2/24/6f4781f2fcb774486585b8ab7e21d74cc21ce39a.jpg" },
      { sku: "TC49 COMBO Vàng", name: "COMBO VÀNG", price: 130000, stock: 0 },
      { sku: "TC49 COMBO ĐEN", name: "COMBO ĐEN", price: 130000, stock: -41, image: "https://content.pancake.vn/2-2512/2025/12/15/35cf5ef9436e87df3984b1826abe02882fcaaaa4.jpg" },
      { sku: "TC49 CB CAM", name: "COMBO CAM", price: 130000, stock: -2, image: "https://content.pancake.vn/2-2604/2026/4/15/a9fb01492032d72e7acad1b9186aacfca18042e0.jpg" }
    ],
    stock: 303,
    pancakeId: "41194a5d-d7ee-4bd7-bf3a-d9236d9c8ba6",
  },
  {
    sku: "TC45",
    name: "TC45 - NÓN GÀ",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["oval", "round", "heart"],
    topFor: ["oval"],
    imageUrl: "https://content.pancake.vn/2-2605/2026/5/31/b1296b483e949c719d9d1e8ef572e76cf6a1ec21.png", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2605/2026/5/31/b1296b483e949c719d9d1e8ef572e76cf6a1ec21.png", "https://content.pancake.vn/2-2606/2026/6/6/79863b9c3e8d9fdef90113b64bd16b7dabe78420.png", "https://content.pancake.vn/2-2510/2025/10/14/461606ee0dd99470c4bede857586e1e1c73d92e2.jpg", "https://content.pancake.vn/2-2605/2026/5/22/f5c1e7d858de2262c8d3eeb9d2faab056014b156.jpg", "https://content.pancake.vn/2-2605/2026/5/22/284af91e9e61fe3bbf300c689ade4a205c56769b.jpg"],
    variants: [
      { sku: "TC45NGANGDEN", name: "NGANG / Đen", price: 130000, stock: 117, image: "https://content.pancake.vn/2-2605/2026/5/31/b1296b483e949c719d9d1e8ef572e76cf6a1ec21.png", images: ["https://content.pancake.vn/2-2605/2026/5/31/b1296b483e949c719d9d1e8ef572e76cf6a1ec21.png", "https://content.pancake.vn/2-2606/2026/6/6/79863b9c3e8d9fdef90113b64bd16b7dabe78420.png"] },
      { sku: "TC45CONGDEN", name: "CONG / Đen", price: 130000, stock: -33, image: "https://content.pancake.vn/2-2510/2025/10/14/461606ee0dd99470c4bede857586e1e1c73d92e2.jpg", images: ["https://content.pancake.vn/2-2510/2025/10/14/461606ee0dd99470c4bede857586e1e1c73d92e2.jpg", "https://content.pancake.vn/2-2606/2026/6/6/79863b9c3e8d9fdef90113b64bd16b7dabe78420.png"] },
      { sku: "TC45CONGLUOIDEN", name: "CONG LƯỚI / Đen", price: 130000, stock: 285, image: "https://content.pancake.vn/2-2605/2026/5/22/f5c1e7d858de2262c8d3eeb9d2faab056014b156.jpg", images: ["https://content.pancake.vn/2-2605/2026/5/22/f5c1e7d858de2262c8d3eeb9d2faab056014b156.jpg", "https://content.pancake.vn/2-2605/2026/5/22/284af91e9e61fe3bbf300c689ade4a205c56769b.jpg"] }
    ],
    stock: 369,
    pancakeId: "f0c6aacb-6354-487b-b3eb-2d2c84353389",
  },
  {
    sku: "TC46",
    name: "TC46 - NÓN DARK STALLION",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["oval", "round", "heart"],
    topFor: ["oval"],
    imageUrl: "https://content.pancake.vn/2-2512/2025/12/8/ec2768ecb1c60190902f3199e71ad4d1dd4578af.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2512/2025/12/8/ec2768ecb1c60190902f3199e71ad4d1dd4578af.jpg", "https://content.pancake.vn/2-2512/2025/12/10/09dd54588db71064be641e645ce120ed3910fe2e.jpg", "https://content.pancake.vn/2-2606/2026/6/6/5e683b0376eb4905f9c2cb955792b47c1b3e6cb8.png", "https://content.pancake.vn/2-2512/2025/12/8/3ec68f7b6eca6e1e9a01ef2f236130a2ecaf99e5.jpg", "https://content.pancake.vn/2-2606/2026/6/6/88af3e69ffaee187807c8ad556e0d418b4fcf377.png", "https://content.pancake.vn/2-2511/2025/11/9/de1b1bcc4726f22bf05ebe27bc22b48163557770.jpg", "https://content.pancake.vn/2-2606/2026/6/6/b58cc150fa524224b1b41dc29fec8e9c9d05c1a1.png", "https://content.pancake.vn/2-2603/2026/3/2/818230076c5f7ffb7cc924066c18a696479e88e1.jpg", "https://content.pancake.vn/2-2605/2026/5/31/1da8c36876e08ceaf645c0d6b7c2109dc8ba0404.png", "https://content.pancake.vn/2-2512/2025/12/10/9adf9472f1b9cb0061d1b6f9eb8fb3bc03997e3a.jpg", "https://content.pancake.vn/2-2511/2025/11/9/3aedec9c70c73ad12b3afcb645af51ab52e09607.jpg", "https://content.pancake.vn/2-2603/2026/3/2/77ec86a1465ec23eccf462de9fec2c6a1eb56a16.jpg"],
    variants: [
      { sku: "TC46NGANGDO", name: "NGANG / ĐỎ", price: 130000, stock: 0, image: "https://content.pancake.vn/2-2512/2025/12/10/09dd54588db71064be641e645ce120ed3910fe2e.jpg", images: ["https://content.pancake.vn/2-2512/2025/12/10/09dd54588db71064be641e645ce120ed3910fe2e.jpg", "https://content.pancake.vn/2-2606/2026/6/6/5e683b0376eb4905f9c2cb955792b47c1b3e6cb8.png"] },
      { sku: "TC46NGANGVANG", name: "NGANG / VÀNG", price: 130000, stock: 13, image: "https://content.pancake.vn/2-2512/2025/12/8/3ec68f7b6eca6e1e9a01ef2f236130a2ecaf99e5.jpg", images: ["https://content.pancake.vn/2-2512/2025/12/8/3ec68f7b6eca6e1e9a01ef2f236130a2ecaf99e5.jpg", "https://content.pancake.vn/2-2606/2026/6/6/88af3e69ffaee187807c8ad556e0d418b4fcf377.png"] },
      { sku: "TC46SNAPBACK XANH", name: "NGANG / XANH", price: 130000, stock: -17, image: "https://content.pancake.vn/2-2511/2025/11/9/de1b1bcc4726f22bf05ebe27bc22b48163557770.jpg", images: ["https://content.pancake.vn/2-2511/2025/11/9/de1b1bcc4726f22bf05ebe27bc22b48163557770.jpg", "https://content.pancake.vn/2-2606/2026/6/6/b58cc150fa524224b1b41dc29fec8e9c9d05c1a1.png"] },
      { sku: "TC46NGANGCAM", name: "NGANG / CAM", price: 130000, stock: -14, image: "https://content.pancake.vn/2-2603/2026/3/2/818230076c5f7ffb7cc924066c18a696479e88e1.jpg", images: ["https://content.pancake.vn/2-2603/2026/3/2/818230076c5f7ffb7cc924066c18a696479e88e1.jpg", "https://content.pancake.vn/2-2605/2026/5/31/1da8c36876e08ceaf645c0d6b7c2109dc8ba0404.png"] },
      { sku: "TC46CONGDO", name: "CONG / ĐỎ", price: 130000, stock: -2, image: "https://content.pancake.vn/2-2512/2025/12/10/9adf9472f1b9cb0061d1b6f9eb8fb3bc03997e3a.jpg", images: ["https://content.pancake.vn/2-2512/2025/12/10/9adf9472f1b9cb0061d1b6f9eb8fb3bc03997e3a.jpg", "https://content.pancake.vn/2-2606/2026/6/6/5e683b0376eb4905f9c2cb955792b47c1b3e6cb8.png"] },
      { sku: "TC46CONGVANG", name: "CONG / VÀNG", price: 130000, stock: 115, image: "https://content.pancake.vn/2-2512/2025/12/8/ec2768ecb1c60190902f3199e71ad4d1dd4578af.jpg", images: ["https://content.pancake.vn/2-2512/2025/12/8/ec2768ecb1c60190902f3199e71ad4d1dd4578af.jpg", "https://content.pancake.vn/2-2606/2026/6/6/88af3e69ffaee187807c8ad556e0d418b4fcf377.png"] },
      { sku: "TC46CONG XANH", name: "CONG / XANH", price: 130000, stock: 85, image: "https://content.pancake.vn/2-2511/2025/11/9/3aedec9c70c73ad12b3afcb645af51ab52e09607.jpg", images: ["https://content.pancake.vn/2-2511/2025/11/9/3aedec9c70c73ad12b3afcb645af51ab52e09607.jpg", "https://content.pancake.vn/2-2606/2026/6/6/b58cc150fa524224b1b41dc29fec8e9c9d05c1a1.png"] },
      { sku: "TC46CONGCAM", name: "CONG / CAM", price: 130000, stock: 60, image: "https://content.pancake.vn/2-2603/2026/3/2/77ec86a1465ec23eccf462de9fec2c6a1eb56a16.jpg", images: ["https://content.pancake.vn/2-2603/2026/3/2/77ec86a1465ec23eccf462de9fec2c6a1eb56a16.jpg", "https://content.pancake.vn/2-2605/2026/5/31/1da8c36876e08ceaf645c0d6b7c2109dc8ba0404.png"] }
    ],
    stock: 240,
    pancakeId: "a693255b-8268-4b55-a11b-77fd93346ef2",
  },
  {
    sku: "NÓN TC43",
    name: "TC43 - NÓN WOLF",
    line: "", style: "sport", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["square", "diamond", "oval"],
    topFor: ["square"],
    imageUrl: "https://content.pancake.vn/2-2606/2026/6/6/492f46b361ab559e462644d612efea48216557f1.png", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2606/2026/6/6/492f46b361ab559e462644d612efea48216557f1.png", "https://content.pancake.vn/2-2606/2026/6/6/fc2622cfc3a30aded2974904dd9120cd6406f5b1.png", "https://content.pancake.vn/2-25/2025/8/29/dcb3c28425e0cbc0f94e39d99fe54b0e65b76a17.jpg", "https://content.pancake.vn/2-2603/2026/3/6/f6574e606db722c23c04cf1aea35feb6cd50604a.jpg", "https://content.pancake.vn/2-25/2025/8/29/139a6ce1dbb6808511df05538b61f6c7cac214d6.jpg", "https://content.pancake.vn/2-2605/2026/5/31/463f54a4ad3ca5c0536e14d1debc2314e300ead9.png"],
    variants: [
      { sku: "NONTC43SNAPBACKDENVANG", name: "Snapback / ĐEN VÀNG", price: 130000, stock: 37, image: "https://content.pancake.vn/2-2606/2026/6/6/492f46b361ab559e462644d612efea48216557f1.png", images: ["https://content.pancake.vn/2-2606/2026/6/6/492f46b361ab559e462644d612efea48216557f1.png", "https://content.pancake.vn/2-2606/2026/6/6/fc2622cfc3a30aded2974904dd9120cd6406f5b1.png"] },
      { sku: "NONTC43SNAPBACKDEN", name: "Snapback / ĐEN CAM", price: 130000, stock: -16, image: "https://content.pancake.vn/2-25/2025/8/29/dcb3c28425e0cbc0f94e39d99fe54b0e65b76a17.jpg" },
      { sku: "NONTC43KETDENVANG", name: "Kết / ĐEN VÀNG", price: 130000, stock: 219, image: "https://content.pancake.vn/2-2603/2026/3/6/f6574e606db722c23c04cf1aea35feb6cd50604a.jpg", images: ["https://content.pancake.vn/2-2603/2026/3/6/f6574e606db722c23c04cf1aea35feb6cd50604a.jpg", "https://content.pancake.vn/2-2606/2026/6/6/fc2622cfc3a30aded2974904dd9120cd6406f5b1.png"] },
      { sku: "NONTC43KETDEN", name: "Kết / ĐEN CAM", price: 130000, stock: 42, image: "https://content.pancake.vn/2-25/2025/8/29/139a6ce1dbb6808511df05538b61f6c7cac214d6.jpg", images: ["https://content.pancake.vn/2-25/2025/8/29/139a6ce1dbb6808511df05538b61f6c7cac214d6.jpg", "https://content.pancake.vn/2-2605/2026/5/31/463f54a4ad3ca5c0536e14d1debc2314e300ead9.png"] }
    ],
    stock: 282,
    pancakeId: "50e7cf12-da08-4c2e-9538-d60b34dcb33f",
  },
  {
    sku: "TC42",
    name: "TC42 - NÓN LOGO SÓI TCAPS",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["oval", "square", "diamond", "heart"],
    topFor: ["oval"],
    imageUrl: "https://content.pancake.vn/2-2605/2026/5/31/8e1406cd3ab9e3ca5aa2bc927c7b548b6fe83bf6.png", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2605/2026/5/31/8e1406cd3ab9e3ca5aa2bc927c7b548b6fe83bf6.png", "https://content.pancake.vn/2-2605/2026/5/31/750c20a062854009245976b938688d780921fe63.png", "https://content.pancake.vn/2-2510/2025/10/8/14b3c1b7088d1f7b37d79108ceb59a900742e720.jpg", "https://content.pancake.vn/2-2606/2026/6/6/5d8538fe86db3e15d1a2e64c05a0d1058f9fe384.png"],
    variants: [
      { sku: "TC42DEN", name: "Đen", price: 130000, stock: -66, image: "https://content.pancake.vn/2-2605/2026/5/31/8e1406cd3ab9e3ca5aa2bc927c7b548b6fe83bf6.png", images: ["https://content.pancake.vn/2-2605/2026/5/31/8e1406cd3ab9e3ca5aa2bc927c7b548b6fe83bf6.png", "https://content.pancake.vn/2-2605/2026/5/31/750c20a062854009245976b938688d780921fe63.png"] },
      { sku: "TC42DENCONG", name: "Đen / CONG", price: 130000, stock: -15, image: "https://content.pancake.vn/2-2510/2025/10/8/14b3c1b7088d1f7b37d79108ceb59a900742e720.jpg", images: ["https://content.pancake.vn/2-2510/2025/10/8/14b3c1b7088d1f7b37d79108ceb59a900742e720.jpg", "https://content.pancake.vn/2-2606/2026/6/6/5d8538fe86db3e15d1a2e64c05a0d1058f9fe384.png"] }
    ],
    stock: -81,
    pancakeId: "6c623699-f83f-4bfb-88a0-289bd6be1932",
  },
  {
    sku: "TC41",
    name: "TC41 - NÓN TCAPSPL",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["square", "diamond", "oval"],
    topFor: ["square"],
    imageUrl: "https://content.pancake.vn/2-2602/2026/2/22/8ce81b59d7b0457d68daa0190e1d06014bad61a2.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2602/2026/2/22/8ce81b59d7b0457d68daa0190e1d06014bad61a2.jpg", "https://content.pancake.vn/2-2603/2026/3/9/6d61058b7c8187a2050539b18bf4267281b8c965.png", "https://content.pancake.vn/2-2606/2026/6/6/8ec50458925ca737078feb81158582013f8db3b9.png", "https://content.pancake.vn/2-2606/2026/6/6/ddd3edacb1c6e167c39ca1e0025e7152e0f6e1d4.png"],
    variants: [
      { sku: "TC41DENNGANG", name: "Đen / NGANG", price: 130000, stock: 115, image: "https://content.pancake.vn/2-2602/2026/2/22/8ce81b59d7b0457d68daa0190e1d06014bad61a2.jpg", images: ["https://content.pancake.vn/2-2602/2026/2/22/8ce81b59d7b0457d68daa0190e1d06014bad61a2.jpg", "https://content.pancake.vn/2-2603/2026/3/9/6d61058b7c8187a2050539b18bf4267281b8c965.png"] },
      { sku: "TC41DENCONG", name: "Đen / CONG", price: 130000, stock: -5, image: "https://content.pancake.vn/2-2606/2026/6/6/8ec50458925ca737078feb81158582013f8db3b9.png", images: ["https://content.pancake.vn/2-2606/2026/6/6/8ec50458925ca737078feb81158582013f8db3b9.png", "https://content.pancake.vn/2-2606/2026/6/6/ddd3edacb1c6e167c39ca1e0025e7152e0f6e1d4.png"] }
    ],
    stock: 110,
    pancakeId: "03f147fa-b540-449a-a06e-8bc799dd4368",
  },
  {
    sku: "TC39",
    name: "TC39 - NÓN THE WARRIORS",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["oval", "round", "heart"],
    topFor: ["oval"],
    imageUrl: "https://content.pancake.vn/2-25/2025/8/14/8223c1da5c7ace01c9b283cf12df077ada8b02a9.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-25/2025/8/14/8223c1da5c7ace01c9b283cf12df077ada8b02a9.jpg", "https://content.pancake.vn/2-2603/2026/3/14/a6e4c1d65c6f5a9dfa014eb0515b50877502b5d2.jpg", "https://content.pancake.vn/2-25/2025/6/12/2ccae2b367dd56df1c94b0fccf0814a700aa26a0.jpg", "https://content.pancake.vn/2-2603/2026/3/27/9126633fc9417e4c52c09283f149748b9cbbf697.jpg", "https://content.pancake.vn/2-25/2025/8/29/95b90b134c83d16f1ee90f748a52d8eaad2c44a6.jpg", "https://content.pancake.vn/2-25/2025/9/22/88eb3f73a0f83892763b4e92335073b46001f2f2.jpg"],
    variants: [
      { sku: "TC39DENSNAPBACK", name: "Đen / Snapback", price: 130000, stock: -10, image: "https://content.pancake.vn/2-25/2025/8/14/8223c1da5c7ace01c9b283cf12df077ada8b02a9.jpg", images: ["https://content.pancake.vn/2-25/2025/8/14/8223c1da5c7ace01c9b283cf12df077ada8b02a9.jpg", "https://content.pancake.vn/2-2603/2026/3/14/a6e4c1d65c6f5a9dfa014eb0515b50877502b5d2.jpg"] },
      { sku: "TC39DENKET", name: "Đen / Kết", price: 130000, stock: -9, image: "https://content.pancake.vn/2-25/2025/6/12/2ccae2b367dd56df1c94b0fccf0814a700aa26a0.jpg", images: ["https://content.pancake.vn/2-25/2025/6/12/2ccae2b367dd56df1c94b0fccf0814a700aa26a0.jpg", "https://content.pancake.vn/2-2603/2026/3/27/9126633fc9417e4c52c09283f149748b9cbbf697.jpg"] },
      { sku: "TC39MAUSNAPBACK", name: "MÀU XANH / Snapback", price: 130000, stock: -38, image: "https://content.pancake.vn/2-25/2025/8/29/95b90b134c83d16f1ee90f748a52d8eaad2c44a6.jpg" },
      { sku: "Tc39 Trắng snapback", name: "TRẮNG / Snapback", price: 130000, stock: -17, image: "https://content.pancake.vn/2-25/2025/9/22/88eb3f73a0f83892763b4e92335073b46001f2f2.jpg" }
    ],
    stock: -74,
    pancakeId: "dc44d50e-e888-45df-a15f-0100ffeba950",
  },
  {
    sku: "TC30",
    name: "TC30 - NÓN SÓI ĐÊM TCAPS",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["oval", "square", "diamond"],
    topFor: ["oval"],
    imageUrl: "https://content.pancake.vn/2-2512/2025/12/11/181ac89e7432747255b8c29bc1491f86f22ce285.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2512/2025/12/11/181ac89e7432747255b8c29bc1491f86f22ce285.jpg", "https://content.pancake.vn/2-24/2024/11/21/5df798461aa5dc8c5584a8bba2d97596986d9151.jpg", "https://content.pancake.vn/2-24/2024/11/21/c58f8b2a3edfcc2158ce850237496e2c2c349c36.jpg", "https://content.pancake.vn/2-25/2025/3/31/62d88aa4ccecbdb302d2b2867b4fede66ba342c1.jpg", "https://content.pancake.vn/2-2606/2026/6/6/cb77b17e9820605a2d024ed391cf5e5829c734eb.png", "https://content.pancake.vn/2-25/2025/1/12/a4ad68f64d9fbeafd1ca273355b0c46c2c771002.jpg", "https://content.pancake.vn/2-2606/2026/6/6/99721ed2bb378d38ec2ea2e6e435ec2ff4434a76.png", "https://content.pancake.vn/2-2512/2025/12/11/f793ee147053c8f94614e35b94f812d7b5e3faab.jpg", "https://content.pancake.vn/2-25/2025/1/12/40034f5a76aed8a8b419144a3f09298e38171c01.jpg", "https://content.pancake.vn/2-25/2025/1/12/cb1567918a130df058465a916984cf84bcda6e2b.jpg", "https://content.pancake.vn/2-2512/2025/12/11/48d230f9c23aca12ab1ed9a34b81a36db1e1be6b.jpg"],
    variants: [
      { sku: "TC30CONGDENVANG", name: "CONG / ĐEN VÀNG", price: 130000, stock: 251, image: "https://content.pancake.vn/2-2512/2025/12/11/181ac89e7432747255b8c29bc1491f86f22ce285.jpg", images: ["https://content.pancake.vn/2-2512/2025/12/11/181ac89e7432747255b8c29bc1491f86f22ce285.jpg", "https://content.pancake.vn/2-2512/2025/12/11/48d230f9c23aca12ab1ed9a34b81a36db1e1be6b.jpg"] },
      { sku: "TC30CONGDEN", name: "CONG / ĐEN", price: 130000, stock: -107, image: "https://content.pancake.vn/2-2606/2026/6/6/99721ed2bb378d38ec2ea2e6e435ec2ff4434a76.png", images: ["https://content.pancake.vn/2-2606/2026/6/6/99721ed2bb378d38ec2ea2e6e435ec2ff4434a76.png", "https://content.pancake.vn/2-2512/2025/12/11/f793ee147053c8f94614e35b94f812d7b5e3faab.jpg"] },
      { sku: "TC30NGANGDEN", name: "NGANG / ĐEN", price: 130000, stock: -26, image: "https://content.pancake.vn/2-25/2025/3/31/62d88aa4ccecbdb302d2b2867b4fede66ba342c1.jpg", images: ["https://content.pancake.vn/2-25/2025/3/31/62d88aa4ccecbdb302d2b2867b4fede66ba342c1.jpg", "https://content.pancake.vn/2-2606/2026/6/6/cb77b17e9820605a2d024ed391cf5e5829c734eb.png"] },
      { sku: "TC30", name: "NGANG / TRẮNG", price: 130000, stock: -3, image: "https://content.pancake.vn/2-24/2024/11/21/5df798461aa5dc8c5584a8bba2d97596986d9151.jpg", images: ["https://content.pancake.vn/2-24/2024/11/21/5df798461aa5dc8c5584a8bba2d97596986d9151.jpg", "https://content.pancake.vn/2-24/2024/11/21/c58f8b2a3edfcc2158ce850237496e2c2c349c36.jpg"] },
      { sku: "TC30CONGTRANGFULL", name: "CONG / TRẮNG", price: 130000, stock: -3, image: "https://content.pancake.vn/2-25/2025/1/12/a4ad68f64d9fbeafd1ca273355b0c46c2c771002.jpg" },
      { sku: "TC30CONGDO", name: "CONG / ĐỎ", price: 130000, stock: -5, image: "https://content.pancake.vn/2-25/2025/1/12/40034f5a76aed8a8b419144a3f09298e38171c01.jpg" },
      { sku: "TC30CONGXANH", name: "CONG / XANH", price: 130000, stock: -32, image: "https://content.pancake.vn/2-25/2025/1/12/cb1567918a130df058465a916984cf84bcda6e2b.jpg" }
    ],
    stock: 75,
    pancakeId: "b8fe8b04-ad1b-4d78-916e-170fe27cb158",
  },
  {
    sku: "Combo CT1",
    name: "CT1 - NÓN TCAPS",
    line: "", style: "minimal", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: [],
    topFor: [],
    imageUrl: "https://content.pancake.vn/2-25/2025/5/2/763ce78c5ef83e14850d111dcf69ebdf3d551d6e.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-25/2025/5/2/763ce78c5ef83e14850d111dcf69ebdf3d551d6e.jpg", "https://content.pancake.vn/2-25/2025/5/2/aba5121211c8f2ae050fc26b732a4643dc4d4ebf.jpg", "https://content.pancake.vn/2-2512/2025/12/18/aade64e7c68d68a130a7a7c54716f42bd9679b1c.jpg", "https://content.pancake.vn/2-2512/2025/12/18/093e80c345406d0d9cb3d2cace07b5c0fa3b8a96.jpg", "https://content.pancake.vn/2-2512/2025/12/18/8696d5a09e93772da6e324bec09fad638839011d.jpg"],
    variants: [
      { sku: "COMBOCT1COMBO2NON", name: "Đen / COMBO 2 NÓN", price: 130000, stock: 17 },
      { sku: "COMBOCT1DENKET", name: "Đen / Kết", price: 130000, stock: 343, image: "https://content.pancake.vn/2-25/2025/5/2/763ce78c5ef83e14850d111dcf69ebdf3d551d6e.jpg" },
      { sku: "COMBOCT1DENBO", name: "Đen / Bo", price: 130000, stock: 16, image: "https://content.pancake.vn/2-25/2025/5/2/aba5121211c8f2ae050fc26b732a4643dc4d4ebf.jpg" },
      { sku: "CBCT1 BE", name: "BE / COMBO 2 NÓN", price: 130000, stock: 15, image: "https://content.pancake.vn/2-2512/2025/12/18/aade64e7c68d68a130a7a7c54716f42bd9679b1c.jpg" },
      { sku: "KẾTCT1 BE", name: "BE / Kết", price: 130000, stock: 15, image: "https://content.pancake.vn/2-2512/2025/12/18/093e80c345406d0d9cb3d2cace07b5c0fa3b8a96.jpg" },
      { sku: "Bo CT1 BE", name: "BE / Bo", price: 130000, stock: 208, image: "https://content.pancake.vn/2-2512/2025/12/18/8696d5a09e93772da6e324bec09fad638839011d.jpg" }
    ],
    stock: 614,
    pancakeId: "9430915a-97e7-4e23-ad19-15e85b13817c",
  },
]

// Quick lookup by SKU
export const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map(p => [p.sku, p]))

// Get compatibility score (deterministic)
export function getCompatibility(product: Product, faceShape: FaceShape): number {
  if (product.topFor.includes(faceShape))   return 95
  if (product.faceShapes.includes(faceShape)) return 85
  return 62
}

// Get best product for a face shape
export function getTopProduct(faceShape: FaceShape): Product {
  const scored = PRODUCTS.map(p => ({ p, score: getCompatibility(p, faceShape) }))
  scored.sort((a, b) => b.score - a.score)
  return scored[0].p
}

// Get top 3 recommendations for a face shape
export function getRecommendations(faceShape: FaceShape): Product[] {
  return PRODUCTS
    .map(p => ({ p, score: getCompatibility(p, faceShape) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.p)
}

export const FACE_SHAPE_LABELS: Record<FaceShape, string> = {
  oval:    'Oval',
  round:   'Tròn',
  square:  'Vuông',
  heart:   'Tim',
  diamond: 'Kim Cương',
  oblong:  'Dài',
}

export const FACE_SHAPE_TIPS: Record<FaceShape, string> = {
  oval:    'Khuôn mặt oval cân đối — hầu hết kiểu nón đều phù hợp.',
  round:   'Mặt tròn — chọn nón crown cao để tạo chiều dài thị giác.',
  square:  'Mặt vuông — nón brim cong mềm giúp cân bằng góc hàm.',
  heart:   'Mặt tim — fitted cap profile thấp cân đối trán rộng.',
  diamond: 'Mặt kim cương — snapback brim ngang cân bằng gò má.',
  oblong:  'Mặt dài — tránh crown cao, chọn fitted cap profile thấp.',
}
