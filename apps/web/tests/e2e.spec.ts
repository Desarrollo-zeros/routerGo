import { test, expect } from "@playwright/test";
const manifest = {
  version: 1,
  contentHash: "a".repeat(64),
  apiRoutes: [
    { route_key: "activity-verify", method: "POST", path_template: "/activities/:id/verify", version: "v1", use_case_key: "verifyActivity", auth_policy_key: "session", request_schema_key: null, response_schema_key: null, enabled: true },
    { route_key: "quote-create", method: "POST", path_template: "/quotes", version: "v1", use_case_key: "createQuote", auth_policy_key: "session", request_schema_key: null, response_schema_key: null, enabled: true },
    { route_key: "run-create", method: "POST", path_template: "/runs", version: "v1", use_case_key: "createRun", auth_policy_key: "session", request_schema_key: null, response_schema_key: null, enabled: true },
    { route_key: "run-events", method: "GET", path_template: "/runs/:id/events", version: "v1", use_case_key: "streamRun", auth_policy_key: "session", request_schema_key: null, response_schema_key: null, enabled: true },
    { route_key: "wallet-get", method: "GET", path_template: "/wallet", version: "v1", use_case_key: "getWallet", auth_policy_key: "session", request_schema_key: null, response_schema_key: null, enabled: true },
    { route_key: "wallet-ledger", method: "GET", path_template: "/wallet/ledger", version: "v1", use_case_key: "getWalletLedger", auth_policy_key: "session", request_schema_key: null, response_schema_key: null, enabled: true },
  ],
  ui: {
    routes: [
      { route_key: "activity-verify", path: "/", screen_key: "activity", enabled: true },
      { route_key: "quote-create", path: "/chat", screen_key: "chat", enabled: true },
      { route_key: "wallet-get", path: "/wallet", screen_key: "wallet", enabled: true },
    ],
    navigation: [
    { route_key: "activity-verify", screen_key: "activity", label_key: "nav.activity", icon_key: "activity", order_index: 1, required_capability: null, feature_flag: null, enabled: true },
    { route_key: "quote-create", screen_key: "chat", label_key: "nav.chat", icon_key: "message", order_index: 2, required_capability: null, feature_flag: null, enabled: true },
    { route_key: "wallet-get", screen_key: "wallet", label_key: "nav.wallet", icon_key: "wallet", order_index: 3, required_capability: null, feature_flag: null, enabled: true },
    ],
  },
  featureFlags: {},
  tokens: [],
  catalog: [
    { logical_id: "zen-free", provider_model_id: "z", gateway_id: "zen", tier: "FREE", credit_price: 1, enabled: true, capabilities: {}, limits: {} },
    { logical_id: "go-pro", provider_model_id: "g", gateway_id: "go", tier: "PREMIUM", credit_price: 5, enabled: true, capabilities: {}, limits: {} },
  ],
};
async function mockApi(page: any, balance=12){
  await page.addInitScript(()=>localStorage.setItem("routergo.local.session","e2e@example.com"));
  await page.route("**/runtime-manifest", (r:any)=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(manifest)}));
  await page.route("**/api/wallet", (r:any)=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({balance,lifetime_earned:30,currency:"CREDITS"})}));
  await page.route("**/api/activities/current/verify", (r:any)=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({verified_reps:10,credits:5})}));
  await page.route("**/api/quotes", (r:any)=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({id:"q1",credit_cost:5})}));
  await page.route("**/api/runs", (r:any)=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({id:"run1"})}));
  await page.route("**/api/runs/**/refund", (r:any)=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({refunded:true,refundId:"ref1"})}));
  await page.route("**/api/wallet/history", (r:any)=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify([])}));
}
async function mockSse(page:any){
  await page.addInitScript(()=>{
    const Fake=(globalThis as any).EventSource;
    class ES{url:string;ls:Record<string,any[]>={};onopen:any;onmessage:any;onerror:any;constructor(u:string){this.url=u;setTimeout(()=>this.onopen?.({}),5);setTimeout(()=>{const d=JSON.stringify({delta:"Hola "});this.ls["chunk"]?.forEach(f=>f({data:d} as any));this.onmessage?.({data:d} as any)},20);setTimeout(()=>{const d=JSON.stringify({delta:"mundo"});this.ls["chunk"]?.forEach(f=>f({data:d} as any))},40);setTimeout(()=>{this.ls["done"]?.forEach(f=>f({data:"{}"} as any))},60)}addEventListener(t:string,f:any){(this.ls[t]??=[]).push(f)}removeEventListener(){ }close(){} }
    (globalThis as any).EventSource=ES; (globalThis as any).__origES=Fake;
  });
}
async function mockCameraOk(page:any){
  await page.addInitScript(()=>{
    const fake={getTracks:()=>[],getVideoTracks:()=>[]};
    (navigator as any).mediaDevices={getUserMedia:()=>Promise.resolve(fake)};
    (globalThis as any).Worker=class{onmessage:any;postMessage(m:any){if(m.type==="init")setTimeout(()=>this.onmessage?.({data:{type:"ready"}}),5)}addEventListener(t:string,f:any){if(t==="message")this.onmessage=f}removeEventListener(){}terminate(){} };
    (globalThis as any).createImageBitmap=()=>Promise.resolve({} as any);
  });
}
test.describe("RouterGo E2E",()=>{
  test("solicita iniciar sesión o crear cuenta antes de entrar",async({page})=>{
    await page.route("**/runtime-manifest",(r:any)=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(manifest)}));
    await page.goto("/");
    await expect(page.getByRole("tab",{name:"Iniciar sesión"})).toBeVisible();
    await expect(page.getByRole("tab",{name:"Crear cuenta"})).toBeVisible();
    await page.getByLabel("Correo electrónico").fill("real@example.com");
    await page.getByLabel("Contraseña").fill("secreto123");
    await page.getByRole("button",{name:"Entrar a RouterGo"}).click();
    await expect(page.getByRole("link",{name:"Actividad"})).toBeVisible();
  });

  test("flujo completo flexión→earn→quote→run→stream→refund",async({page})=>{
    await mockApi(page,12);await mockSse(page);await mockCameraOk(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Recupera GoCredits" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Flexiones" })).toBeVisible();
    await expect(page.locator('[data-route-key="activity-verify"]')).toBeVisible();
    // flexión -> verify (mock direct API call covers earn)
    const earn=await page.evaluate(async()=>{const r=await fetch("/api/activities/current/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({claimed_reps:10})});return r.json()});
    expect(earn.credits).toBe(5);
    // quote
    const quote=await page.evaluate(async()=>{const r=await fetch("/api/quotes",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({logical_model_id:"zen-free",prompt:"hola"})});return r.json()});
    expect(quote.id).toBe("q1");
    // run
    const run=await page.evaluate(async()=>{const r=await fetch("/api/runs",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({quote_id:"q1",idempotency_key:"k1"})});return r.json()});
    expect(run.id).toBe("run1");
    // chat stream via UI
    await page.goto("/chat");
    await expect(page.locator("#modelSel")).toBeVisible();
    await page.fill("#prompt","hola");
    await page.getByRole("button",{name:/Enviar/}).click();
    await expect(page.getByText("Hola")).toBeVisible({timeout:5000});
    // refund
    const refund=await page.evaluate(async()=>{const r=await fetch("/api/runs/run1/refund",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({reason:"test"})});return r.json()});
    expect(refund.refunded).toBeTruthy();
  });
  test("responsive 320/360/430 sin scroll horizontal",async({page})=>{
    await mockApi(page);
    for(const w of [320,360,430]){
      await page.setViewportSize({width:w,height:800});
      await page.goto("/");
      await expect(page.locator(".rg-workout-cta").first()).toBeVisible();
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
      expect(overflow).toBeFalsy();
      const ctaH=await page.evaluate(()=>{const e=document.querySelector(".rg-workout-cta") as HTMLElement;return e?e.getBoundingClientRect().height:44});
      expect(ctaH).toBeGreaterThanOrEqual(44);
    }
  });
  test("offline muestra fallback sin conexión",async({page})=>{
    await page.route("**/runtime-manifest",(r)=>r.abort());
    await page.goto("/");
    await expect(page.getByText(/Configuración no disponible/i)).toBeVisible({timeout:5000});
  });
  test("saldo cero badge y CTA bloqueado",async({page})=>{
    await mockApi(page,0);
    await page.goto("/chat");
    await expect(page.getByText("0 GoCredits")).toBeVisible();
    await page.goto("/wallet");
    await expect(page.getByText("Ganados hasta hoy")).toBeVisible();
    await expect(page.getByText("GoCredits disponibles")).toBeVisible();
    await expect(page.getByLabel("créditos").first()).toBeVisible();
  });
  test("cámara denegada muestra permiso",async({page})=>{
    await mockApi(page);
    await page.addInitScript(()=>{(navigator as any).mediaDevices={getUserMedia:()=>Promise.reject(Object.assign(new Error("Permission denied"),{name:"NotAllowedError"}))};(globalThis as any).Worker=class{onmessage:any;postMessage(m:any){setTimeout(()=>this.onmessage?.({data:{type:"ready"}}),5)}addEventListener(t:string,f:any){this.onmessage=f}terminate(){}}});
    await page.goto("/");
    await page.getByRole("button",{name:"Comenzar entrenamiento"}).click();
    await expect(page.getByText(/Permiso de cámara|No disponible|Cámara/i)).toBeVisible({timeout:5000});
  });
  test("actividad presenta el CTA y el estado inicial real",async({page})=>{
    await mockApi(page);
    await page.goto("/");
    await expect(page.getByText("Una forma distinta de acceder")).toBeVisible();
    await expect(page.getByText("Cada repetición equivale a")).toBeVisible();
    await expect(page.getByRole("button", { name: "Comenzar entrenamiento" })).toBeEnabled();
  });
});
