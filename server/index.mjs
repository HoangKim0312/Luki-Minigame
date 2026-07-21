import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(root, "../.local-data");
const gamesFile = resolve(dataDir, "games.json");
const usersFile = resolve(dataDir, "users.json");
const port = Number(process.env.PORT || 8787);
const secret = process.env.SESSION_SECRET || "change-this-local-development-secret";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,https://hoangkim0312.github.io").split(",").map(value => value.trim());

const starterGames = [
  { id:"wavelength",icon:"≈",kind:"match",minPlayers:2,maxPlayers:8,minutes:"10–15",tone:"lime",published:true,aiEnabled:true,topic:"Bạn bè, đời sống và những lựa chọn vui",name:{vi:"Chung Tần Số",en:"Same Wavelength"},description:{vi:"Cùng trả lời một câu hỏi. Càng nhiều đáp án trùng nhau, cả nhóm càng nhiều điểm.",en:"Answer the same prompt. Matching answers earn points for everyone."},questions:{vi:["Kể tên một món ăn mà hầu như ai cũng thích.","Điều gì mọi người thường quên trước khi đi du lịch?"],en:["Name a food that almost everyone likes.","What do people often forget before travelling?"]}},
  { id:"who-said-it",icon:"?",kind:"guess-author",minPlayers:3,maxPlayers:10,minutes:"15–25",tone:"coral",published:true,aiEnabled:true,topic:"Kỷ niệm và tình huống hài hước",name:{vi:"Ai Đã Nói?",en:"Who Said It?"},description:{vi:"Viết đáp án bí mật rồi đoán chủ nhân của từng lá bài.",en:"Write secret answers, then guess who wrote each card."},questions:{vi:["Một thói quen kỳ lạ bạn vẫn làm khi không ai nhìn thấy?"],en:["What odd habit do you have when nobody is watching?"]}},
  { id:"number",icon:"37",kind:"number",minPlayers:2,maxPlayers:8,minutes:"12–20",tone:"violet",published:true,aiEnabled:true,topic:"Ước lượng vui từ 1 đến 100",name:{vi:"Nghĩ Quanh Con Số",en:"Think Around the Number"},description:{vi:"Đưa ra con số từ 1–100 và xem cả bàn gần nhau đến đâu.",en:"Pick a number from 1–100 and see how close the table gets."},questions:{vi:["Mức độ đáng sợ khi điện thoại còn 2% pin, từ 1–100?"],en:["How scary is a phone at 2% battery, from 1–100?"]}},
  { id:"hot-take",icon:"✦",kind:"prompt",minPlayers:2,maxPlayers:12,minutes:"10–20",tone:"sky",published:true,aiEnabled:true,topic:"Quan điểm vui, thân thiện",name:{vi:"Ý Kiến Nóng",en:"Hot Takes"},description:{vi:"Chọn một phía và kể câu chuyện đằng sau lựa chọn.",en:"Choose a side and tell the story behind your choice."},questions:{vi:["Dứa hoàn toàn thuộc về pizza."],en:["Pineapple absolutely belongs on pizza."]}}
];
const fallbackQuestions = {
  vi:["Điều gì khiến một chuyến đi trở nên đáng nhớ?","Món ăn nào xứng đáng được nổi tiếng hơn?","Thói quen nhỏ nào làm ngày của bạn tốt hơn?","Nếu có thêm một giờ mỗi ngày, bạn sẽ làm gì?","Điều gì luôn khiến cả nhóm bật cười?","Một lựa chọn tưởng tệ nhưng hóa ra rất đúng?","Bạn sẽ đặt tên gì cho một hành tinh mới?","Luật bất thành văn nào mọi người nên biết?"],
  en:["What makes a trip truly memorable?","Which food deserves to be more famous?","What small habit makes your day better?","What would you do with one extra hour a day?","What always makes your group laugh?","What bad-looking choice turned out right?","What would you name a new planet?","What unwritten rule should everyone know?"]
};

async function ensureData() {
  await mkdir(dataDir, { recursive:true });
  try { await readFile(gamesFile); } catch { await writeFile(gamesFile, JSON.stringify(starterGames,null,2)); }
  try { await readFile(usersFile); } catch { await writeFile(usersFile, "[]"); }
}
async function load(path) { return JSON.parse(await readFile(path,"utf8")); }
async function save(path,data) { await writeFile(path,JSON.stringify(data,null,2)); }
function hashPassword(password,salt=randomBytes(16).toString("hex")) { return `${salt}:${scryptSync(password,salt,64).toString("hex")}`; }
function verifyPassword(password,stored) { const [salt,hash]=stored.split(":"); const actual=scryptSync(password,salt,64); return timingSafeEqual(actual,Buffer.from(hash,"hex")); }
function tokenFor(user) { const payload=Buffer.from(JSON.stringify({id:user.id,email:user.email,name:user.name,role:user.role,exp:Date.now()+7*864e5})).toString("base64url"); const sig=createHmac("sha256",secret).update(payload).digest("base64url"); return `${payload}.${sig}`; }
function userFrom(req) { try { const token=req.headers.authorization?.replace(/^Bearer /,"")||"";const [payload,sig]=token.split(".");const expected=createHmac("sha256",secret).update(payload).digest();if(!timingSafeEqual(expected,Buffer.from(sig,"base64url")))return null;const user=JSON.parse(Buffer.from(payload,"base64url").toString());return user.exp>Date.now()?user:null; } catch { return null; } }
function send(res,status,data,origin) { res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"GET,POST,PUT,OPTIONS","Vary":"Origin"});res.end(JSON.stringify(data)); }
async function body(req) { let raw="";for await(const chunk of req)raw+=chunk;if(raw.length>1_000_000)throw new Error("Payload too large");return raw?JSON.parse(raw):{}; }
function publicUser(user) { return {name:user.name,email:user.email,role:user.role}; }
function validateGame(game) { return game&&typeof game.id==="string"&&game.id.length<80&&game.name?.vi&&game.name?.en&&Array.isArray(game.questions?.vi)&&Array.isArray(game.questions?.en); }

