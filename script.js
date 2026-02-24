// ══════════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ══════════════════════════════════════════════════════════════
var TORNEOS  = [];
var PARTIDOS = [];
var MAX_PARTIDOS = 8;
var partidoActual = 0;

var torneoParaRenombrar  = null;
var torneoParaEliminar   = null;
var torneoParaConfig     = null;
var partidoParaRenombrar = null;
var partidoParaEliminar  = null;
var partidoParaToken     = null;
var equipoParaEliminar   = null;
var eliminarModo         = '';

var cfgTitulares    = 11;
var cfgSuplentes    = 0;
var cfgPrefijoDT    = true;
var cfgTitularesNew = 11;
var cfgSuplentesNew = 0;
var cfgPrefijoDTNew = true;

var plantelData    = { local:[], visitante:[] };
var plantelVisible = { local:false, visitante:false };
var plantelEliminarLado = null;
var plantelEliminarIdx  = null;

var estado = Array.from({length:MAX_PARTIDOS}, function(){
  return {
    torneoId:'',
    local:    {equipo:'',jugadores:[],suplentes:[],dt:{nombre:'',ok:false,editando:false},guardado:false},
    visitante:{equipo:'',jugadores:[],suplentes:[],dt:{nombre:'',ok:false,editando:false},guardado:false}
  };
});

// Estado temporal para el modal JSON
var jsonModalData = { torneoId:'', torneoNombre:'', equipoNombre:'', hojaName:'' };

// ══════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ══════════════════════════════════════════════════════════════
function configActual() {
  var t = TORNEOS.find(function(t){ return t.id===estado[partidoActual].torneoId; });
  return t ? t.config : {titulares:11,suplentes:0,mostrarPrefijoDT:true};
}

function jugadoresVacios(n) {
  return Array.from({length:n||0},function(){ return {dorsal:'',nombre:'',ok:false,error:false,editando:false}; });
}

function normalizarNombreHoja(nombre) {
  var upper = nombre.toUpperCase();
  return upper
    .replace(/Á/g,'A').replace(/É/g,'E').replace(/Í/g,'I').replace(/Ó/g,'O').replace(/Ú/g,'U')
    .replace(/À/g,'A').replace(/È/g,'E').replace(/Ì/g,'I').replace(/Ò/g,'O').replace(/Ù/g,'U')
    .replace(/Ü/g,'U');
}

function sugerirIdEquipo(nombre) {
  return nombre.toLowerCase()
    .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u')
    .replace(/ñ/g,'n').replace(/ü/g,'u')
    .replace(/[^a-z0-9]/g,'');
}

function sugerirTricode(nombre) {
  var norm = normalizarNombreHoja(nombre).replace(/[^A-Z0-9]/g,'');
  return norm.substring(0,3);
}

function cerrarModal(id){ document.getElementById(id).classList.remove('visible'); }

var toastTimer;
function toast(msg,tipo){
  var el=document.getElementById('toast');
  el.textContent=msg; el.className='toast '+(tipo||'ok')+' show';
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){ el.classList.remove('show'); },3500);
}

function mostrarErrorConfig(msg){
  document.getElementById('error-config-txt').textContent=msg;
  document.getElementById('error-config').classList.add('visible');
}

// ══════════════════════════════════════════════════════════════
// INICIO
// ══════════════════════════════════════════════════════════════
window.onload = function() {
  google.script.run
    .withSuccessHandler(function(partidos){
      if (partidos&&partidos.error){ mostrarErrorConfig(partidos.error); return; }
      PARTIDOS = partidos||[]; renderTabs(); renderPartido();
    })
    .withFailureHandler(function(e){ mostrarErrorConfig('Error: '+e.message); })
    .getPartidos();

  google.script.run
    .withSuccessHandler(function(res){
      if (res&&res.error){ mostrarErrorConfig(res.error); return; }
      TORNEOS = res||[]; poblarSelectorTorneo(); actualizarSeccionAgregarEquipo();
    })
    .withFailureHandler(function(e){ mostrarErrorConfig('Error: '+e.message); })
    .getTorneos();
};

// ══════════════════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════════════════
function renderTabs() {
  var bar=document.getElementById('tabs-bar'); bar.innerHTML='';
  PARTIDOS.forEach(function(p,i){
    var btn=document.createElement('button');
    btn.className='tab'+(i===partidoActual?' activo':'');
    btn.textContent=p.nombre;
    btn.onclick=(function(idx){ return function(){ cambiarPartido(idx); }; })(i);
    bar.appendChild(btn);
  });
  if (PARTIDOS.length<MAX_PARTIDOS){
    var btnAdd=document.createElement('button');
    btnAdd.className='tab-agregar'; btnAdd.textContent='+ Partido';
    btnAdd.onclick=function(){ abrirLoginAdmin(); };
    bar.appendChild(btnAdd);
  }
  var nombre=PARTIDOS[partidoActual]?PARTIDOS[partidoActual].nombre:'PARTIDO '+(partidoActual+1);
  document.getElementById('badge-partido').textContent=nombre.toUpperCase();
}

function cambiarPartido(idx){ partidoActual=idx; renderTabs(); renderPartido(); }

function renderPartido() {
  var p=estado[partidoActual];
  poblarSelectorTorneo();
  actualizarSelectEquipos();
  document.getElementById('sel-local').value    =p.local.equipo    ||'';
  document.getElementById('sel-visitante').value=p.visitante.equipo||'';
  document.getElementById('nombre-local').textContent    =p.local.equipo    ||'—';
  document.getElementById('nombre-visitante').textContent=p.visitante.equipo||'—';
  document.getElementById('btn-plantel-local').style.display    =p.local.equipo    ?'':'none';
  document.getElementById('btn-plantel-visitante').style.display=p.visitante.equipo?'':'none';
  plantelVisible={local:false,visitante:false};
  plantelData={local:[],visitante:[]};
  document.getElementById('plantel-local').style.display    ='none';
  document.getElementById('plantel-visitante').style.display='none';
  renderCuerpo('local'); renderCuerpo('visitante');
}

// ══════════════════════════════════════════════════════════════
// TORNEOS
// ══════════════════════════════════════════════════════════════
function poblarSelectorTorneo() {
  var sel=document.getElementById('sel-torneo');
  var valorActual=estado[partidoActual].torneoId;
  sel.innerHTML='<option value="">-- Selecciona torneo --</option>';
  TORNEOS.forEach(function(t){
    var opt=document.createElement('option'); opt.value=t.id; opt.text=t.nombre; sel.appendChild(opt);
  });
  sel.value=valorActual||'';
  actualizarBadgeTorneo();
}

function actualizarBadgeTorneo() {
  var badge=document.getElementById('torneo-info-badge');
  var cfg=configActual();
  if (!estado[partidoActual].torneoId){ badge.innerHTML=''; return; }
  var html='<span class="torneo-badge especial">'+cfg.titulares+' titulares</span>';
  if (cfg.suplentes>0) html+='<span class="torneo-badge especial">'+cfg.suplentes+' suplentes</span>';
  badge.innerHTML=html;
}

function cambiarTorneo() {
  var id=document.getElementById('sel-torneo').value;
  var p=estado[partidoActual];
  var cfg=id?((TORNEOS.find(function(t){ return t.id===id; })||{}).config||{titulares:11,suplentes:0,mostrarPrefijoDT:true}):{titulares:11,suplentes:0,mostrarPrefijoDT:true};
  p.torneoId=id;
  p.local    ={equipo:'',jugadores:jugadoresVacios(cfg.titulares),suplentes:[],dt:{nombre:'',ok:false,editando:false},guardado:false};
  p.visitante={equipo:'',jugadores:jugadoresVacios(cfg.titulares),suplentes:[],dt:{nombre:'',ok:false,editando:false},guardado:false};
  document.getElementById('nombre-local').textContent='—';
  document.getElementById('nombre-visitante').textContent='—';
  document.getElementById('estado-local').classList.remove('visible');
  document.getElementById('estado-visitante').classList.remove('visible');
  document.getElementById('btn-plantel-local').style.display='none';
  document.getElementById('btn-plantel-visitante').style.display='none';
  document.getElementById('plantel-local').style.display='none';
  document.getElementById('plantel-visitante').style.display='none';
  plantelVisible={local:false,visitante:false}; plantelData={local:[],visitante:[]};
  actualizarSelectEquipos();
  renderCuerpo('local'); renderCuerpo('visitante');
  actualizarBadgeTorneo();
  actualizarSeccionAgregarEquipo();
}

