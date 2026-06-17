import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.join(__dirname, '..');
const EDITED = path.join(BASE, 'output/vetka-batch/edited');

// Read .env manually
const envPath = path.join(BASE, '.env');
const env = {};
readFileSync(envPath,'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).forEach(l=>{const[k,...v]=l.split('=');if(k)env[k.trim()]=v.join('=').trim();});
const KEY = env.OPENAI_API_KEY;

function colorFromFile(fname) {
  const f = fname.toLowerCase();
  if(f.includes('dark-pink')||f.includes('darkpink')) return 'dark pink / magenta';
  if(f.includes('light-pink')||f.includes('lightpink')) return 'light pink / soft pink';
  if(f.includes('light-red')||f.includes('lightred')) return 'light red / coral red';
  if(f.includes('rose-pink')||f.includes('rosepink')) return 'rose pink / dusty rose';
  if(f.includes('dark-red')||f.includes('darkred')) return 'dark red / burgundy';
  if(f.includes('rose-red')||f.includes('rosered')) return 'rose red';
  if(f.includes('champagne')) return 'champagne / cream / ivory';
  if(f.includes('violet')) return 'violet / purple';
  if(f.includes('orange')) return 'orange';
  if(f.includes('yellow')) return 'yellow';
  if(f.includes('white')) return 'white';
  if(f.includes('blue')) return 'blue';
  if(f.includes('green')) return 'green';
  if(f.includes('red')) return 'red';
  if(f.includes('pink')) return 'pink';
  if(f.includes('lemon')) return 'lemon yellow';
  if(f.includes('eucalpt')) return 'eucalyptus green / sage green';
  return null;
}

async function genRecolor(idealFile, targetFile, idealColor, targetColor) {
  const imgBuf = fs.readFileSync(path.join(EDITED, idealFile));
  const bnd = 'B' + Date.now();
  const CRLF = '\r\n';
  const prompt = (!targetColor || targetColor === idealColor)
    ? `Take this exact product photo and create a very subtle variation: slightly alter the petal arrangement just a tiny bit. Keep everything identical — same color (${idealColor}), same stem, same leaves, same white background.`
    : `Take this exact product photo and change ONLY the flower color from ${idealColor} to ${targetColor}. Keep absolutely everything else identical — same stem, same leaves, same white background, same composition, same shape, same number of flowers.`;
  const parts = Buffer.from(
    `--${bnd}${CRLF}Content-Disposition: form-data; name="model"${CRLF}${CRLF}gpt-image-2${CRLF}` +
    `--${bnd}${CRLF}Content-Disposition: form-data; name="prompt"${CRLF}${CRLF}${prompt}${CRLF}` +
    `--${bnd}${CRLF}Content-Disposition: form-data; name="size"${CRLF}${CRLF}1024x1024${CRLF}` +
    `--${bnd}${CRLF}Content-Disposition: form-data; name="image"; filename="img.png"${CRLF}Content-Type: image/png${CRLF}${CRLF}`
  );
  const body = Buffer.concat([parts, imgBuf, Buffer.from(`${CRLF}--${bnd}--${CRLF}`)]);
  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method:'POST', headers:{'Authorization':`Bearer ${KEY}`,'Content-Type':`multipart/form-data; boundary=${bnd}`}, body
  });
  const data = await res.json();
  if(data.error) throw new Error(data.error.message);
  fs.writeFileSync(path.join(EDITED, targetFile), Buffer.from(data.data[0].b64_json,'base64'));
}

