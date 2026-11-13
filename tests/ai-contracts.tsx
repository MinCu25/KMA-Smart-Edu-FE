import assert from "node:assert/strict";
import { createAiApi, documentError, questionError, sessionPath } from "../src/services/api/aiApi";
import { ApiError } from "../src/services/api/httpClient";
import { AiCitations } from "../src/pages/live/AiChat";
import { renderToStaticMarkup } from "react-dom/server";
const original=globalThis.fetch;
const requests:{url:string;init?:RequestInit}[]=[];
const largeId="9223372036854775806";
const api=createAiApi("test-token");
assert.equal(sessionPath(largeId),"/api/v1/ai/sessions/"+largeId);
for(const id of ["", "1/2", "1?x=y", "-1", "1.2", "9223372036854775808"])assert.throws(()=>sessionPath(id));
assert(questionError("  "));assert.equal(questionError("a".repeat(2000)),"");assert(questionError("a".repeat(2001)));
try {
 globalThis.fetch=async(url,init)=>{
  requests.push({url:String(url),init});
  assert.equal(new Headers(init?.headers).get("Authorization"),"Bearer test-token");
  if(String(url).endsWith('/chat'))return Response.json({success:true,data:{sessionId:largeId,messageId:"101",content:"Theo tài liệu",intent:"KNOWLEDGE",citations:[],scenario:null}});
  if(String(url).includes('?page='))return Response.json({success:true,data:{content:[],pageNumber:1,pageSize:20,totalElements:0,totalPages:0,last:true}});
  if(String(url).endsWith('/documents'))return Response.json({success:true,data:{sourceTitle:"quy-che.txt",chunkCount:2}});
  return Response.json({success:true,data:{sessionId:largeId,createdAt:"2026-11-13T10:00:00",messages:[]}});
 };
 await api.chat("Câu hỏi",null);assert.deepEqual(JSON.parse(requests.at(-1)!.init!.body as string),{message:"Câu hỏi",sessionId:null});
 await api.chat("Hỏi tiếp",largeId);assert.equal(JSON.parse(requests.at(-1)!.init!.body as string).sessionId,largeId);
 await api.sessions(1);assert(requests.at(-1)!.url.endsWith('/api/v1/ai/sessions?page=1&size=20'));
 assert.equal((await api.session(largeId)).sessionId,largeId);
 const file=new File(["Điều 1. Quy định học vụ"],"quy-che.txt",{type:"text/plain"});
 assert.equal(await documentError(file),"");
 await api.upload(file);const body=requests.at(-1)!.init!.body as FormData;
 assert.deepEqual([...body.keys()],["file"]);assert.equal((body.get('file') as File).name,'quy-che.txt');
 assert.equal(new Headers(requests.at(-1)!.init!.headers).has("Content-Type"),false);
 assert(await documentError(null));assert(await documentError(new File(["x"],"a.pdf")));assert(await documentError(new File([" "],"a.txt")));assert(await documentError(new File([new Uint8Array([0xff])],"a.txt")));assert(await documentError(new File([new Uint8Array(20*1024*1024+1)],"a.txt")));
 const before=requests.length;await assert.rejects(api.chat(" ",null));assert.equal(requests.length,before);
 globalThis.fetch=async()=>Response.json({success:false,code:4006,message:"Đổi mật khẩu"},{status:403});await assert.rejects(api.chat("Hỏi",null),e=>e instanceof ApiError&&e.code===4006);
 globalThis.fetch=async()=>Response.json({success:false,code:9999,message:"AI tạm thời không phản hồi"},{status:503});await assert.rejects(api.chat("Hỏi",null),ApiError);
 globalThis.fetch=async()=>new Response(null,{status:204});await assert.rejects(api.sessions(0),/chưa trả dữ liệu/);
 const markup=renderToStaticMarkup(<AiCitations items={[{sourceTitle:"<script>alert(1)</script>",sectionTitle:null,pageNumber:null,snippet:"<img src=x onerror=alert(1)>"}]}/>);
 assert(!markup.includes('<script>'));assert(!markup.includes('<img'));assert(markup.includes('&lt;script&gt;'));
 console.log("PASS: AI chat/session/history/upload contract, string Long IDs, TXT UTF-8 limits, auth/errors, citation escaping");
} finally {globalThis.fetch=original;}