function actualizarSelectEquipos() {
  var p=estado[partidoActual];
  ['local','visitante'].forEach(function(lado){
    var sel=document.getElementById('sel-'+lado);
    if (!p.torneoId){
      sel.innerHTML='<option value="">Selecciona torneo primero</option>';
      sel.style.pointerEvents='none'; sel.style.opacity='0.5'; return;
    }
    sel.innerHTML='<option value="">Cargando equipos...</option>';
    sel.style.pointerEvents='none'; sel.style.opacity='0.5';
    google.script.run
      .withSuccessHandler(function(equipos){
        if (equipos.error){ sel.innerHTML='<option value="">Error al cargar</option>'; return; }
        sel.innerHTML='<option value="">-- Selecciona equipo --</option>';
        equipos.forEach(function(eq){ var opt=document.createElement('option'); opt.value=eq; opt.text=eq; sel.appendChild(opt); });
        sel.value=p[lado].equipo||'';
        sel.style.pointerEvents='auto'; sel.style.opacity='1';
      })
      .withFailureHandler(function(){ sel.innerHTML='<option value="">Error de conexión</option>'; })
      .getEquipos(p.torneoId);
  });
}

function seleccionarEquipo(lado) {
  var equipo=document.getElementById('sel-'+lado).value;
  var p=estado[partidoActual]; var cfg=configActual();
  p[lado].equipo=equipo; p[lado].jugadores=jugadoresVacios(cfg.titulares);
  p[lado].suplentes=[]; p[lado].dt={nombre:'',ok:false,editando:false}; p[lado].guardado=false;
  document.getElementById('nombre-'+lado).textContent=equipo||'—';
  document.getElementById('estado-'+lado).classList.remove('visible');
  var btnPlantel=document.getElementById('btn-plantel-'+lado);
  var panelPlantel=document.getElementById('plantel-'+lado);
  btnPlantel.style.display=equipo?'':'none'; btnPlantel.textContent='REVISAR PLANTEL';
  panelPlantel.style.display='none'; plantelVisible[lado]=false; plantelData[lado]=[];
  renderCuerpo(lado);
  if (equipo&&p.torneoId) cargarDT(lado);
}

// ══════════════════════════════════════════════════════════════
// AGREGAR EQUIPO
// ══════════════════════════════════════════════════════════════
function actualizarSeccionAgregarEquipo() {
  var seccion=document.getElementById('seccion-agregar-equipo');
  var sel=document.getElementById('sel-torneo-equipo');

  if (!TORNEOS.length){ seccion.style.display='none'; return; }
  seccion.style.display='block';

  var torneoActualId=estado[partidoActual].torneoId;
  sel.innerHTML='<option value="">-- Selecciona torneo --</option>';
  TORNEOS.forEach(function(t){
    var opt=document.createElement('option'); opt.value=t.id; opt.text=t.nombre; sel.appendChild(opt);
  });
  sel.removeAttribute('disabled');
  if (torneoActualId) sel.value=torneoActualId;
}

function actualizarPreviewJson() {
  var id       = document.getElementById('json-id').value.trim();
  var tricode  = document.getElementById('json-tricode').value.trim().toUpperCase();
  var title    = document.getElementById('json-title').value.trim();
  var eqname   = document.getElementById('json-eqname').value.trim();
  var icon     = document.getElementById('json-icon').value.trim();
  var hoja     = jsonModalData.hojaName;
  var range1   = hoja ? hoja+'!D1:E15' : '—';
  var range2   = hoja ? hoja+'!A1:B100' : '—';

  document.getElementById('json-range1-preview').textContent = range1;
  document.getElementById('json-range2-preview').textContent = range2;
  document.getElementById('json-tricode').value = tricode;

  var obj = {
    id: id || '…',
    title: title || '…',
    eqName: eqname || '…',
    icon: icon || '',
    tricode: tricode || '…',
    sheetRange: range1,
    sheetRange2: range2
  };
  document.getElementById('json-preview-code').textContent = JSON.stringify(obj, null, 2);
}

function abrirModalJson(torneoId, equipoNombre) {
  var hojaName = normalizarNombreHoja(equipoNombre);
  jsonModalData = { torneoId:torneoId, equipoNombre:equipoNombre, hojaName:hojaName };
  document.getElementById('modal-json-subtitulo').textContent = 'Equipo creado: ' + equipoNombre;
  document.getElementById('json-id').value      = sugerirIdEquipo(equipoNombre);
  document.getElementById('json-tricode').value = sugerirTricode(equipoNombre);
  document.getElementById('json-title').value   = equipoNombre;
  document.getElementById('json-eqname').value  = '';
  document.getElementById('json-icon').value    = '';
  actualizarPreviewJson();
  document.getElementById('modal-json-github').classList.add('visible');
}

function ejecutarAgregarEquipo() {
  var torneoId=document.getElementById('sel-torneo-equipo').value;
  var nombre=document.getElementById('input-nombre-equipo').value.trim();
  if (!torneoId){ toast('Selecciona un torneo','error'); return; }
  if (!nombre){ toast('Ingresa el nombre del equipo','error'); return; }
  var btn=document.getElementById('btn-agregar-equipo');
  btn.disabled=true; btn.textContent='CREANDO...';
  google.script.run
    .withSuccessHandler(function(res){
      btn.disabled=false; btn.textContent='+ AGREGAR';
      if (res.error){ toast(res.error,'error'); return; }
      var nombreGuardado = nombre;
      document.getElementById('input-nombre-equipo').value='';
      toast('Equipo "'+nombreGuardado+'" creado ✓','ok');
      if (torneoId===estado[partidoActual].torneoId) actualizarSelectEquipos();
      abrirModalJson(torneoId, nombreGuardado);
    })
    .withFailureHandler(function(){ btn.disabled=false; btn.textContent='+ AGREGAR'; toast('Error de conexión','error'); })
    .agregarEquipo(torneoId, nombre);
}

function publicarJsonGitHub() {
  var id      = document.getElementById('json-id').value.trim();
  var tricode = document.getElementById('json-tricode').value.trim().toUpperCase();
  var title   = document.getElementById('json-title').value.trim();
  var eqname  = document.getElementById('json-eqname').value.trim();
  var icon    = document.getElementById('json-icon').value.trim();
  var hoja    = jsonModalData.hojaName;
  
  if (!id)     { toast('❌ El ID no puede estar vacío','error'); return; }
  if (!title)  { toast('❌ El título no puede estar vacío','error'); return; }
  if (!eqname) { toast('❌ El nombre del equipo no puede estar vacío','error'); return; }
  if (!tricode){ toast('❌ El tricode no puede estar vacío','error'); return; }
  if (!hoja)   { toast('❌ Sin nombre de hoja','error'); return; }
  
  var entradaJson = {
    id: id,
    title: title,
    eqName: eqname,
    icon: icon,
    tricode: tricode,
    sheetRange:  hoja+'!D1:E15',
    sheetRange2: hoja+'!A1:B100'
  };
  
  console.log('📤 Publicando JSON:', entradaJson);
  toast('📤 Publicando ' + id + '...', 'ok');
  
  var btn = document.getElementById('btn-publicar-json');
  btn.disabled = true; 
  btn.textContent = 'PUBLICANDO...';
  
  google.script.run
    .withSuccessHandler(function(res){
      btn.disabled = false; 
      btn.textContent = '🚀 PUBLICAR EN GITHUB';
      if (res.error){ 
        toast('❌ Error GitHub: ' + res.error, 'error');
        console.error('❌ Error detallado:', res.error);
      } else { 
        toast('✅ Publicado en GitHub ✓', 'ok');
        console.log('✅ Publicación exitosa');
        cerrarModal('modal-json-github');
      }
    })
    .withFailureHandler(function(e){
      btn.disabled = false; 
      btn.textContent = '🚀 PUBLICAR EN GITHUB';
      toast('❌ Error de conexión: ' + e, 'error');
      console.error('❌ Error de conexión:', e);
    })
    .publicarEquipoJson(entradaJson);
}

