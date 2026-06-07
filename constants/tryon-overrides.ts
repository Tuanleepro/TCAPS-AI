// Per-SKU overrides for the try-on pipeline.
//
// Why this file exists:
//   The default behaviour sends up to MAX_CAP_IMAGES (currently 6) cap angles
//   to Gemini per try-on. For MOST products this is fine — more angles → cap
//   reproduces more faithfully, and the head-lock + colour/brim locks in the
//   prompt prevent identity drift.
//
//   For a handful of products the Pancake gallery is dominated by close-up
//   shots of a single model's face wearing the cap. When 4–6 of those photos
//   reach Gemini together, the model's face identity bleeds through and
//   overwrites the customer's selfie — even with the head-lock prompt.
//
//   This override lets us dial DOWN the number of references on a per-SKU
//   basis: a value of 1 sends ONLY the pinned variant image (no parent
//   gallery angles), which empirically kills the face-leak.
//
// How to apply:
//   `maxRefImages: 1` — minimal, use when the gallery is full-face-only.
//   `maxRefImages: 2` — keep variant + 1 angle when one extra angle helps.
//   omit / undefined  — use the global MAX_CAP_IMAGES.
//
// This file is NOT touched by scripts/pancake-scrape.mjs — it's the
// owner-curated companion to products.ts.

/** Colour tokens the COLOUR LOCK sentence understands. Must match the `en`
 * values in lib/products/color.ts so the prompt reads naturally. */
export type ColorOverride =
  | 'BLACK' | 'WHITE' | 'SILVER' | 'GOLD'
  | 'RED'   | 'BLUE'  | 'PINK'   | 'BROWN' | 'GRAY' | 'CREAM' | 'BEIGE'

export interface TryOnOverride {
  /** Number of reference cap photos to send to Gemini (default = global
   * MAX_CAP_IMAGES). Lower for face-leak SKUs. */
  maxRefImages?: number
  /** Force the COLOUR LOCK sent to Gemini. Use when the product name
   * contains a colour token that's actually a proper noun (e.g.
   * "LẠC HỒNG" matches HỒNG → PINK, but the cap is black). Set `null`
   * to SKIP the colour lock entirely when even a fixed value would
   * mislead Gemini. Leave `undefined` to use auto-detect from the name. */
  colorOverride?: ColorOverride | null
  /** Default variant SKU to pre-select when the customer enters the
   * try-on flow from a "deep" link (catalog "THỬ NÓN" button, search
   * dropdown). The product detail page IGNORES this — it always uses
   * the variant the customer manually picked there. */
  defaultTryOnVariant?: string
  /** Force the catalog / product-detail "representative" image to this
   * URL, regardless of what Pancake's API returns as images[0]. Used
   * when the POS UI shows one photo as primary but the API keeps
   * returning a different one. The scraper checks this override and
   * skips overwriting imageUrl during SYNC_ONLY when set. */
  pinnedImageUrl?: string
  /** Per-SKU text guidance appended to the Gemini prompt. Use when a cap
   * has details that Gemini consistently misreads from photos alone
   * (complex patches, intricate embroidery, ambiguous shapes). The hint
   * is owner-curated prose — describe the design in concrete terms so
   * Gemini can verify its output against the description rather than
   * inventing details. Leave undefined for SKUs where photos suffice. */
  promptHint?: string
}