const SERIES = {
  'B-1':{'ideal':'6436-B-1-white-1.png','idealColor':'white'},
  'B-10':{'ideal':'6626-B-10-blue-1.png','idealColor':'blue'},
  'B-11':{'ideal':'6632-B-11-white-1.png','idealColor':'white'},
  'B-13':{'ideal':'6638-B-13-pink-1.png','idealColor':'pink'},
  'B-14':{'ideal':'7397-B-14-pink-1.png','idealColor':'pink'},
  'B-15':{'ideal':'8559-B-15-red-1.png','idealColor':'red'},
  'B-16':{'ideal':'7405-B-16-darkpink-1.png','idealColor':'dark pink'},
  'B-19':{'ideal':'6644-B-19-white-1.png','idealColor':'white'},
  'B-2':{'ideal':'6444-B-2-rose-1.png','idealColor':'rose pink'},
  'B-20':{'ideal':'6504-B-20-blue-1.png','idealColor':'blue'},
  'B-23':{'ideal':'6654-B-23-green-1.png','idealColor':'green'},
  'B-24':{'ideal':'6662-B-24-light-pink-1.png','idealColor':'light pink'},
  'B-25':{'ideal':'6664-B-25-white-1.png','idealColor':'white'},
  'B-27':{'ideal':'6684-B-27-rosepink-1.png','idealColor':'rose pink'},
  'B-28':{'ideal':'6518-B-28-yellow-1.png','idealColor':'yellow'},
  'B-29':{'ideal':'7409-B-29-green-1.png','idealColor':'green'},
  'B-3':{'ideal':'6450-B-3-blue-1.png','idealColor':'blue'},
  'B-32':{'ideal':'8493-B-32-white-2.png','idealColor':'white'},
  'B-34':{'ideal':'6526-B-34-red-3.png','idealColor':'red'},
  'B-35':{'ideal':'6698-B-35-red-1.png','idealColor':'red'},
  'B-4':{'ideal':'6606-B-4-dark-pink-1.png','idealColor':'dark pink'},
  'B-7':{'ideal':'7387-B-7-red-1.png','idealColor':'red'},
  'B-8':{'ideal':'6610-B-8-pink-1.png','idealColor':'pink'},
  'B-9':{'ideal':'6620-B-9-yellow-1.png','idealColor':'yellow'},
  'C-1':{'ideal':'8240-C-1-yellow-1.png','idealColor':'yellow'},
  'C-10':{'ideal':'8349-C-10-dark-pink-1.png','idealColor':'dark pink'},
  'C-3':{'ideal':'8287-C-3-dark-pink-1.png','idealColor':'dark pink'},
  'C-5':{'ideal':'8297-C-5-pink-2.png','idealColor':'pink'},
  'C-6':{'ideal':'8305-C-6-pink-1.png','idealColor':'pink'},
  'C-7':{'ideal':'8315-C-7-pink-1.png','idealColor':'pink'},
  'C-8':{'ideal':'8337-C-8-rosepink-1.png','idealColor':'rose pink'},
  'C-9':{'ideal':'8341-C-9-champagne-1.png','idealColor':'champagne'},
  'DH-156':{'ideal':'7623-DH-156-lemon-1.png','idealColor':'lemon yellow'},
  'W-28':{'ideal':'6742-W-28-2.png','idealColor':'same'},
  'W-29':{'ideal':'6744-W-29-green-1.png','idealColor':'green'},
  'W-30':{'ideal':'6745-W-30-eucalptus-2.png','idealColor':'eucalyptus green'},
  'Z-20':{'ideal':'4573-Z-20-Pink-1.png','idealColor':'pink'},
  'Z-22':{'ideal':'5818-Z-22-dark-pink-1.png','idealColor':'dark pink'},
  'Z-23':{'ideal':'4596-Z-23-red-1.png','idealColor':'red'},
  'Z-4':{'ideal':'6588-Z-4-blue-1.png','idealColor':'blue'},
  'Z-6':{'ideal':'4524-Z-6-blue-1.png','idealColor':'blue'},
  'Z-7':{'ideal':'4663-z-7-rose-pink-1.png','idealColor':'rose pink'},
  'Z-8':{'ideal':'5604-Z-8-blue-gortenziya-1.png','idealColor':'blue'},
};

const allFiles = fs.readdirSync(EDITED).filter(f=>f.endsWith('.png'));
const tasks = [];
for(const [seriesKey,{ideal,idealColor}] of Object.entries(SERIES)) {
  const others = allFiles.filter(f=>{
    if(f===ideal) return false;
    const parts=f.split('-');
    let key=null;
    if(['B','C','W','S','Z'].includes(parts[1])) key=parts[1]+'-'+parts[2];
    if(parts[1]==='DH') key='DH-156';
    return key===seriesKey;
  });
  for(const targetFile of others) tasks.push({seriesKey,ideal,idealColor,targetFile,targetColor:colorFromFile(targetFile)});
}