// ══════════════════════════════════════════════════════════════
// FUNCIÓN PARA ELIMINAR EQUIPO
// ══════════════════════════════════════════════════════════════
function pedirEliminarEquipo(torneoId, equipoNombre, equipoId) {
  console.log('🗑️ Solicitando eliminar equipo:', { torneoId, equipoNombre, equipoId });
  
  equipoParaEliminar = {
    torneoId: torneoId,
    equipoNombre: equipoNombre,
    equipoId: equipoId || ''
  };
  eliminarModo = 'equipo';
  
  var mensaje = '¿Eliminar el equipo "' + equipoNombre + '"?\n\n';
  mensaje += 'Esto eliminará:\n';
  mensaje += '• La hoja en Google Sheets\n';
  if (equipoId) {
    mensaje += '• El equipo del JSON en GitHub (ID: ' + equipoId + ')\n';
  } else {
    mensaje += '• El equipo del JSON en GitHub (si existe)\n';
  }
  mensaje += '\n¿Estás seguro?';
  
  document.getElementById('modal-eliminar-txt').textContent = mensaje;
  document.getElementById('modal-eliminar').classList.add('visible');
}

// ══════════════════════════════════════════════════════════════
// RENDER CUERPO
// ══════════════════════════════════════════════════════════════
function renderCuerpo(lado) {
  var cfg=configActual(); var p=estado[partidoActual];
  var contenedor=document.getElementById('cuerpo-'+lado); contenedor.innerHTML='';
  if (!p[lado].jugadores||p[lado].jugadores.length!==cfg.titulares) p[lado].jugadores=jugadoresVacios(cfg.titulares);
  if (!p[lado].suplentes) p[lado].suplentes=[];

  var secTit=document.createElement('div'); secTit.className='seccion-jugadores';
  if (cfg.titulares!==11){
    var lblTit=document.createElement('div'); lblTit.className='seccion-titulo';
    lblTit.textContent='TITULARES ('+cfg.titulares+')'; secTit.appendChild(lblTit);
  }
  var listaTit=document.createElement('div'); listaTit.className='lista-jugadores';
  for (var i=0;i<cfg.titulares;i++) listaTit.appendChild(crearFilaJugador(lado,i,false));
  secTit.appendChild(listaTit); contenedor.appendChild(secTit);
  contenedor.appendChild(crearSeccionDT(lado));

  if (cfg.suplentes>0){
    var secSup=document.createElement('div'); secSup.className='seccion-jugadores';
    var lblSup=document.createElement('div'); lblSup.className='seccion-titulo suplentes';
    lblSup.textContent='SUPLENTES ('+p[lado].suplentes.length+'/'+cfg.suplentes+')'; secSup.appendChild(lblSup);
    var listaSup=document.createElement('div'); listaSup.className='lista-jugadores';
    for (var j=0;j<p[lado].suplentes.length;j++) listaSup.appendChild(crearFilaJugador(lado,j,true));
    secSup.appendChild(listaSup);
    if (p[lado].suplentes.length<cfg.suplentes){
      var btnAdd=document.createElement('button'); btnAdd.className='btn-agregar-suplente'; btnAdd.textContent='+ Agregar suplente';
      btnAdd.onclick=(function(l){ return function(){ agregarSuplente(l); }; })(lado);
      secSup.appendChild(btnAdd);
    }
    contenedor.appendChild(secSup);
  }
  actualizarContador(lado);
}

function crearFilaJugador(lado,idx,esSuplente) {
  var arr=esSuplente?estado[partidoActual][lado].suplentes:estado[partidoActual][lado].jugadores;
  var j=arr[idx];
  var row=document.createElement('div');
  row.className='jugador-row'+(j.ok?' tiene-jugador'+(esSuplente?' suplente':''):'')+(j.error?' error':'');
  var inp=document.createElement('input'); inp.type='number';
  inp.className='dorsal-input'+(esSuplente?' suplente':'');
  inp.placeholder=String(idx+1); inp.value=j.dorsal; inp.min=1; inp.max=99;
  inp.addEventListener('change',(function(l,i,s){ return function(){ onDorsalChange(l,i,this.value,s); }; })(lado,idx,esSuplente));
  inp.addEventListener('keydown',(function(l,i,s){ return function(e){ if(e.key==='Enter') onDorsalChange(l,i,this.value,s); }; })(lado,idx,esSuplente));
  var nombreEl;
  if (j.editando){
    nombreEl=document.createElement('input'); nombreEl.type='text'; nombreEl.className='nombre-editable';
    nombreEl.value=j.nombre; nombreEl.id=(esSuplente?'edit-sup-':'edit-')+lado+'-'+idx;
  } else {
    nombreEl=document.createElement('div');
    nombreEl.className='nombre-jugador'+(!j.ok&&!j.error?' vacio':'')+(j.error?' error-txt':'');
    nombreEl.textContent=j.ok?j.nombre:(j.error?j.error:'Ingresa dorsal...');
  }
  var acciones=document.createElement('div'); acciones.className='fila-acciones';
  if (j.editando){
    var btnOk=document.createElement('button'); btnOk.className='btn-guardar-nombre'; btnOk.textContent='OK';
    btnOk.onclick=(function(l,i,s){ return function(){ confirmarEdicion(l,i,s); }; })(lado,idx,esSuplente);
    acciones.appendChild(btnOk);
  } else if (j.ok){
    var btnEdit=document.createElement('button'); btnEdit.className='btn-editar'; btnEdit.textContent='Editar';
    btnEdit.onclick=(function(l,i,s){ return function(){ activarEdicion(l,i,s); }; })(lado,idx,esSuplente);
    acciones.appendChild(btnEdit);
  }
  if (esSuplente){
    var btnBorrar=document.createElement('button'); btnBorrar.className='btn-borrar-suplente'; btnBorrar.textContent='✕';
    btnBorrar.onclick=(function(l,i){ return function(){ borrarSuplente(l,i); }; })(lado,idx);
    acciones.appendChild(btnBorrar);
  }
  row.appendChild(inp); row.appendChild(nombreEl); row.appendChild(acciones);
  return row;
}

function agregarSuplente(lado){
  var cfg=configActual(); var sup=estado[partidoActual][lado].suplentes;
  if (sup.length>=cfg.suplentes) return;
  sup.push({dorsal:'',nombre:'',ok:false,error:false,editando:false}); renderCuerpo(lado);
}
function borrarSuplente(lado,idx){ estado[partidoActual][lado].suplentes.splice(idx,1); renderCuerpo(lado); }

function onDorsalChange(lado,idx,dorsal,esSuplente){
  if (!esSuplente&&estado[partidoActual][lado].guardado){
    estado[partidoActual][lado].guardado=false;
    document.getElementById('estado-'+lado).classList.remove('visible');
    document.getElementById('btn-guardar-'+lado).disabled=false;
  }
  buscarJugador(lado,idx,dorsal,esSuplente);
}

function buscarJugador(lado,idx,dorsal,esSuplente){
  if (!dorsal) return;
  var p=estado[partidoActual];
  if (!p.torneoId||!p[lado].equipo){ toast('Selecciona torneo y equipo primero','error'); return; }
  var arr=esSuplente?p[lado].suplentes:p[lado].jugadores; var j=arr[idx];
  j.dorsal=dorsal; j.ok=false; j.error=false; j.nombre='';
  google.script.run
    .withSuccessHandler(function(res){
      if (res.error){ j.error=res.error; j.ok=false; } else { j.nombre=res.nombre; j.ok=true; j.error=false; }
      renderCuerpo(lado);
    })
    .withFailureHandler(function(){ j.error='Error de conexión'; renderCuerpo(lado); })
    .buscarJugador(p.torneoId,p[lado].equipo,dorsal);
}

function activarEdicion(lado,idx,esSuplente){
  var arr=esSuplente?estado[partidoActual][lado].suplentes:estado[partidoActual][lado].jugadores;
  arr[idx].editando=true; renderCuerpo(lado);
  setTimeout(function(){ var el=document.getElementById((esSuplente?'edit-sup-':'edit-')+lado+'-'+idx); if(el){el.focus();el.select();} },50);
}

