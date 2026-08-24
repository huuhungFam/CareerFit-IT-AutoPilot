/**
 * company-alias-map.mjs
 *
 * Source of truth cho alias chuẩn hóa tên công ty từ dữ liệu import.
 *
 * Cấu trúc: mỗi entry là [canonicalName, [...aliases]]
 * - canonicalName: tên chính thức, ngắn gọn, được dùng trong job.company và employer_profile.company_name
 * - aliases: tất cả dạng alias đã được xác minh trong dataset (không dùng fuzzy matching)
 *
 * Nguyên tắc gộp:
 * 1. Bằng chứng rõ ràng: cùng thương hiệu, chỉ khác định dạng legal / hoa thường / dấu câu / ngôn ngữ Việt-Anh
 * 2. Không gộp nếu chỉ gần giống hoặc cùng parent company khác pháp nhân
 * 3. "Công ty con" rõ ràng (ví dụ công ty chứng khoán, tài chính, bảo hiểm) được gộp khi tên thương hiệu = parent
 * 4. Các công ty chỉ "liên quan" (ví dụ FE CREDIT liên quan SHB nhưng thương hiệu riêng) KHÔNG gộp
 */

export const ALIAS_GROUPS = [
  // ───────────────────────────────────────────────────────────────────────────
  // MB Bank – Ngân hàng TMCP Quân Đội và các đơn vị trực thuộc
  // Bằng chứng: cùng thương hiệu MB Bank, "Quân Đội" là tên pháp lý của MB Bank
  // ───────────────────────────────────────────────────────────────────────────
  [
    "MB Bank",
    [
      "MB Bank",
      "Ngân Hàng TMCP Quân Đội",
      "Military Commercial Joint Stock Bank",
      // Công ty quản lý nợ thuộc MB Bank - rõ ràng từ tên
      "Công Ty Quản Lý Nợ Và Khai Thác Tài Sản - Ngân Hàng TMCP Quân Đội",
      // Ngân hàng MBV là tên rút gọn của "Vietnam Modern Bank" thuộc MB Group
      "Ngân hàng TNHH MTV Việt Nam Hiện Đại (MBV)",
      "NGÂN HÀNG TRÁCH NHIỆM HỮU HẠN MỘT THÀNH VIÊN VIỆT NAM HIỆN ĐẠI",
      // Bảo hiểm nhân thọ MB Ageas - joint venture nhưng mang thương hiệu MB
      "CÔNG TY TNHH BẢO HIỂM NHÂN THỌ MB AGEAS",
    ],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // TPBank – Ngân hàng TMCP Tiên Phong
  // Bằng chứng: cùng thương hiệu TPBank, khác nhau về format Việt/Anh và dấu câu
  // ───────────────────────────────────────────────────────────────────────────
  [
    "TPBank",
    [
      "TPBank",
      "Ngân Hàng TMCP Tiên Phong (TPBank)",
      "Ngân hàng TMCP Tiên Phong | TPBank",
    ],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // VPBank – Ngân hàng TMCP Việt Nam Thịnh Vượng
  // Bằng chứng: VPBank là brand chính, các dạng alias khác viết tắt/legal name
  // Không gộp: FE CREDIT (brand riêng độc lập, JD không mang tên VPBank)
  // Không gộp: LOTTE FINANCE (đã thoái vốn, brand riêng)
  // Gộp: Công ty chứng khoán VPBank vì tên rõ ràng chứa "VPBank"
  // ───────────────────────────────────────────────────────────────────────────
  [
    "VPBank",
    [
      "VPBank",
      "Ngân Hàng TMCP Việt Nam Thịnh Vượng - VPBANK",
      // Công ty chứng khoán VPBank - cùng thương hiệu, tên rõ ràng
      "Công ty Cổ phần Chứng khoán VPBank",
      "CÔNG TY CỔ PHẦN CHỨNG KHOÁN VPBank",
    ],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Techcombank – Ngân hàng TMCP Kỹ Thương Việt Nam
  // Bằng chứng: cùng thương hiệu, khác hoa/thường và định dạng
  // ───────────────────────────────────────────────────────────────────────────
  [
    "Techcombank",
    [
      "Techcombank",
      "NGÂN HÀNG TMCP KỸ THƯƠNG VIỆT NAM (TECHCOMBANK)",
    ],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Vietcombank – Ngân hàng TMCP Ngoại Thương Việt Nam
  // Bằng chứng: cùng thương hiệu, khác hoa/thường
  // Gộp: VCBS (Vietcombank Securities) vì tên rõ ràng thuộc Vietcombank
  // ───────────────────────────────────────────────────────────────────────────
  [
    "Vietcombank",
    [
      "NGÂN HÀNG TMCP NGOẠI THƯƠNG VIỆT NAM (VIETCOMBANK)",
      // VCBS = Vietcombank Securities - tên rõ ràng từ tên công ty
      "Công ty TNHH Chứng khoán Ngân hàng TMCP Ngoại thương Việt Nam (VCBS - Vietcombank Securities)",
    ],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // NCB – National Citizen Bank
  // Bằng chứng: cùng thương hiệu NCB, hai dạng tên khác nhau
  // ───────────────────────────────────────────────────────────────────────────
  [
    "NCB",
    [
      "National Citizen Bank | NCB",
      "Ngân Hàng TMCP Quốc Dân (NCB)",
    ],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // PVcomBank – Ngân hàng TMCP Đại Chúng Việt Nam
  // Bằng chứng: cùng thương hiệu PVcomBank
  // ───────────────────────────────────────────────────────────────────────────
  [
    "PVcomBank",
    [
      "PVcomBank",
      "Ngân hàng TMCP Đại Chúng Việt Nam - PVcomBank",
    ],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Ngân Hàng Á Châu | ACB
  // Bằng chứng: cùng thương hiệu ACB, gộp công ty chứng khoán ACB
  // ───────────────────────────────────────────────────────────────────────────
  [
    "ACB",
    [
      "Ngân Hàng Á Châu | ACB",
      // Chứng khoán ACB - rõ ràng là công ty con của ACB
      "Công ty TNHH Chứng khoán ACB",
    ],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // VietABank – Ngân hàng TMCP Việt Á
  // Bằng chứng: cùng thương hiệu, khác định dạng
  // ───────────────────────────────────────────────────────────────────────────
  [
    "VietABank",
    [
      "Viet A Bank",
      "Ngân hàng TMCP Việt Á – VietABank",
    ],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Phu Hung Securities – hai alias rõ ràng cùng thương hiệu
  // Bằng chứng: cùng entity, khác format (tên đầy đủ vs rút gọn)
  // ───────────────────────────────────────────────────────────────────────────
  [
    "Phu Hung Securities",
    [
      "Phu Hung Securities (PHS)",
      "Phu Hung Securities Corporation",
    ],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Laidon – hai thực thể Laidon Consulting và Laidon Group
  // Bằng chứng: cùng brand "Laidon", nhóm công ty rõ ràng
  // ───────────────────────────────────────────────────────────────────────────
  [
    "Laidon Group",
    [
      "Laidon Consulting Vietnam",
      "Laidon Group",
    ],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // AITS | Vietnam Airlines
  // Bằng chứng: cùng entity, khác format (brand | parent vs tên pháp lý)
  // ───────────────────────────────────────────────────────────────────────────
  [
    "AITS | Vietnam Airlines",
    [
      "AITS | Vietnam Airlines",
      "CÔNG TY CỔ PHẦN TIN HỌC - VIỄN THÔNG HÀNG KHÔNG AITS",
    ],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // F88
  // Bằng chứng: F88 là brand, CÔNG TY CỔ PHẦN KINH DOANH F88 là tên pháp lý
  // ───────────────────────────────────────────────────────────────────────────
  [
    "F88",
    [
      "F88",
      "CÔNG TY CỔ PHẦN KINH DOANH F88",
    ],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Gene Solutions
  // Bằng chứng: cùng entity, khác format
  // ───────────────────────────────────────────────────────────────────────────
  [
    "Gene Solutions",
    [
      "Gene Solutions",
      "CÔNG TY CỔ PHẦN GIẢI PHÁP GENE - GENE SOLUTIONS",
    ],
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // Viettel CHT
  // Bằng chứng: Viettel - CHT là tên chính thức, không khác nhau về pháp nhân
  // ───────────────────────────────────────────────────────────────────────────
  // (chỉ có 1 alias nên không cần gộp - giữ nguyên)

  // ───────────────────────────────────────────────────────────────────────────
  // KHÔNG GỘP (documented):
  // - FE CREDIT: brand riêng độc lập với VPBank, không mang tên VPBank trong JD
  // - LOTTE FINANCE VIETNAM: brand riêng, đã thoái vốn khỏi VPBank
  // - SHBFinance vs SHB: finance company riêng biệt về mặt pháp lý và brand
  // - Công ty bảo hiểm MIC vs MB Bank: MIC (Tổng Công ty Cổ phần Bảo hiểm Quân đội) không chính thức là MB
  // - TPIsoftware: công ty IT độc lập, không phải TPBank
  // - SHINHAN DS vs Shinhan Finance: hai pháp nhân khác nhau trong Shinhan Group
  // ───────────────────────────────────────────────────────────────────────────
];

/**
 * Build reverse lookup: alias (trimmed, normalized) → canonicalName
 * Alias lookup sử dụng normalized key (lowercase + collapse whitespace) để match an toàn
 */
function buildAliasLookup(groups) {
  const map = new Map(); // normalizedAlias -> canonicalName
  const canonicalSet = new Set();

  for (const [canonical, aliases] of groups) {
    if (canonicalSet.has(canonical)) {
      throw new Error(`Duplicate canonical name: "${canonical}"`);
    }
    canonicalSet.add(canonical);

    for (const alias of aliases) {
      const key = normalizeKey(alias);
      if (map.has(key) && map.get(key) !== canonical) {
        throw new Error(
          `Alias collision: "${alias}" maps to both "${map.get(key)}" and "${canonical}"`
        );
      }
      map.set(key, canonical);
    }
  }

  return map;
}

/**
 * Normalize một chuỗi để làm lookup key:
 * - trim whitespace
 * - collapse multiple whitespace thành 1 space
 * - lowercase
 * Không thay đổi Unicode (giữ ký tự tiếng Việt)
 */
export function normalizeKey(str) {
  return str.trim().replace(/\s+/g, " ").toLowerCase();
}

// Singleton lookup table được build 1 lần
let _lookup = null;
function getLookup() {
  if (!_lookup) _lookup = buildAliasLookup(ALIAS_GROUPS);
  return _lookup;
}

/**
 * Chuẩn hóa tên công ty từ raw import:
 * 1. Làm sạch whitespace và null bytes
 * 2. Tra cứu alias map
 * 3. Nếu không có mapping, giữ nguyên sau bước clean
 *
 * @param {string|null|undefined} rawCompany
 * @returns {string|null}
 */
export function normalizeCompanyName(rawCompany) {
  if (rawCompany === null || rawCompany === undefined) return null;
  const cleaned = String(rawCompany).replace(/\u0000/g, "").trim().replace(/\s+/g, " ");
  if (!cleaned) return null;

  const lookup = getLookup();
  const key = normalizeKey(cleaned);
  return lookup.get(key) ?? cleaned;
}

/**
 * Tạo slug từ canonical company name, dùng cho email và employer_profile.slug
 * - lowercase ASCII
 * - thay thế ký tự đặc biệt và Unicode bằng dấu gạch ngang
 * - dedup consecutive hyphens
 * - trim hyphens ở đầu và cuối
 *
 * @param {string} canonicalName
 * @returns {string}
 */
export function companySlug(canonicalName) {
  // Transliterate một số ký tự tiếng Việt phổ biến
  const translitMap = {
    'à':'a','á':'a','ả':'a','ã':'a','ạ':'a',
    'ă':'a','ắ':'a','ặ':'a','ẳ':'a','ẵ':'a','ằ':'a',
    'â':'a','ầ':'a','ấ':'a','ẩ':'a','ẫ':'a','ậ':'a',
    'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e',
    'ê':'e','ề':'e','ế':'e','ể':'e','ễ':'e','ệ':'e',
    'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
    'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o',
    'ô':'o','ồ':'o','ố':'o','ổ':'o','ỗ':'o','ộ':'o',
    'ơ':'o','ờ':'o','ớ':'o','ở':'o','ỡ':'o','ợ':'o',
    'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u',
    'ư':'u','ừ':'u','ứ':'u','ử':'u','ữ':'u','ự':'u',
    'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y',
    'đ':'d',
    'À':'a','Á':'a','Ả':'a','Ã':'a','Ạ':'a',
    'Ă':'a','Ắ':'a','Ặ':'a','Ẳ':'a','Ẵ':'a','Ằ':'a',
    'Â':'a','Ầ':'a','Ấ':'a','Ẩ':'a','Ẫ':'a','Ậ':'a',
    'È':'e','É':'e','Ẻ':'e','Ẽ':'e','Ẹ':'e',
    'Ê':'e','Ề':'e','Ế':'e','Ể':'e','Ễ':'e','Ệ':'e',
    'Ì':'i','Í':'i','Ỉ':'i','Ĩ':'i','Ị':'i',
    'Ò':'o','Ó':'o','Ỏ':'o','Õ':'o','Ọ':'o',
    'Ô':'o','Ồ':'o','Ố':'o','Ổ':'o','Ỗ':'o','Ộ':'o',
    'Ơ':'o','Ờ':'o','Ớ':'o','Ở':'o','Ỡ':'o','Ợ':'o',
    'Ù':'u','Ú':'u','Ủ':'u','Ũ':'u','Ụ':'u',
    'Ư':'u','Ừ':'u','Ứ':'u','Ử':'u','Ữ':'u','Ự':'u',
    'Ỳ':'y','Ý':'y','Ỷ':'y','Ỹ':'y','Ỵ':'y',
    'Đ':'d',
  };

  let slug = canonicalName.split('').map(c => translitMap[c] ?? c).join('');
  // lowercase
  slug = slug.toLowerCase();
  // replace non-alphanumeric với hyphen
  slug = slug.replace(/[^a-z0-9]+/g, '-');
  // trim hyphens
  slug = slug.replace(/^-+|-+$/g, '');
  // dedup consecutive hyphens
  slug = slug.replace(/-{2,}/g, '-');
  return slug || 'unknown';
}

/**
 * Tạo email cho canonical recruiter import
 * Format: recruiter.<slug>@careerfit.local
 *
 * @param {string} canonicalName
 * @returns {string}
 */
export function recruiterEmail(canonicalName) {
  return `recruiter.${companySlug(canonicalName)}@careerfit.local`;
}

/**
 * Tính số alias được hợp nhất trong dataset
 * @param {string[]} rawCompanies - list company names gốc
 * @returns {{ rawCount, canonicalCount, mergedCount, groups }}
 */
export function analyzeAliases(rawCompanies) {
  const canonicalCounts = new Map();
  for (const raw of rawCompanies) {
    const canonical = normalizeCompanyName(raw) ?? raw;
    canonicalCounts.set(canonical, (canonicalCounts.get(canonical) ?? 0) + 1);
  }

  // Tìm các canonical có nhiều hơn 1 raw alias
  const mergedGroups = [];
  for (const [canonical, count] of canonicalCounts) {
    if (count > 1) {
      // Find original aliases that map to this canonical
      const aliases = rawCompanies.filter(r =>
        (normalizeCompanyName(r) ?? r) === canonical && r !== canonical
      );
      if (aliases.length > 0) {
        mergedGroups.push({ canonical, count, aliases: [...new Set(aliases)] });
      }
    }
  }

  // Cross-check to ensure no canonical companies produce the same slug
  const slugMap = new Map();
  for (const canonical of canonicalCounts.keys()) {
    const s = companySlug(canonical);
    if (slugMap.has(s)) {
      console.error(`ERROR: Slug collision detected! Both "${canonical}" and "${slugMap.get(s)}" resolve to slug "${s}"`);
      process.exit(1);
    }
    slugMap.set(s, canonical);
  }

  return {
    rawCount: new Set(rawCompanies).size,
    canonicalCount: canonicalCounts.size,
    mergedCount: new Set(rawCompanies).size - canonicalCounts.size,
    groups: mergedGroups,
  };
}
