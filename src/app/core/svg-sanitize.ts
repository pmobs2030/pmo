/**
 * تعقيم SVG مرفوع من المستخدم قبل قبوله (icon upload) — مصدر موحّد يُستخدم من كل
 * مكان يقبل رفع أيقونة من الجهاز (تبويب الأيقونات، تبويب الحسابات).
 * يمنع: script، أحداث on*، foreignObject، روابط خارجية (href/xlink:href غير #).
 * هذا يختلف عن أيقونات icons.json الثابتة وقت البناء — هذا مصدر ديناميكي فعلي
 * (رفع مستخدم)، لذلك التعقيم هنا إلزامي وليس اختياريًا.
 */
export function sanitizeUploadedSvg(raw: string): string | null {
  if (!raw || raw.length > 60000) return null;
  let s = raw;
  if (!/<svg[\s\S]*<\/svg>/i.test(s)) return null;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
  s = s.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  s = s.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  s = s.replace(/(href|xlink:href)\s*=\s*"(?!#)[^"]*"/gi, '');
  s = s.replace(/(href|xlink:href)\s*=\s*'(?!#)[^']*'/gi, '');
  const svgMatch = s.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  return svgMatch ? svgMatch[1].trim() : null;
}