export const TRYON_OVERRIDES: Record<string, TryOnOverride> = {
  // ── No per-SKU maxRefImages overrides ──────────────────────────────────
  //
  // 2026-06-07 owner: all SKUs use the global cap from hooks/useTryOn.ts
  // (20 images max). Pancake's `images[]` for each product is curated
  // owner-side, so trusting the whole gallery gives Gemini the richest
  // reference set without per-SKU hard-coding.
  //
  // History: a face-leak cohort (TC39/42/43/49/56/59/61/63/67/68) was
  // previously capped at 2 to suppress model-face leak. The overrides were
  // removed when owner cleaned the Pancake galleries to product-only shots
  // — if face-leak returns on a specific SKU, the right fix is to clean
  // that SKU's Pancake gallery, not re-add an SKU override here.

  // TC46 NÓN DARK STALLION — pinnedImageUrl kept (Pancake's API returns
  // the wrong primary). maxRefImages override removed: global cap is now
  // 20, which covers TC46's 13-photo gallery in full.
  TC46: {
    pinnedImageUrl: 'https://content.pancake.vn/2-2512/2025/12/8/ec2768ecb1c60190902f3199e71ad4d1dd4578af.jpg',
    promptHint:
      'TC46 DARK STALLION — design verification: ' +
      'BASE: black snapback. ' +
      'FRONT-LEFT PATCH: ARCHED / tombstone-shaped patch with RED background ' +
      'and a black HORSE silhouette (rearing/galloping wild horse with mane). ' +
      'Patch has black border. Not a square or rectangle. ' +
      'SIDE CORD: a RED THIN CORD / PIPING runs along the side panel seam ' +
      'from the front patch curving around the side. ' +
      'RIGHT SIDE TEXT: "Dark Stallion" in RED Gothic / blackletter font, ' +
      'oriented vertically along the side panel. ' +
      'RIGHT SIDE EYELET: a red rectangular metal eyelet/grommet near the ' +
      'bottom of the side panel. ' +
      'BRIM: black leather edge trim. ' +
      'COLOUR PALETTE: black + red accents.',
  },

  // TC30 NÓN SÓI ĐÊM TCAPS — owner picked CONG/ĐEN VÀNG (gold-badge black)
  // as the canonical hero. Pancake's variant API doesn't tell us which
  // variant photo is "primary", so we pin the URL here to keep the hero
  // stable across syncs. defaultTryOnVariant makes the catalog "THỬ NÓN"
  // button deep-link straight to that variant so the AI matches the hero.
  TC30: {
    pinnedImageUrl:      'https://content.pancake.vn/2-2512/2025/12/11/181ac89e7432747255b8c29bc1491f86f22ce285.jpg',
    defaultTryOnVariant: 'TC30CONGDENVANG',
    promptHint:
      'TC30 NÓN SÓI ĐÊM (Night Wolf) — design verification: ' +
      'BASE: black baseball cap, curved brim. ' +
      'FRONT-CENTRE PATCH: vertical rectangular black patch with: 3 small ' +
      'GOLD STARS in a row at the top, a GOLD CRESCENT MOON with a stylised ' +
      'WOLF HEAD silhouette inside the crescent (gold on black), and "TCAPS ' +
      'WOLF" text in GOLD at the bottom. Patch has black border. ' +
      'RIGHT SIDE TAG: small rectangular BROWN/TAN LEATHER tag with "TCAPS ' +
      'NIGHT WOLF" text printed on it, sewn onto the side panel. ' +
      'BRIM: decorative parallel rows of stitching on the brim top. ' +
      'COLOUR PALETTE: black + gold accents + brown leather tag.',
  },

  // CT1 NÓN TCAPS — catalog thumbnail features the "Đen / Kết" variant.
  // When the customer taps "THỬ NÓN" from the catalog the try-on should
  // open on that variant by default (instead of the first variant in
  // the array, which is "Đen / COMBO 2 NÓN" — that combo doesn't make
  // sense as a single try-on subject).
  'Combo CT1': {
    defaultTryOnVariant: 'COMBOCT1DENKET',
    promptHint:
      'CT1 NÓN TCAPS — design verification: ' +
      'BASE: black baseball cap, curved brim. ' +
      'FRONT-CENTRE PATCH: CIRCULAR / ROUND black patch (not rectangular) ' +
      'with: 3 small GOLD STARS in a row at the top, a stylised GOLD "t" ' +
      'logo (lowercase "t" inside a crescent shape — the TCAPS signature ' +
      'logo) in the centre, and "TCAPS" text in gold at the bottom. ' +
      'BRIM UNDERSIDE: BLACK with REPEATING GOLD "TCAPS" text + small ' +
      'TCAPS logo motifs printed across the entire underside (looks like a ' +
      'leather pattern with gold print). This is a signature detail — do ' +
      'NOT leave the brim underside plain. ' +
      'BRIM EDGES: black leather trim. ' +
      'COLOUR PALETTE: black + gold accents. Minimalist premium look.',
  },

  // ── Batch-added 2026-06-07 promptHints for owner-reported quality issues ──
  // 13 SKUs: TC68, TC67, TC52, TC51, TC49, TC45, TC43, TC42, TC41, TC39.
  // (TC46, TC30, Combo CT1 hints are folded into the entries above.)
  // Each hint locks the distinctive design elements Gemini was dropping
  // (patch shapes, signature graphics, materials, accent colours).

  TC68: {
    promptHint:
      'TC68 NÓN SPARTAN — design verification: ' +
      'BASE: black baseball cap, curved brim. ' +
      'LEFT BRIM TOP: vertical ORANGE text "SPARTAN" in stylised rune/Greek ' +
      'lettering, flanked by orange ornamental swirl flourishes. ' +
      'SIDE PANEL MEDALLION: large CIRCULAR orange decorative motif with a ' +
      'detailed TIGER HEAD facing forward and a SPEAR / WEAPON crossing ' +
      'behind it, surrounded by a Greek-key (meander) border pattern. The ' +
      'medallion is on the side panel near the front. ' +
      'SECONDARY ORANGE SILHOUETTE: small orange bull/ram head icon near ' +
      'the top of the side panel. ' +
      'COLOUR PALETTE: black + ORANGE accents — bold Spartan / warrior ' +
      'aesthetic.',
  },

  TC67: {
    promptHint:
      'TC67 NÓN SKELETON — design verification: ' +
      'BASE: WHITE trucker cap (NOT black) with WHITE mesh back panels. ' +
      'Front panel is solid white, brim is white. ' +
      'FRONT GRAPHIC — LARGE COLOURFUL (size + vibrancy critical): a stylised ' +
      'SKULL with a GOLD CROWN on top, with a vibrant PAINT-SPLATTER / ' +
      'SPLASH effect bursting out around the skull in ORANGE, BLUE, RED, ' +
      'and YELLOW colours. ' +
      'GRAPHIC SIZE: the skull + crown + paint splash MUST be LARGE and ' +
      'PROMINENT — it covers most of the front panel from near the top down ' +
      'to near the brim. Do NOT render as a small accent or minor decal. ' +
      'GRAPHIC COLOURS: the splash colours must be VIBRANT, SATURATED, and ' +
      'POP brightly against the white base. The orange / red / blue / yellow ' +
      'must look bold and lively — NOT muted, NOT pastel, NOT washed out. ' +
      'SIDE PATCH: small rectangular "TOYS" patch in yellow/red colours on ' +
      'the side panel. ' +
      'CAP FIT: the cap must sit SNUG on the head — brim rests just above ' +
      'the eyebrows, NOT floating high above the hair, NOT tilted backwards. ' +
      'COLOUR PALETTE: white base + multi-colour skull graphic. NOT a ' +
      'monochrome cap — the splash colours are signature.',
  },

  'NÓN TC52': {
    promptHint:
      'TC52 NÓN KỴ SĨ (Knight) — design verification: ' +
      'BASE: black baseball cap, curved brim. ' +
      'FRONT-CENTRE PATCH: large HERALDIC SHIELD-SHAPED patch (heraldic ' +
      'shield with pointed/rounded bottom — NOT a rectangle, NOT a square). ' +
      'The patch is made of METALLIC LEATHER material. ' +
      'PATCH COLOUR: TC52 ships in 7 colourways — Vàng (gold), Xanh Lá ' +
      '(green), Xanh Dương (blue), Bạc (silver), Đỏ (red), Cam (orange), ' +
      'Tím (purple). The patch colour MUST match image 2 (the LEAD ref) ' +
      'EXACTLY — if image 2 shows a RED patch, the output patch must be ' +
      'RED. NEVER default to gold/yellow. NEVER swap colours between ' +
      'colourways. Image 2 is the absolute colour authority for the patch. ' +
      'PATCH CONTENT: a KNIGHT on HORSEBACK charging right, with SWORD ' +
      'raised high and the horse REARING — rendered as a BLACK silhouette ' +
      'inside the coloured shield. "Tcaps" text in gothic / medieval font ' +
      'at the bottom of the shield. ' +
      'RIGHT SIDE TAG: small rectangular leather tag on the side panel. ' +
      'The tag colour also matches the patch colourway (red for ĐEN ĐỎ, ' +
      'gold for ĐEN VÀNG, etc — match image 2). ' +
      'COLOUR PALETTE: black cap + accent colour from image 2 (varies per ' +
      'variant). Premium leather look.',
  },

  TC51: {
    promptHint:
      'TC51 NÓN MOTORCYCLE — design verification: ' +
      'BASE: black baseball cap. 6 variants — NGANG/CONG (flat vs curved ' +
      'brim) × Đen/VÀNG/BẠC (accent colour: red / gold / silver-white). ' +
      'Brim shape locked via brimLock; accent colour from image 2. ' +
      'FRONT-LEFT PATCH (signature shape): HEXAGONAL patch (6-sided, NOT ' +
      'rectangular, NOT shield) with a BIKER RIDER figure (rider wearing ' +
      'a full-face helmet with raised fist) + 5 SMALL STARS arched along ' +
      'the top inside the patch. ' +
      'FRONT-RIGHT GRAPHIC (signature feature): large SPORT MOTORCYCLE ' +
      'silhouette prominently printed on the right front panel. This ' +
      'motorcycle is a defining design element — do NOT drop or shrink it. ' +
      'RIGHT SIDE BUTTON: small X button / accent near the top of the side ' +
      'panel. ' +
      'BRIM EDGE PIPING: thin coloured cord runs along the brim edge. ' +
      'BRIM TOP: small rectangle markers on the front of the brim top. ' +
      'ACCENT COLOUR (varies per variant — MUST match image 2): ' +
      '  - ĐEN variant → RED accents (red biker rider, red stars, red bike ' +
      '    details, red brim piping, red X button) ' +
      '  - VÀNG variant → GOLD / YELLOW accents on every accent element ' +
      '  - BẠC variant → WHITE / SILVER accents (silver biker rider, ' +
      '    silver stars, silver motorcycle, silver brim piping, silver X) ' +
      'Image 2 is the absolute colour authority — match its accent colour ' +
      'EXACTLY. NEVER default to red. NEVER swap colours between variants. ' +
      'CAP FIT: snug on the head, brim just above the eyebrows — NOT ' +
      'floating high, NOT tilted backwards.',
  },

  'CB TC49': {
    promptHint:
      'TC49 NÓN MONOGRAM HỌA TIẾT — design verification: ' +
      'CONSTRUCTION: TAPESTRY / JACQUARD WOVEN FABRIC base (NOT solid ' +
      'fabric, NOT smooth twill). The fabric has a visible PICTOGRAPHIC ' +
      'PATTERN with stylised CARTOON CHARACTER FACES / HEADS woven into ' +
      'the fabric. The woven jacquard texture is a defining feature — the ' +
      'individual woven threads + character motifs must be clearly visible. ' +
      'PATTERN COLOURS: TC49 ships in multiple colourways (Đen, CAM, VÀNG, ' +
      'ĐỎ) — each with a different palette. Đen = muted earth tones (pink, ' +
      'beige, blue, grey, brown); CAM = vibrant orange + teal + red + ' +
      'burgundy; VÀNG = yellow-dominant; ĐỎ = red-dominant. The pattern ' +
      'colours MUST match image 2 (the LEAD ref) EXACTLY. NEVER default to ' +
      'a fixed palette. Image 2 is the colour authority. ' +
      'BRIM: same tapestry fabric as the crown, with WHITE PIPING / TRIM ' +
      'along the brim edges (the white trim is consistent across all ' +
      'colourways). ' +
      'FRONT-CENTRE PATCH: WHITE CIRCULAR / ROUND patch with a metallic ' +
      '"TC" / "t" TCAPS logo (gold or silver). The white circular patch + ' +
      'metallic logo are consistent across all colourways. ' +
      'CAP FIT: the cap must sit SNUG on the head — brim rests just above ' +
      'the eyebrows, NOT floating high above the hair.',
  },

  TC45: {
    promptHint:
      'TC45 NÓN GÀ (Rooster) — design verification: ' +
      'BASE: black baseball cap. ' +
      'BRIM SHAPE: TC45 ships in 3 variants — NGANG/Đen (FLAT brim, ' +
      'snapback), CONG/Đen (CURVED brim), CONG LƯỚI/Đen (curved brim + ' +
      'mesh trucker). Match the brim shape to the customer pick via the ' +
      'brim lock. ' +
      'FRONT-CENTRE PATCH (signature design): SHIELD-SHAPED patch (heraldic ' +
      'shield with rounded/pointed bottom, NOT rectangular, NOT square). ' +
      'The patch is centred on the FRONT panel. ' +
      'PATCH CONTENT — ROOSTER (must be detailed, signature element): a ' +
      'detailed Vietnamese folk-art / tranh dân gian ROOSTER illustration. ' +
      '  • Pose: standing tall in profile facing LEFT, both legs visible, ' +
      '    chest puffed forward, head raised proudly with beak slightly ' +
      '    upward (crowing / proud rooster pose). ' +
      '  • Tail: prominent CURVING TAIL with MULTIPLE LONG ARCHING PLUME ' +
      '    FEATHERS sweeping up and back — this tail is iconic and must be ' +
      '    drawn fully (NOT a stub tail, NOT simplified). ' +
      '  • Comb: visible serrated COMB on top of the head + WATTLE under ' +
      '    the beak. ' +
      '  • Feathers: DETAILED feather patterns on body, wing, and tail — ' +
      '    fine line work, NOT a flat silhouette. ' +
      '  • Style: traditional Vietnamese folk-art (Đông Hồ / tranh dân ' +
      '    gian aesthetic) — NOT a generic cartoon chicken, NOT a logo ' +
      '    abstract icon. ' +
      'BELOW THE ROOSTER inside the shield: "Tcaps" text in gothic / ' +
      'medieval / blackletter script. ' +
      'PATCH COLOUR: rooster + "Tcaps" text are in ROSE-GOLD / COPPER ' +
      'metallic tones on a black patch background. Subtle metallic ' +
      'finish — NOT bright orange, NOT bright red, NOT pure gold. ' +
      'RIGHT SIDE TAG: small RECTANGULAR tag with 2 mini rose-gold rooster ' +
      'icons + a small black eyelet next to it. ' +
      'CAP FIT: snug on the head, brim rests just above the eyebrows — NOT ' +
      'floating high. ' +
      'OVERALL: minimalist premium look — black cap + rose-gold rooster ' +
      'shield patch as the focal point. The rooster detail is what makes ' +
      'this cap recognisable — render it faithfully, not simplified.',
  },

  'NÓN TC43': {
    promptHint:
      'TC43 NÓN WOLF — design verification: ' +
      'BASE: black snapback, FLAT brim. ' +
      'FRONT-LEFT PATCH: SHIELD-SHAPED patch with YELLOW background and a ' +
      'stylised BLACK WOLF HEAD inside (geometric / angular wolf face ' +
      'design). ' +
      'SIDE CORD: a YELLOW THIN CORD / PIPING runs along the side panel ' +
      'seam from the front patch curving around the side. ' +
      'RIGHT SIDE TAG: small black tag with vertical YELLOW "TCAPS" text + ' +
      'small yellow rectangular metal eyelet near the tag. ' +
      'BRIM TOP — SIGNATURE: THREE YELLOW DIAGONAL CLAW-MARK SCRATCHES ' +
      '(parallel scratch lines) printed on the brim top, like a wolf claw ' +
      'scratching across the brim. ' +
      'COLOUR PALETTE: black + YELLOW accents.',
  },

  TC42: {
    promptHint:
      'TC42 NÓN LOGO SÓI (Wolf Logo) — design verification: ' +
      'BASE: black snapback, FLAT brim. ' +
      'FRONT-LEFT PATCH: VERTICAL RECTANGULAR patch with: detailed ' +
      'REALISTIC WOLF HEAD (grey/white, looking forward) at the top, RED ' +
      'BLOOD DRIPS dripping from the top of the patch, and "TCAPS" text in ' +
      'red on a RED rectangular section at the bottom of the patch. ' +
      'RIGHT SIDE — SIGNATURE: TWO RED METAL EYELETS / GROMMETS (with red ' +
      'rings) stacked VERTICALLY on the right side panel. The eyelets are ' +
      'prominent and must appear. ' +
      'BRIM: dark / black leather edge trim. ' +
      'COLOUR PALETTE: black + RED accents + grey wolf head.',
  },

  TC41: {
    promptHint:
      'TC41 NÓN TCAPSPL — design verification: ' +
      'BASE: black snapback, FLAT brim. ' +
      'SIGNATURE DETAIL: a HORIZONTAL BLACK LEATHER STRIP / BAND wraps ' +
      'around the front of the cap, running along the BASE of the crown ' +
      'just above the brim seam (like a hatband). ' +
      'CENTRE PATCH ON THE LEATHER STRAP: large RECTANGULAR YELLOW / GOLD ' +
      'LEATHER PATCH centred on the leather strap, with "TCAPSPL" in bold ' +
      'BLACK text printed on it. ' +
      'BRIM UNDERSIDE: BROWN / TAN LEATHER UNDERSIDE trim (NOT black). ' +
      'The brim has a two-tone look — black top with brown leather under. ' +
      'RIGHT SIDE: small dark tag with small yellow text. ' +
      'COLOUR PALETTE: black + gold/yellow leather patch + brown leather ' +
      'brim. Luxury minimalist look.',
  },

  TC39: {
    promptHint:
      'TC39 NÓN THE WARRIORS — design verification: ' +
      'BASE: black snapback with BLACK MESH side and back panels (trucker ' +
      'construction). Front panel is solid black, sides and back are mesh. ' +
      'FRONT-LEFT PATCH: SHIELD-SHAPED patch with detailed GOLD design on ' +
      'BLACK background: "The Warriors" in gothic blackletter text at the ' +
      'top, a stylised SKULL HEAD with CROSSED SWORDS / SPEARS behind it ' +
      'in the centre, smaller text below ("Stay For Life" or similar), and ' +
      '"TCPS" tiny text at the very bottom of the shield. ' +
      'RIGHT SIDE EMBROIDERY: GOLD CROSSED-SWORDS (X-shape) + "TCPS" ' +
      'gothic text embroidered directly onto the BLACK MESH side panel. ' +
      'BRIM: black leather edge trim. ' +
      'COLOUR PALETTE: black + GOLD accents. Premium gothic / warrior look.',
  },

  // Combo CT3 — TCAPS SPARTAN luxury cap. Owner observed Gemini rendering
  // this as a BUCKET HAT instead of a baseball cap — likely misreading
  // the decorative "BUILT IN SILENCE" leather strap as a bucket-hat band.
  // The hint locks the silhouette (baseball cap with curved brim) and
  // describes each design element so Gemini can verify its output.
  'Combo CT3': {
    promptHint:
      'COMBO CT3 SPARTAN CAP — silhouette + design verification: ' +
      'SHAPE: this is a STRUCTURED BASEBALL CAP / SNAPBACK with a CURVED BRIM ' +
      '(lưỡi cong). It is NOT a bucket hat. NOT a fisherman hat. NOT a beanie. ' +
      'NOT a flat-brim cap. The crown is rounded and structured, the brim ' +
      'extends forward like a typical baseball cap. The output MUST be a ' +
      'baseball cap silhouette. ' +
      'DECORATIVE LEATHER STRAP: a thin BLACK LEATHER STRAP wraps around the ' +
      'BASE of the crown (at the seam where crown meets brim). The strap has ' +
      'GOLD text "BUILT IN SILENCE" on the front section near the brim and ' +
      'small gold quatrefoil / cross motifs spaced along its length. This ' +
      'strap is a decorative band on the cap surface — it is NOT a bucket-hat ' +
      'band, NOT a brim, NOT a separate item. ' +
      'FRONT-RIGHT PATCH: vertical rectangular patch (taller than wide), ' +
      'black background, gold elements: "TCPS" text on top with a small ' +
      'Spartan helmet icon, surrounded by small gold quatrefoil motifs. ' +
      'SIDE PANELS: gold PYRAMIDAL STUDS (4-sided pyramid / cone studs) ' +
      'placed at intervals on the side panels. ' +
      'BRIM: BLACK LEATHER TRIM along the brim edge with small gold ' +
      'quatrefoil motifs. Brim shape is CURVED. ' +
      'BACK: "FORGED BY PRESSURE" text in gold across the back panels + ' +
      '"Gentle" text on the back closure strap. ' +
      'OVERALL AESTHETIC: luxury streetwear — gold studs + leather trim + ' +
      'gold text + Spartan branding on a black baseball cap base.',
  },

  // TC55 NÓN WUKONG — owner observed Gemini simplifying the Wukong
  // design (arched patch rendered as generic rectangle, crossed-staffs
  // brim graphic dropped, orange underside lost). The hint locks each
  // signature element.
  'NÓN TC55': {
    promptHint:
      'TC55 NÓN WUKONG — design verification: ' +
      'BASE: black baseball cap, structured crown. ' +
      'FRONT PATCH SHAPE: ARCHED / TOMBSTONE-SHAPED patch — rounded curved ' +
      'top + straight horizontal bottom (NOT a rectangle, NOT a square, ' +
      'NOT a shield). Orange border outlining the arch shape. ' +
      'FRONT PATCH CONTENT: black background, all design elements in ORANGE. ' +
      'Around the arch border: text "WUKONG DESIGN TCAPS" following the curve. ' +
      'Centre of the patch: a stylised WUKONG (Sun Wukong / Monkey King) ' +
      'figure standing, holding a long STAFF / spear vertically, with armour ' +
      'and a cape — orange line-art on black. Cloud motifs along the bottom ' +
      'of the patch. ' +
      'BRIM TOP — SIGNATURE GRAPHIC: TWO CROSSED ORANGE STAFFS (Wukong\'s ' +
      'Ru Yi Bang / golden staffs) forming an X-shape across the brim top, ' +
      'with decorative ornate pattern detail along each staff. Text "TCAPS" ' +
      'printed in orange at the bottom-left of the brim top. This brim ' +
      'graphic is a SIGNATURE feature — do NOT leave the brim plain. ' +
      'BRIM UNDERSIDE: BRIGHT ORANGE colour with a LARGE BLACK WUKONG ' +
      'SILHOUETTE (same Monkey King figure with staff). This is another ' +
      'signature detail — the brim underside is ORANGE, not black. ' +
      'SIDE PANELS: multiple ORANGE-RINGED METAL EYELETS / GROMMETS (small ' +
      'rectangular vents with orange borders), 2 visible per side. ' +
      'BACK: small TCAPS branding patch on the back closure. ' +
      'COLOUR PALETTE: black cap + orange accents EVERYWHERE (patch border, ' +
      'patch design, brim graphic, brim underside, eyelet rings) — orange ' +
      'is the defining accent colour.',
  },

  // TC56 NÓN TCAPS FOR LIFE — owner observed Gemini rendering a generic
  // smooth-front-panel cap, missing the cap's defining feature: the
  // ENTIRE front panel is BLACK MESH with a visible honeycomb pattern,
  // and the white text is printed OVER the mesh. The brim underside
  // also has a large white cursive "Tcaps" signature script.
  TC56: {
    promptHint:
      'TC56 NÓN TCAPS FOR LIFE — design verification: ' +
      'CONSTRUCTION: this is an ALL-MESH TRUCKER CAP. The ENTIRE FRONT ' +
      'PANEL is BLACK MESH with a visible HONEYCOMB / HEXAGONAL pattern ' +
      'texture (not solid fabric). The back is also mesh. The mesh texture ' +
      'MUST be visible on the front panel — do NOT render the front as a ' +
      'smooth solid panel. This is the defining feature of TC56. ' +
      'FRONT TEXT: white CURSIVE script "Tcaps" (stylised handwriting font) ' +
      'large across the upper front, with block-letter "FOR LIFE" below it ' +
      'in white. The text is printed OVER the mesh, so the mesh pattern ' +
      'shows through and around the letters. ' +
      'BRIM UNDERSIDE: a LARGE WHITE CURSIVE "Tcaps" signature script is ' +
      'printed on the UNDERSIDE of the brim (visible when the brim is ' +
      'tilted up or viewed from below). This is a signature detail — do ' +
      'NOT leave the brim underside blank. ' +
      'SIDE PANEL: small black rectangular label on the right side panel ' +
      'near the brim, with small white icons (star + Tcaps logo elements). ' +
      'BRIM TOP: solid black, plain. ' +
      'OVERALL: this is a streetwear MESH trucker cap — the honeycomb mesh ' +
      'texture is what makes it look "real". A smooth-fronted black cap ' +
      'with just text is the WRONG output.',
  },

  // TC57 NÓN TCAPS — owner observed Gemini rendering an over-simplified
  // cap with most luxury details missing (no gold border on TCAPS patch,
  // no gold eyelets, faint side stripes). The hint locks the metallic
  // detail elements so the output looks "real" and not plain.
  'NÓN TC57': {
    promptHint:
      'TC57 NÓN TCAPS — design verification: ' +
      'BASE: black baseball cap, structured crown. ' +
      'FRONT-RIGHT PATCH: vertical rectangular black patch with "TCAPS" text ' +
      'in WHITE running vertically. The patch is FLANKED by TWO vertical GOLD ' +
      'STRIPES — one gold stripe on the LEFT edge of the patch and one on the ' +
      'RIGHT edge. These gold border stripes are a SIGNATURE detail and MUST ' +
      'appear. The patch is NOT a plain rectangle. ' +
      'SIDE PANELS: each side panel has 3 HORIZONTAL gold/yellow stripes ' +
      '(military epaulette style — three thin gold horizontal lines stacked). ' +
      'These stripes are clearly visible from the front-right and back-right ' +
      'angles. ' +
      'GOLD METAL EYELETS: the crown panels are decorated with MULTIPLE small ' +
      'gold/orange RECTANGULAR METAL EYELETS / GROMMETS (decorative metal ' +
      'pieces). At least 4–6 visible from front and side angles. These give ' +
      'the cap its premium / luxury look. ' +
      'BRIM: dark glossy / leather underside trim along the brim — the brim ' +
      'has a two-tone look with a darker leather-like inner section. ' +
      'BACK CLOSURE: gold "TCAPS" text on the back closure strap. ' +
      'OVERALL: this is a LUXURY cap — gold border stripes + gold side ' +
      'stripes + gold eyelets + leather brim trim must all be visible. Do ' +
      'NOT render as a plain black cap with just a small patch.',
  },

  // TC63 NÓN SAMURAI — owner observed Gemini misreading the complex
  // Japanese-themed front patch (rendered as a generic square cherry-
  // blossom design instead of the actual vertical kanji+wave layout).
  // The hint describes the patch in concrete terms so Gemini has a
  // text-based reference to cross-check its output.
  TC63: {
    promptHint:
      'TC63 SAMURAI CAP — design verification: ' +
      'FRONT PATCH is a VERTICAL RECTANGULAR patch (taller than wide, NOT square), gold-bordered. ' +
      'Inside the rectangle, top to bottom: (1) a small red sun-disc / red circle near the top, ' +
      '(2) two vertical Japanese kanji characters in the middle, ' +
      '(3) a blue traditional wave pattern (seigaiha style) as the background fill, ' +
      '(4) a small red square stamp near the bottom. ' +
      'The patch is NOT a flower. NOT a cherry blossom. NOT a square. NOT abstract. ' +
      'It is a tall vertical rectangle with kanji characters and Japanese wave patterns. ' +
      'SIDE PANEL has a small gold dragon/serpent embroidery. ' +
      'BRIM TOP has gold oriental decorative patterns. ' +
      'BACK has a small gold patch with red sun + mountain silhouette, and a small gold samurai helmet embroidery on the side. ' +
      'CAP base is BLACK with corduroy front + mesh back trucker style + curved brim.',
  },
}

