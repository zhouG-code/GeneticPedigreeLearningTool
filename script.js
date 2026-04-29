/* 数据结构 */
let persons = []; // {id,name,sex,gen,affected,genotype,fatherId,motherId}
let nextId = 1;

const byId = id => persons.find(p => p.id === id);
const $ = sel => document.querySelector(sel);
const svg = $("#svg");
const viewport = $("#viewport");

/* UI refs */
const modeSelect = $("#modeSelect");
const modeHint = $("#modeHint");
const nameInput = $("#nameInput");
const sexInput = $("#sexInput");
const genInput = $("#genInput");
const affectedInput = $("#affectedInput");
const genotypeInput = $("#genotypeInput");
const fatherInput = $("#fatherInput");
const motherInput = $("#motherInput");
const addBtn = $("#addBtn");
const resetBtn = $("#resetBtn");
const personList = $("#personList");
const exportBtn = $("#exportBtn");
const importBtn = $("#importBtn");
const importFile = $("#importFile");
const clearAllBtn = $("#clearAllBtn");
const calcFather = $("#calcFather");
const calcMother = $("#calcMother");
const childSex = $("#childSex");
const calcBtn = $("#calcBtn");
const calcResult = $("#calcResult");
const genoHint = $("#genoHint");
const themeToggle = $("#themeToggle");
const searchInput = $("#searchInput");
const sortSelect = $("#sortSelect");
const zoomInBtn = $("#zoomInBtn");
const zoomOutBtn = $("#zoomOutBtn");
const resetViewBtn = $("#resetViewBtn");
const zoomLabel = $("#zoomLabel");

/* 模式与基因型选项 */
const GENOTYPES = {
  AR: [
    {v:"AA", label:"AA（正常）"},
    {v:"Aa", label:"Aa（携带者）"},
    {v:"aa", label:"aa（患病）"},
  ],
  AD: [
    {v:"aa", label:"aa（正常）"},
    {v:"Aa", label:"Aa（患病）"},
    {v:"AA", label:"AA（患病，少见）"},
  ],
  XLR_M: [
    {v:"XA Y", label:"X^A Y（正常）"},
    {v:"Xa Y", label:"X^a Y（患病）"},
  ],
  XLR_F: [
    {v:"XA XA", label:"X^A X^A（正常）"},
    {v:"XA Xa", label:"X^A X^a（携带者）"},
    {v:"Xa Xa", label:"X^a X^a（患病）"},
  ],
  XLD_M: [
    {v:"XA Y", label:"X^A Y（患病）"},
    {v:"Xa Y", label:"X^a Y（正常）"},
  ],
  XLD_F: [
    {v:"XA XA", label:"X^A X^A（患病）"},
    {v:"XA Xa", label:"X^A X^a（患病）"},
    {v:"Xa Xa", label:"X^a X^a（正常）"},
  ],
};

function updateModeHint() {
  const m = modeSelect.value;
  const map = {
    AR:"AR: aa患病；Aa携带；AA正常",
    AD:"AD: 含A即患病（Aa/AA），aa正常",
    XLR:"X连隐: 男X^aY患病；女X^aX^a患病，X^AX^a携带",
    XLD:"X连显: 男X^AY患病；女带X^A即患病",
  };
  modeHint.textContent = map[m];
}

/* 根据模式与性别填充可选基因型 */
function fillGenotypeOptions() {
  const m = modeSelect.value;
  const sex = sexInput.value;
  genotypeInput.innerHTML = "";
  const opts = (m==="AR"||m==="AD") ? GENOTYPES[m]
              : (m==="XLR" ? (sex==="M"?GENOTYPES.XLR_M:GENOTYPES.XLR_F)
                           : (sex==="M"?GENOTYPES.XLD_M:GENOTYPES.XLD_F));
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "（未知）";
  genotypeInput.appendChild(placeholder);
  opts.forEach(o=>{
    const op=document.createElement("option");
    op.value=o.v; op.textContent=o.label;
    genotypeInput.appendChild(op);
  });
  genoHint.style.display = "block";
}

/* 受影响判定 */
function isAffected(p) {
  if (p.affected === "yes") return true;
  if (p.affected === "no") return false;
  const m = modeSelect.value;
  const g = p.genotype || "";
  if (!g) return false;
  if (m==="AR") return g==="aa";
  if (m==="AD") return g==="Aa" || g==="AA";
  if (m==="XLR") {
    if (p.sex==="M") return g==="Xa Y";
    return g==="Xa Xa";
  }
  if (m==="XLD") {
    if (p.sex==="M") return g==="XA Y";
    return g==="XA Xa" || g==="XA XA";
  }
  return false;
}