const SKIP = new Set(['6432-B-1-blue-1.png','6434-B-1-pink-1.png','6496-B-10-white-1.png','6624-B-10-pink-1.png','6498-B-11-blue-1.png','6628-B-11-red-1.png','6500-B-13-orange-1.png','6500-B-13-orange-2.png','6634-B-13-white-1.png','6640-B-13-blue-1.png','7395-B-14-rose-1.png','7395-B-14-rose-2.png','7397-B-14-pink-2.png','7399-B-14-blue-1.png','7399-B-14-blue-2.png','7401-B-15-1.png','7401-B-15-2.png','8559-B-15-red-2.png','8560-B-15-violet-1.png','8560-B-15-violet-2.png','8561-B-15-pink-1.png','8561-B-15-pink-2.png','7403-B-16-blue-1.png','7407-B-16-pink-1.png','6502-B-19-blue-1.png','6502-B-19-blue-2.png','6646-B-19-pink-1.png','6648-B-19-red-1.png','6438-B-2-blue-1.png','6440-B-2-white-1.png','6440-B-2-white-2.png','6442-B-2-pink-1.png','6442-B-2-pink-2.png','6444-B-2-rose-2.png','6504-B-20-blue-2.png','6504-B-20-blue-3.png','6508-B-23-white-1.png','6656-B-23-rosepink-1.png','6658-B-23-blue-1.png','6510-B-24-rosepink-1.png','6662-B-24-light-pink-2.png','6512-B-25-red-1.png','6512-B-25-red-2.png','6668-B-25-blue-1.png','6670-B-25-violet-1.png','6516-B-27-white-1.png','6682-B-27-pink-1.png','6518-B-28-yellow-2.png','6688-B-28-white-1.png','6692-B-28-pink-2.png','7411-B-29-orange-1.png','7413-B-29-pink-1.png','7415-B-29-darkpink-1.png','6446-B-3-white-1.png','6446-B-3-white-2.png','6448-B-3-pink-1.png','6448-B-3-pink-2.png','6450-B-3-blue-2.png','6452-B-3-red-1.png','6452-B-3-red-2.png','6520-B-32-pink-1.png','6520-B-32-pink-2.png','8491-B-32-rosepink-1.png','8491-B-32-rosepink-2.png','8493-B-32-white-1.png','6454-B-4-pink-1.png','6612-B-8-blue-1.png','6494-B-9-pink-1.png','6690-B-28-light-red-1.png','6692-B-28-pink-1.png','6526-B-34-red-1.png','6526-B-34-red-2.png','6526-B-34-red-4.png','6526-B-34-red-5.png','6530-B-35-yellow-1.png','6530-B-35-yellow-2.png','6694-B-35-white-1.png','6700-B-35-orange-1.png','6702-B-35-pink-1.png','6454-B-4-pink-2.png','6598-B-4-white-1.png','6604-B-4-rose-pink-1.png','7389-B-7-blue-1.png','7391-B-7-white-1.png','6492-B-8-red-1.png','6614-B-8-rose-pink-1.png','6616-B-9-red-1.png','8272-C-1-red-1.png','8274-C-1-pink-1.png','8276-C-1-white-1.png','8278-C-1-light-yellow-1.png','8353-C-1-rose-red-1.png','8257-C-10-rose-pink-1.png','8345-C-10-pink-1.png','8351-C-10-white-1.png','8244-C-3-red-1.png','8285-C-3-white-1.png','8289-C-3-pink-1.png','8248-C-5-white-1.png','8248-C-5-white-2.png','8295-C-5-dark-pink-1.png','8295-C-5-dark-pink-2.png','8297-C-5-pink-1.png','8299-C-5-red-1.png','8299-C-5-red-2.png','8301-C-5-champagne-1.png','8301-C-5-champagne-2.png','8250-C-6-white-1.png','8250-C-6-white-2.png','8305-C-6-pink-2.png','8307-C-6-dark-pink-1.png','8307-C-6-dark-pink-2.png','8309-C-6-yellow-1.png','8309-C-6-yellow-2.png','8311-C-6-light-pink-1.png','8311-C-6-light-pink-2.png','8408-C-6-orange-1.png','8408-C-6-orange-2.png','8252-C-7-red-1.png','8252-C-7-red-2.png','8315-C-7-pink-2.png','8317-C-7-blue-1.png','8317-C-7-blue-2.png','8319-C-7-white-1.png','8319-C-7-white-2.png','8321-C-7-dark-pink-1.png','8321-C-7-dark-pink-2.png','8331-C-8-red-1.png','8333-C-8-darkpink-1.png','8335-C-8-champagne-1.png','8255-C-9-rose-pink-1.png','8343-C-9-white-1.png','7623-DH-156-lemon-2.png','6742-W-28-1.png','6743-W-29-red-1.png','6743-W-29-red-2.png','6744-W-29-green-2.png','6745-W-30-eucalptus-1.png']);
const resumeTasks = tasks.filter(t=>!SKIP.has(t.targetFile));
console.log(`Total: ${tasks.length}, Skip: ${SKIP.size}, Remaining: ${resumeTasks.length}`);
const LOG = path.join(BASE,'recolor_log.txt');
fs.writeFileSync(LOG,`Started: ${new Date().toISOString()}\nTotal: ${tasks.length}\n\n`);

let ok=0,failed=0;
for(const t of resumeTasks) {
  try {
    await genRecolor(t.ideal,t.targetFile,t.idealColor,t.targetColor);
    const msg=`✅ [${t.seriesKey}] ${t.targetFile} (${t.idealColor}→${t.targetColor||'var'})`;
    console.log(msg); fs.appendFileSync(LOG,msg+'\n'); ok++;
  } catch(e) {
    const msg=`❌ ${t.targetFile}: ${e.message.slice(0,80)}`;
    console.error(msg); fs.appendFileSync(LOG,msg+'\n'); failed++;
  }
  await new Promise(r=>setTimeout(r,350));
}
const summary=`\nDone: ${ok} ok, ${failed} failed`;
console.log(summary); fs.appendFileSync(LOG,summary+'\n');
