export function localizePotentialReason(reason: string, language: 'vi' | 'en') {
  if (language === 'en') return reason;
  return reason
    .replace(/Potential\s+(\d+)\/100\./gi, 'Điểm tiềm năng $1/100.')
    .replace(/Transferable:/gi, 'Kỹ năng có thể chuyển đổi:')
    .replace(/Aligned:/gi, 'Kỹ năng tương đồng:')
    .replace(/Shared foundation:/gi, 'Nền tảng chung:')
    .replace(/Gaps to close:/gi, 'Kỹ năng cần bổ sung:')
    .replace(/\s->\s/g, ' → ');
}