/* 载体判定（教育显示） */
function isCarrier(p) {
  const m = modeSelect.value;
  const g = p.genotype || "";
  if (m==="AR") return g==="Aa";
  if (m==="XLR" && p.sex==="F") return g==="XA Xa";
  return false;
}

/* 添加或更新人物 */
function upsertPerson() {
  const name = nameInput.value.trim() || ("P"+nextId);
  const sex = sexInput.value;
  const gen = Math.max(1, parseInt(genInput.value||"1"));
  const affected = affectedInput.value;
  const genotype = genotypeInput.value || "";
  const fatherId = parseInt(fatherInput.value||"0")||null;
  const motherId = parseInt(motherInput.value||"0")||null;

  if (fatherId) {
    const f = byId(fatherId);
    if (f && f.sex!=="M") { alert("所选父亲不是男性"); return; }
  }
  if (motherId) {
    const m = byId(motherId);
    if (m && m.sex!=="F") { alert("所选母亲不是女性"); return; }
  }

  const editingId = addBtn.dataset.editing ? parseInt(addBtn.dataset.editing) : null;
  if (editingId) {
    const p = byId(editingId);
    Object.assign(p, {name,sex,gen,affected,genotype,fatherId,motherId});
  } else {
    persons.push({id: nextId++, name, sex, gen, affected, genotype, fatherId, motherId});
  }
  refreshAll();
  resetForm();
}

/* 重置表单 */
function resetForm() {
  addBtn.textContent = "添加/更新人物";
  delete addBtn.dataset.editing;
  nameInput.value = "";
  sexInput.value = "M";
  genInput.value = 1;
  affectedInput.value = "unknown";
  genotypeInput.value = "";
  fatherInput.value = "";
  motherInput.value = "";
  fillGenotypeOptions();
}

/* 列表、下拉、画布刷新 */
function refreshAll() {
  refreshPersonList();
  refreshParentOptions();
  drawPedigree();
}

function personMatchesSearch(p, kw) {
  if (!kw) return true;
  kw = kw.toLowerCase();
  return (p.name||"").toLowerCase().includes(kw) || String(p.id).includes(kw);
}

function refreshPersonList() {
  personList.innerHTML = "";
  const kw = searchInput.value.trim();
  let sorted = [...persons];
  if (sortSelect.value==="gen") sorted.sort((a,b)=>a.gen-b.gen || a.id-b.id);
  if (sortSelect.value==="id") sorted.sort((a,b)=>a.id-b.id);
  if (sortSelect.value==="name") sorted.sort((a,b)=>(a.name||"").localeCompare(b.name||"")||a.id-b.id);
  sorted.filter(p=>personMatchesSearch(p, kw)).forEach(p=>{
    const div = document.createElement("div");
    div.className = "person-item";
    const left = document.createElement("div");
    const right = document.createElement("div");
    left.innerHTML = `<span class="pill">#${p.id}</span> ${p.name}（${p.sex==="M"?"男":"女"} · 第${p.gen}代）
      <span class="${isAffected(p)?'danger':(isCarrier(p)?'carrier':'success')}">
        ${isAffected(p) ? "患病" : (isCarrier(p)?"携带/可能携带":"未患病")}
      </span>
      ${p.genotype?` <span class="nowrap">[${p.genotype}]</span>`:""}
      ${p.fatherId?` 父:${byId(p.fatherId)?.name}`:""}${p.motherId?` 母:${byId(p.motherId)?.name}`:""}`;
    const editBtn = document.createElement("button");
    editBtn.textContent = "编辑";
    editBtn.className = "ghost";
    editBtn.onclick = ()=> {
      addBtn.textContent = "保存修改";
      addBtn.dataset.editing = p.id;
      nameInput.value = p.name;
      sexInput.value = p.sex;
      genInput.value = p.gen;
      affectedInput.value = p.affected;
      fillGenotypeOptions();
      genotypeInput.value = p.genotype || "";
      fatherInput.value = p.fatherId||"";
      motherInput.value = p.motherId||"";
      window.scrollTo({top:0, behavior:"smooth"});
    };
    const delBtn = document.createElement("button");
    delBtn.textContent = "删除";
    delBtn.className = "ghost";
    delBtn.onclick = () => {
      persons = persons.filter(x=>x.id!==p.id).map(x=>{
        if (x.fatherId===p.id) x.fatherId=null;
        if (x.motherId===p.id) x.motherId=null;
        return x;
      });
      refreshAll();
    };
    right.appendChild(editBtn); right.appendChild(delBtn);
    div.appendChild(left); div.appendChild(right);
    personList.appendChild(div);
  });
}