function confirmarEdicion(lado,idx,esSuplente){
  var el=document.getElementById((esSuplente?'edit-sup-':'edit-')+lado+'-'+idx);
  var nombre=el?el.value.trim():'';
  if (!nombre){ toast('El nombre no puede estar vacío','error'); return; }
  var arr=esSuplente?estado[partidoActual][lado].suplentes:estado[partidoActual][lado].jugadores; var j=arr[idx];
  google.script.run
    .withSuccessHandler(function(res){
      if (res.error) toast('Error: '+res.error,'error');
      else { j.nombre=nombre; j.editando=false; toast('Nombre actualizado ✓','ok'); renderCuerpo(lado); }
    })
    .withFailureHandler(function(){ toast('Error de conexión','error'); })
    .actualizarJugador(estado[partidoActual].torneoId,estado[partidoActual][lado].equipo,j.dorsal,nombre);
}

function crearSeccionDT(lado){
  var p=estado[partidoActual]; var dt=p[lado].dt||{nombre:'',ok:false,editando:false};
  var sec=document.createElement('div'); sec.className='dt-seccion';
  if (!p[lado].equipo){ sec.style.display='none'; return sec; }
  var lbl=document.createElement('div'); lbl.className='dt-label'; lbl.textContent='Director Técnico';
  sec.appendChild(lbl);
  var row=document.createElement('div'); row.className='dt-row'+(dt.ok?' tiene-dt':'');
  var badge=document.createElement('div'); badge.className='dt-badge'; badge.textContent='D.T.';
  row.appendChild(badge);
  if (dt.editando){
    var inp=document.createElement('input'); inp.type='text'; inp.className='dt-input-nombre';
    inp.value=dt.nombre; inp.id='dt-input-'+lado; inp.placeholder='Nombre del DT...';
    inp.addEventListener('keydown',function(e){ if(e.key==='Enter') confirmarEdicionDT(lado); });
    var btnOk=document.createElement('button'); btnOk.className='btn-guardar-nombre'; btnOk.textContent='OK';
    btnOk.onclick=function(){ confirmarEdicionDT(lado); };
    row.appendChild(inp); row.appendChild(btnOk);
    setTimeout(function(){ var i=document.getElementById('dt-input-'+lado); if(i){i.focus();i.select();} },50);
  } else {
    var nombreDiv=document.createElement('div');
    nombreDiv.className=dt.ok?'dt-nombre':'dt-nombre vacio';
    nombreDiv.textContent=dt.ok?dt.nombre:'Sin DT — haz clic en Agregar';
    var btnEdit=document.createElement('button'); btnEdit.className='btn-editar'; btnEdit.textContent=dt.ok?'Editar':'Agregar';
    btnEdit.onclick=function(){ activarEdicionDT(lado); };
    row.appendChild(nombreDiv); row.appendChild(btnEdit);
  }
  sec.appendChild(row); return sec;
}

function cargarDT(lado){
  var p=estado[partidoActual];
  google.script.run
    .withSuccessHandler(function(res){
      p[lado].dt=(!res.error&&res.nombre)?{nombre:res.nombre,ok:true,editando:false}:{nombre:'',ok:false,editando:false};
      renderCuerpo(lado);
    })
    .withFailureHandler(function(){ p[lado].dt={nombre:'',ok:false,editando:false}; renderCuerpo(lado); })
    .getDT(p.torneoId,p[lado].equipo);
}

function activarEdicionDT(lado){ estado[partidoActual][lado].dt.editando=true; renderCuerpo(lado); }

function confirmarEdicionDT(lado){
  var inp=document.getElementById('dt-input-'+lado); var nombre=inp?inp.value.trim():'';
  var dt=estado[partidoActual][lado].dt;
  var p=estado[partidoActual]; var cfg=configActual();
  dt.nombre=nombre; dt.ok=nombre!==''; dt.editando=false;
  renderCuerpo(lado);
  if (!p.torneoId||!p[lado].equipo) return;
  google.script.run
    .withSuccessHandler(function(res){
      if (res.error) toast('Error al guardar DT: '+res.error,'error');
      else if (nombre) toast('DT guardado en Sheets ✓','ok');
    })
    .withFailureHandler(function(){ toast('Error de conexión al guardar DT','error'); })
    .guardarDT(p.torneoId,p[lado].equipo,nombre,cfg.mostrarPrefijoDT!==undefined?cfg.mostrarPrefijoDT:true);
}

function actualizarContador(lado){
  var p=estado[partidoActual]; var cfg=configActual();
  var cnt   =(p[lado].jugadores||[]).filter(function(j){ return j.ok; }).length;
  var cntSup=(p[lado].suplentes||[]).filter(function(j){ return j.ok; }).length;
  var c=document.getElementById('contador-'+lado);
  c.innerHTML='<div class="contador-bloque"><span class="contador-txt">TITULARES</span>'+
    '<span class="contador-num '+(cnt===cfg.titulares?'completo':'incompleto')+'">'+cnt+'/'+cfg.titulares+'</span></div>';
  if (cfg.suplentes>0) c.innerHTML+='<div class="contador-bloque"><span class="contador-txt" style="color:#64B5F6">SUPLENTES</span>'+
    '<span class="contador-num suplentes">'+cntSup+'/'+cfg.suplentes+'</span></div>';
  var btn=document.getElementById('btn-guardar-'+lado);
  if (!p[lado].guardado) btn.disabled=cnt===0;
}

function guardarAlineacion(lado){
  var p=estado[partidoActual]; var cfg=configActual();
  if (!p.torneoId||!p[lado].equipo){ toast('Selecciona torneo y equipo primero','error'); return; }
  var jugadores=(p[lado].jugadores||[]).filter(function(j){ return j.ok; }).map(function(j){ return {dorsal:j.dorsal,nombre:j.nombre}; });
  if (!jugadores.length){ toast('No hay titulares para guardar','error'); return; }
  var suplentes=(p[lado].suplentes||[]).filter(function(j){ return j.ok; }).map(function(j){ return {dorsal:j.dorsal,nombre:j.nombre}; });
  var nombreDT=p[lado].dt?p[lado].dt.nombre:'';
  var btn=document.getElementById('btn-guardar-'+lado); btn.disabled=true; btn.textContent='GUARDANDO...';
  google.script.run
    .withSuccessHandler(function(res){
      if (res.error){ btn.textContent='GUARDAR EN SHEETS'; btn.disabled=false; toast('Error: '+res.error,'error'); }
      else { p[lado].guardado=true; btn.textContent='✓ GUARDADO'; btn.disabled=true; document.getElementById('estado-'+lado).classList.add('visible'); toast('Alineación guardada ✓','ok'); }
    })
    .withFailureHandler(function(){ btn.textContent='GUARDAR EN SHEETS'; btn.disabled=false; toast('Error de conexión','error'); })
    .guardarAlineacion(p.torneoId,p[lado].equipo,jugadores,nombreDT,suplentes,cfg);
}

function limpiarPanel(lado){
  var cfg=configActual();
  estado[partidoActual][lado].jugadores=jugadoresVacios(cfg.titulares);
  estado[partidoActual][lado].suplentes=[];
  estado[partidoActual][lado].dt={nombre:'',ok:false,editando:false};
  estado[partidoActual][lado].guardado=false;
  document.getElementById('estado-'+lado).classList.remove('visible');
  renderCuerpo(lado); toast('Panel limpiado','ok');
}