export function getTryOnMaxRefs(sku: string | undefined, fallback: number): number {
  if (!sku) return fallback
  const ov = TRYON_OVERRIDES[sku]?.maxRefImages
  return typeof ov === 'number' && ov > 0 ? ov : fallback
}

/** Resolve the default try-on variant SKU for a deep-link entry point
 *  (catalog "THỬ NÓN" button, navbar search). Returns the variant SKU
 *  to pre-select, or `undefined` to fall back to the first variant. */
export function getDefaultTryOnVariant(sku: string | undefined): string | undefined {
  if (!sku) return undefined
  return TRYON_OVERRIDES[sku]?.defaultTryOnVariant
}

/** Resolve the colour-lock value for a given SKU. Tri-state result:
 *  - `string` — owner-forced colour, override the auto-detected value
 *  - `null`   — owner explicitly said "no colour lock"
 *  - `undefined` — no override, fall back to auto-detect
 */
export function getTryOnColorOverride(
  sku: string | undefined,
): ColorOverride | null | undefined {
  if (!sku) return undefined
  const ov = TRYON_OVERRIDES[sku]
  if (!ov) return undefined
  // 'colorOverride' present but `null` → explicit skip.
  // 'colorOverride' present and a string → explicit force.
  // 'colorOverride' absent → no opinion.
  return 'colorOverride' in ov ? ov.colorOverride : undefined
}

/** Resolve the per-SKU prompt hint, if any. Owner-curated text describing
 *  details Gemini misreads from photos alone. */
export function getTryOnPromptHint(sku: string | undefined): string | undefined {
  if (!sku) return undefined
  return TRYON_OVERRIDES[sku]?.promptHint
}