function refreshParentOptions() {
  [fatherInput, calcFather].forEach(sel=>{
    const v = sel.value;
    sel.innerHTML = '<option value="">（无）</option>';
    persons.filter(p=>p.sex==="M").forEach(p=>{
      const op = document.createElement("option");
      op.value = p.id; op.textContent = `#${p.id} ${p.name}`;
      sel.appendChild(op);
    });
    sel.value = v||"";
  });
  [motherInput, calcMother].forEach(sel=>{
    const v = sel.value;
    sel.innerHTML = '<option value="">（无）</option>';
    persons.filter(p=>p.sex==="F").forEach(p=>{
      const op = document.createElement("option");
      op.value = p.id; op.textContent = `#${p.id} ${p.name}`;
      sel.appendChild(op);
    });
    sel.value = v||"";
  });
}

/* 画网格 */
function drawGrid() {
  const width = 3000, height = 2000, step = 60;
  for (let x=0; x<width; x+=step) {
    const line = document.createElementNS("http://www.w3.org/2000/svg","line");
    line.setAttribute("x1", x); line.setAttribute("y1", 0);
    line.setAttribute("x2", x); line.setAttribute("y2", height);
    line.setAttribute("class","gridline");
    viewport.appendChild(line);
  }
  for (let y=0; y<height; y+=step) {
    const line = document.createElementNS("http://www.w3.org/2000/svg","line");
    line.setAttribute("x1", 0); line.setAttribute("y1", y);
    line.setAttribute("x2", 3000); line.setAttribute("y2", y);
    line.setAttribute("class","gridline");
    viewport.appendChild(line);
  }
}