// ══════════════════════════════════════════════════════════════
// CONFIG TITULARES / SUPLENTES / DT
// ══════════════════════════════════════════════════════════════
function selTitulares(val){
  cfgTitulares=val;
  document.querySelectorAll('#rg-titulares .radio-opt').forEach(function(el){ el.classList.remove('activo'); });
  event.currentTarget.classList.add('activo');
  document.getElementById('campo-titulares-custom').classList.toggle('visible',val===0);
}
function selSuplentes(val){
  document.getElementById('tog-sup-no').className='toggle-opt'+(!val?' activo-no':'');
  document.getElementById('tog-sup-si').className='toggle-opt'+(val?' activo-si':'');
  document.getElementById('campo-suplentes').classList.toggle('visible',val);
}
function selPrefijoDT(val){
  cfgPrefijoDT=val;
  document.getElementById('tog-dt-nombre').className ='toggle-opt'+(!val?' activo-si':'');
  document.getElementById('tog-dt-prefijo').className='toggle-opt'+(val?' activo-si':'');
}
function selTitularesNew(val){
  cfgTitularesNew=val;
  document.querySelectorAll('#rg-titulares-new .radio-opt').forEach(function(el){ el.classList.remove('activo'); });
  event.currentTarget.classList.add('activo');
  document.getElementById('campo-titulares-new-custom').classList.toggle('visible',val===0);
}
function selSuplentesNew(val){
  cfgSuplentesNew=val?3:0;
  document.getElementById('tog-sup-no-new').className='toggle-opt'+(!val?' activo-no':'');
  document.getElementById('tog-sup-si-new').className='toggle-opt'+(val?' activo-si':'');
  document.getElementById('campo-suplentes-new').classList.toggle('visible',val);
}
function selPrefijoDTNew(val){
  cfgPrefijoDTNew=val;
  document.getElementById('tog-dt-nombre-new').className ='toggle-opt'+(!val?' activo-si':'');
  document.getElementById('tog-dt-prefijo-new').className='toggle-opt'+(val?' activo-si':'');
}

// ══════════════════════════════════════════════════════════════
// ADMIN — LOGIN Y PANEL
// ══════════════════════════════════════════════════════════════
function abrirLoginAdmin(){
  document.getElementById('input-clave').value='';
  document.getElementById('login-error').style.display='none';
  document.getElementById('modal-login').classList.add('visible');
  setTimeout(function(){ document.getElementById('input-clave').focus(); },100);
}
function confirmarLogin(){
  var clave=document.getElementById('input-clave').value;
  google.script.run
    .withSuccessHandler(function(ok){
      if (ok){ cerrarModal('modal-login'); abrirAdmin(); }
      else { document.getElementById('login-error').style.display='block'; }
    })
    .verificarClave(clave);
}
function abrirAdmin(){
  document.getElementById('admin-overlay').classList.add('visible');
  renderAdminPartidos(); renderAdminTorneos();
}
function cerrarAdmin(){
  document.getElementById('admin-overlay').classList.remove('visible');
  recargarPartidos();
  google.script.run
    .withSuccessHandler(function(res){
      TORNEOS=res||[]; poblarSelectorTorneo(); actualizarSeccionAgregarEquipo();
    })
    .getTorneos();
}

// ══════════════════════════════════════════════════════════════
// ADMIN — PARTIDOS
// ══════════════════════════════════════════════════════════════
function renderAdminPartidos(){
  var lista=document.getElementById('lista-admin-partidos'); lista.innerHTML='';
  if (!PARTIDOS.length){ lista.innerHTML='<div class="admin-empty">No hay partidos.</div>'; return; }
  PARTIDOS.forEach(function(p){
    var item=document.createElement('div'); item.className='partido-admin-item';
    var info=document.createElement('div'); info.style.flex='1'; info.style.minWidth='0';
    var fila1=document.createElement('div'); fila1.style.cssText='display:flex;align-items:center;gap:8px';
    var nSpan=document.createElement('span'); nSpan.className='partido-admin-nombre'; nSpan.textContent=p.nombre;
    fila1.appendChild(nSpan);
    if (p.fijo){ var badge=document.createElement('span'); badge.className='partido-admin-badge'; badge.textContent='PREDETERMINADO'; fila1.appendChild(badge); }
    info.appendChild(fila1);
    var fila2=document.createElement('div'); fila2.className='partido-token-fila';
    var tLbl=document.createElement('span'); tLbl.className='partido-token-label'; tLbl.textContent='APP TOKEN:'; fila2.appendChild(tLbl);
    if (p.token){ var tVal=document.createElement('span'); tVal.className='partido-token-valor'; tVal.textContent=p.token; tVal.title=p.token; fila2.appendChild(tVal); }
    else { var tVac=document.createElement('span'); tVac.className='partido-token-vacio'; tVac.textContent='Sin token asignado'; fila2.appendChild(tVac); }
    info.appendChild(fila2); item.appendChild(info);
    var acc=document.createElement('div'); acc.className='partido-admin-acciones';
    var btnTok=document.createElement('button'); btnTok.className='btn-token'; btnTok.textContent=p.token?'✎ Token':'+ Token';
    btnTok.onclick=(function(part){ return function(){ abrirModalToken(part); }; })(p); acc.appendChild(btnTok);
    if (p.token){
      var btnDelTok=document.createElement('button'); btnDelTok.className='btn-token-eliminar'; btnDelTok.textContent='✕ Token';
      btnDelTok.onclick=(function(part){ return function(){ eliminarToken(part); }; })(p); acc.appendChild(btnDelTok);
    }
    var btnRen=document.createElement('button'); btnRen.className='btn-renombrar'; btnRen.textContent='Renombrar';
    btnRen.onclick=(function(part){ return function(){ pedirRenombrarPartido(part); }; })(p); acc.appendChild(btnRen);
    if (!p.fijo){
      var btnDel=document.createElement('button'); btnDel.className='btn-eliminar'; btnDel.textContent='Eliminar';
      btnDel.onclick=(function(part){ return function(){ pedirEliminarPartido(part); }; })(p); acc.appendChild(btnDel);
    }
    item.appendChild(acc); lista.appendChild(item);
  });
  var cnt=document.createElement('div');
  cnt.style.cssText='font-size:12px;color:var(--texto-dim);margin-top:8px;text-align:right;';
  cnt.textContent=PARTIDOS.length+' / '+MAX_PARTIDOS+' partidos'; lista.appendChild(cnt);
}

function abrirModalToken(partido){
  partidoParaToken=partido;
  document.getElementById('modal-token-subtitulo').textContent='Panel: '+partido.nombre;
  document.getElementById('input-app-token').value=partido.token||'';
  document.getElementById('modal-token').classList.add('visible');
  setTimeout(function(){ document.getElementById('input-app-token').focus(); },100);
}
function confirmarToken(){
  var token=document.getElementById('input-app-token').value.trim();
  if (!token){ toast('El token no puede estar vacío','error'); return; }
  google.script.run
    .withSuccessHandler(function(res){ cerrarModal('modal-token'); if(res.error) toast(res.error,'error'); else { toast('Token guardado ✓','ok'); recargarPartidos(); } })
    .withFailureHandler(function(){ toast('Error de conexión','error'); })
    .guardarTokenPartido(partidoParaToken.fila,token);
}
function eliminarToken(partido){
  if (!confirm('¿Eliminar el App Token de "'+partido.nombre+'"?')) return;
  google.script.run
    .withSuccessHandler(function(res){ if(res.error) toast(res.error,'error'); else { toast('Token eliminado ✓','ok'); recargarPartidos(); } })
    .withFailureHandler(function(){ toast('Error de conexión','error'); })
    .guardarTokenPartido(partido.fila,'');
}
function agregarPartido(){
  var nombre=document.getElementById('nuevo-partido-nombre').value.trim();
  if (!nombre){ toast('Ingresa el nombre del partido','error'); return; }
  if (PARTIDOS.length>=MAX_PARTIDOS){ toast('Máximo '+MAX_PARTIDOS+' partidos','error'); return; }
  var btn=document.getElementById('btn-agregar-partido'); btn.disabled=true; btn.textContent='GUARDANDO...';
  google.script.run
    .withSuccessHandler(function(res){
      btn.disabled=false; btn.textContent='+ AGREGAR';
      if (res.error) toast(res.error,'error');
      else { document.getElementById('nuevo-partido-nombre').value=''; toast('Partido agregado ✓','ok'); recargarPartidos(); }
    })
    .withFailureHandler(function(){ btn.disabled=false; btn.textContent='+ AGREGAR'; toast('Error de conexión','error'); })
    .agregarPartido(nombre);
}
function pedirRenombrarPartido(partido){
  partidoParaRenombrar=partido;
  document.getElementById('input-nombre-partido').value=partido.nombre;
  document.getElementById('modal-renombrar-partido').classList.add('visible');
  setTimeout(function(){ var i=document.getElementById('input-nombre-partido'); i.focus(); i.select(); },100);
}
function confirmarRenombrarPartido(){
  var nombre=document.getElementById('input-nombre-partido').value.trim();
  if (!nombre){ toast('El nombre no puede estar vacío','error'); return; }
  google.script.run
    .withSuccessHandler(function(res){ cerrarModal('modal-renombrar-partido'); if(res.error) toast(res.error,'error'); else { toast('Renombrado ✓','ok'); recargarPartidos(); } })
    .renombrarPartido(partidoParaRenombrar.fila,nombre);
}
function pedirEliminarPartido(partido){
  eliminarModo='partido'; partidoParaEliminar=partido;
  document.getElementById('modal-eliminar-txt').textContent='¿Eliminar el partido "'+partido.nombre+'"?';
  document.getElementById('modal-eliminar').classList.add('visible');
}
function recargarPartidos(){
  google.script.run
    .withSuccessHandler(function(partidos){
      PARTIDOS=partidos||[];
      if (partidoActual>=PARTIDOS.length) partidoActual=PARTIDOS.length-1;
      renderTabs(); renderAdminPartidos();
    })
    .getPartidos();
}

