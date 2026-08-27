const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "change-me-now";
const DATA = path.join(__dirname, "data", "store.json");

function load() {
  if (!fs.existsSync(DATA)) {
    const initial = {
      settings: {brand:"Only Flix", whatsapp:"8801996088845", website:"onlyflixbd.com"},
      products: [
        {id:1,name:"Netflix Premium",category:"Netflix",price:299,duration:"1 Month",badge:"BEST SELLER",active:true},
        {id:2,name:"Prime Video",category:"Prime Video",price:199,duration:"1 Month",badge:"POPULAR",active:true},
        {id:3,name:"YouTube Premium",category:"YouTube",price:249,duration:"1 Month",badge:"TOP CHOICE",active:true}
      ],
      orders: []
    };
    fs.writeFileSync(DATA, JSON.stringify(initial,null,2));
  }
  return JSON.parse(fs.readFileSync(DATA,"utf8"));
}
function save(db){ fs.writeFileSync(DATA, JSON.stringify(db,null,2)); }
function auth(req,res,next){ if(req.session && req.session.admin) return next(); res.status(401).json({error:"Unauthorized"}); }

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({secret:process.env.SESSION_SECRET || "only-flix-local-secret",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax"}}));
app.use(express.static(path.join(__dirname,"public")));

app.get("/api/session",(req,res)=>res.json({loggedIn:!!(req.session&&req.session.admin)}));
app.post("/api/login",(req,res)=>{
  const {username,password}=req.body;
  if(username===ADMIN_USER && password===ADMIN_PASS){req.session.admin=true; return res.json({ok:true});}
  res.status(401).json({error:"Invalid login"});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));

app.get("/api/store",(req,res)=>res.json(load()));
app.get("/api/admin",(req,res)=>{
  if(!req.session.admin) return res.status(401).json({error:"Unauthorized"});
  res.json(load());
});
app.post("/api/settings",auth,(req,res)=>{
  const db=load(); db.settings={...db.settings,...req.body}; save(db); res.json(db.settings);
});
app.post("/api/products",auth,(req,res)=>{
  const db=load();
  const p={id:Date.now(),name:String(req.body.name||"New Service"),category:String(req.body.category||"Other"),price:Number(req.body.price||0),duration:String(req.body.duration||"1 Month"),badge:String(req.body.badge||""),active:req.body.active!==false};
  db.products.push(p); save(db); res.json(p);
});
app.put("/api/products/:id",auth,(req,res)=>{
  const db=load(); const id=Number(req.params.id); const p=db.products.find(x=>x.id===id);
  if(!p) return res.status(404).json({error:"Not found"});
  Object.assign(p,{...req.body,price:Number(req.body.price??p.price),active:req.body.active!==false}); save(db); res.json(p);
});
app.delete("/api/products/:id",auth,(req,res)=>{
  const db=load(); db.products=db.products.filter(x=>x.id!==Number(req.params.id)); save(db); res.json({ok:true});
});
app.post("/api/orders", (req,res)=>{
  const db=load();
  const o={id:"OF-"+Date.now(),createdAt:new Date().toISOString(),status:"Pending",name:String(req.body.name||""),phone:String(req.body.phone||""),product:String(req.body.product||""),note:String(req.body.note||"")};
  db.orders.unshift(o); save(db); res.json(o);
});
app.put("/api/orders/:id",auth,(req,res)=>{
  const db=load(); const o=db.orders.find(x=>x.id===req.params.id);
  if(!o) return res.status(404).json({error:"Not found"});
  o.status=String(req.body.status||o.status); save(db); res.json(o);
});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

app.listen(PORT,()=>console.log(`Only Flix running on http://localhost:${PORT}`));