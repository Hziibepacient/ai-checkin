export const sticker={width:2048,height:108,left:12,titleY:38,urlY:87,titleSize:30,urlSize:26};
export const stickerTitle='AI CHECK-IN  /  发给 Agent，说「签到」';
const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function stickerSVG(url:string){
 return `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="108" viewBox="0 0 2048 108"><text x="12" y="38" fill="#111111" font-family="Microsoft YaHei, Arial, sans-serif" font-size="30" font-weight="600">${escape(stickerTitle)}</text><text x="12" y="87" fill="#111111" font-family="Consolas, monospace" font-size="26">${escape(url)}</text></svg>`;
}