// ══════════════════════════════════════════════════════════════
// ADMIN — TORNEOS (VERSIÓN CORREGIDA PARA ELIMINAR EQUIPOS)
// ══════════════════════════════════════════════════════════════
function renderAdminTorneos(){
  var lista = document.getElementById('lista-admin-torneos');
  lista.innerHTML = '<div class="admin-empty">Cargando torneos y equipos...</div>';
  
  google.script.run
    .withSuccessHandler(function(torneos){
      if (!torneos || !torneos.length) {
        lista.innerHTML = '<div class="admin-empty">No hay torneos registrados.</div>';
        return;
      }
      
      lista.innerHTML = '';
      
      torneos.forEach(function(t, index){
        var torneoDiv = document.createElement('div');
        torneoDiv.className = 'admin-section';
        torneoDiv.style.marginBottom = '30px';
        torneoDiv.style.borderBottom = '1px solid var(--borde)';
        torneoDiv.style.paddingBottom = '20px';
        
        var header = document.createElement('div');
        header.style.cssText = 'display:flex; align-items:center; justify-content:space-between; margin-bottom:15px; padding:0 4px;';
        header.innerHTML = '<h3 style="color:var(--amarillo); margin:0;">📋 ' + t.nombre + '</h3>' +
          '<span style="color:var(--texto-dim); font-size:11px; font-family:monospace;">ID: ' + t.id + '</span>';
        torneoDiv.appendChild(header);
        
        var equiposContainer = document.createElement('div');
        equiposContainer.id = 'equipos-torneo-' + index;
        equiposContainer.innerHTML = '<div class="admin-empty" style="padding:8px;">Cargando equipos...</div>';
        torneoDiv.appendChild(equiposContainer);
        lista.appendChild(torneoDiv);
        
        google.script.run
          .withSuccessHandler(function(equipos, torneoId, torneoNombre){
            var container = document.getElementById('equipos-torneo-' + index);
            if (!container) return;
            
            if (equipos.error || !equipos || equipos.length === 0) {
              container.innerHTML = '<div class="admin-empty" style="padding:8px; color:var(--texto-dim);">📭 No hay equipos en este torneo</div>';
              return;
            }
            
            container.innerHTML = '';
            
            google.script.run
              .withSuccessHandler(function(githubData){
                var equiposEnGithub = [];
                try {
                  if (githubData && githubData.contenido) {
                    equiposEnGithub = JSON.parse(githubData.contenido);
                  }
                } catch(e) {
                  console.error('Error parseando GitHub:', e);
                }
                
                var mapaEquipos = {};
                equiposEnGithub.forEach(function(eq){
                  var nombreNormalizado = normalizarNombreHoja(eq.eqName || eq.title || '');
                  mapaEquipos[nombreNormalizado] = eq.id;
                });
                
                equipos.forEach(function(eq){
                  var item = document.createElement('div');
                  item.className = 'torneo-admin-item';
                  item.style.padding = '12px 16px';
                  item.style.marginBottom = '8px';
                  
                  var info = document.createElement('div');
                  info.className = 'torneo-admin-info';
                  
                  var nombreEq = eq;
                  var nombreNormalizado = normalizarNombreHoja(nombreEq);
                  var githubId = mapaEquipos[nombreNormalizado] || '';
                  
                  info.innerHTML = '<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">' +
                    '<span style="color:var(--blanco); font-weight:600; font-size:15px;">⚽ ' + eq + '</span>' +
                    (githubId ? '<span style="color:var(--verde); font-size:10px; background:rgba(0,200,83,.1); padding:2px 8px; border-radius:10px;">GitHub: ' + githubId + '</span>' : 
                     '<span style="color:var(--texto-dim); font-size:10px;">(solo Sheets)</span>') +
                    '</div>';
                  
                  var acciones = document.createElement('div');
                  acciones.className = 'torneo-admin-acciones';
                  
                  var btnEliminar = document.createElement('button');
                  btnEliminar.className = 'btn-eliminar-equipo';
                  btnEliminar.innerHTML = '🗑️ ELIMINAR EQUIPO';
                  btnEliminar.style.borderColor = 'var(--rojo)';
                  btnEliminar.style.color = 'var(--rojo)';
                  btnEliminar.style.padding = '6px 14px';
                  btnEliminar.onclick = (function(tId, eNombre, gId){
                    return function(){ 
                      pedirEliminarEquipo(tId, eNombre, gId);
                    };
                  })(torneoId, eq, githubId);
                  
                  acciones.appendChild(btnEliminar);
                  item.appendChild(info);
                  item.appendChild(acciones);
                  container.appendChild(item);
                });
              })
              .withFailureHandler(function(){
                container.innerHTML = '';
                equipos.forEach(function(eq){
                  var item = document.createElement('div');
                  item.className = 'torneo-admin-item';
                  item.style.padding = '12px 16px';
                  
                  var info = document.createElement('div');
                  info.className = 'torneo-admin-info';
                  info.innerHTML = '<div style="display:flex; align-items:center; gap:10px;">' +
                    '<span style="color:var(--blanco); font-weight:600;">⚽ ' + eq + '</span>' +
                    '<span style="color:var(--texto-dim); font-size:10px;">(sin conexión a GitHub)</span>' +
                    '</div>';
                  
                  var acciones = document.createElement('div');
                  acciones.className = 'torneo-admin-acciones';
                  
                  var btnEliminar = document.createElement('button');
                  btnEliminar.className = 'btn-eliminar-equipo';
                  btnEliminar.innerHTML = '🗑️ ELIMINAR EQUIPO';
                  btnEliminar.style.borderColor = 'var(--rojo)';
                  btnEliminar.style.color = 'var(--rojo)';
                  btnEliminar.onclick = (function(tId, eNombre){
                    return function(){ 
                      pedirEliminarEquipo(tId, eNombre, '');
                    };
                  })(torneoId, eq);
                  
                  acciones.appendChild(btnEliminar);
                  item.appendChild(info);
                  item.appendChild(acciones);
                  container.appendChild(item);
                });
              })
              .leerGist();
          })
          .withFailureHandler(function(){
            var container = document.getElementById('equipos-torneo-' + index);
            if (container) {
              container.innerHTML = '<div class="admin-empty" style="color:var(--rojo);">❌ Error al cargar equipos</div>';
            }
          })
          .getEquipos(t.id);
      });
    })
    .withFailureHandler(function(){ 
      lista.innerHTML = '<div class="admin-empty" style="color:var(--rojo)">❌ Error al cargar torneos</div>'; 
    })
    .getTorneos();
}