/* 计算布局并绘制系谱 */
function drawPedigree() {
  viewport.innerHTML = "";
  drawGrid();

  const gens = {};
  persons.forEach(p=>{
    if (!gens[p.gen]) gens[p.gen] = [];
    gens[p.gen].push(p);
  });
  Object.values(gens).forEach(arr => arr.sort((a,b)=>a.id-b.id));

  const nodePos = new Map(); // id -> {x,y}
  const xGap = 160, yGap = 170;
  const genKeys = Object.keys(gens).map(n=>parseInt(n)).sort((a,b)=>a-b);
  genKeys.forEach((gIdx, gi)=>{
    const arr = gens[gIdx];
    arr?.forEach((p, pi)=>{
      const x = 140 + pi*xGap;
      const y = 100 + gi*yGap;
      nodePos.set(p.id, {x,y});
    });
  });

  // 父母-子代连线
  persons.forEach(child=>{
    if (child.fatherId && child.motherId) {
      const f = byId(child.fatherId), m = byId(child.motherId);
      if (!f || !m) return;
      const pf = nodePos.get(f.id), pm = nodePos.get(m.id), pc = nodePos.get(child.id);
      if (!pf || !pm || !pc) return;

      const midY = Math.min(pf.y, pm.y) + 30;
      const x1 = pf.x + 30, x2 = pm.x + 30;

      const spouse = document.createElementNS("http://www.w3.org/2000/svg","line");
      spouse.setAttribute("x1", Math.min(x1,x2));
      spouse.setAttribute("y1", midY);
      spouse.setAttribute("x2", Math.max(x1,x2));
      spouse.setAttribute("y2", midY);
      spouse.setAttribute("class", "link");
      viewport.appendChild(spouse);

      const midX = (x1 + x2)/2;
      const down = document.createElementNS("http://www.w3.org/2000/svg","line");
      down.setAttribute("x1", midX);
      down.setAttribute("y1", midY);
      down.setAttribute("x2", midX);
      down.setAttribute("y2", pc.y - 30);
      down.setAttribute("class","parent-bar");
      viewport.appendChild(down);

      const toChild = document.createElementNS("http://www.w3.org/2000/svg","line");
      toChild.setAttribute("x1", midX);
      toChild.setAttribute("y1", pc.y - 30);
      toChild.setAttribute("x2", pc.x + 30);
      toChild.setAttribute("y2", pc.y - 10);
      toChild.setAttribute("class","link");
      viewport.appendChild(toChild);
    }
  });

  // 节点
  persons.forEach(p=>{
    const pos = nodePos.get(p.id);
    if (!pos) return;
    const g = document.createElementNS("http://www.w3.org/2000/svg","g");
    g.setAttribute("class","node " + (p.sex==="M"?"male":"female") + " " + (isAffected(p)?"affected":(p.genotype? "":"unknown")));
    g.setAttribute("transform", `translate(${pos.x},${pos.y})`);
    g.addEventListener("click", ()=>{
      addBtn.textContent = "保存修改";
      addBtn.dataset.editing = p.id;
      nameInput.value = p.name;
      sexInput.value = p.sex;
      genInput.value = p.gen;
      affectedInput.value = p.affected;
      fillGenotypeOptions();
      genotypeInput.value = p.genotype || "";
      fatherInput.value = p.fatherId||"";
      motherInput.value = p.motherId||"";
      window.scrollTo({top:0, behavior:"smooth"});
    });

    if (p.sex==="M") {
      const rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
      rect.setAttribute("x",0); rect.setAttribute("y",0);
      rect.setAttribute("rx",7); rect.setAttribute("ry",7);
      rect.setAttribute("width",60); rect.setAttribute("height",40);
      g.appendChild(rect);
    } else {
      const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
      circle.setAttribute("cx",30); circle.setAttribute("cy",20);
      circle.setAttribute("r",20);
      g.appendChild(circle);
    }

    const label = document.createElementNS("http://www.w3.org/2000/svg","text");
    label.setAttribute("x", 30);
    label.setAttribute("y", 60);
    label.setAttribute("text-anchor", "middle");
    label.textContent = `${p.name}${p.genotype?` [${p.genotype}]`:""}`;
    g.appendChild(label);

    if (isCarrier(p)) {
      const t = document.createElementNS("http://www.w3.org/2000/svg","text");
      t.setAttribute("x",30); t.setAttribute("y", 76);
      t.setAttribute("text-anchor","middle");
      t.setAttribute("fill","#c084fc");
      t.textContent = "携带";
      g.appendChild(t);
    }

    // hover 提示
    g.addEventListener("mouseenter", (e)=>{
      const tip = document.createElementNS("http://www.w3.org/2000/svg","text");
      tip.setAttribute("x", 30);
      tip.setAttribute("y", -8);
      tip.setAttribute("text-anchor","middle");
      tip.setAttribute("fill", "var(--muted)");
      tip.setAttribute("data-tip","1");
      const st = `${p.sex==="M"?"男":"女"}·第${p.gen}代 ${isAffected(p)?"患病":(isCarrier(p)?"携带":"未患病")}`;
      tip.textContent = st;
      g.appendChild(tip);
    });
    g.addEventListener("mouseleave", ()=>{
      [...g.querySelectorAll('[data-tip="1"]')].forEach(n=>n.remove());
    });

    viewport.appendChild(g);
  });
}

/* 概率计算 */
function calcChildProb() {
  const fId = parseInt(calcFather.value||"0");
  const mId = parseInt(calcMother.value||"0");
  const sexSel = childSex.value;
  if (!fId || !mId) { calcResult.innerHTML = "请选择父亲与母亲。"; return; }
  const father = byId(fId), mother = byId(mId);
  const mode = modeSelect.value;

  if (!father?.genotype || !mother?.genotype) {
    calcResult.innerHTML = "请先为父母设置与当前模式匹配的基因型。";
    return;
  }

  const result = computeMendel(mode, father, mother);
  let out = "";
  function pct(x){ return (x*100).toFixed(1) + "%"; }

  if (sexSel==="M") {
    out += `男孩：患病 ${pct(result.boy.affected)}；携带 ${pct(result.boy.carrier)}；未患病 ${pct(result.boy.unaffected)}。`;
  } else if (sexSel==="F") {
    out += `女孩：患病 ${pct(result.girl.affected)}；携带 ${pct(result.girl.carrier)}；未患病 ${pct(result.girl.unaffected)}。`;
  } else {
    out += `男女未知（1:1）：患病 ${pct(result.any.affected)}；携带 ${pct(result.any.carrier)}；未患病 ${pct(result.any.unaffected)}。`;
  }

  calcResult.innerHTML = out;
}

