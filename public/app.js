
(()=>{'use strict';
const LOGO_MARK='/assets/logo-marca.webp';
const LOGO_LOCKUP='/assets/logo-completo.webp';
let tituloAntesImpressao=null;
const STATUS=['Aprovado','Em execução','Aguardando peça','Pronto para retirada','Entregue','Cancelado'];
const STATUS_ANTIGOS=['Recebido','Em avaliação','Aguardando aprovação'];
const APPROVAL=['Pendente','Aprovado','Recusado'];
const TYPES=['Violão','Guitarra','Baixo','Cavaquinho','Ukulele','Viola','Outro'];
const DEFAULT={version:3,seq:0,customers:[],instruments:[],orders:[],settings:{name:'Bueno Luthier',phone:'',address:'',document:'',terms:'O orçamento e a execução dos serviços dependem de aprovação do cliente. Alterações no valor ou no prazo serão comunicadas previamente.',warranty:90}};
let data=structuredClone(DEFAULT),revision=0,saving=false,loginAtivo=false;const ui={page:'dashboard',modal:null,editId:null,customerForInstrument:null,search:'',filter:'Todos',toastTimeout:null,orderPhotos:[],photoFiles:[],uploading:false,orderDraft:null,customerOptionIndex:-1,customerSearchToken:0,customerSearchTimer:null,customerSearchLoading:false,customerSearchError:'',customerSearchQuery:null,customerSearchResults:[],customerSearchTotal:null};
async function init(){try{const r=await fetch('/api/state',{cache:'no-store'});const result=await r.json();if(r.status===401){location.assign('/entrar');return}if(!r.ok)throw Error(result.erro||'Erro ao carregar o banco');loginAtivo=Boolean(result.loginAtivo);data=result.state;revision=result.revision;render()}catch(e){document.getElementById('app').innerHTML='<main style="font:16px system-ui;max-width:620px;margin:12vh auto;padding:30px;line-height:1.6"><h1>Não foi possível conectar ao banco de dados</h1><p>Execute <code>npm start</code> no terminal do VS Code e abra <strong>http://localhost:3000</strong>.</p><p>Detalhes: '+h(e.message)+'</p><button onclick="location.reload()">Tentar novamente</button></main>'}}
async function save(anterior){if(saving){showToast('Aguarde a gravação em andamento.',true);return false}saving=true;try{const r=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,state:data})});const resultado=await r.json();if(!r.ok)throw Error(resultado.erro||'Falha ao salvar');revision=resultado.revision;data=resultado.state;return true}catch(e){data=anterior;showToast('Não foi possível salvar: '+e.message,true);return false}finally{saving=false}}
function h(v=''){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function id(){return String(Date.now())+'-'+Math.random().toString(36).slice(2,9)}
function today(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function date(v){if(!v)return '—';const [y,m,d]=String(v).slice(0,10).split('-');return y&&m&&d?`${d}/${m}/${y}`:'—'}
function money(n){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0)}
function num(n){return Math.max(0,Number(n)||0)}
function cust(id){return data.customers.find(x=>x.id===id)}
function instr(id){return data.instruments.find(x=>x.id===id)}
function orderTotal(o){return (o.items||[]).reduce((a,i)=>a+num(i.quantity)*num(i.price),0)}
function labelInstrument(i){return i?`${i.type||'Instrumento'}${i.brand?' • '+i.brand:''}${i.model?' '+i.model:''}`:'Instrumento não localizado'}
function statusClass(s){return s==='Entregue'?'done':s==='Pronto para retirada'?'ready':s==='Aprovado'||s==='Em execução'?'progress':s==='Aguardando peça'?'wait':s==='Cancelado'?'cancel':''}
function opcaoStatusAntigo(atual){return STATUS_ANTIGOS.includes(atual)?`<option value="${h(atual)}" selected hidden>${h(atual)} (anterior)</option>`:''}
function statusRapido(o){return `<span class="status-select-wrap ${statusClass(o.status)}"><select class="status-quick" data-status-order="${h(o.id)}" aria-label="Alterar status da ordem ${h(o.number)}" title="Clique para alterar o status da O.S.">${opcaoStatusAntigo(o.status)}${STATUS.map(s=>`<option value="${h(s)}" ${o.status===s?'selected':''}>${h(s)}</option>`).join('')}</select></span>`}
function icon(name,size=18){const paths={dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',orders:'<path d="M8 3h8l4 4v14H4V3h4z"/><path d="M16 3v5h4M8 12h8M8 16h8"/>',clients:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5"/>',guitar:'<path d="M17 3l4 4M14 6l4 4M12 8l4 4M14 10l-3 3a5 5 0 1 1-7-1l3-3M18 2l4 4M7 15l2 2"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.08-1l2-1.5-2-3.5-2.35 1a7 7 0 0 0-1.7-1L14.5 3h-5L9 6a7 7 0 0 0-1.7 1l-2.3-1-2 3.5 2 1.5A7 7 0 0 0 5 13l-2 1.5 2 3.5 2.3-1a7 7 0 0 0 1.7 1l.5 3h5l.4-3a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5A7 7 0 0 0 19 12z"/>',plus:'<path d="M12 5v14M5 12h14"/>',printer:'<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6zM18 12h.01"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',arrow:'<path d="m9 18 6-6-6-6"/>',wallet:'<rect x="2" y="5" width="20" height="15" rx="2"/><path d="M2 9h20M16 15h3"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',check:'<path d="m5 12 4 4L19 6"/>',download:'<path d="M12 3v12m0 0 5-5m-5 5-5-5M4 17v4h16v-4"/>',upload:'<path d="M12 17V5m0 0 5 5m-5-5-5 5M4 17v4h16v-4"/>',edit:'<path d="M12 20h9M5 16l-1 4 4-1L19 8l-3-3L5 16z"/>',back:'<path d="m15 18-6-6 6-6"/>'};return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.orders}</svg>`}
function btn(txt,attrs='',type=''){return `<button class="btn ${type}" ${/\btype=/.test(attrs)?'':'type="button" '}${attrs}>${txt}</button>`}
function navBtn(page,text,ico){return `<button class="nav-btn ${ui.page===page?'active':''}" data-page="${page}">${icon(ico,18)}${text}</button>`}
function showToast(msg,error=false){const old=document.querySelector('.toast');old?.remove();const t=document.createElement('div');t.className='toast'+(error?' error':'');t.textContent=msg;document.body.append(t);clearTimeout(ui.toastTimeout);ui.toastTimeout=setTimeout(()=>t.remove(),3400)}
function shell(){
  const labels={
    dashboard:['Visão geral','Painel da oficina','Uma visão rápida dos serviços e do que precisa de atenção.'],
    orders:['Ordens de serviço','Ordens de serviço','Acompanhe os serviços, valores e prazos de entrega.'],
    customers:['Clientes','Clientes','Consulte e mantenha os contatos dos clientes da oficina.'],
    settings:['Configurações','Configurações','Dados da oficina, impressão e cópias de segurança.']
  };
  const [crumb,title,sub]=labels[ui.page]||labels.dashboard;
  const hoje=new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
  const acoes=ui.page==='dashboard'
    ?btn(icon('plus',16)+' Novo cliente','data-open="customer"')+btn(icon('plus',16)+' Nova ordem de serviço','data-open="order"','primary')
    :ui.page==='customers'
      ?btn(icon('plus',16)+' Novo cliente','data-open="customer"','primary')
      :ui.page==='orders'
        ?btn(icon('plus',16)+' Nova ordem de serviço','data-open="order"','primary')
        :'';
  return `<div class="app-shell"><aside class="sidebar">
    <div class="brand"><span class="brand-mark"><img src="${LOGO_MARK}" alt="Monograma Bueno Luthier"></span><div><div class="brand-title">BUENO<br>LUTHIER</div><div class="brand-sub">Gestão da oficina</div></div></div>
    <div class="nav-label">Navegação</div>
    <div class="nav-items">${navBtn('dashboard','Painel','dashboard')}${navBtn('orders','Ordens de serviço','orders')}${navBtn('customers','Clientes','clients')}${navBtn('settings','Configurações','settings')}</div>
    <div class="side-bottom"><div class="office-indicator"><span class="office-dot"></span>Ambiente da oficina</div><div>Bueno Luthier</div><div>Organização e atendimento</div>${loginAtivo?'<button class="sidebar-logout" type="button" data-logout>Sair da conta</button>':''}</div>
  </aside><main class="content">
    <div class="utility-strip"><span>Oficina <span class="utility-separator">/</span> ${h(crumb)}</span><div class="utility-right"><span>${h(hoje)}</span><span class="utility-pipe"></span><span>Área de trabalho</span></div></div>
    <div class="topbar"><div><div class="breadcrumb">${ui.page==='dashboard'?'Operação diária':h(crumb)}</div><h1 class="page-title">${h(title)}</h1><p class="subtext">${h(sub)}</p></div><div class="actions">${acoes}</div></div>
    ${pageHtml()}<div class="footer"><span>© ${new Date().getFullYear()} Bueno Luthier</span></div>
  </main></div>${ui.modal?modalHtml():''}`;
}
function pageHtml(){return ui.page==='dashboard'?dashboard():ui.page==='orders'?ordersPage():ui.page==='customers'?customersPage():settingsPage()}
function metric(name,val,small,ico){return `<div class="metric"><div class="metric-top">${name}<span class="metric-icon">${icon(ico,18)}</span></div><div class="metric-num">${val}</div><small>${small}</small></div>`}
function dashboard(){
  const active=data.orders.filter(o=>!['Entregue','Cancelado'].includes(o.status));
  const waitingParts=data.orders.filter(o=>o.status==='Aguardando peça');
  const ready=data.orders.filter(o=>o.status==='Pronto para retirada');
  const received=data.orders.reduce((total,o)=>total+num(o.paid),0);
  const query=ui.search.toLocaleLowerCase('pt-BR').trim();
  const filtered=data.orders.filter(o=>(ui.filter==='Todos'||o.status===ui.filter)&&[
    o.number,cust(o.customerId)?.name,cust(o.customerId)?.phone,
    instr(o.instrumentId)?.type,instr(o.instrumentId)?.brand,instr(o.instrumentId)?.model
  ].join(' ').toLocaleLowerCase('pt-BR').includes(query))
  .sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
  const visible=filtered.slice(0,12);
  const metrics=[
    ['Em andamento',String(active.length).padStart(2,'0'),'Ordens abertas'],
    ['Aguardando peça',String(waitingParts.length).padStart(2,'0'),'Ordens aguardando material'],
    ['Prontos para retirada',String(ready.length).padStart(2,'0'),'Aguardando cliente'],
    ['Pagamentos registrados',money(received),'Total recebido']
  ];
  const prio=(number,title,desc,filter)=>`<button type="button" class="priority-item" ${filter?`data-priority="${h(filter)}"`:'data-page="orders"'}><span class="priority-number">${number}</span><span><strong>${title}</strong><small>${desc}</small></span>${icon('arrow',15)}</button>`;
  return `<section class="dashboard-stats" aria-label="Resumo dos atendimentos">${metrics.map(([label,value,sub])=>`<div class="dashboard-stat"><div class="dashboard-stat-label">${label}</div><div class="dashboard-stat-value">${value}</div><div class="dashboard-stat-desc">${sub}</div></div>`).join('')}</section>
  <div class="dashboard-workspace">
    <section class="dashboard-panel" aria-label="Últimas ordens de serviço">
      <div class="dashboard-panel-head"><div><h2>Últimas ordens de serviço</h2><p>Acompanhe serviços em andamento e ordens finalizadas.</p></div><button type="button" class="dashboard-text-link" data-page="orders">Ver todas ${icon('arrow',15)}</button></div>
      <div class="dashboard-controls"><div class="searchbox">${icon('search',16)}<input id="listing-search" class="input" aria-label="Buscar ordem" placeholder="Buscar cliente ou número da O.S." value="${h(ui.search)}"></div><select id="listing-filter" aria-label="Filtrar ordens por status"><option value="Todos">Todos os status</option>${STATUS.map(status=>`<option value="${h(status)}" ${ui.filter===status?'selected':''}>${h(status)}</option>`).join('')}</select></div>
      ${visible.length?`<div class="table-scroll"><table class="data-table dashboard-table"><thead><tr><th>O.S.</th><th>Cliente / instrumento</th><th>Entrada</th><th>Status</th><th>Valor</th></tr></thead><tbody>${visible.map(o=>`<tr><td class="clickable" data-view="${h(o.id)}"><span class="osno">${h(o.number)}</span></td><td class="clickable" data-view="${h(o.id)}"><div class="cell-main">${h(cust(o.customerId)?.name||'Cliente')}</div><div class="cell-sub">${h(labelInstrument(instr(o.instrumentId)))}</div></td><td class="clickable" data-view="${h(o.id)}">${date(o.receivedDate)}</td><td>${statusRapido(o)}</td><td>${money(orderTotal(o))}</td></tr>`).join('')}</tbody></table></div>`:`<div class="dashboard-empty"><strong>${query||ui.filter!=='Todos'?'Nenhuma ordem encontrada':'Nenhuma ordem cadastrada'}</strong><p>${query||ui.filter!=='Todos'?'Altere a busca ou o filtro para ver outros atendimentos.':'Abra uma nova O.S. para registrar o primeiro atendimento.'}</p>${!query&&ui.filter==='Todos'?btn(icon('plus',15)+' Nova ordem de serviço','data-open="order"','primary'):''}</div>`}
      <div class="dashboard-table-footer"><span>${visible.length} de ${filtered.length} ordem(ns) exibida(s)</span><span>Atualização rápida de status disponível</span></div>
    </section>
    <aside class="dashboard-priorities" aria-label="Prioridades da oficina"><div class="dashboard-priorities-head"><h2>Prioridades</h2><p>O que merece atenção agora</p></div>
      <div class="dashboard-priorities-body">${prio('01','Aguardando peça',waitingParts.length===1?'1 ordem aguardando peça.':`${waitingParts.length} ordens aguardando peça.`,'Aguardando peça')}${prio('02','Instrumentos prontos',ready.length===1?'1 instrumento aguardando retirada.':`${ready.length} instrumentos aguardando retirada.`,'Pronto para retirada')}${prio('03','Ordens recentes',`${data.orders.length} atendimento(s) registrado(s).`,'')}</div>
      <button type="button" class="dashboard-priorities-footer" data-page="orders">Abrir todas as ordens ${icon('arrow',15)}</button>
    </aside>
  </div>`;
}
function empty(title,subtitle,type=''){return `<div class="empty"><span class="empty-symbol">♪</span><strong>${title}</strong>${subtitle}${type==='orders'?'<div style="margin-top:15px">'+btn('Nova ordem','data-open="order"','primary')+'</div>':''}</div>`}
function searchTools(placeholder,filter=false){return `<div class="tools"><div class="searchbox">${icon('search',17)}<input id="listing-search" class="input" placeholder="${placeholder}" value="${h(ui.search)}" aria-label="Pesquisar"></div>${filter?`<select id="listing-filter" aria-label="Filtrar status"><option value="Todos">Todos os status</option>${STATUS.map(s=>`<option value="${h(s)}" ${ui.filter===s?'selected':''}>${h(s)}</option>`).join('')}</select>`:''}</div>`}
function ordersPage(){const q=ui.search.toLowerCase().trim();let items=[...data.orders].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));items=items.filter(o=>(ui.filter==='Todos'||o.status===ui.filter)&&[o.number,cust(o.customerId)?.name,cust(o.customerId)?.phone,instr(o.instrumentId)?.brand,instr(o.instrumentId)?.model,instr(o.instrumentId)?.serial].join(' ').toLowerCase().includes(q));return `${searchTools('Buscar por O.S., cliente, marca ou modelo…',true)}<section class="panel"><div class="panel-hd"><span class="panel-title">Ordens registradas</span><span class="panel-meta">${items.length} registro(s)</span></div>${items.length?`<div class="table-scroll"><table class="data-table"><thead><tr><th>O.S. / entrada</th><th>Cliente</th><th>Instrumento</th><th>Previsão</th><th>Status</th><th>Orçamento</th><th>Ações</th></tr></thead><tbody>${items.map(o=>`<tr><td class="clickable" data-view="${h(o.id)}"><div class="osno">${h(o.number)}</div><div class="cell-sub">${date(o.receivedDate)}</div></td><td class="clickable" data-view="${h(o.id)}"><div class="cell-main">${h(cust(o.customerId)?.name||'—')}</div><div class="cell-sub">${h(cust(o.customerId)?.phone||'')}</div></td><td class="clickable" data-view="${h(o.id)}"><div class="cell-main">${h(labelInstrument(instr(o.instrumentId)))}</div></td><td>${date(o.dueDate)}</td><td>${statusRapido(o)}</td><td><strong>${money(orderTotal(o))}</strong><div class="cell-sub">Pago: ${money(o.paid)}</div></td><td><div style="display:flex;gap:5px">${btn(icon('printer',15),'data-print="'+h(o.id)+'" title="Imprimir duas vias"','sm')}${btn(icon('download',15),'data-download-pdf="'+h(o.id)+'" title="Baixar PDF sem rodapé do navegador"','sm')}${btn(icon('edit',15),'data-edit="order" data-id="'+h(o.id)+'" title="Editar"','sm')}</div></td></tr>`).join('')}</tbody></table></div>`:empty(q?'Sem resultados':'Nenhuma ordem cadastrada',q?'Tente outro termo ou filtro.':'Abra uma ordem para registrar um atendimento.','orders')}</section>`}
function customersPage(){const q=ui.search.toLowerCase();const items=[...data.customers].filter(c=>[c.name,c.phone,c.email,c.document].join(' ').toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));return `${searchTools('Pesquisar nome, telefone, e-mail…')}<section class="panel"><div class="panel-hd"><span class="panel-title">Clientes cadastrados</span><span class="panel-meta">${items.length} registro(s)</span></div>${items.length?`<div class="table-scroll"><table class="data-table"><thead><tr><th>Cliente</th><th>Telefone / WhatsApp</th><th>E-mail</th><th>Ordens</th><th></th></tr></thead><tbody>${items.map(c=>`<tr><td><strong>${h(c.name)}</strong></td><td>${h(c.phone)}</td><td>${h(c.email||'—')}</td><td>${data.orders.filter(o=>o.customerId===c.id).length}</td><td>${btn(icon('edit',15)+' Editar','data-edit="customer" data-id="'+h(c.id)+'"','sm')}</td></tr>`).join('')}</tbody></table></div>`:empty('Nenhum cliente encontrado','Comece cadastrando o primeiro cliente.')}</section>`}
function instrumentsPage(){const q=ui.search.toLowerCase();const items=[...data.instruments].filter(i=>[i.type,i.brand,i.model,i.serial,cust(i.customerId)?.name].join(' ').toLowerCase().includes(q)).sort((a,b)=>(cust(a.customerId)?.name||'').localeCompare(cust(b.customerId)?.name||''));return `${searchTools('Buscar por cliente, tipo, marca, modelo ou série…')}<section class="panel"><div class="panel-hd"><span class="panel-title">Instrumentos cadastrados</span><span class="panel-meta">${items.length} registro(s)</span></div>${items.length?`<div class="table-scroll"><table class="data-table"><thead><tr><th>Instrumento</th><th>Proprietário</th><th>Nº de série</th><th>Estado / observações</th><th>Atendimentos</th><th></th></tr></thead><tbody>${items.map(i=>`<tr><td><strong>${h(labelInstrument(i))}</strong><div class="cell-sub">${h(i.color||'')}</div></td><td>${h(cust(i.customerId)?.name||'—')}</td><td>${h(i.serial||'—')}</td><td>${h(i.condition||'—').slice(0,70)}</td><td>${data.orders.filter(o=>o.instrumentId===i.id).length}</td><td>${btn(icon('edit',15)+' Editar','data-edit="instrument" data-id="'+h(i.id)+'"','sm')}</td></tr>`).join('')}</tbody></table></div>`:empty('Nenhum instrumento encontrado','Cadastre um cliente e depois o instrumento dele.')}</section>`}
function settingsPage(){const s=data.settings;return `<div class="settings-grid"><section class="panel"><div class="panel-hd"><div class="panel-title">Dados da luthieria</div></div><div class="panel-body"><form id="settings-form"><div class="field-row"><div class="field"><label>Nome da oficina</label><input class="input" name="name" required value="${h(s.name)}"></div><div class="field"><label>Telefone / WhatsApp</label><input class="input" name="phone" value="${h(s.phone)}"></div><div class="field"><label>CPF / CNPJ (opcional)</label><input class="input" name="document" value="${h(s.document)}"></div><div class="field"><label>Garantia padrão (dias)</label><input class="input" name="warranty" type="number" min="0" max="3650" value="${num(s.warranty)}"></div><div class="field wide"><label>Endereço para a O.S.</label><input class="input" name="address" value="${h(s.address)}"></div><div class="field wide"><label>Condições exibidas na impressão</label><textarea name="terms">${h(s.terms)}</textarea></div></div><button class="btn primary" type="submit">Salvar configurações</button></form></div></section><div><section class="panel"><div class="panel-hd"><span class="panel-title">Backup e recuperação</span></div><div class="panel-body"><p class="subtext" style="margin-bottom:16px">Faça cópias de segurança dos atendimentos e das fotos dos instrumentos.</p><div style="display:flex;gap:8px;flex-wrap:wrap">${btn(icon('download',15)+' Exportar backup','data-export','primary')}${btn(icon('upload',15)+' Importar backup','data-import')}</div><input id="import-file" type="file" accept="application/json,.json" hidden><p class="muted" style="font-size:11px;margin-top:13px">Importar substitui todos os dados atuais. Guarde o arquivo em lugar seguro: ele contém informações de clientes.</p></div></section></div></div>`}
function field(label,name,value='',type='text',extra=''){return `<div class="field"><label>${label}</label><input class="input" name="${name}" type="${type}" value="${h(value)}" ${extra}></div>`}
function area(label,name,value='',rows=3){return `<div class="field wide"><label>${label}</label><textarea name="${name}" rows="${rows}">${h(value)}</textarea></div>`}
function select(label,name,options,current='',extra=''){return `<div class="field"><label>${label}</label><select name="${name}" ${extra}>${name==='status'?opcaoStatusAntigo(current):''}${options.map(v=>typeof v==='string'?`<option value="${h(v)}" ${v===current?'selected':''}>${h(v)}</option>`:`<option value="${h(v.id)}" ${v.id===current?'selected':''}>${h(v.label)}</option>`).join('')}</select></div>`}
function normalizarBuscaCliente(valor){return String(valor||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim()}
function clientesCorrespondentes(busca){
  const termo=normalizarBuscaCliente(busca);
  const digitos=String(busca||'').replace(/\D/g,'');
  return [...data.customers].filter(cliente=>{
    const nome=normalizarBuscaCliente(cliente.name);
    const telefone=String(cliente.phone||'').replace(/\D/g,'');
    return !termo||nome.includes(termo)||(digitos.length>0&&telefone.includes(digitos));
  }).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).slice(0,10);
}
function campoBuscaCliente(customerId=''){
  const selecionado=cust(customerId);
  return `<div class="field customer-search-field"><label for="order-customer-search">Cliente <span>*</span></label>
    <div class="customer-search-line"><div class="customer-search-wrap">
      <input type="hidden" id="order-customer" name="customerId" value="${h(selecionado?.id||'')}">
      <input class="input" id="order-customer-search" type="search" placeholder="Digite o nome ou telefone do cliente" value="${h(selecionado?.name||'')}" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded="false" aria-controls="order-customer-options" aria-label="Buscar cliente pelo nome ou telefone" required>
      <div class="customer-search-options" id="order-customer-options" role="listbox" aria-label="Resultados de clientes" hidden></div>
    </div><button class="btn sm customer-add-btn" type="button" data-new-customer-order>${icon('plus',15)} Novo cliente</button></div>
  </div>`;
}
function fecharBuscaCliente(){
  clearTimeout(ui.customerSearchTimer);
  ui.customerSearchToken++;
  ui.customerSearchLoading=false;
  const lista=document.getElementById('order-customer-options');
  const busca=document.getElementById('order-customer-search');
  if(lista){lista.hidden=true;lista.innerHTML=''}
  if(busca){busca.setAttribute('aria-expanded','false');busca.removeAttribute('aria-activedescendant')}
  ui.customerOptionIndex=-1;
}
function resultadosBuscaCliente(termo){
  return ui.customerSearchQuery===termo&&!ui.customerSearchError?ui.customerSearchResults:clientesCorrespondentes(termo);
}
function atualizarBuscaCliente(index=-1){
  const busca=document.getElementById('order-customer-search'), lista=document.getElementById('order-customer-options');
  if(!busca||!lista)return;
  const termo=busca.value;
  const clientes=resultadosBuscaCliente(termo);
  ui.customerOptionIndex=clientes.length?Math.min(Math.max(index,-1),clientes.length-1):-1;
  lista.hidden=false;
  busca.setAttribute('aria-expanded','true');
  busca.removeAttribute('aria-activedescendant');
  if(ui.customerOptionIndex>=0)busca.setAttribute('aria-activedescendant','customer-result-'+ui.customerOptionIndex);
  let mensagem='';
  if(ui.customerSearchError) mensagem='<div class="customer-search-empty">Não foi possível consultar os clientes no servidor. Verifique a conexão e tente novamente.</div>';
  else if(ui.customerSearchLoading&&!clientes.length)mensagem='<div class="customer-search-empty">Buscando clientes cadastrados…</div>';
  else if(ui.customerSearchQuery===termo&&!clientes.length){
    mensagem=ui.customerSearchTotal===0?'<div class="customer-search-empty">Ainda não há clientes cadastrados neste banco.</div>'
    :`<div class="customer-search-empty">Nenhum resultado para <strong>${h(termo)}</strong> entre ${ui.customerSearchTotal} cliente(s) deste banco. Confira a tela Clientes ou cadastre uma nova pessoa.</div>`;
  } else if(!clientes.length)mensagem='<div class="customer-search-empty">Buscando clientes cadastrados…</div>';
  lista.innerHTML=ui.customerSearchError?mensagem:clientes.length?clientes.map((c,i)=>`<button type="button" class="customer-result ${i===ui.customerOptionIndex?'active':''}" role="option" aria-selected="${i===ui.customerOptionIndex}" id="customer-result-${i}" data-customer-option="${h(c.id)}"><span class="customer-result-name">${h(c.name)}</span><span class="customer-result-phone">${h(c.phone)}</span></button>`).join(''):mensagem;
  lista.querySelector('.customer-result.active')?.scrollIntoView({block:'nearest'});
}
async function consultarClientesServidor(termo,token){
  try {
    const resposta=await fetch('/api/customers/search?q='+encodeURIComponent(termo),{cache:'no-store'});
    if(resposta.status===401){location.assign('/entrar');return}
    const retorno=await resposta.json();
    if(!resposta.ok)throw Error(retorno.erro||'Erro ao consultar clientes.');
    if(token!==ui.customerSearchToken)return;
    if(!saving&&(retorno.revision!==revision||retorno.customers.some(c=>!cust(c.id)))){
      const r=await fetch('/api/state',{cache:'no-store'});
      if(r.status===401){location.assign('/entrar');return}
      if(!r.ok)throw Error('Não foi possível sincronizar a lista de clientes.');
      const atual=await r.json();
      if(token!==ui.customerSearchToken)return;
      if(atual.revision>=revision){data=atual.state;revision=atual.revision}
    }
    if(token!==ui.customerSearchToken||document.getElementById('order-customer-search')?.value!==termo)return;
    ui.customerSearchResults=retorno.customers;
    ui.customerSearchTotal=retorno.total;
    ui.customerSearchQuery=termo;
    ui.customerSearchError='';
  }catch(erro){
    if(token!==ui.customerSearchToken)return;
    ui.customerSearchError=erro.message||'Falha de conexão';
    ui.customerSearchQuery=null;
  }finally{
    if(token===ui.customerSearchToken){ui.customerSearchLoading=false;atualizarBuscaCliente()}
  }
}
function agendarBuscaCliente(){
  const busca=document.getElementById('order-customer-search');
  if(!busca)return;
  clearTimeout(ui.customerSearchTimer);
  const token=++ui.customerSearchToken;
  const termo=busca.value;
  ui.customerSearchQuery=null;
  ui.customerSearchResults=[];
  ui.customerSearchLoading=true;
  ui.customerSearchError='';
  atualizarBuscaCliente();
  ui.customerSearchTimer=setTimeout(()=>consultarClientesServidor(termo,token),250);
}
function selecionarClienteDaBusca(clienteId){
  const cliente=cust(clienteId);
  if(!cliente)return;
  const busca=document.getElementById('order-customer-search'),hidden=document.getElementById('order-customer');
  if(!busca||!hidden)return;
  hidden.value=cliente.id;busca.value=cliente.name;fecharBuscaCliente();
}
function guardarRascunhoOrdem(){
  const form=document.getElementById('order-form');
  if(!form)return;
  ui.orderDraft={editId:ui.editId,campos:Object.fromEntries(new FormData(form).entries()),busca:document.getElementById('order-customer-search')?.value||'',scroll:document.querySelector('.modal')?.scrollTop||0,
    servicos:[...form.querySelectorAll('.service-line')].map(linha=>({description:linha.querySelector('.svc-desc').value,quantity:linha.querySelector('.svc-qty').value,price:linha.querySelector('.svc-price').value}))};
}
function restaurarRascunhoOrdem(clienteId){
  const rascunho=ui.orderDraft;
  if(!rascunho)return;
  ui.modal='order';ui.editId=rascunho.editId;render();
  const form=document.getElementById('order-form');
  if(!form)return;
  for(const [nome,valor] of Object.entries(rascunho.campos)){
    const elemento=[...form.elements].find(e=>e.name===nome);
    if(elemento)elemento.value=valor;
  }
  const lista=form.querySelector('#service-list');
  lista.innerHTML=rascunho.servicos.map(servico=>serviceRow(servico)).join('');
  const busca=document.getElementById('order-customer-search');
  busca.value=rascunho.busca;
  if(clienteId)selecionarClienteDaBusca(clienteId);
  else fecharBuscaCliente();
  updateOrderTotal();
  const modal=document.querySelector('.modal');if(modal)modal.scrollTop=0;
  ui.orderDraft=null;
}
function modalHtml(){let html='',title='',wide=false;const type=ui.modal,edit=ui.editId;
if(type==='customer'){const c=cust(edit)||{};title=edit?'Editar cliente':'Cadastrar cliente';html=`<form id="customer-form" data-id="${h(edit||'')}"><div class="field-row">${field('Nome completo <span>*</span>','name',c.name,'text','required maxlength="120"')}${field('Telefone / WhatsApp <span>*</span>','phone',c.phone,'tel','required maxlength="30"')}${field('E-mail','email',c.email,'email')}${field('CPF / CNPJ (opcional)','document',c.document)}${area('Endereço e observações','notes',c.notes)}</div>${modalButtons()}</form>`}
else if(type==='instrument'){const i=instr(edit)||{};title=edit?'Editar instrumento':'Cadastrar instrumento';const cs=[{id:'',label:'Selecione o proprietário…'},...data.customers.map(c=>({id:c.id,label:c.name}))];html=`<form id="instrument-form" data-id="${h(edit||'')}"><div class="field-row">${select('Cliente / proprietário <span>*</span>','customerId',cs,i.customerId||ui.customerForInstrument||'','required')}${select('Tipo de instrumento <span>*</span>','type',TYPES,i.type||'Violão')}${field('Marca','brand',i.brand,'text','placeholder="Ex.: Takamine, Yamaha"')}${field('Modelo','model',i.model)}${field('Número de série','serial',i.serial)}${field('Cor / acabamento','color',i.color)}${area('Condição atual / avarias visíveis','condition',i.condition)}${area('Observações adicionais','notes',i.notes,2)}</div>${modalButtons()}</form>`}
else if(type==='order'){wide=true;
const o=data.orders.find(o=>o.id===edit)||{},i=instr(o.instrumentId)||{};
title=edit?'Editar ordem '+o.number:'Nova ordem de serviço';
html=`<form id="order-form" data-id="${h(edit||'')}"><div class="form-note">Busque o cliente pelo nome ou telefone e informe os dados do instrumento. Você pode anexar fotos do recebimento.</div>
<div class="section-title">Cliente e instrumento</div>
<div class="field-row">${campoBuscaCliente(o.customerId||'')}${select('Tipo de instrumento <span>*</span>','instrumentType',TYPES,i.type||'Violão','required')}${field('Marca','instrumentBrand',i.brand,'text','maxlength="160" placeholder="Ex.: Yamaha"')}${field('Modelo','instrumentModel',i.model,'text','maxlength="160"')}</div>
<div class="section-title">Fotos no recebimento</div>
<div class="photo-upload-box"><label for="order-photo-picker" class="btn soft" style="cursor:pointer">${icon('upload',16)} Selecionar fotos</label><input id="order-photo-picker" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden><span class="photo-hint">Até 6 fotos em JPG, PNG ou WebP, com até 2 MB cada.</span></div>
<div class="photo-grid" id="order-photo-preview">${photoListHtml()}</div>
<div class="section-title">Dados do atendimento</div>
<div class="field-row">${field('Data de entrada <span>*</span>','receivedDate',o.receivedDate||today(),'date','required')}${field('Previsão de entrega','dueDate',o.dueDate||'','date')}${select('Situação da O.S.','status',STATUS,o.status||'Em execução')}${select('Aprovação do orçamento','approval',APPROVAL,o.approval||'Pendente')}${area('Acessórios recebidos (capa, correia etc.)','accessories',o.accessories||'',2)}</div>
<div class="section-flex"><span class="section-title">Serviços e valores</span>${btn(icon('plus',14)+' Adicionar serviço','data-add-service','sm')}</div><div class="service-list" id="service-list">${(o.items?.length?o.items:[{description:'',quantity:1,price:0}]).map(serviceRow).join('')}</div><div class="field-row" style="margin-top:15px">${field('Valor já recebido (R$)','paid',o.paid||0,'number','min="0" step="0.01"')}${select('Forma de pagamento','paymentMethod',['Não informado','Pix','Dinheiro','Cartão','Transferência','Outro'],o.paymentMethod||'Não informado')}${field('Garantia informada (dias)','warrantyDays',o.warrantyDays??data.settings.warranty,'number','min="0" max="3650"')}</div><div class="sumrow" id="order-total">Total previsto: ${money(orderTotal(o))}</div><div class="field-row">${area('Observações internas / orientações para entrega','notes',o.notes||'')}</div>${modalButtons('Salvar ordem de serviço')}</form>`} 
else if(type==='orderSaved'){
  const o=data.orders.find(item=>item.id===edit);
  if(!o)return '';
  title='Ordem de serviço salva';
  html=`<div class="order-saved-confirmation" role="status">
    <div class="order-saved-icon">${icon('check',24)}</div>
    <p>O atendimento foi salvo com sucesso.</p>
    <div class="order-saved-number-label">Número da ordem de serviço</div>
    <strong class="order-saved-number">${h(o.number)}</strong>
    <p class="order-saved-help">Esse número identifica o atendimento e aparece nas vias da oficina e do cliente.</p>
    <div class="order-saved-actions">${btn('Fechar','data-close')}${btn(icon('download',16)+' Baixar PDF','data-download-pdf="'+h(o.id)+'"','primary')}${btn(icon('printer',16)+' Imprimir duas vias','data-print="'+h(o.id)+'"')}</div>
  </div>`;
}
else if(type==='view'){const o=data.orders.find(o=>o.id===edit);if(!o)return '';title='Ordem de serviço '+o.number;wide=true;html=viewOrder(o)}
return `<div class="modal-backdrop" id="modal-backdrop"><div class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${h(title)}"><div class="modal-hd"><h2>${h(title)}</h2><button class="close" type="button" data-close aria-label="Fechar">×</button></div><div class="modal-body">${html}</div></div></div>`}
function modalButtons(name='Salvar cadastro'){return `<div class="modal-footer" style="margin:20px -25px -24px">${btn('Cancelar','type="button" data-close')}${btn(name,'type="submit"','primary')}</div>`}
function serviceRow(it){return `<div class="service-line"><div><label>Descrição do serviço</label><input class="input svc-desc" placeholder="Ex.: Regulagem completa" value="${h(it.description||'')}" maxlength="180"></div><div><label>Qtd.</label><input class="input svc-qty" type="number" min="0.01" step="0.01" value="${num(it.quantity)||1}"></div><div><label>Valor unit.</label><input class="input svc-price" type="number" min="0" step="0.01" value="${num(it.price)}"></div><button class="remove" type="button" data-remove-service title="Remover">×</button></div>`}
function viewOrder(o){const c=cust(o.customerId),i=instr(o.instrumentId);const details=[['Cliente',c?.name],['Telefone',c?.phone],['Instrumento',labelInstrument(i)],['Entrada',date(o.receivedDate)],['Entrega prevista',date(o.dueDate)],['Situação',o.status],['Orçamento',o.approval],['Garantia',`${o.warrantyDays||0} dias`]];return `<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px">${statusRapido(o)}<div class="actions">${btn(icon('edit',15)+' Editar','data-edit="order" data-id="'+h(o.id)+'"')}${btn(icon('download',15)+' Baixar PDF','data-download-pdf="'+h(o.id)+'"','primary')}${btn(icon('printer',15)+' Imprimir 2 vias','data-print="'+h(o.id)+'"')}</div></div><div class="detail-grid">${details.map(([name,val])=>`<div><div class="detail-label">${name}</div><div class="detail-val">${h(val||'—')}</div></div>`).join('')}</div><div class="section-title">Fotos do instrumento no recebimento</div><div class="photo-grid photo-view">${photoViewHtml(o.photos||[])}</div>${o.accessories?`<div class="section-title">Acessórios recebidos</div><div class="detail-block"><div>${h(o.accessories)}</div></div>`:''}<div class="section-title">Orçamento e pagamento</div><div class="table-scroll"><table class="data-table"><thead><tr><th>Serviço</th><th>Qtd.</th><th>Unidade</th><th>Subtotal</th></tr></thead><tbody>${(o.items||[]).map(it=>`<tr><td>${h(it.description)}</td><td>${h(it.quantity)}</td><td>${money(it.price)}</td><td>${money(num(it.quantity)*num(it.price))}</td></tr>`).join('')||'<tr><td colspan="4">Não informado</td></tr>'}</tbody></table></div><div style="text-align:right;line-height:2"><strong>Total: ${money(orderTotal(o))}</strong><div>Pago: ${money(o.paid)} • Saldo: ${money(Math.max(0,orderTotal(o)-num(o.paid)))}</div></div>${o.notes?`<div class="detail-block"><strong>Observações</strong><div>${h(o.notes)}</div></div>`:''}`}
function render(){document.getElementById('app').innerHTML=shell()}
function open(type,editId=null){if(type==='order'&&!data.customers.length){showToast('Cadastre um cliente antes de criar a ordem de serviço.',true);ui.modal='customer';ui.editId=null}else{ui.modal=type;ui.editId=editId}limparPreviews();const os=data.orders.find(o=>o.id===editId);ui.orderPhotos=type==='order'?[...(os?.photos||[])]:[];render()}
function close(){if(ui.uploading){showToast('Aguarde o envio das fotos.',true);return}if(ui.modal==='customer'&&ui.orderDraft){restaurarRascunhoOrdem();return}limparPreviews();ui.orderDraft=null;ui.modal=null;ui.editId=null;ui.customerForInstrument=null;render()}
function formObject(form){return Object.fromEntries(new FormData(form).entries())}
async function handleCustomer(form){const o=formObject(form);if(!o.name.trim()||!o.phone.trim()){showToast('Preencha nome e telefone.',true);return}const anterior=structuredClone(data),edit=form.dataset.id,record={id:edit||id(),name:o.name.trim(),phone:o.phone.trim(),email:o.email.trim(),document:o.document.trim(),notes:o.notes.trim()};if(edit){data.customers=data.customers.map(c=>c.id===edit?record:c)}else{data.customers.push(record)}if(await save(anterior)){if(ui.orderDraft)restaurarRascunhoOrdem(record.id);else close();showToast('Cliente salvo com sucesso.')}}
async function handleInstrument(form){const o=formObject(form);if(!cust(o.customerId)){showToast('Selecione um cliente.',true);return}const anterior=structuredClone(data),edit=form.dataset.id;if(edit&&data.orders.some(x=>x.instrumentId===edit&&x.customerId!==o.customerId)){showToast('Não altere o proprietário de um instrumento com ordens registradas.',true);return}const record={id:edit||id(),customerId:o.customerId,type:o.type,brand:o.brand.trim(),model:o.model.trim(),serial:o.serial.trim(),color:o.color.trim(),condition:o.condition.trim(),notes:o.notes.trim()};if(edit)data.instruments=data.instruments.map(i=>i.id===edit?record:i);else data.instruments.push(record);if(await save(anterior)){close();showToast('Instrumento salvo com sucesso.')}}
async function handleOrder(form){if(ui.uploading)return;
const o=formObject(form),items=[...form.querySelectorAll('.service-line')].map(r=>({description:r.querySelector('.svc-desc').value.trim(),quantity:Number(r.querySelector('.svc-qty').value),price:Number(r.querySelector('.svc-price').value)})).filter(it=>it.description);
if(!cust(o.customerId)){showToast('Selecione um cliente para a ordem.',true);return}
if(!TYPES.includes(o.instrumentType)){showToast('Selecione o tipo de instrumento.',true);return}
if(!o.receivedDate){showToast('Informe a data de entrada.',true);return}
if(items.some(it=>!Number.isFinite(it.quantity)||it.quantity<=0||!Number.isFinite(it.price)||it.price<0)){showToast('Informe quantidades e valores válidos.',true);return}
const paid=Number(o.paid),subtotal=items.reduce((x,it)=>x+it.quantity*it.price,0);
if(!Number.isFinite(paid)||paid<0||paid>subtotal+0.001){showToast('Confira o valor recebido: ele não pode superar o total dos serviços.',true);return}
if(ui.orderPhotos.length+ui.photoFiles.length>6){showToast('Limite de 6 fotos por ordem.',true);return}
ui.uploading=true;
const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;
try{
  const photos=[...ui.orderPhotos];
  for(const foto of ui.photoFiles){photos.push(await enviarFoto(foto.file))}
  const anterior=structuredClone(data),edit=form.dataset.id,old=data.orders.find(x=>x.id===edit),iAnterior=old?instr(old.instrumentId):null;
  let instrumentId=old?.instrumentId||id();
  if(old&&data.orders.some(outra=>outra.id!==edit&&outra.instrumentId===old.instrumentId))instrumentId=id();
  const instrumento={id:instrumentId,customerId:o.customerId,type:o.instrumentType,brand:o.instrumentBrand.trim(),model:o.instrumentModel.trim(),serial:iAnterior?.serial||'',color:iAnterior?.color||'',condition:iAnterior?.condition||'',notes:iAnterior?.notes||''};
  if(data.instruments.some(i=>i.id===instrumentId))data.instruments=data.instruments.map(i=>i.id===instrumentId?instrumento:i);
  else data.instruments.push(instrumento);
  const record={id:edit||id(),number:old?.number||'OS-'+String(++data.seq).padStart(5,'0'),createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),customerId:o.customerId,instrumentId,receivedDate:o.receivedDate,dueDate:o.dueDate,complaint:old?.complaint||'',diagnosis:old?.diagnosis||'',condition:old?.condition||'',accessories:o.accessories.trim(),status:o.status,approval:o.approval,items,photos,paid,paymentMethod:o.paymentMethod,warrantyDays:num(o.warrantyDays),notes:o.notes.trim()};
  if(edit)data.orders=data.orders.map(x=>x.id===edit?record:x);else data.orders.push(record);
  if(await save(anterior)){ui.uploading=false;limparPreviews();ui.orderDraft=null;ui.page='orders';ui.search='';ui.filter='Todos';ui.modal='orderSaved';ui.editId=record.id;render();showToast(`Ordem ${record.number} salva com sucesso.`)}
}catch(erro){showToast('Erro ao anexar fotos: '+erro.message,true)}finally{ui.uploading=false;if(submit&&submit.isConnected)submit.disabled=false}
} 
function limparPreviews(){for(const foto of ui.photoFiles||[])URL.revokeObjectURL(foto.url);ui.photoFiles=[];ui.orderPhotos=[]}
function photoListHtml(){const existentes=ui.orderPhotos.map(p=>`<div class="photo-card"><img src="/api/photos/${encodeURIComponent(p.id)}" alt="${h(p.name)}"><div class="photo-caption">${h(p.name)}</div><button type="button" class="remove-photo" data-remove-photo="${h(p.id)}" aria-label="Remover foto">×</button></div>`);
const novos=ui.photoFiles.map((p,n)=>`<div class="photo-card"><img src="${p.url}" alt="Prévia da foto"><div class="photo-caption">${h(p.file.name)}</div><button type="button" class="remove-photo" data-remove-file="${n}" aria-label="Remover foto">×</button></div>`);
return [...existentes,...novos].join('')||'<p class="subtext" style="grid-column:1/-1">Nenhuma foto adicionada. Registre detalhes do instrumento na entrada.</p>'}
function photoViewHtml(photos){return photos.length?photos.map(p=>`<a class="photo-card" href="/api/photos/${encodeURIComponent(p.id)}" target="_blank" rel="noopener"><img src="/api/photos/${encodeURIComponent(p.id)}" alt="${h(p.name)}" loading="lazy"><div class="photo-caption">${h(p.name)}</div></a>`).join(''):'<p class="subtext">Nenhuma foto registrada nesta ordem.</p>'}
function renderPhotoList(){const el=document.getElementById('order-photo-preview');if(el)el.innerHTML=photoListHtml()}
function adicionarFotos(lista){for(const file of lista){if(ui.orderPhotos.length+ui.photoFiles.length>=6){showToast('Máximo de 6 fotos por ordem.',true);break}if(!['image/jpeg','image/png','image/webp'].includes(file.type)){showToast('Use fotos JPG, PNG ou WebP.',true);continue}if(file.size>2*1024*1024||!file.size){showToast('Cada foto precisa ter até 2 MB.',true);continue}ui.photoFiles.push({file,url:URL.createObjectURL(file)})}renderPhotoList()}
function lerFotoBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Não foi possível ler o arquivo.'));reader.readAsDataURL(file)})}
async function enviarFoto(file){const r=await fetch('/api/photos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,mime:file.type,data:await lerFotoBase64(file)})});const retorno=await r.json();if(!r.ok)throw Error(retorno.erro||'Falha ao armazenar foto.');return retorno}
function updateOrderTotal(){const form=document.getElementById('order-form');if(!form)return;let total=0;form.querySelectorAll('.service-line').forEach(r=>total+=num(r.querySelector('.svc-qty').value)*num(r.querySelector('.svc-price').value));document.getElementById('order-total').textContent='Total previsto: '+money(total)}
function filteredRender(){const input=document.getElementById('listing-search');const pos=input?.selectionStart??0;render();const neo=document.getElementById('listing-search');if(neo){neo.focus();neo.setSelectionRange(pos,pos)}}
async function exportBackup(){try{const r=await fetch('/api/backup',{cache:'no-store'});const json=await r.json();if(!r.ok)throw Error(json.erro||'Falha no backup');const blob=new Blob([JSON.stringify(json,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`bueno-luthier-backup-com-fotos-${today()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);showToast('Backup com fotos exportado.')}catch(e){showToast('Erro ao exportar backup: '+e.message,true)}}
async function importBackup(file){if(!file)return;try{const parsed=JSON.parse(await file.text());if(!Array.isArray(parsed.customers)||!Array.isArray(parsed.instruments)||!Array.isArray(parsed.orders)||!parsed.settings||!Number.isFinite(Number(parsed.seq)))throw Error('Arquivo incompatível.');if(!confirm(`Importar este backup? Ele substituirá TODOS os dados atuais por ${parsed.customers.length} cliente(s) e ${parsed.orders.length} ordem(ns), incluindo as fotos.`))return;
const r=await fetch('/api/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,state:{...structuredClone(DEFAULT),...parsed,seq:Number(parsed.seq),settings:{...DEFAULT.settings,...parsed.settings}},photos:parsed.photos||[]})});const result=await r.json();if(!r.ok)throw Error(result.erro||'Falha ao restaurar backup');revision=result.revision;data=result.state;ui.page='dashboard';ui.search='';ui.filter='Todos';render();showToast('Backup e fotos restaurados com sucesso.')}catch(e){showToast('Não foi possível importar: '+e.message,true)}}
function garantirEstiloImpressaoV40(){
  if(document.getElementById('bueno-print-v40'))return;
  const estilo=document.createElement('style');
  estilo.id='bueno-print-v40';
  estilo.textContent=`
@media print {
  @page { size: A4 portrait; margin: 13mm; }
  html,body { width:auto!important; height:auto!important; min-height:0!important; margin:0!important; padding:0!important; overflow:visible!important; }
  body { background:#fff!important; }
  .app-shell,.modal-backdrop,.toast { display:none!important; }
  #print-root { display:block!important; position:static!important; width:184mm!important; height:270mm!important; max-width:184mm!important; margin:0!important; padding:0!important; overflow:visible!important; }
  #print-root .print-sheet { display:flex!important; flex-direction:column!important; position:relative!important; box-sizing:border-box!important; width:184mm!important; min-width:184mm!important; max-width:184mm!important; height:270mm!important; min-height:270mm!important; max-height:270mm!important; margin:0!important; padding:0!important; overflow:hidden!important; break-inside:avoid!important; page-break-inside:avoid!important; break-after:auto!important; page-break-after:auto!important; }
  #print-root .print-sheet .print-page.print-copy { box-sizing:border-box!important; position:relative!important; display:flex!important; flex-direction:column!important; flex:0 0 135mm!important; width:184mm!important; height:135mm!important; min-height:135mm!important; max-height:135mm!important; margin:0!important; padding:3.5mm 2.5mm 3mm!important; overflow:hidden!important; break-inside:avoid!important; page-break-inside:avoid!important; break-after:auto!important; page-break-after:auto!important; font:9px/1.18 Arial,Helvetica,sans-serif!important; }
  #print-root .print-header { display:flex!important; align-items:flex-start!important; justify-content:space-between!important; gap:3mm!important; margin:0 0 1.4mm!important; padding:0 0 1.5mm!important; border-bottom:1.5px solid #947046!important; }
  #print-root .print-header>div:first-child { flex:1 1 auto!important; min-width:0!important; max-width:none!important; }
  #print-root .print-brand { display:flex!important; flex-direction:row!important; align-items:flex-start!important; gap:2mm!important; min-width:0!important; max-width:none!important; }
  #print-root .print-logo { width:9mm!important; min-width:9mm!important; flex:0 0 9mm!important; height:12mm!important; object-fit:contain!important; }
  #print-root .print-business-details { min-width:0!important; flex:1 1 auto!important; }
  #print-root .print-company { font:700 15px/1.04 Georgia,serif!important; margin:0 0 .7mm!important; color:#18392b!important; }
  #print-root .print-contact-row { display:grid!important; grid-template-columns:minmax(0,1fr) minmax(0,36mm)!important; column-gap:2.5mm!important; align-items:start!important; }
  #print-root .print-contact-entry,#print-root .print-contact-document { display:block!important; font:8px/1.12 Arial,Helvetica,sans-serif!important; overflow-wrap:anywhere!important; white-space:normal!important; color:#374a40!important; }
  #print-root .print-contact-document { margin-top:.8mm!important; }
  #print-root .print-os-title { flex:0 0 39mm!important; text-align:right!important; white-space:normal!important; }
  #print-root .print-os-title strong { display:block!important; font-size:12px!important; line-height:1.05!important; }
  #print-root .print-os-title>div { font-size:11px!important; font-weight:800!important; margin:1mm 0 .2mm!important; }
  #print-root .print-badge { display:inline-block!important; font-size:8px!important; margin-top:.5mm!important; padding:1px 4px!important; }
  #print-root .print-section { margin:1.2mm 0 0!important; break-inside:avoid!important; }
  #print-root .print-section h4 { font-size:8px!important; line-height:1.12!important; letter-spacing:.25px!important; padding:2px 5px!important; margin:0 0 .7mm!important; }
  #print-root .print-grid { display:grid!important; grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important; gap:.6mm 3mm!important; }
  #print-root .print-line { min-height:0!important; padding:0 0 .55mm!important; }
  #print-root .print-line b { font-size:7px!important; margin:0 0 .4mm!important; }
  #print-root .print-line span { font-size:9px!important; line-height:1.14!important; overflow-wrap:anywhere!important; }
  #print-root .print-table { width:100%!important; table-layout:fixed!important; margin:0.8mm 0 0!important; }
  #print-root .print-table th,#print-root .print-table td { font-size:8px!important; line-height:1.13!important; padding:2px 4px!important; overflow-wrap:anywhere!important; }
  #print-root .print-total { font-size:10px!important; margin:1mm 0 0!important; }
  #print-root .print-payments { margin-top:.7mm!important; }
  #print-root .print-note,#print-root .print-photo-summary { font-size:7.7px!important; line-height:1.2!important; }
  #print-root .print-spacer { flex:1 1 auto!important; min-height:1mm!important; }
  #print-root .print-signatures { position:static!important; display:flex!important; gap:8mm!important; padding-top:2mm!important; margin-top:0!important; }
  #print-root .print-sign { font-size:8px!important; padding-top:.75mm!important; }
  #print-root .print-foot { position:static!important; display:flex!important; justify-content:space-between!important; margin-top:1.5mm!important; padding-top:.8mm!important; font-size:7px!important; }
  #print-root .print-cut-line { position:absolute!important; z-index:10!important; left:0!important; right:0!important; top:135mm!important; border-top:1px dashed #888!important; pointer-events:none!important; }
  #print-root .print-cut-line span { position:absolute!important; top:-6px!important; left:50%!important; transform:translateX(-50%)!important; padding:0 5px!important; background:#fff!important; white-space:nowrap!important; font:7px Arial,sans-serif!important; color:#777!important; }
  #print-root .print-sheet.print-dense .print-page.print-copy { padding:2.5mm 2mm 2mm!important; font-size:8px!important; line-height:1.08!important; }
  #print-root .print-sheet.print-dense .print-header { padding-bottom:.8mm!important; margin-bottom:.5mm!important; }
  #print-root .print-sheet.print-dense .print-section { margin-top:.65mm!important; }
  #print-root .print-sheet.print-dense .print-section h4 { margin-bottom:.5mm!important; padding:1px 4px!important; }
  #print-root .print-sheet.print-dense .print-table th,#print-root .print-sheet.print-dense .print-table td { padding:1.5px 3px!important; font-size:7.5px!important; }
  #print-root .print-sheet.print-dense .print-contact-entry,#print-root .print-sheet.print-dense .print-contact-document { font-size:7.2px!important; }
}
`;
  document.head.appendChild(estilo);
}
async function baixarPdfOrdem(o){
  if(!o)return;
  try{
    if(!window.BuenoPdf)throw Error('Gerador de PDF indisponível. Atualize a página e tente novamente.');
    const nome=await window.BuenoPdf.baixar({
      order:o,
      customer:cust(o.customerId)||{},
      instrument:instr(o.instrumentId)||{},
      settings:data.settings,
      logo:LOGO_MARK
    });
    showToast('Arquivo salvo: '+nome);
  }catch(erro){showToast('Não foi possível gerar o PDF: '+erro.message,true)}
}
function printOrder(o){
// Ajusta o nome sugerido pelo Chrome caso o usuário escolha Salvar como PDF.
tituloAntesImpressao=document.title;
document.title=String(o.number||'Ordem de servico').replace(/[^a-zA-Z0-9_-]/g,'-')+' - Bueno Luthier';
const c=cust(o.customerId)||{},i=instr(o.instrumentId)||{},s=data.settings;
function line(label,val){return `<div class="print-line"><b>${h(label)}</b><span>${h(val||'—')}</span></div>`}
function section(t,content){return `<div class="print-section"><h4>${t}</h4>${content}</div>`}
const endereco=h(s.address||'—');
const telefone=h(s.phone||'—');
const cnpj=h(s.document||'—');
const company=`<div class="print-brand"><img class="print-logo" src="${LOGO_MARK}" alt="Símbolo Bueno Luthier"><div class="print-business-details"><div class="print-company">${h(s.name||'Bueno Luthier')}</div><div class="print-contact-row"><div class="print-contact-entry"><strong>Endereço:</strong> ${endereco}</div><div class="print-contact-entry"><strong>Telefone:</strong> ${telefone}</div></div><div class="print-contact-document"><strong>CNPJ:</strong> ${cnpj}</div></div></div>`;
const items=o.items||[];
const maxPrintItems=5;
const shownItems=items.slice(0,maxPrintItems);
const remaining=items.length-shownItems.length;
const table=items.length?`<table class="print-table"><thead><tr><th>Serviço</th><th>Qtd.</th><th>Valor unit.</th><th>Subtotal</th></tr></thead><tbody>${shownItems.map(it=>`<tr><td>${h(it.description)}</td><td>${h(it.quantity)}</td><td class="right">${money(it.price)}</td><td class="right">${money(num(it.quantity)*num(it.price))}</td></tr>`).join('')}</tbody></table>${remaining>0?`<div class="print-note">+ ${remaining} serviço(s) detalhado(s) na O.S. digital. Valor total abaixo inclui todos.</div>`:''}`:'<div class="print-note">Serviços pendentes de orçamento.</div>';
function one(copy){return `<section class="print-page print-copy"><div class="print-header"><div>${company}</div><div class="print-os-title"><strong>ORDEM DE SERVIÇO</strong><div>${h(o.number)}</div><div class="print-badge">${h(o.status)}</div></div></div>${section('Cliente e prazos',`<div class="print-grid">${line('Nome',c.name)}${line('Telefone',c.phone)}${line('Data de entrada',date(o.receivedDate))}${line('Previsão de entrega',date(o.dueDate))}</div>`)}${section('Instrumento',`<div class="print-grid">${line('Instrumento',labelInstrument(i))}${line('Acessórios recebidos',o.accessories||'Nenhum informado')}</div>`)}${o.photos?.length?section('Fotos do recebimento',`<div class="print-photo-summary">${o.photos.length} foto(s) arquivada(s) no registro digital da O.S.</div>`):''}${section('Serviços e orçamento',`${table}<div class="print-total">VALOR TOTAL: ${money(orderTotal(o))}</div><div class="print-grid print-payments">${line('Aprovação',o.approval)}${line('Recebido / saldo',money(o.paid)+' / '+money(Math.max(0,orderTotal(o)-num(o.paid))))}${line('Pagamento',o.paymentMethod)}${line('Garantia',`${o.warrantyDays||0} dias`)}</div>`)}${section('Condições e observações',`<div class="print-note print-text">${h(s.terms)}</div>${o.notes?`<div class="print-note print-text">Observações: ${h(o.notes)}</div>`:''}`)}<div class="print-spacer"></div><div class="print-signatures"><div class="print-sign">Assinatura do cliente<br>Data: ____/____/________</div><div class="print-sign">Responsável pela oficina<br>Data: ____/____/________</div></div><div class="print-foot"><span>${h(s.name)} · ${h(o.number)}</span><span>${h(copy)}</span></div></section>`}
garantirEstiloImpressaoV40();
const el=document.getElementById('print-root');
el.innerHTML=`<div class="print-sheet${items.length>3||String(o.notes||'').length>150?' print-dense':''}">${one('VIA DA OFICINA')}<div class="print-cut-line" aria-hidden="true"><span>✂ RECORTE AQUI</span></div>${one('VIA DO CLIENTE')}</div>`;
const imagens=[...el.querySelectorAll('.print-logo')];
Promise.all(imagens.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve}))).then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>window.print())));
}
window.addEventListener('afterprint',()=>{document.getElementById('print-root').innerHTML='';if(tituloAntesImpressao!==null){document.title=tituloAntesImpressao;tituloAntesImpressao=null}})
document.addEventListener('click',e=>{
if(e.target.closest('[data-customer-option]')){selecionarClienteDaBusca(e.target.closest('[data-customer-option]').dataset.customerOption);return}
if(e.target.closest('[data-new-customer-order]')){guardarRascunhoOrdem();ui.modal='customer';ui.editId=null;render();return}
if(!e.target.closest('.customer-search-field'))fecharBuscaCliente();
if(e.target.closest('[data-status-order]'))return;const t=e.target.closest('[data-page],[data-open],[data-close],[data-edit],[data-view],[data-print],[data-download-pdf],[data-add-service],[data-remove-service],[data-export],[data-import],[data-remove-photo],[data-remove-file],[data-logout],[data-priority]');if(ui.uploading){showToast('Aguarde o envio das fotos.',true);return}if(!t){if(e.target.id==='modal-backdrop')close();return}if(t.hasAttribute('data-logout')){fetch('/api/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).finally(()=>location.assign('/entrar'));return}if(t.hasAttribute('data-priority')){ui.page='orders';ui.modal=null;ui.editId=null;ui.search='';ui.filter=t.dataset.priority;render()}else if(t.hasAttribute('data-page')){ui.page=t.dataset.page;ui.modal=null;ui.editId=null;ui.search='';ui.filter='Todos';render()}else if(t.hasAttribute('data-open')){ui.customerForInstrument=null;open(t.dataset.open)}else if(t.hasAttribute('data-close'))close();else if(t.hasAttribute('data-edit'))open(t.dataset.edit,t.dataset.id);else if(t.hasAttribute('data-view'))open('view',t.dataset.view);else if(t.hasAttribute('data-print')){const o=data.orders.find(x=>x.id===t.dataset.print);if(o)printOrder(o)}else if(t.hasAttribute('data-download-pdf')){const o=data.orders.find(x=>x.id===t.dataset.downloadPdf);if(o)baixarPdfOrdem(o)}else if(t.hasAttribute('data-add-service')){document.getElementById('service-list').insertAdjacentHTML('beforeend',serviceRow({description:'',quantity:1,price:0}));updateOrderTotal()}else if(t.hasAttribute('data-remove-service')){const list=document.getElementById('service-list');if(list.children.length>1){t.closest('.service-line').remove()}else{t.closest('.service-line').querySelectorAll('input').forEach(x=>x.value=x.classList.contains('svc-qty')?'1':x.classList.contains('svc-price')?'0':'')}updateOrderTotal()}else if(t.hasAttribute('data-remove-photo')){ui.orderPhotos=ui.orderPhotos.filter(p=>p.id!==t.dataset.removePhoto);renderPhotoList()}else if(t.hasAttribute('data-remove-file')){const index=Number(t.dataset.removeFile),foto=ui.photoFiles[index];if(foto)URL.revokeObjectURL(foto.url);ui.photoFiles.splice(index,1);renderPhotoList()}else if(t.hasAttribute('data-export'))exportBackup();else if(t.hasAttribute('data-import'))document.getElementById('import-file').click()});
document.addEventListener('focusin',e=>{if(e.target.id==='order-customer-search')agendarBuscaCliente()});
document.addEventListener('input',e=>{if(e.target.id==='order-customer-search'){document.getElementById('order-customer').value='';agendarBuscaCliente();return}if(e.target.id==='listing-search'){ui.search=e.target.value;filteredRender()}else if(e.target.closest('#order-form')&&(e.target.classList.contains('svc-qty')||e.target.classList.contains('svc-price')))updateOrderTotal()});
async function alterarStatusRapido(id,novo){
  const os=data.orders.find(x=>x.id===id);
  if(!os||!STATUS.includes(novo)||novo===os.status)return;
  if(saving||ui.uploading){showToast('Aguarde a gravação em andamento.',true);render();return}
  saving=true;
  try{
    const r=await fetch('/api/orders/'+encodeURIComponent(id)+'/status',{
      method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,status:novo})
    });
    const resposta=await r.json();
    if(r.status===401){location.assign('/entrar');return}
    if(!r.ok){const erro=new Error(resposta.erro||'Falha ao atualizar o status.');erro.status=r.status;throw erro}
    revision=resposta.revision;
    os.status=resposta.status;
    os.updatedAt=resposta.updatedAt;
    render();
    showToast(`Status da ${os.number} alterado para ${novo}.`);
  }catch(erro){
    if(erro.status===409){
      try{
        const atual=await fetch('/api/state',{cache:'no-store'});
        if(atual.ok){const retorno=await atual.json();data=retorno.state;revision=retorno.revision}
      }catch(_e){}
    }
    render();
    showToast(erro instanceof TypeError?'Falha de conexão com o servidor. Confira se a Railway está Online e tente novamente.':`Não foi possível alterar o status: ${erro.message}`,true);
  }finally{saving=false}
}
document.addEventListener('change',e=>{if(e.target.matches('[data-status-order]')){alterarStatusRapido(e.target.dataset.statusOrder,e.target.value);return}if(e.target.id==='listing-filter'){ui.filter=e.target.value;render()}else if(e.target.id==='order-photo-picker'){adicionarFotos([...e.target.files]);e.target.value=''}else if(e.target.id==='import-file')importBackup(e.target.files[0])});
document.addEventListener('submit',e=>{if(!['customer-form','instrument-form','order-form','settings-form'].includes(e.target.id))return;e.preventDefault();if(saving||ui.uploading){showToast('Aguarde o salvamento anterior.',true);return}if(e.target.id==='customer-form')handleCustomer(e.target);else if(e.target.id==='instrument-form')handleInstrument(e.target);else if(e.target.id==='order-form')handleOrder(e.target);else if(e.target.id==='settings-form'){const o=formObject(e.target);const anterior=structuredClone(data);data.settings={name:o.name.trim(),phone:o.phone.trim(),address:o.address.trim(),document:o.document.trim(),terms:o.terms.trim(),warranty:num(o.warranty)};save(anterior).then(ok=>{if(ok){render();showToast('Configurações salvas.')}})}});
document.addEventListener('keydown',e=>{
  if(e.target.id==='order-customer-search'){
    const lista=document.getElementById('order-customer-options');
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();if(lista?.hidden)atualizarBuscaCliente();
      const quantidade=resultadosBuscaCliente(e.target.value).length;
      if(quantidade)atualizarBuscaCliente(e.key==='ArrowDown'?(ui.customerOptionIndex+1)%quantidade:(ui.customerOptionIndex<0?quantidade-1:(ui.customerOptionIndex-1+quantidade)%quantidade));
      return;
    }
    if(e.key==='Enter'&&!lista?.hidden){
      e.preventDefault();
      const clientes=resultadosBuscaCliente(e.target.value);
      if(clientes.length&&ui.customerOptionIndex>=0)selecionarClienteDaBusca(clientes[ui.customerOptionIndex].id);
      return;
    }
    if(e.key==='Escape'&&!lista?.hidden){e.preventDefault();fecharBuscaCliente();return}
    if(e.key==='Tab')fecharBuscaCliente();
  }
  if(e.key==='Escape'&&ui.modal)close();
});document.getElementById('app').innerHTML='<div style="padding:45px;font:16px system-ui">Carregando Bueno Luthier…</div>';init();
})();