function agregarTorneo(){
  var id=document.getElementById('nuevo-torneo-id').value.trim();
  var nombre=document.getElementById('nuevo-torneo-nombre').value.trim();
  if (!id)     { toast('Ingresa el ID del archivo','error'); return; }
  if (!nombre) { toast('Ingresa el nombre del torneo','error'); return; }
  var numTit=cfgTitularesNew===0?parseInt(document.getElementById('input-titulares-new-custom').value)||11:cfgTitularesNew;
  var numSup=cfgSuplentesNew>0?Math.max(3,parseInt(document.getElementById('input-suplentes-new').value)||3):0;
  if (numTit<1){ toast('Mínimo 1 titular','error'); return; }
  var config={titulares:numTit,suplentes:numSup,mostrarPrefijoDT:cfgPrefijoDTNew};
  var btn=document.getElementById('btn-agregar'); btn.disabled=true; btn.textContent='VERIFICANDO...';
  google.script.run
    .withSuccessHandler(function(res){
      btn.disabled=false; btn.textContent='+ AGREGAR TORNEO';
      if (res.error) toast(res.error,'error');
      else { document.getElementById('nuevo-torneo-id').value=''; document.getElementById('nuevo-torneo-nombre').value=''; toast('Torneo agregado ✓','ok'); renderAdminTorneos(); }
    })
    .withFailureHandler(function(){ btn.disabled=false; btn.textContent='+ AGREGAR TORNEO'; toast('Error de conexión','error'); })
    .agregarTorneo(id,nombre,config);
}

function abrirConfigTorneo(torneo){
  var cfg=torneo.config||{titulares:11,suplentes:0,mostrarPrefijoDT:true};
  torneoParaConfig=torneo.id;
  document.getElementById('modal-config-titulo').textContent='Configurar: '+torneo.nombre;
  cfgTitulares=cfg.titulares||11;
  var valTit=([11,5].indexOf(cfgTitulares)!==-1)?cfgTitulares:0;
  document.querySelectorAll('#rg-titulares .radio-opt').forEach(function(el){ el.classList.remove('activo'); });
  document.querySelectorAll('#rg-titulares .radio-opt').forEach(function(el){
    if (parseInt(el.querySelector('input').value)===valTit) el.classList.add('activo');
  });
  document.getElementById('campo-titulares-custom').classList.toggle('visible',valTit===0);
  if (valTit===0) document.getElementById('input-titulares-custom').value=cfgTitulares;
  var tieneSup=(cfg.suplentes||0)>0;
  document.getElementById('tog-sup-no').className='toggle-opt'+(!tieneSup?' activo-no':'');
  document.getElementById('tog-sup-si').className='toggle-opt'+(tieneSup?' activo-si':'');
  document.getElementById('campo-suplentes').classList.toggle('visible',tieneSup);
  if (tieneSup) document.getElementById('input-suplentes').value=cfg.suplentes;
  cfgPrefijoDT=cfg.mostrarPrefijoDT!==undefined?cfg.mostrarPrefijoDT:true;
  document.getElementById('tog-dt-nombre').className ='toggle-opt'+(!cfgPrefijoDT?' activo-si':'');
  document.getElementById('tog-dt-prefijo').className='toggle-opt'+(cfgPrefijoDT?' activo-si':'');
  document.getElementById('modal-config-torneo').classList.add('visible');
}

function guardarConfigTorneo(){
  var numTit=cfgTitulares===0?parseInt(document.getElementById('input-titulares-custom').value)||11:cfgTitulares;
  var supAct=document.getElementById('tog-sup-si').classList.contains('activo-si');
  var numSup=supAct?Math.max(3,parseInt(document.getElementById('input-suplentes').value)||3):0;
  var prefijo=document.getElementById('tog-dt-prefijo').classList.contains('activo-si');
  if (numTit<1){ toast('Mínimo 1 titular','error'); return; }
  var config={titulares:numTit,suplentes:numSup,mostrarPrefijoDT:prefijo};
  var btn=document.getElementById('btn-guardar-config-torneo'); btn.disabled=true; btn.textContent='GUARDANDO...';
  google.script.run
    .withSuccessHandler(function(res){
      btn.disabled=false; btn.textContent='GUARDAR CONFIG'; cerrarModal('modal-config-torneo');
      if(res.error) toast(res.error,'error'); else { toast('Configuración guardada ✓','ok'); renderAdminTorneos(); }
    })
    .withFailureHandler(function(){ btn.disabled=false; btn.textContent='GUARDAR CONFIG'; toast('Error de conexión','error'); })
    .actualizarConfigTorneo(torneoParaConfig,config);
}

function pedirRenombrar(id,nombre){
  torneoParaRenombrar=id; document.getElementById('input-nuevo-nombre').value=nombre;
  document.getElementById('modal-renombrar').classList.add('visible');
  setTimeout(function(){ var i=document.getElementById('input-nuevo-nombre'); i.focus(); i.select(); },100);
}
function confirmarRenombrar(){
  var nombre=document.getElementById('input-nuevo-nombre').value.trim();
  if (!nombre){ toast('El nombre no puede estar vacío','error'); return; }
  google.script.run
    .withSuccessHandler(function(res){ cerrarModal('modal-renombrar'); if(res.error) toast(res.error,'error'); else { toast('Renombrado ✓','ok'); renderAdminTorneos(); } })
    .renombrarTorneo(torneoParaRenombrar,nombre);
}
function pedirEliminarTorneo(id,nombre){
  eliminarModo='torneo'; torneoParaEliminar=id;
  document.getElementById('modal-eliminar-txt').textContent='¿Eliminar "'+nombre+'"? El archivo de Sheets no se borrará.';
  document.getElementById('modal-eliminar').classList.add('visible');
}

// ══════════════════════════════════════════════════════════════
// PLANTEL DESPLEGABLE
// ══════════════════════════════════════════════════════════════
function togglePlantel(lado){
  var panel=document.getElementById('plantel-'+lado);
  var btn=document.getElementById('btn-plantel-'+lado);
  plantelVisible[lado]=!plantelVisible[lado];
  if (plantelVisible[lado]){
    panel.style.display='block'; btn.textContent='OCULTAR PLANTEL';
    if (!plantelData[lado].length) cargarPlantel(lado); else renderPlantel(lado,plantelData[lado]);
  } else { panel.style.display='none'; btn.textContent='REVISAR PLANTEL'; }
}

function cargarPlantel(lado){
  var p=estado[partidoActual];
  if (!p.torneoId||!p[lado].equipo) return;
  document.getElementById('plantel-lista-'+lado).innerHTML='<div class="plantel-vacio">Cargando...</div>';
  google.script.run
    .withSuccessHandler(function(res){
      if (res&&res.error){ document.getElementById('plantel-lista-'+lado).innerHTML='<div class="plantel-vacio" style="color:var(--rojo)">'+res.error+'</div>'; return; }
      res.sort(function(a,b){ return parseInt(a.dorsal)-parseInt(b.dorsal); });
      plantelData[lado]=res; renderPlantel(lado,res);
    })
    .withFailureHandler(function(){ document.getElementById('plantel-lista-'+lado).innerHTML='<div class="plantel-vacio" style="color:var(--rojo)">Error de conexión</div>'; })
    .getPlantilla(p.torneoId,p[lado].equipo);
}

function renderPlantel(lado,jugadores){
  var lista=document.getElementById('plantel-lista-'+lado);
  if (!jugadores.length){ lista.innerHTML='<div class="plantel-vacio">No hay jugadores registrados</div>'; return; }
  lista.innerHTML='';
  jugadores.forEach(function(j,idx){ lista.appendChild(crearFilaPlantel(lado,j,idx)); });
}

function crearFilaPlantel(lado,j,idx){
  var row=document.createElement('div'); row.className='plantel-fila';
  var dorsal=document.createElement('div'); dorsal.className='plantel-dorsal'; dorsal.textContent=j.dorsal;
  var acc=document.createElement('div'); acc.className='fila-acciones';
  var nombreEl;
  if (j.editando){
    nombreEl=document.createElement('input'); nombreEl.className='plantel-nombre-input'; nombreEl.type='text'; nombreEl.value=j.nombre; nombreEl.id='plantel-edit-'+lado+'-'+idx;
    nombreEl.addEventListener('keydown',(function(l,i){ return function(e){ if(e.key==='Enter') confirmarEdicionPlantel(l,i); }; })(lado,idx));
    var btnOk=document.createElement('button'); btnOk.className='btn-guardar-nombre'; btnOk.textContent='OK';
    btnOk.onclick=(function(l,i){ return function(){ confirmarEdicionPlantel(l,i); }; })(lado,idx);
    acc.appendChild(btnOk);
    setTimeout(function(){ var el=document.getElementById('plantel-edit-'+lado+'-'+idx); if(el){el.focus();el.select();} },50);
  } else {
    nombreEl=document.createElement('div'); nombreEl.className='plantel-nombre'; nombreEl.textContent=j.nombre;
    var btnEdit=document.createElement('button'); btnEdit.className='btn-editar'; btnEdit.textContent='Editar';
    btnEdit.onclick=(function(l,i){ return function(){ activarEdicionPlantel(l,i); }; })(lado,idx); acc.appendChild(btnEdit);
    var btnDel=document.createElement('button'); btnDel.className='btn-borrar-suplente'; btnDel.textContent='✕'; btnDel.title='Eliminar del plantel';
    btnDel.onclick=(function(l,i){ return function(){ pedirEliminarJugadorPlantel(l,i); }; })(lado,idx); acc.appendChild(btnDel);
  }
  row.appendChild(dorsal); row.appendChild(nombreEl); row.appendChild(acc); return row;
}