function gametesAR(g){
  if (g==="AA") return [{A:1}];
  if (g==="Aa") return [{A:0.5},{a:0.5}];
  if (g==="aa") return [{a:1}];
  return [{A:0.5},{a:0.5}];
}
function phenotypeAR(G){
  if (G==="aa") return {affected:true, carrier:false};
  if (G==="Aa"||G==="aA") return {affected:false, carrier:true};
  return {affected:false, carrier:false};
}
function gametesAD(g){ return gametesAR(g); }
function phenotypeAD(G){
  if (G==="AA"||G==="Aa"||G==="aA") return {affected:true, carrier:false};
  return {affected:false, carrier:false};
}
function gametesX_M(g){
  if (g.includes("XA")) return [{XA:1, Y:1}];
  if (g.includes("Xa")) return [{Xa:1, Y:1}];
  return [{XA:1, Y:1}];
}
function gametesX_F(g){
  if (g==="XA XA") return [{XA:1}];
  if (g==="Xa Xa") return [{Xa:1}];
  if (g==="XA Xa"||g==="Xa XA") return [{XA:0.5},{Xa:0.5}];
  return [{XA:0.5},{Xa:0.5}];
}
function phenotypeXLR(sex, X){
  if (sex==="M") { return (X==="Xa") ? {affected:true, carrier:false} : {affected:false, carrier:false}; }
  if (X[0]==="Xa" && X[1]==="Xa") return {affected:true, carrier:false};
  if (X.includes("Xa")) return {affected:false, carrier:true};
  return {affected:false, carrier:false};
}
function phenotypeXLD(sex, X){
  if (sex==="M") { return (X==="XA") ? {affected:true, carrier:false} : {affected:false, carrier:false}; }
  if (X.includes("XA")) return {affected:true, carrier:false};
  return {affected:false, carrier:false};
}
function computeMendel(mode, father, mother){
  const res = {boy:{affected:0,carrier:0,unaffected:0}, girl:{affected:0,carrier:0,unaffected:0}};
  if (mode==="AR"||mode==="AD") {
    const gf = gametesAR(father.genotype);
    const gm = gametesAR(mother.genotype);
    for (const fx of gf) for (const mx of gm) {
      const fa = Object.keys(fx)[0], ma = Object.keys(mx)[0];
      const p = fx[fa]*(mx[ma]);
      const G = fa+ma;
      const ph = mode==="AR" ? phenotypeAR(G) : phenotypeAD(G);
      ["boy","girl"].forEach(s=>{
        if (ph.affected) res[s].affected += p*0.5;
        else if (ph.carrier) res[s].carrier += p*0.5;
        else res[s].unaffected += p*0.5;
      });
    }
  } else if (mode==="XLR"||mode==="XLD") {
    const gf = gametesX_M(father.genotype);
    const gm = gametesX_F(mother.genotype);
    for (const fgm of gf) for (const mgm of gm) {
      const fx = fgm, mx = mgm;
      if (fx.Y) {
        if (mx.XA) {
          const ph = (mode==="XLR") ? phenotypeXLR("M","XA") : phenotypeXLD("M","XA");
          res.boy[ ph.affected ? "affected":"unaffected" ] += fx.Y * mx.XA;
        }
        if (mx.Xa) {
          const ph = (mode==="XLR") ? phenotypeXLR("M","Xa") : phenotypeXLD("M","Xa");
          res.boy[ ph.affected ? "affected":"unaffected" ] += fx.Y * mx.Xa;
        }
      }
      if (fx.XA || fx.Xa) {
        if (mx.XA) {
          const X = [(fx.XA?"XA":"Xa"), "XA"];
          const ph = (mode==="XLR") ? phenotypeXLR("F",X) : phenotypeXLD("F",X);
          const prob = (fx.XA?fx.XA:fx.Xa) * mx.XA;
          if (ph.affected) res.girl.affected += prob;
          else if (ph.carrier) res.girl.carrier += prob;
          else res.girl.unaffected += prob;
        }
        if (mx.Xa) {
          const X = [(fx.XA?"XA":"Xa"), "Xa"];
          const ph = (mode==="XLR") ? phenotypeXLR("F",X) : phenotypeXLD("F",X);
          const prob = (fx.XA?fx.XA:fx.Xa) * mx.Xa;
          if (ph.affected) res.girl.affected += prob;
          else if (ph.carrier) res.girl.carrier += prob;
          else res.girl.unaffected += prob;
        }
      }
    }
  }
  const any = {
    affected: (res.boy.affected + res.girl.affected)/2,
    carrier: (res.boy.carrier + res.girl.carrier)/2,
    unaffected: (res.boy.unaffected + res.girl.unaffected)/2
  };
  return { ...res, any };
}

