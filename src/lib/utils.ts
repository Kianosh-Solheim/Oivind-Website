export function isHtml(str: string) {
  return /<[a-z][\s\S]*>/i.test(str);
}

export function stripHtml(html: string) {
  if (!isHtml(html)) return html;
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}