function activarEdicionPlantel(lado,idx){ plantelData[lado][idx].editando=true; renderPlantel(lado,plantelData[lado]); }

function confirmarEdicionPlantel(lado,idx){
  var el=document.getElementById('plantel-edit-'+lado+'-'+idx); var nombre=el?el.value.trim():'';
  if (!nombre){ toast('El nombre no puede estar vacío','error'); return; }
  var j=plantelData[lado][idx]; var p=estado[partidoActual];
  google.script.run
    .withSuccessHandler(function(res){
      if (res.error) toast('Error: '+res.error,'error');
      else { j.nombre=nombre; j.editando=false; toast('Nombre actualizado ✓','ok'); renderPlantel(lado,plantelData[lado]); }
    })
    .withFailureHandler(function(){ toast('Error de conexión','error'); })
    .actualizarJugador(p.torneoId,p[lado].equipo,j.dorsal,nombre);
}

function agregarAlPlantel(lado){
  var dorsal=document.getElementById('plantel-dorsal-'+lado).value.trim();
  var nombre=document.getElementById('plantel-nombre-'+lado).value.trim();
  if (!dorsal){ toast('Ingresa el dorsal','error'); return; }
  if (!nombre){ toast('Ingresa el nombre','error'); return; }
  var p=estado[partidoActual];
  if (!p.torneoId||!p[lado].equipo){ toast('Selecciona equipo primero','error'); return; }
  google.script.run
    .withSuccessHandler(function(res){
      if (res.error){ toast(res.error,'error'); return; }
      document.getElementById('plantel-dorsal-'+lado).value='';
      document.getElementById('plantel-nombre-'+lado).value='';
      plantelData[lado].push({dorsal:dorsal,nombre:nombre,editando:false});
      plantelData[lado].sort(function(a,b){ return parseInt(a.dorsal)-parseInt(b.dorsal); });
      renderPlantel(lado,plantelData[lado]); toast('Jugador agregado ✓','ok');
    })
    .withFailureHandler(function(){ toast('Error de conexión','error'); })
    .agregarJugadorPlantel(p.torneoId,p[lado].equipo,dorsal,nombre);
}

function filtrarPlantel(lado){
  var q=document.getElementById('plantel-buscar-'+lado).value.toLowerCase().trim();
  renderPlantel(lado,!q?plantelData[lado]:plantelData[lado].filter(function(j){ return j.dorsal.toLowerCase().includes(q)||j.nombre.toLowerCase().includes(q); }));
}

function pedirEliminarJugadorPlantel(lado,idx){
  var j=plantelData[lado][idx]; plantelEliminarLado=lado; plantelEliminarIdx=idx; eliminarModo='jugador-plantel';
  document.getElementById('modal-eliminar-txt').textContent='¿Eliminar a '+j.nombre+' (#'+j.dorsal+') del plantel? Esta acción no se puede deshacer.';
  document.getElementById('modal-eliminar').classList.add('visible');
}

function confirmarEliminarJugadorPlantel(){
  var lado=plantelEliminarLado; var idx=plantelEliminarIdx;
  var j=plantelData[lado][idx]; var p=estado[partidoActual];
  google.script.run
    .withSuccessHandler(function(res){
      if (res.error){ toast(res.error,'error'); return; }
      plantelData[lado].splice(idx,1); renderPlantel(lado,plantelData[lado]); toast('Jugador eliminado ✓','ok');
    })
    .withFailureHandler(function(){ toast('Error de conexión','error'); })
    .eliminarJugadorPlantel(p.torneoId,p[lado].equipo,j.fila);
}

// ══════════════════════════════════════════════════════════════
// DIAGNÓSTICO
// ══════════════════════════════════════════════════════════════
function diagnosticarGitHub() {
  toast('🔍 Ejecutando diagnóstico de GitHub...', 'ok');
  google.script.run
    .withSuccessHandler(function(res){
      if (res.error) {
        toast('❌ Error: ' + res.error, 'error');
        return;
      }
      var mensaje = '=== DIAGNÓSTICO GITHUB ===\n\n';
      mensaje += res.paso1 + '\n';
      mensaje += res.paso2 + '\n';
      mensaje += res.paso3 + '\n';
      mensaje += res.paso4 + '\n';
      alert(mensaje);
    })
    .withFailureHandler(function(e){
      toast('❌ Error de conexión: ' + e, 'error');
    })
    .diagnosticarGitHub();
}

// ══════════════════════════════════════════════════════════════
// FUNCIÓN PARA MANEJAR EL MODAL DE ELIMINACIÓN GENÉRICO
// ══════════════════════════════════════════════════════════════
function confirmarEliminar(){
  cerrarModal('modal-eliminar');
  
  if (eliminarModo === 'torneo'){
    google.script.run
      .withSuccessHandler(function(res){ 
        if(res.error) toast(res.error,'error'); 
        else { 
          toast('✅ Torneo eliminado', 'ok'); 
          renderAdminTorneos(); 
        } 
      })
      .eliminarTorneo(torneoParaEliminar);
  } else if (eliminarModo === 'partido'){
    google.script.run
      .withSuccessHandler(function(res){ 
        if(res.error) toast(res.error,'error'); 
        else { 
          toast('✅ Partido eliminado', 'ok'); 
          recargarPartidos(); 
        } 
      })
      .eliminarPartido(partidoParaEliminar.fila);
  } else if (eliminarModo === 'jugador-plantel'){
    confirmarEliminarJugadorPlantel();
  } else if (eliminarModo === 'equipo'){
    if (!equipoParaEliminar) {
      toast('❌ Error: No hay equipo seleccionado', 'error');
      return;
    }
    
    toast('🗑️ Eliminando equipo...', 'ok');
    
    google.script.run
      .withSuccessHandler(function(res){
        if (res.error) {
          toast('❌ Error: ' + res.error, 'error');
          return;
        }
        
        var mensaje = '✅ Equipo eliminado:\n';
        if (res.resultados.sheets && res.resultados.sheets.ok) {
          mensaje += '• Sheets: ✓\n';
        } else {
          mensaje += '• Sheets: ⚠️ ' + (res.resultados.sheets?.error || 'No existía') + '\n';
        }
        
        if (res.resultados.github && res.resultados.github.ok) {
          mensaje += '• GitHub: ✓\n';
        } else {
          mensaje += '• GitHub: ⚠️ ' + (res.resultados.github?.error || 'No existía') + '\n';
        }
        
        alert(mensaje);
        
        if (equipoParaEliminar.torneoId === estado[partidoActual].torneoId) {
          actualizarSelectEquipos();
        }
        
        renderAdminTorneos();
        
        equipoParaEliminar = null;
      })
      .withFailureHandler(function(e){
        toast('❌ Error de conexión: ' + e, 'error');
        equipoParaEliminar = null;
      })
      .eliminarEquipoCompleto(
        equipoParaEliminar.torneoId,
        equipoParaEliminar.equipoNombre,
        equipoParaEliminar.equipoId
      );
  }
  
  eliminarModo = '';
}

// Event listener para cerrar modales con Escape
document.addEventListener('keydown',function(e){
  if (e.key==='Escape') ['modal-login','modal-renombrar','modal-renombrar-partido','modal-eliminar','modal-config-torneo','modal-token','modal-json-github'].forEach(cerrarModal);
});