async function generateQuestions({topic,language,count=8,kind="prompt"}) {
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey)return {questions:fallbackQuestions[language]?.slice(0,count)||fallbackQuestions.vi.slice(0,count),source:"fallback"};
  const schema={type:"object",additionalProperties:false,properties:{questions:{type:"array",minItems:count,maxItems:count,items:{type:"string"}}},required:["questions"]};
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-5.6-sol",reasoning:{effort:"low"},input:`Create ${count} original, friendly party-game prompts in ${language==="vi"?"Vietnamese":"English"}. Topic: ${topic}. Game mechanic: ${kind}. Keep each prompt concise, inclusive, safe for friends, and avoid politics, trauma, sexual content, or obscure trivia.`,text:{format:{type:"json_schema",name:"party_questions",strict:true,schema}}})});
  if(!response.ok)throw new Error(`OpenAI request failed (${response.status})`);
  const result=await response.json();
  const outputText=result.output_text||result.output?.flatMap(item=>item.content||[]).find(item=>item.type==="output_text")?.text;
  if(!outputText)throw new Error("OpenAI returned no question pack");
  const parsed=JSON.parse(outputText);
  return {questions:parsed.questions,source:process.env.OPENAI_MODEL||"gpt-5.6-sol"};
}

await ensureData();
if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD){const users=await load(usersFile);if(!users.some(user=>user.email===process.env.ADMIN_EMAIL.toLowerCase())){users.push({id:randomBytes(12).toString("hex"),name:process.env.ADMIN_NAME||"Luki Admin",email:process.env.ADMIN_EMAIL.toLowerCase(),password:hashPassword(process.env.ADMIN_PASSWORD),role:"admin"});await save(usersFile,users);console.log("Admin account created.");}}

createServer(async(req,res)=>{const origin=allowedOrigins.includes(req.headers.origin)?req.headers.origin:allowedOrigins[0];if(req.method==="OPTIONS")return send(res,204,{},origin);try{const url=new URL(req.url,"http://localhost");
  if(req.method==="GET"&&url.pathname==="/health")return send(res,200,{ok:true,ai:Boolean(process.env.OPENAI_API_KEY)},origin);
  if(req.method==="GET"&&url.pathname==="/api/games")return send(res,200,{games:(await load(gamesFile)).filter(game=>game.published)},origin);
  if(req.method==="POST"&&url.pathname==="/api/auth/register"){const input=await body(req);if(!input.name||!/^\S+@\S+\.\S+$/.test(input.email||"")||(input.password||"").length<8)return send(res,400,{error:"Tên, email và mật khẩu tối thiểu 8 ký tự là bắt buộc."},origin);const users=await load(usersFile),email=input.email.toLowerCase();if(users.some(user=>user.email===email))return send(res,409,{error:"Email đã được sử dụng."},origin);const user={id:randomBytes(12).toString("hex"),name:String(input.name).slice(0,40),email,password:hashPassword(input.password),role:"player"};users.push(user);await save(usersFile,users);return send(res,201,{token:tokenFor(user),user:publicUser(user)},origin);}
  if(req.method==="POST"&&url.pathname==="/api/auth/login"){const input=await body(req),users=await load(usersFile),user=users.find(item=>item.email===String(input.email||"").toLowerCase());if(!user||!verifyPassword(input.password||"",user.password))return send(res,401,{error:"Email hoặc mật khẩu không đúng."},origin);return send(res,200,{token:tokenFor(user),user:publicUser(user)},origin);}
  const user=userFrom(req);if(url.pathname.startsWith("/api/admin/")&&user?.role!=="admin")return send(res,403,{error:"Bạn cần đăng nhập với quyền admin."},origin);
  if(req.method==="GET"&&url.pathname==="/api/admin/games")return send(res,200,{games:await load(gamesFile)},origin);
  if(req.method==="PUT"&&url.pathname.startsWith("/api/admin/games/")){const input=await body(req);if(!validateGame(input))return send(res,400,{error:"Cấu hình game chưa hợp lệ."},origin);const games=await load(gamesFile),index=games.findIndex(game=>game.id===url.pathname.split("/").pop());if(index>=0)games[index]=input;else games.push(input);await save(gamesFile,games);return send(res,200,{game:input},origin);}
  if(req.method==="POST"&&url.pathname==="/api/admin/questions/generate")return send(res,200,await generateQuestions(await body(req)),origin);
  return send(res,404,{error:"Not found"},origin);
}catch(error){console.error(error);return send(res,500,{error:error instanceof Error?error.message:"Server error"},allowedOrigins[0]);}}).listen(port,()=>console.log(`Luki local backend: http://localhost:${port}`));
