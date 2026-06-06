import type { FaceShape } from '@/types'

export interface ProductVariant {
  sku?:   string
  name?:  string
  price?: number
  stock?: number
  image?: string
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
    sku: "TC30",
    name: "TC30 - NÓN SÓI ĐÊM TCAPS",
    line: "", style: "streetwear", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["oval", "square", "diamond"],
    topFor: ["oval"],
    imageUrl: "https://content.pancake.vn/2-24/2024/11/21/c58f8b2a3edfcc2158ce850237496e2c2c349c36.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-24/2024/11/21/c58f8b2a3edfcc2158ce850237496e2c2c349c36.jpg", "https://content.pancake.vn/2-24/2024/11/15/ef198ab9ccd3fffe03a8f09d697734e895d15f8b.jpg", "https://content.pancake.vn/2-24/2024/11/21/87438e4efc3c1399af7ef668b7e1d09d5781c98f.jpg", "https://content.pancake.vn/2-24/2024/11/21/af512301afcd0efc8729fc543e8f51aebe4d54d2.jpg", "https://content.pancake.vn/2-24/2024/11/21/5df798461aa5dc8c5584a8bba2d97596986d9151.jpg", "https://content.pancake.vn/2-24/2024/11/21/eb33229e83e83b60cb786c4eacd6d4da64cf8b19.jpg", "https://content.pancake.vn/2-24/2024/11/21/990bc1315cbc2ce90ddb94c52557ee54df1247cd.jpg", "https://content.pancake.vn/2-24/2024/11/21/6887aa8c9184af777ca6533071fdf93e62171053.jpg", "https://content.pancake.vn/2-25/2025/3/31/62d88aa4ccecbdb302d2b2867b4fede66ba342c1.jpg", "https://content.pancake.vn/2-25/2025/1/12/a4ad68f64d9fbeafd1ca273355b0c46c2c771002.jpg", "https://content.pancake.vn/2-24/2024/11/24/4b740a3d92a6e17270b4c0b0594513645570432b.jpg", "https://content.pancake.vn/2-2512/2025/12/28/e96defcb9bf4aef0f06d1200e350aca216207b2b.jpg", "https://content.pancake.vn/2-2512/2025/12/11/f793ee147053c8f94614e35b94f812d7b5e3faab.jpg", "https://content.pancake.vn/2-25/2025/1/12/40034f5a76aed8a8b419144a3f09298e38171c01.jpg", "https://content.pancake.vn/2-25/2025/1/12/cb1567918a130df058465a916984cf84bcda6e2b.jpg", "https://content.pancake.vn/2-2512/2025/12/11/181ac89e7432747255b8c29bc1491f86f22ce285.jpg", "https://content.pancake.vn/2-2512/2025/12/11/3c8714583b0f113b18e7ede40e3b3b8ad3ca6553.jpg", "https://content.pancake.vn/2-2512/2025/12/11/48d230f9c23aca12ab1ed9a34b81a36db1e1be6b.jpg", "https://content.pancake.vn/2-2512/2025/12/11/aa9b63db93abbfa7448837064f5019a5947a8290.jpg"],
    variants: [
      { sku: "TC30CONGDENVANG",   name: "CONG / ĐEN VÀNG", price: 130000, stock: 496, image: "https://content.pancake.vn/2-24/2024/11/21/c58f8b2a3edfcc2158ce850237496e2c2c349c36.jpg" },
      { sku: "TC30CONGDEN",       name: "CONG / ĐEN",      price: 130000, stock: 5,   image: "https://content.pancake.vn/2-25/2025/3/31/62d88aa4ccecbdb302d2b2867b4fede66ba342c1.jpg" },
      { sku: "TC30NGANGDEN",      name: "NGANG / ĐEN",     price: 130000, stock: -26, image: "https://content.pancake.vn/2-25/2025/1/12/a4ad68f64d9fbeafd1ca273355b0c46c2c771002.jpg" },
      { sku: "TC30",              name: "NGANG / TRẮNG",   price: 130000, stock: -3,  image: "https://content.pancake.vn/2-24/2024/11/24/4b740a3d92a6e17270b4c0b0594513645570432b.jpg" },
      { sku: "TC30CONGTRANGFULL", name: "CONG / TRẮNG",    price: 130000, stock: -3,  image: "https://content.pancake.vn/2-25/2025/1/12/40034f5a76aed8a8b419144a3f09298e38171c01.jpg" },
      { sku: "TC30CONGDO",        name: "CONG / ĐỎ",       price: 130000, stock: -5,  image: "https://content.pancake.vn/2-25/2025/1/12/cb1567918a130df058465a916984cf84bcda6e2b.jpg" },
      { sku: "TC30CONGXANH",      name: "CONG / XANH",     price: 130000, stock: -32, image: "https://content.pancake.vn/2-2512/2025/12/11/181ac89e7432747255b8c29bc1491f86f22ce285.jpg" }
    ],
    stock: 311,
    pancakeId: "b8fe8b04-ad1b-4d78-916e-170fe27cb158",
  },
  {
    sku: "TC68",
    name: "TC68 - NÓN SPARTAN",
    line: "", style: "sport", color: "",
    price: 130000, priceBundle: 130000,
    badge: null,
    description: "",
    faceShapes: ["square", "diamond", "oval"],
    topFor: ["square"],
    imageUrl: "https://content.pancake.vn/2-2605/2026/5/31/c83f3724e200a663ba2fdaf05c920586b9bfa2cf.png", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2605/2026/5/31/c83f3724e200a663ba2fdaf05c920586b9bfa2cf.png", "https://content.pancake.vn/2-2605/2026/5/26/e36efadec2a1973ec1deb890de6a975ecfcb380b.jpg", "https://content.pancake.vn/2-2605/2026/5/31/ea6664267686290cef7497e07aa6f9801319d9a7.png", "https://content.pancake.vn/2-2605/2026/5/31/012af807b30edabe665908cf3b4e5588bdfd9fc8.png"],
    variants: [
      { sku: "TC68CONGDEN", name: "CONG / ĐEN", price: 130000, stock: 350, image: "https://content.pancake.vn/2-2605/2026/5/31/c83f3724e200a663ba2fdaf05c920586b9bfa2cf.png" }
    ],
    stock: 350,
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
    imageUrl: "https://content.pancake.vn/2-2605/2026/5/31/9f1402482b7c25901a05ad8de9edd7ae1f8c3996.png", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2605/2026/5/31/9f1402482b7c25901a05ad8de9edd7ae1f8c3996.png", "https://content.pancake.vn/2-2605/2026/5/31/ca8e8bf7c0682d19b40daac54c25001fb229fe89.jpg", "https://content.pancake.vn/2-2605/2026/5/20/6ad92817552e211955abfdc6db3f92188fbf4480.jpg", "https://content.pancake.vn/2-2605/2026/5/31/c086b972960c6d046d56c373785d603f971a370d.png", "https://content.pancake.vn/2-2605/2026/5/15/e37f1cfd8391468e63cbb3dc3e8ea0e5cb34415c.jpg"],
    variants: [
      { sku: "TC67NGANGTRANG", name: "NGANG / TRẮNG", price: 130000, stock: -17, image: "https://content.pancake.vn/2-2605/2026/5/31/9f1402482b7c25901a05ad8de9edd7ae1f8c3996.png" },
      { sku: "TC67NGANGDEN", name: "NGANG / ĐEN", price: 130000, stock: 121, image: "https://content.pancake.vn/2-2605/2026/5/20/6ad92817552e211955abfdc6db3f92188fbf4480.jpg" },
      { sku: "TC67CONGTRANG", name: "CONG / TRẮNG", price: 130000, stock: -5, image: "https://content.pancake.vn/2-2605/2026/5/15/e37f1cfd8391468e63cbb3dc3e8ea0e5cb34415c.jpg" }
    ],
    stock: 99,
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
      { sku: "CBTC66 KẾT ĐEN", name: "KẾT ĐEN", price: 130000, stock: -18, image: "https://content.pancake.vn/2-2605/2026/5/12/9b931f92837da87934922fef5ff63aba2d2bcfb4.jpg" },
      { sku: "CBTC66 BO ĐEN", name: "BO ĐEN", price: 130000, stock: 56, image: "https://content.pancake.vn/2-2605/2026/5/12/ca67e36e2ac8df9a4e1f625cce8935cd704ead71.jpg" },
      { sku: "CBTC66 COMBO ĐEN", name: "COMBO ĐEN", price: 130000, stock: -9, image: "https://content.pancake.vn/2-2605/2026/5/12/0d8ecb4ca9a2f38f84c73ad67de3d51b699f4d95.jpg" }
    ],
    stock: 29,
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
    images: ["https://content.pancake.vn/2-2605/2026/5/3/7de9ef63d8d8a821f430c71dab10dc7f807cbd02.jpg", "https://content.pancake.vn/2-2605/2026/5/31/5453266a1342755307e1c422065c6f68c00f19b8.png", "https://content.pancake.vn/2-2605/2026/5/31/7239ef15eab618d74e7639c91fbb5cd0f20390ab.png", "https://content.pancake.vn/2-2605/2026/5/3/f240cb384bf7c961c0699dc907321d8f21e9c1e5.jpg", "https://content.pancake.vn/2-2605/2026/5/31/899798e6be262abdc92873be1ced7f051b82b9aa.png"],
    variants: [
      { sku: "TC65NGANGDEN", name: "NGANG / Đen", price: 130000, stock: 69, image: "https://content.pancake.vn/2-2605/2026/5/3/7de9ef63d8d8a821f430c71dab10dc7f807cbd02.jpg" },
      { sku: "TC65CONGDEN", name: "CONG / Đen", price: 130000, stock: 80, image: "https://content.pancake.vn/2-2605/2026/5/3/f240cb384bf7c961c0699dc907321d8f21e9c1e5.jpg" }
    ],
    stock: 149,
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
    imageUrl: "https://content.pancake.vn/2-2603/2026/3/23/e6903d14f0e1d3f01229db383c0dde2345447f2d.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2603/2026/3/23/e6903d14f0e1d3f01229db383c0dde2345447f2d.jpg", "https://content.pancake.vn/2-2603/2026/3/23/d611eacb783fea2e7e583fd547d860b2c04c9b52.jpg", "https://content.pancake.vn/2-2605/2026/5/31/e9f5a0f0b242aef54db45976256ee6f071e9fd2b.png", "https://content.pancake.vn/2-2605/2026/5/31/236faecab33dd825f2d4d08bce0015517b75c5f4.png"],
    variants: [
      { sku: "Tc63 Cong Đen", name: "ĐEN / Cong", price: 130000, stock: -34, image: "https://content.pancake.vn/2-2603/2026/3/23/e6903d14f0e1d3f01229db383c0dde2345447f2d.jpg" }
    ],
    stock: -34,
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
    imageUrl: "https://content.pancake.vn/2-2603/2026/3/16/fad02bc8ac84c3fe3d3fb933ef61e43c5aae77c2.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2603/2026/3/16/fad02bc8ac84c3fe3d3fb933ef61e43c5aae77c2.jpg", "https://content.pancake.vn/2-2605/2026/5/31/849da0f6b39fadfa8682a7b4f80ead17d08a21c6.png", "https://content.pancake.vn/2-2605/2026/5/31/2208a196b89159581562e16d3678a38a2d768268.png", "https://content.pancake.vn/2-2603/2026/3/16/edffbe9bae8f29744ba6db6eb47a15b9cde1e7ba.jpg", "https://content.pancake.vn/2-2605/2026/5/31/20366f9b20ab402bba7b5c76c42e3c07e52edabb.png", "https://content.pancake.vn/2-2605/2026/5/31/0574f6f82ee77f18b902a4836b04751970e7bacb.png"],
    variants: [
      { sku: "NONTC62NGANGDEN", name: "NGANG / ĐEN", price: 130000, stock: 140, image: "https://content.pancake.vn/2-2603/2026/3/16/fad02bc8ac84c3fe3d3fb933ef61e43c5aae77c2.jpg" },
      { sku: "NONTC62CONGDEN", name: "CONG / ĐEN", price: 130000, stock: 214, image: "https://content.pancake.vn/2-2603/2026/3/16/edffbe9bae8f29744ba6db6eb47a15b9cde1e7ba.jpg" }
    ],
    stock: 354,
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
    images: ["https://content.pancake.vn/2-2602/2026/2/1/209470012663a51dc61a4df6dfa6347a4b8b353a.jpg", "https://content.pancake.vn/2-2603/2026/3/31/564aa4b6920ce53cfdbf41185cafb24935ab41d0.png", "https://content.pancake.vn/2-2602/2026/2/1/ba93a5a320e66271541899fee8461fe7138903ed.jpg", "https://content.pancake.vn/2-2602/2026/2/1/e84adbb5e5f71d6b15fae695962f1b931188d650.jpg"],
    variants: [
      { sku: "CT3NONKETDEN", name: "Nón Kết / Đen", price: 130000, stock: -13, image: "https://content.pancake.vn/2-2602/2026/2/1/209470012663a51dc61a4df6dfa6347a4b8b353a.jpg" },
      { sku: "CT3NONBODEN", name: "Nón Bo / Đen", price: 130000, stock: 83, image: "https://content.pancake.vn/2-2602/2026/2/1/ba93a5a320e66271541899fee8461fe7138903ed.jpg" },
      { sku: "CT3COMBODEN", name: "Combo / Đen", price: 130000, stock: -4, image: "https://content.pancake.vn/2-2602/2026/2/1/e84adbb5e5f71d6b15fae695962f1b931188d650.jpg" }
    ],
    stock: 66,
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
    images: ["https://content.pancake.vn/2-2601/2026/1/24/6c4bcd380a1eba95c7c2e631eee2e960464ca98a.jpg", "https://content.pancake.vn/2-2601/2026/1/24/b7bcbf6ad108644be25c4ab932b4a98f23bfc693.jpg", "https://content.pancake.vn/2-2601/2026/1/24/85290c30bef6306885b40f4b8946efd36d8e2bba.jpg", "https://content.pancake.vn/2-2601/2026/1/24/66654aff446dcfce8f1f47e6fe121cdeadf49ce5.jpg", "https://content.pancake.vn/2-2601/2026/1/24/b3a7f60420dafb73591a977e433976bf2972a420.jpg", "https://content.pancake.vn/2-2601/2026/1/22/d9e4216bbf1be166d0546d057dcee74b78848eb5.jpg"],
    variants: [
      { sku: "TC61LUOICONG", name: "Lưỡi Cong", price: 130000, stock: 264, image: "https://content.pancake.vn/2-2601/2026/1/24/6c4bcd380a1eba95c7c2e631eee2e960464ca98a.jpg" }
    ],
    stock: 264,
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
    images: ["https://content.pancake.vn/2-2601/2026/1/11/7e4a0cc9c74ff6572c716faf8a33969219ab2b87.jpg", "https://content.pancake.vn/2-2601/2026/1/11/508d528af7b66dd053e234886e6159fdf49ad1e9.jpg", "https://content.pancake.vn/2-2601/2026/1/11/e76937891b46bbe87844afdee013915a4f1ded7c.jpg", "https://content.pancake.vn/2-2601/2026/1/11/1ecc23fdef5f04ee6814e868a2d38ad79fcdc027.jpg", "https://content.pancake.vn/2-2601/2026/1/4/c9f0a6a0a2d57e94483087a0e9f9dead541ee62c.jpg", "https://content.pancake.vn/2-2605/2026/5/31/4be997e50309d6e5bde21492fa9981683d164008.png"],
    variants: [
      { sku: "NONTC59SNAPBACK", name: "Snapback", price: 130000, stock: 190, image: "https://content.pancake.vn/2-2601/2026/1/11/7e4a0cc9c74ff6572c716faf8a33969219ab2b87.jpg" },
      { sku: "NONTC59LUOICONG", name: "Lưỡi Cong", price: 130000, stock: 483, image: "https://content.pancake.vn/2-2601/2026/1/4/c9f0a6a0a2d57e94483087a0e9f9dead541ee62c.jpg" }
    ],
    stock: 673,
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
    images: ["https://content.pancake.vn/2-2601/2026/1/15/d5ce1d5f29d922fc488e9371cf3cd2628c419ea3.jpg", "https://content.pancake.vn/2-2605/2026/5/31/df6b4019fa609e51278f5577ca5ad5df876ac498.png", "https://content.pancake.vn/2-2605/2026/5/31/0e1cc50347148ccf54f152a73a18b95b9d71e457.png", "https://content.pancake.vn/2-2512/2025/12/23/edce7582be55687fbdab8084a75b4659b129ba45.jpg", "https://content.pancake.vn/2-2512/2025/12/23/0413f914644c486f509f9ecc51865c5ae3ed1c6a.jpg", "https://content.pancake.vn/2-2512/2025/12/23/c6d6a67fdbf5c1fb22494fa061677d912989e751.jpg", "https://content.pancake.vn/2-2512/2025/12/23/f26149acde0f38bd31f6c42be475c4973df7ec0f.jpg", "https://content.pancake.vn/2-2512/2025/12/23/c9fef72588a843cb4e350e17b4be481cee2571d7.jpg", "https://content.pancake.vn/2-2512/2025/12/23/348482365177f261f0e16f40ba7528def4dc6d75.jpg", "https://content.pancake.vn/2-2512/2025/12/23/73e14bf16bfb9415b88e8892078b5f1d26341e38.jpg", "https://content.pancake.vn/2-2512/2025/12/30/2ca9c9e79b6597b6d6353689e67177cae34970a0.jpg"],
    variants: [
      { sku: "NONTC58CONGDEN", name: "CONG / Đen", price: 130000, stock: -6, image: "https://content.pancake.vn/2-2601/2026/1/15/d5ce1d5f29d922fc488e9371cf3cd2628c419ea3.jpg" },
      { sku: "NONTC58NGANGDEN", name: "NGANG / Đen", price: 130000, stock: 186, image: "https://content.pancake.vn/2-2512/2025/12/23/edce7582be55687fbdab8084a75b4659b129ba45.jpg" }
    ],
    stock: 180,
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
    images: ["https://content.pancake.vn/2-2512/2025/12/18/dfe0c3fa4c469d4b01c3b429b226d478edea04a5.jpg", "https://content.pancake.vn/2-2605/2026/5/31/9f62b8de37afcbaca6491bcb174c91ec8b85e0f9.png", "https://content.pancake.vn/2-2512/2025/12/18/da78183b3f46d2da44654e179aa1dbcf830e08ff.jpg", "https://content.pancake.vn/2-2512/2025/12/15/c50128e53db89d4a0b54421838bdb2808c9a0963.jpg", "https://content.pancake.vn/2-2512/2025/12/15/82b80518167617f45f096040f3a1cb9134ffdb98.jpg", "https://content.pancake.vn/2-2512/2025/12/15/523760dbd0ecd6883c3871da486e647ea43eb80a.jpg", "https://content.pancake.vn/2-2512/2025/12/15/62e017256a0a34333a08d2465207e2db90e8775a.jpg", "https://content.pancake.vn/2-2512/2025/12/15/a0b92ae8c68047f7ecfcab22ffa7524560394ec9.jpg"],
    variants: [
      { sku: "NONTC57CONGDEN", name: "CONG / Đen", price: 130000, stock: -1, image: "https://content.pancake.vn/2-2512/2025/12/18/dfe0c3fa4c469d4b01c3b429b226d478edea04a5.jpg" },
      { sku: "NONTC57NGANGDEN", name: "NGANG / Đen", price: 130000, stock: -40, image: "https://content.pancake.vn/2-2512/2025/12/18/da78183b3f46d2da44654e179aa1dbcf830e08ff.jpg" }
    ],
    stock: -41,
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
    images: ["https://content.pancake.vn/2-2512/2025/12/9/2885bd2d36cb7662511409a25a6f235114b71ac0.jpg", "https://content.pancake.vn/2-2512/2025/12/10/ba5500c6693344f0429f92ad335ac62c595be01b.jpg", "https://content.pancake.vn/2-2512/2025/12/10/5427eeb66f8f83df2e64e1096f4adbd3b83eb240.jpg", "https://content.pancake.vn/2-2512/2025/12/10/c497f72d308a5fba83a46536d918796e30234190.jpg", "https://content.pancake.vn/2-2512/2025/12/15/7d31335d4cebbfb508baeb57603d5c81303f3266.jpg", "https://content.pancake.vn/2-2512/2025/12/10/15ec42e8b1875f3363b6b1a98e6c9974ecba825f.jpg", "https://content.pancake.vn/2-2605/2026/5/31/c52fd397545c26067d51abaf2602c5b8f1649e99.png", "https://content.pancake.vn/2-2605/2026/5/31/579c1a09b1ec8e4f164c7166cf5904f94345611d.png"],
    variants: [
      { sku: "TC56DENNGANG", name: "ĐEN / NGANG", price: 130000, stock: 543, image: "https://content.pancake.vn/2-2512/2025/12/9/2885bd2d36cb7662511409a25a6f235114b71ac0.jpg" },
      { sku: "TC56DENCONG", name: "ĐEN / CONG", price: 130000, stock: -10, image: "https://content.pancake.vn/2-2512/2025/12/10/15ec42e8b1875f3363b6b1a98e6c9974ecba825f.jpg" }
    ],
    stock: 533,
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
    images: ["https://content.pancake.vn/2-2603/2026/3/19/507421313ad59b85dd72f4afeee4cbeb07b0183b.jpg", "https://content.pancake.vn/2-2601/2026/1/25/56b910fc7e2af03c6683d0ee6f8af925b0d17c75.png", "https://content.pancake.vn/2-2605/2026/5/31/0acb84758b41330c2e4efdd943f60d202e71ab9b.png", "https://content.pancake.vn/2-2512/2025/12/6/71cbbaa5d3bd9eab823ed4f5e6f6d016b0fdf9d5.jpg", "https://content.pancake.vn/2-2605/2026/5/31/d7bc5af77a736a364dd746395c6966cd221decf7.png"],
    variants: [
      { sku: "NONTC55CONGDEN", name: "CONG / ĐEN", price: 130000, stock: -4, image: "https://content.pancake.vn/2-2603/2026/3/19/507421313ad59b85dd72f4afeee4cbeb07b0183b.jpg" },
      { sku: "NONTC55NGANGDEN", name: "NGANG / ĐEN", price: 130000, stock: 151, image: "https://content.pancake.vn/2-2512/2025/12/6/71cbbaa5d3bd9eab823ed4f5e6f6d016b0fdf9d5.jpg" }
    ],
    stock: 147,
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
      { sku: "NONTC52DENXANHDUONG", name: "ĐEN XANH DƯƠNG", price: 130000, stock: -1, image: "https://content.pancake.vn/2-2511/2025/11/21/8f1694e838d536e981ce3b68a2f67908f784f92a.jpg" },
      { sku: "NONTC52DENBAC", name: "ĐEN BẠC", price: 130000, stock: 0, image: "https://content.pancake.vn/2-2512/2025/12/17/fdaedf87cdedd6adebbf1333352c4fbf4e3b73e8.jpg" },
      { sku: "NONTC52DENDO", name: "ĐEN ĐỎ", price: 130000, stock: 0, image: "https://content.pancake.vn/2-2511/2025/11/21/798d94c5cfd6f75c68b53df0455d9f36d1893899.jpg" },
      { sku: "NONTC52DENCAM", name: "ĐEN CAM", price: 130000, stock: -1, image: "https://content.pancake.vn/2-2511/2025/11/21/741533dc612bb7aa9a6c1b99803bf20d969b1946.jpg" },
      { sku: "NONTC52DENTIM", name: "ĐEN TÍM", price: 130000, stock: -1, image: "https://content.pancake.vn/2-2511/2025/11/21/153c232e20e81eb9a08ee2f631f8f2357d56b962.jpg" }
    ],
    stock: -7,
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
    images: ["https://content.pancake.vn/2-2511/2025/11/7/b1a69bbf08989e3cf76f4b59ca5a04344be6e3f2.jpg", "https://content.pancake.vn/2-2605/2026/5/31/c83c6e54d9751c725e7d8071bd0a2afeb34a6d26.png", "https://content.pancake.vn/2-2605/2026/5/31/8cf93e4453713172c524c8f9b04bf4c09f462863.png", "https://content.pancake.vn/2-2605/2026/5/19/1aea8ec7b6f13be9a02bd5d45f35a75728cecebc.jpg", "https://content.pancake.vn/2-2605/2026/5/19/9074dc8d4a448dee8f663b099940f5ccbe9bf933.jpg", "https://content.pancake.vn/2-2511/2025/11/7/17efaadf8d3913c48a3506087c04165f1257bda9.jpg", "https://content.pancake.vn/2-2605/2026/5/19/ed2b5c4250c0421929ce581be335af2d5d638e83.jpg", "https://content.pancake.vn/2-2605/2026/5/19/cb2c4ee52d5412b555b9b9c74a26e141de123be8.jpg"],
    variants: [
      { sku: "TC51NGANGDEN", name: "NGANG / Đen", price: 130000, stock: 182, image: "https://content.pancake.vn/2-2511/2025/11/7/b1a69bbf08989e3cf76f4b59ca5a04344be6e3f2.jpg" },
      { sku: "TC51NGANGVANG", name: "NGANG / VÀNG", price: 130000, stock: 66, image: "https://content.pancake.vn/2-2605/2026/5/19/1aea8ec7b6f13be9a02bd5d45f35a75728cecebc.jpg" },
      { sku: "TC51NGANGBAC", name: "NGANG / BẠC", price: 130000, stock: 82, image: "https://content.pancake.vn/2-2605/2026/5/19/9074dc8d4a448dee8f663b099940f5ccbe9bf933.jpg" },
      { sku: "TC51CONGDEN", name: "CONG / Đen", price: 130000, stock: 46, image: "https://content.pancake.vn/2-2511/2025/11/7/17efaadf8d3913c48a3506087c04165f1257bda9.jpg" },
      { sku: "TC51CONGVANG", name: "CONG / VÀNG", price: 130000, stock: 167, image: "https://content.pancake.vn/2-2605/2026/5/19/ed2b5c4250c0421929ce581be335af2d5d638e83.jpg" },
      { sku: "TC51CONGBAC", name: "CONG / BẠC", price: 130000, stock: 205, image: "https://content.pancake.vn/2-2605/2026/5/19/cb2c4ee52d5412b555b9b9c74a26e141de123be8.jpg" }
    ],
    stock: 748,
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
      { sku: "TC49 Kết ĐEN", name: "Nón Kết / Đen", price: 130000, stock: 101, image: "https://content.pancake.vn/2-2512/2025/12/15/3577a5ba1af32de19a0b8f3a42fe4399453f3f3a.jpg" },
      { sku: "TC49 KẾT CAM", name: "Nón Kết / CAM", price: 130000, stock: -15, image: "https://content.pancake.vn/2-2604/2026/4/15/df8054adcce2fb5464c621bd5b10e3e64f4ea529.jpg" },
      { sku: "TC49 KẾT VÀNG", name: "Nón Kết / VÀNG", price: 130000, stock: 0 },
      { sku: "TC49 KẾT ĐỎ", name: "Nón Kết / ĐỎ", price: 130000, stock: -44, image: "https://content.pancake.vn/2-2602/2026/2/24/c68b096f45d7a7ec215a2f0d7a24a90eb3b572d1.jpg" },
      { sku: "TC49 BO ĐEN", name: "Nón Bo / Đen", price: 130000, stock: -37, image: "https://content.pancake.vn/2-2512/2025/12/15/1527c5198c491d49f393f03539fa2d9a3a477573.jpg" },
      { sku: "TC49 BO CAM", name: "Nón Bo / CAM", price: 130000, stock: -12, image: "https://content.pancake.vn/2-2604/2026/4/15/607e8688fdc93238c78e7afdd6d76c96a089884a.jpg" },
      { sku: "TC49 BO VÀNG", name: "Nón Bo / VÀNG", price: 130000, stock: 0 },
      { sku: "TC49 Bo ĐỎ", name: "Nón Bo / ĐỎ", price: 130000, stock: 101, image: "https://content.pancake.vn/2-2602/2026/2/24/639aee8c7b8fda51c1fe70d0e649c56546d02425.jpg" },
      { sku: "TC49 COMBO ĐỎ", name: "COMBO ĐỎ", price: 130000, stock: -38, image: "https://content.pancake.vn/2-2602/2026/2/24/6f4781f2fcb774486585b8ab7e21d74cc21ce39a.jpg" },
      { sku: "TC49 COMBO Vàng", name: "COMBO VÀNG", price: 130000, stock: 0 },
      { sku: "TC49 COMBO ĐEN", name: "COMBO ĐEN", price: 130000, stock: -37, image: "https://content.pancake.vn/2-2512/2025/12/15/35cf5ef9436e87df3984b1826abe02882fcaaaa4.jpg" },
      { sku: "TC49 CB CAM", name: "COMBO CAM", price: 130000, stock: -2, image: "https://content.pancake.vn/2-2604/2026/4/15/a9fb01492032d72e7acad1b9186aacfca18042e0.jpg" }
    ],
    stock: 17,
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
    imageUrl: "https://content.pancake.vn/2-2510/2025/10/8/84d153ef6b4a93456f8ca8d3bc1d265b01d51963.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2510/2025/10/8/84d153ef6b4a93456f8ca8d3bc1d265b01d51963.jpg", "https://content.pancake.vn/2-2605/2026/5/31/54bfb5be875ab1ca1dd771129c973e424c76a051.png", "https://content.pancake.vn/2-2605/2026/5/31/b1296b483e949c719d9d1e8ef572e76cf6a1ec21.png", "https://content.pancake.vn/2-2605/2026/5/31/3f6c87394fb4cabd8b150908a587251660830459.png", "https://content.pancake.vn/2-2510/2025/10/14/461606ee0dd99470c4bede857586e1e1c73d92e2.jpg", "https://content.pancake.vn/2-2605/2026/5/22/f5c1e7d858de2262c8d3eeb9d2faab056014b156.jpg", "https://content.pancake.vn/2-2605/2026/5/22/284af91e9e61fe3bbf300c689ade4a205c56769b.jpg"],
    variants: [
      { sku: "TC45NGANGDEN", name: "NGANG / Đen", price: 130000, stock: 141, image: "https://content.pancake.vn/2-2510/2025/10/8/84d153ef6b4a93456f8ca8d3bc1d265b01d51963.jpg" },
      { sku: "TC45CONGDEN", name: "CONG / Đen", price: 130000, stock: -33, image: "https://content.pancake.vn/2-2510/2025/10/14/461606ee0dd99470c4bede857586e1e1c73d92e2.jpg" },
      { sku: "TC45CONGLUOIDEN", name: "CONG LƯỚI / Đen", price: 130000, stock: 288, image: "https://content.pancake.vn/2-2605/2026/5/22/f5c1e7d858de2262c8d3eeb9d2faab056014b156.jpg" }
    ],
    stock: 396,
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
    images: ["https://content.pancake.vn/2-2512/2025/12/8/ec2768ecb1c60190902f3199e71ad4d1dd4578af.jpg", "https://content.pancake.vn/2-2512/2025/12/10/09dd54588db71064be641e645ce120ed3910fe2e.jpg", "https://content.pancake.vn/2-2512/2025/12/8/3ec68f7b6eca6e1e9a01ef2f236130a2ecaf99e5.jpg", "https://content.pancake.vn/2-2511/2025/11/9/de1b1bcc4726f22bf05ebe27bc22b48163557770.jpg", "https://content.pancake.vn/2-2511/2025/11/2/07d79524ee471f954a293b7dbe321d71532e9247.jpg", "https://content.pancake.vn/2-2511/2025/11/2/14bdd6a52665c2344dfe7f9a3c654397623dea57.jpg", "https://content.pancake.vn/2-2511/2025/11/2/763ba8d3cf85f071a39bf10157eecd089ff02bf6.jpg", "https://content.pancake.vn/2-2603/2026/3/2/818230076c5f7ffb7cc924066c18a696479e88e1.jpg", "https://content.pancake.vn/2-2512/2025/12/10/9adf9472f1b9cb0061d1b6f9eb8fb3bc03997e3a.jpg", "https://content.pancake.vn/2-2511/2025/11/9/3aedec9c70c73ad12b3afcb645af51ab52e09607.jpg", "https://content.pancake.vn/2-2605/2026/5/31/fd9f2bd2db573c09d3626d2c821b0b14960101be.png", "https://content.pancake.vn/2-2603/2026/3/2/77ec86a1465ec23eccf462de9fec2c6a1eb56a16.jpg", "https://content.pancake.vn/2-2605/2026/5/31/1da8c36876e08ceaf645c0d6b7c2109dc8ba0404.png"],
    variants: [
      { sku: "TC46NGANGDO", name: "NGANG / ĐỎ", price: 130000, stock: 0, image: "https://content.pancake.vn/2-2512/2025/12/10/09dd54588db71064be641e645ce120ed3910fe2e.jpg" },
      { sku: "TC46NGANGVANG", name: "NGANG / VÀNG", price: 130000, stock: 25, image: "https://content.pancake.vn/2-2512/2025/12/8/3ec68f7b6eca6e1e9a01ef2f236130a2ecaf99e5.jpg" },
      { sku: "TC46SNAPBACK XANH", name: "NGANG / XANH", price: 130000, stock: -16, image: "https://content.pancake.vn/2-2511/2025/11/9/de1b1bcc4726f22bf05ebe27bc22b48163557770.jpg" },
      { sku: "TC46NGANGCAM", name: "NGANG / CAM", price: 130000, stock: -14, image: "https://content.pancake.vn/2-2603/2026/3/2/818230076c5f7ffb7cc924066c18a696479e88e1.jpg" },
      { sku: "TC46CONGDO", name: "CONG / ĐỎ", price: 130000, stock: -2, image: "https://content.pancake.vn/2-2512/2025/12/10/9adf9472f1b9cb0061d1b6f9eb8fb3bc03997e3a.jpg" },
      { sku: "TC46CONGVANG", name: "CONG / VÀNG", price: 130000, stock: 122, image: "https://content.pancake.vn/2-2512/2025/12/8/ec2768ecb1c60190902f3199e71ad4d1dd4578af.jpg" },
      { sku: "TC46CONG XANH", name: "CONG / XANH", price: 130000, stock: 112, image: "https://content.pancake.vn/2-2511/2025/11/9/3aedec9c70c73ad12b3afcb645af51ab52e09607.jpg" },
      { sku: "TC46CONGCAM", name: "CONG / CAM", price: 130000, stock: 67, image: "https://content.pancake.vn/2-2603/2026/3/2/77ec86a1465ec23eccf462de9fec2c6a1eb56a16.jpg" }
    ],
    stock: 294,
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
    imageUrl: "https://content.pancake.vn/2-2603/2026/3/6/3b788039e11b1bcc5e89f3a358171dda1bb40bd8.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-2603/2026/3/6/3b788039e11b1bcc5e89f3a358171dda1bb40bd8.jpg", "https://content.pancake.vn/2-2605/2026/5/31/40f704697610dc7d77eeb625ecea22abba7cc4e6.png", "https://content.pancake.vn/2-25/2025/8/29/dcb3c28425e0cbc0f94e39d99fe54b0e65b76a17.jpg", "https://content.pancake.vn/2-2603/2026/3/6/f6574e606db722c23c04cf1aea35feb6cd50604a.jpg", "https://content.pancake.vn/2-25/2025/8/29/139a6ce1dbb6808511df05538b61f6c7cac214d6.jpg", "https://content.pancake.vn/2-2605/2026/5/31/463f54a4ad3ca5c0536e14d1debc2314e300ead9.png", "https://content.pancake.vn/2-2605/2026/5/31/1ed2817af801351150fec8a6d56b855eb840fab2.png"],
    variants: [
      { sku: "NONTC43SNAPBACKDENVANG", name: "Snapback / ĐEN VÀNG", price: 130000, stock: 43, image: "https://content.pancake.vn/2-2603/2026/3/6/3b788039e11b1bcc5e89f3a358171dda1bb40bd8.jpg" },
      { sku: "NONTC43SNAPBACKDEN", name: "Snapback / ĐEN CAM", price: 130000, stock: -12, image: "https://content.pancake.vn/2-25/2025/8/29/dcb3c28425e0cbc0f94e39d99fe54b0e65b76a17.jpg" },
      { sku: "NONTC43KETDENVANG", name: "Kết / ĐEN VÀNG", price: 130000, stock: 225, image: "https://content.pancake.vn/2-2603/2026/3/6/f6574e606db722c23c04cf1aea35feb6cd50604a.jpg" },
      { sku: "NONTC43KETDEN", name: "Kết / ĐEN CAM", price: 130000, stock: 59, image: "https://content.pancake.vn/2-25/2025/8/29/139a6ce1dbb6808511df05538b61f6c7cac214d6.jpg" }
    ],
    stock: 315,
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
    images: ["https://content.pancake.vn/2-2605/2026/5/31/8e1406cd3ab9e3ca5aa2bc927c7b548b6fe83bf6.png", "https://content.pancake.vn/2-25/2025/8/22/2ea0115ec24cf336fa292a4740ebc773b6dfa8e5.jpg", "https://content.pancake.vn/2-2605/2026/5/31/c8b4bc63ada3391532ade2a7905f2c9d6c6cdabc.png", "https://content.pancake.vn/2-2605/2026/5/31/750c20a062854009245976b938688d780921fe63.png", "https://content.pancake.vn/2-2605/2026/5/31/bbb0c329a5a9ccca1c0974ed8dd7a40eb58dfd10.png", "https://content.pancake.vn/2-2510/2025/10/8/14b3c1b7088d1f7b37d79108ceb59a900742e720.jpg"],
    variants: [
      { sku: "TC42DEN", name: "Đen", price: 130000, stock: -43, image: "https://content.pancake.vn/2-2605/2026/5/31/8e1406cd3ab9e3ca5aa2bc927c7b548b6fe83bf6.png" },
      { sku: "TC42DENCONG", name: "Đen / CONG", price: 130000, stock: -15, image: "https://content.pancake.vn/2-2510/2025/10/8/14b3c1b7088d1f7b37d79108ceb59a900742e720.jpg" }
    ],
    stock: -58,
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
    images: ["https://content.pancake.vn/2-2602/2026/2/22/8ce81b59d7b0457d68daa0190e1d06014bad61a2.jpg", "https://content.pancake.vn/2-2603/2026/3/9/6d61058b7c8187a2050539b18bf4267281b8c965.png", "https://content.pancake.vn/2-2605/2026/5/31/7d99bd50bec7e1e8f9e60793de97ec43c89fae2f.png", "https://content.pancake.vn/2-2603/2026/3/14/2c25d213cef5892d2c90085ef0fb950615b4a0a1.png", "https://content.pancake.vn/2-2605/2026/5/31/0e14fda54e8a58d33a2a202f936115c59d68a794.png"],
    variants: [
      { sku: "TC41DENNGANG", name: "Đen / NGANG", price: 130000, stock: 117, image: "https://content.pancake.vn/2-2602/2026/2/22/8ce81b59d7b0457d68daa0190e1d06014bad61a2.jpg" },
      { sku: "TC41DENCONG", name: "Đen / CONG", price: 130000, stock: -3, image: "https://content.pancake.vn/2-2603/2026/3/14/2c25d213cef5892d2c90085ef0fb950615b4a0a1.png" }
    ],
    stock: 114,
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
    imageUrl: "https://content.pancake.vn/2-25/2025/6/12/3d8a953e41340d2bd370ace666172dd15ac5de21.jpg", overlayUrl: "",
    tags: [],
    images: ["https://content.pancake.vn/2-25/2025/6/12/3d8a953e41340d2bd370ace666172dd15ac5de21.jpg", "https://content.pancake.vn/2-25/2025/8/14/8223c1da5c7ace01c9b283cf12df077ada8b02a9.jpg", "https://content.pancake.vn/2-2603/2026/3/27/9126633fc9417e4c52c09283f149748b9cbbf697.jpg", "https://content.pancake.vn/2-25/2025/6/12/2ccae2b367dd56df1c94b0fccf0814a700aa26a0.jpg", "https://content.pancake.vn/2-25/2025/8/29/95b90b134c83d16f1ee90f748a52d8eaad2c44a6.jpg", "https://content.pancake.vn/2-25/2025/9/22/88eb3f73a0f83892763b4e92335073b46001f2f2.jpg"],
    variants: [
      { sku: "TC39DENSNAPBACK", name: "Đen / Snapback", price: 130000, stock: 45, image: "https://content.pancake.vn/2-25/2025/6/12/3d8a953e41340d2bd370ace666172dd15ac5de21.jpg" },
      { sku: "TC39DENKET", name: "Đen / Kết", price: 130000, stock: 94, image: "https://content.pancake.vn/2-25/2025/6/12/2ccae2b367dd56df1c94b0fccf0814a700aa26a0.jpg" },
      { sku: "TC39MAUSNAPBACK", name: "MÀU XANH / Snapback", price: 130000, stock: -38, image: "https://content.pancake.vn/2-25/2025/8/29/95b90b134c83d16f1ee90f748a52d8eaad2c44a6.jpg" },
      { sku: "Tc39 Trắng snapback", name: "TRẮNG / Snapback", price: 130000, stock: -17, image: "https://content.pancake.vn/2-25/2025/9/22/88eb3f73a0f83892763b4e92335073b46001f2f2.jpg" }
    ],
    stock: 84,
    pancakeId: "dc44d50e-e888-45df-a15f-0100ffeba950",
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
      { sku: "COMBOCT1COMBO2NON", name: "Đen / COMBO 2 NÓN", price: 130000, stock: 20 },
      { sku: "COMBOCT1DENKET", name: "Đen / Kết", price: 130000, stock: 30, image: "https://content.pancake.vn/2-25/2025/5/2/763ce78c5ef83e14850d111dcf69ebdf3d551d6e.jpg" },
      { sku: "COMBOCT1DENBO", name: "Đen / Bo", price: 130000, stock: 17, image: "https://content.pancake.vn/2-25/2025/5/2/aba5121211c8f2ae050fc26b732a4643dc4d4ebf.jpg" },
      { sku: "CBCT1 BE", name: "BE / COMBO 2 NÓN", price: 130000, stock: 8, image: "https://content.pancake.vn/2-2512/2025/12/18/aade64e7c68d68a130a7a7c54716f42bd9679b1c.jpg" },
      { sku: "KẾTCT1 BE", name: "BE / Kết", price: 130000, stock: -30, image: "https://content.pancake.vn/2-2512/2025/12/18/093e80c345406d0d9cb3d2cace07b5c0fa3b8a96.jpg" },
      { sku: "Bo CT1 BE", name: "BE / Bo", price: 130000, stock: 209, image: "https://content.pancake.vn/2-2512/2025/12/18/8696d5a09e93772da6e324bec09fad638839011d.jpg" }
    ],
    stock: 254,
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