/* 视图缩放/拖拽 */
let scale = 1, tx = 0, ty = 0;
const clamp = (v, a, b)=>Math.max(a, Math.min(b, v));
function applyTransform(){ viewport.setAttribute("transform", `translate(${tx},${ty}) scale(${scale})`); zoomLabel.textContent = Math.round(scale*100)+"%"; }
function zoomAt(factor, cx, cy){
  const prev = scale;
  scale = clamp(scale*factor, 0.3, 3);
  const k = scale/prev;
  // 以光标为中心缩放：平移修正
  tx = cx - k*(cx - tx);
  ty = cy - k*(cy - ty);
  applyTransform();
}
function resetView(){ scale=1; tx=40; ty=40; applyTransform(); }

let isPanning = false, lastX=0, lastY=0, spaceDown=false;
svg.addEventListener("mousedown", (e)=>{ isPanning = true; lastX=e.clientX; lastY=e.clientY; });
window.addEventListener("mouseup", ()=>{ isPanning=false; });
window.addEventListener("mousemove", (e)=>{
  if (!isPanning && !spaceDown) return;
  if (e.buttons!==1 && !spaceDown) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  tx += dx; ty += dy;
  lastX = e.clientX; lastY = e.clientY;
  applyTransform();
});
svg.addEventListener("wheel", (e)=>{
  e.preventDefault();
  const rect = svg.getBoundingClientRect();
  const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
  zoomAt(e.deltaY<0 ? 1.1 : 0.9, cx, cy);
},{passive:false});
window.addEventListener("keydown", (e)=>{ if (e.code==="Space") { spaceDown=true; svg.style.cursor="grabbing"; } });
window.addEventListener("keyup", (e)=>{ if (e.code==="Space") { spaceDown=false; svg.style.cursor="default"; } });

zoomInBtn.addEventListener("click", ()=> zoomAt(1.2, svg.clientWidth/2, svg.clientHeight/2));
zoomOutBtn.addEventListener("click", ()=> zoomAt(1/1.2, svg.clientWidth/2, svg.clientHeight/2));
resetViewBtn.addEventListener("click", resetView);

/* 事件绑定 */
modeSelect.addEventListener("change", ()=>{ updateModeHint(); fillGenotypeOptions(); drawPedigree(); });
sexInput.addEventListener("change", ()=> fillGenotypeOptions());
addBtn.addEventListener("click", upsertPerson);
resetBtn.addEventListener("click", resetForm);
exportBtn.addEventListener("click", ()=>{
  const data = JSON.stringify({mode:modeSelect.value, persons}, null, 2);
  const blob = new Blob([data], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "pedigree.json"; a.click();
  URL.revokeObjectURL(url);
});
importBtn.addEventListener("click", ()=> importFile.click());
importFile.addEventListener("change", (e)=>{
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try {
      const data = JSON.parse(reader.result);
      persons = (data.persons||[]).map(x=>({...x}));
      nextId = persons.reduce((m,p)=>Math.max(m,p.id),0)+1;
      if (data.mode) modeSelect.value = data.mode;
      updateModeHint();
      refreshAll();
      resetView();
    } catch(err){ alert("JSON格式不正确"); }
  };
  reader.readAsText(f);
});
clearAllBtn.addEventListener("click", ()=>{
  if (!confirm("确定清空所有数据？")) return;
  persons = []; nextId = 1; refreshAll(); resetForm(); resetView();
});
calcBtn.addEventListener("click", calcChildProb);
searchInput.addEventListener("input", refreshPersonList);
sortSelect.addEventListener("change", refreshPersonList);

themeToggle.addEventListener("click", ()=>{
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark")?"dark":"light");
});

/* 初始化 */
(function initTheme(){
  const pref = localStorage.getItem("theme") || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  if (pref==="dark") document.body.classList.add("dark");
})();
updateModeHint();
fillGenotypeOptions();
refreshAll();
resetForm();
resetView();
