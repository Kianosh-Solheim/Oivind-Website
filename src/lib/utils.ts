export function isHtml(str: string) {
  return /<[a-z][\s\S]*>/i.test(str);
}

export function stripHtml(html: string) {
  if (!isHtml(html)) return html;
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export function calculateReadingTime(text: string): number {
  if (!text) return 1;
  const plainText = stripHtml(text);
  // Matches words (alphanumeric and some punctuation correctly, but split by space is easiest)
  const words = plainText.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}
