// ============================================================
// CÓDIGO PRINCIPAL - Codigo.gs
// ============================================================

var CONFIG_SHEET_ID    = '1-izxg3Uq7c-PmOqT_SSgp2mxjZlf7aX4a4hg0mPe62k';
var ADMIN_CLAVE        = '!@n&@my2431';
var PARTIDOS_DEFAULT   = ['Alfredo', 'Jorge', 'Mónica'];
var MAX_PARTIDOS       = 8;

// ══════════════════════════════════════════════════════════════
// GITHUB GIST - CONFIGURACIÓN
// ══════════════════════════════════════════════════════════════
var GITHUB_TOKEN   = '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';
var GITHUB_GIST_ID = '19342ae28cda741d79f5fbb729a4b128';
var GIST_FILENAME  = 'Datos_Primera.json';

// ══════════════════════════════════════════════════════════════
// doGet
// ══════════════════════════════════════════════════════════════
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Control de Alineaciones')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function verificarClave(clave) { return clave === ADMIN_CLAVE; }

// ══════════════════════════════════════════════════════════════
// PARTIDOS
// ══════════════════════════════════════════════════════════════
function getHojaPartidos() {
  var ss = SpreadsheetApp.openById(CONFIG_SHEET_ID);
  var hoja = ss.getSheetByName('Partidos');
  if (!hoja) {
    hoja = ss.insertSheet('Partidos');
    hoja.getRange(1,1,1,3).setValues([['nombre','fijo','token']]);
    PARTIDOS_DEFAULT.forEach(function(n){ hoja.appendRow([n,'si','']); });
  }
  return hoja;
}

function getPartidos() {
  try {
    var hoja = getHojaPartidos(); 
    var ultima = hoja.getLastRow();
    if (ultima < 2) return [];
    return hoja.getRange(2,1,ultima-1,3).getValues()
      .filter(function(f){ return String(f[0]).trim()!==''; })
      .map(function(f,i){ 
        return {
          nombre:String(f[0]).trim(),
          fijo:String(f[1]).trim()==='si',
          token:String(f[2]).trim(),
          fila:i+2
        }; 
      });
  } catch(e) { 
    return {error:e.message}; 
  }
}

function agregarPartido(nombre) {
  try {
    var hoja = getHojaPartidos(); 
    var total = hoja.getLastRow() >= 2 ? hoja.getLastRow()-1 : 0;
    if (total >= MAX_PARTIDOS) return {error:'Máximo '+MAX_PARTIDOS+' partidos permitidos'};
    hoja.appendRow([nombre.trim(),'no','']); 
    return {ok:true};
  } catch(e) { 
    return {error:e.message}; 
  }
}

function renombrarPartido(fila, nuevoNombre) {
  try { 
    getHojaPartidos().getRange(fila,1).setValue(nuevoNombre.trim()); 
    return {ok:true}; 
  } catch(e) { 
    return {error:e.message}; 
  }
}

function eliminarPartido(fila) {
  try {
    var hoja = getHojaPartidos();
    if (String(hoja.getRange(fila,2).getValue()).trim() === 'si') 
      return {error:'No se puede eliminar un partido predeterminado'};
    hoja.deleteRow(fila); 
    return {ok:true};
  } catch(e) { 
    return {error:e.message}; 
  }
}

function guardarTokenPartido(fila, token) {
  try { 
    getHojaPartidos().getRange(fila,3).setValue(token ? token.trim() : ''); 
    return {ok:true}; 
  } catch(e) { 
    return {error:e.message}; 
  }
}

// ══════════════════════════════════════════════════════════════
// TORNEOS
// ══════════════════════════════════════════════════════════════
function getTorneos() {
  try {
    var ss = SpreadsheetApp.openById(CONFIG_SHEET_ID); 
    var hoja = ss.getSheetByName('Torneos');
    if (!hoja) return []; 
    var ultima = hoja.getLastRow(); 
    if (ultima < 2) return [];
    
    return hoja.getRange(2,1,ultima-1,3).getValues()
      .filter(function(f){ return String(f[0]).trim() && String(f[1]).trim(); })
      .map(function(f){
        var cfg = {titulares:11, suplentes:0, mostrarPrefijoDT:true};
        try { 
          if (f[2] && String(f[2]).trim() !== '') 
            cfg = JSON.parse(String(f[2]).trim()); 
        } catch(e){}
        if (cfg.mostrarPrefijoDT === undefined) cfg.mostrarPrefijoDT = true;
        return {
          id: String(f[0]).trim(),
          nombre: String(f[1]).trim(),
          config: cfg
        };
      });
  } catch(e) { 
    return {error:e.message}; 
  }
}

function agregarTorneo(id, nombre, config) {
  try {
    SpreadsheetApp.openById(id); // Verificar que existe
    var ss = SpreadsheetApp.openById(CONFIG_SHEET_ID); 
    var hoja = ss.getSheetByName('Torneos');
    if (!hoja) return {error:'Hoja "Torneos" no existe'};
    
    var ultima = hoja.getLastRow();
    if (ultima >= 2) {
      var ids = hoja.getRange(2,1,ultima-1,1).getValues();
      for (var i=0; i<ids.length; i++) {
        if (String(ids[i][0]).trim() === id.trim()) 
          return {error:'Ese torneo ya está registrado'};
      }
    }
    
    hoja.appendRow([
      id.trim(), 
      nombre.trim(), 
      JSON.stringify(config || {titulares:11, suplentes:0, mostrarPrefijoDT:true})
    ]);
    return {ok:true};
  } catch(e) { 
    return {error:'No se pudo abrir el archivo con ese ID.'}; 
  }
}

function actualizarConfigTorneo(id, config) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG_SHEET_ID); 
    var hoja = ss.getSheetByName('Torneos');
    var ultima = hoja.getLastRow(); 
    if (ultima < 2) return {error:'No hay torneos'};
    
    var datos = hoja.getRange(2,1,ultima-1,1).getValues();
    for (var i=0; i<datos.length; i++) {
      if (String(datos[i][0]).trim() === id.trim()) { 
        hoja.getRange(i+2, 3).setValue(JSON.stringify(config)); 
        return {ok:true}; 
      }
    }
    return {error:'Torneo no encontrado'};
  } catch(e) { 
    return {error:e.message}; 
  }
}

function eliminarTorneo(id) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG_SHEET_ID); 
    var hoja = ss.getSheetByName('Torneos');
    var ultima = hoja.getLastRow(); 
    if (ultima < 2) return {error:'No hay torneos'};
    
    var datos = hoja.getRange(2,1,ultima-1,1).getValues();
    for (var i=0; i<datos.length; i++) {
      if (String(datos[i][0]).trim() === id.trim()) { 
        hoja.deleteRow(i+2); 
        return {ok:true}; 
      }
    }
    return {error:'Torneo no encontrado'};
  } catch(e) { 
    return {error:e.message}; 
  }
}

function renombrarTorneo(id, nuevoNombre) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG_SHEET_ID); 
    var hoja = ss.getSheetByName('Torneos');
    var ultima = hoja.getLastRow();
    var datos = hoja.getRange(2,1,ultima-1,1).getValues();
    
    for (var i=0; i<datos.length; i++) {
      if (String(datos[i][0]).trim() === id.trim()) { 
        hoja.getRange(i+2, 2).setValue(nuevoNombre.trim()); 
        return {ok:true}; 
      }
    }
    return {error:'Torneo no encontrado'};
  } catch(e) { 
    return {error:e.message}; 
  }
}

// ══════════════════════════════════════════════════════════════
// EQUIPOS
// ══════════════════════════════════════════════════════════════
function getEquipos(torneoId) {
  try { 
    return SpreadsheetApp.openById(torneoId).getSheets().map(function(h){ return h.getName(); }); 
  } catch(e) { 
    return {error:'No se pudo abrir el archivo.'}; 
  }
}

function agregarEquipo(torneoId, nombreEquipo) {
  try {
    var ss = SpreadsheetApp.openById(torneoId);
    var nombreLimpio = nombreEquipo.trim();
    if (!nombreLimpio) return {error:'El nombre del equipo no puede estar vacío'};
    if (ss.getSheetByName(nombreLimpio)) 
      return {error:'Ya existe un equipo llamado "'+nombreLimpio+'" en este torneo'};
    
    var hoja = ss.insertSheet(nombreLimpio);
    hoja.getRange('A1').setValue('N°');
    hoja.getRange('B1').setValue('NOMBRE');
    return {ok:true};
  } catch(e) { 
    return {error:'No se pudo acceder al torneo: '+e.message}; 
  }
}

// ══════════════════════════════════════════════════════════════
// NUEVA FUNCIÓN: ELIMINAR EQUIPO COMPLETO (SHEETS + GITHUB)
// ══════════════════════════════════════════════════════════════
function eliminarEquipoCompleto(torneoId, equipoNombre, equipoId) {
  try {
    var resultados = {
      sheets: null,
      github: null,
      errores: []
    };
    
    // PASO 1: Eliminar la hoja del equipo en Google Sheets
    try {
      var ss = SpreadsheetApp.openById(torneoId);
      var hoja = ss.getSheetByName(equipoNombre);
      if (hoja) {
        ss.deleteSheet(hoja);
        resultados.sheets = { ok: true };
        console.log('✅ Hoja eliminada de Sheets:', equipoNombre);
      } else {
        resultados.sheets = { ok: false, error: 'La hoja no existe' };
        console.log('⚠️ La hoja no existe en Sheets:', equipoNombre);
      }
    } catch(e) {
      resultados.sheets = { ok: false, error: e.toString() };
      resultados.errores.push('Error en Sheets: ' + e.toString());
      console.error('❌ Error eliminando hoja de Sheets:', e.toString());
    }
    
    // PASO 2: Eliminar el equipo del JSON en GitHub (si tiene equipoId)
    if (equipoId) {
      try {
        var githubResult = eliminarEquipoJson(equipoId);
        resultados.github = githubResult;
        if (githubResult.error) {
          resultados.errores.push('Error en GitHub: ' + githubResult.error);
        } else {
          console.log('✅ Equipo eliminado de GitHub:', equipoId);
        }
      } catch(e) {
        resultados.github = { ok: false, error: e.toString() };
        resultados.errores.push('Error en GitHub: ' + e.toString());
        console.error('❌ Error eliminando de GitHub:', e.toString());
      }
    } else {
      resultados.github = { ok: true, mensaje: 'Sin ID de GitHub para eliminar' };
    }
    
    // Determinar si la operación fue exitosa en general
    var exitoGeneral = (resultados.sheets && resultados.sheets.ok) && 
                      (!equipoId || (resultados.github && resultados.github.ok));
    
    return {
      ok: exitoGeneral,
      resultados: resultados,
      errores: resultados.errores
    };
    
  } catch(e) {
    return { error: 'Error en eliminarEquipoCompleto: ' + e.toString() };
  }
}

// ══════════════════════════════════════════════════════════════
// JUGADORES
// ══════════════════════════════════════════════════════════════
function buscarJugador(torneoId, equipo, dorsal) {
  try {
    var hoja = SpreadsheetApp.openById(torneoId).getSheetByName(equipo);
    if (!hoja) return {error:'Equipo no encontrado: '+equipo};
    
    var datos = hoja.getRange('A2:B'+hoja.getLastRow()).getValues();
    for (var i=0; i<datos.length; i++) {
      if (String(datos[i][0]).trim() === String(dorsal).trim()) 
        return {nombre: datos[i][1]};
    }
    return {error:'Dorsal '+dorsal+' no encontrado'};
  } catch(e) { 
    return {error:e.message}; 
  }
}

function getPlantilla(torneoId, equipo) {
  try {
    var hoja = SpreadsheetApp.openById(torneoId).getSheetByName(equipo);
    if (!hoja) return {error:'Equipo no encontrado: '+equipo};
    
    var colA = hoja.getRange('A2:A200').getValues(); 
    var colB = hoja.getRange('B2:B200').getValues();
    var jugadores = [];
    
    for (var i=0; i<colA.length; i++) {
      var d = String(colA[i][0]).trim(); 
      var n = String(colB[i][0]).trim();
      if (d === '' || isNaN(Number(d)) || n === '') continue;
      jugadores.push({dorsal: d, nombre: n, fila: i+2});
    }
    return jugadores;
  } catch(e) { 
    return {error:e.message}; 
  }
}

function eliminarJugadorPlantel(torneoId, equipo, fila) {
  try {
    var hoja = SpreadsheetApp.openById(torneoId).getSheetByName(equipo);
    if (!hoja) return {error:'Equipo no encontrado'};
    hoja.getRange(fila, 1, 1, 2).clearContent(); 
    return {ok:true};
  } catch(e) { 
    return {error:e.message}; 
  }
}

function actualizarJugador(torneoId, equipo, dorsal, nuevoNombre) {
  try {
    var hoja = SpreadsheetApp.openById(torneoId).getSheetByName(equipo);
    if (!hoja) return {error:'Equipo no encontrado'};
    
    var datos = hoja.getRange('A2:B'+hoja.getLastRow()).getValues();
    for (var i=0; i<datos.length; i++) {
      if (String(datos[i][0]).trim() === String(dorsal).trim()) { 
        hoja.getRange(i+2, 2).setValue(nuevoNombre); 
        return {ok:true}; 
      }
    }
    return {error:'Dorsal no encontrado'};
  } catch(e) { 
    return {error:e.message}; 
  }
}

function agregarJugadorPlantel(torneoId, equipo, dorsal, nombre) {
  try {
    var hoja = SpreadsheetApp.openById(torneoId).getSheetByName(equipo);
    if (!hoja) return {error:'Equipo no encontrado'};
    
    var numDorsal = parseInt(dorsal);
    if (isNaN(numDorsal) || numDorsal < 1 || numDorsal > 99) 
      return {error:'Dorsal inválido'};
    
    var filaDestino = numDorsal + 1;
    var dorsalExist = String(hoja.getRange(filaDestino, 1).getValue()).trim();
    if (dorsalExist !== '') return {error:'El dorsal '+dorsal+' ya existe'};
    
    hoja.getRange(filaDestino, 1).setValue(numDorsal);
    hoja.getRange(filaDestino, 2).setValue(nombre.trim());
    return {ok:true};
  } catch(e) { 
    return {error:e.message}; 
  }
}

// ══════════════════════════════════════════════════════════════
// DIRECTOR TÉCNICO
// ══════════════════════════════════════════════════════════════
function getDT(torneoId, equipo) {
  try {
    var hoja = SpreadsheetApp.openById(torneoId).getSheetByName(equipo);
    if (!hoja) return {error:'Equipo no encontrado'};
    
    var etiqueta = String(hoja.getRange('A101').getValue()).trim();
    var nombre = String(hoja.getRange('B101').getValue()).trim();
    
    if (etiqueta === 'D.T.' && nombre !== '') 
      return {nombre: nombre};
    return {nombre: ''};
  } catch(e) { 
    return {error:e.message}; 
  }
}

function guardarDT(torneoId, equipo, nombreDT, mostrarPrefijoDT) {
  try {
    var hoja = SpreadsheetApp.openById(torneoId).getSheetByName(equipo);
    if (!hoja) return {error:'Equipo no encontrado'};
    
    hoja.getRange('A101').clearContent();
    hoja.getRange('B101').clearContent();
    hoja.getRange('E14').clearContent();
    
    if (nombreDT && nombreDT.trim() !== '') {
      hoja.getRange('B101').setValue(nombreDT.trim());
      if (mostrarPrefijoDT) {
        hoja.getRange('A101').setValue('D.T.');
        hoja.getRange('E14').setFormula('=A101&" "&B101');
      } else {
        hoja.getRange('E14').setValue(nombreDT.trim());
      }
    }
    return {ok:true};
  } catch(e) { 
    return {error:e.message}; 
  }
}

// ══════════════════════════════════════════════════════════════
// ALINEACIÓN
// ══════════════════════════════════════════════════════════════
function guardarAlineacion(torneoId, equipo, jugadores, nombreDT, suplentes, config) {
  try {
    var hoja = SpreadsheetApp.openById(torneoId).getSheetByName(equipo);
    if (!hoja) return {error:'Equipo no encontrado'};
    
    var numTit = config && config.titulares ? config.titulares : 11;
    var numSup = config && config.suplentes ? config.suplentes : 0;
    var prefijo = config && config.mostrarPrefijoDT !== undefined ? config.mostrarPrefijoDT : true;
    
    hoja.getRange('D1:E' + (numTit + 2)).clearContent();
    hoja.getRange('D1:E1').setValues([['DORSAL', 'TITULAR']]);
    
    if (jugadores.length > 0) {
      hoja.getRange(2, 4, jugadores.length, 2)
        .setValues(jugadores.map(function(j){ return [j.dorsal, j.nombre]; }));
    }
    
    hoja.getRange('A101').clearContent(); 
    hoja.getRange('B101').clearContent(); 
    hoja.getRange('E14').clearContent();
    
    if (nombreDT && nombreDT.trim() !== '') {
      hoja.getRange('B101').setValue(nombreDT.trim());
      if (prefijo) { 
        hoja.getRange('A101').setValue('D.T.'); 
        hoja.getRange('E14').setFormula('=A101&" "&B101'); 
      } else { 
        hoja.getRange('E14').setValue(nombreDT.trim()); 
      }
    }
    
    if (numSup > 0) {
      hoja.getRange('F1:G' + (numSup + 2)).clearContent();
      hoja.getRange('F1:G1').setValues([['DORSAL', 'SUPLENTE']]);
      if (suplentes && suplentes.length > 0) {
        hoja.getRange(2, 6, suplentes.length, 2)
          .setValues(suplentes.map(function(j){ return [j.dorsal, j.nombre]; }));
      }
    }
    return {ok:true};
  } catch(e) { 
    return {error:e.message}; 
  }
}

// ══════════════════════════════════════════════════════════════
// GIST — JSON para Singular
// ══════════════════════════════════════════════════════════════

function leerGist() {
  try {
    var url = 'https://api.github.com/gists/' + GITHUB_GIST_ID;
    
    var options = {
      headers: {
        'Authorization': 'token ' + GITHUB_TOKEN,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Google-Apps-Script'
      },
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (responseCode !== 200) {
      return { 
        error: 'GitHub respondió con código ' + responseCode + ': ' + responseText 
      };
    }
    
    var data = JSON.parse(responseText);
    
    if (!data.files || !data.files[GIST_FILENAME]) {
      return { error: 'El archivo ' + GIST_FILENAME + ' no existe en el Gist' };
    }
    
    var contenido = data.files[GIST_FILENAME].content;
    return { ok: true, contenido: contenido };
    
  } catch(e) {
    return { error: 'Error en leerGist: ' + e.toString() };
  }
}

function publicarEquipoJson(entradaJson) {
  try {
    console.log('📤 publicarEquipoJson recibió:', JSON.stringify(entradaJson));
    
    // Leer el Gist actual
    var actual = leerGist();
    if (actual.error) {
      console.error('❌ Error al leer Gist:', actual.error);
      return { error: actual.error };
    }

    var arr = JSON.parse(actual.contenido);
    console.log('📊 Gist actual tiene', arr.length, 'items');

    // Buscar y actualizar/agregar
    var idx = -1;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].id === entradaJson.id) { 
        idx = i; 
        break; 
      }
    }
    
    if (idx >= 0) {
      arr[idx] = entradaJson;
      console.log('🔄 Actualizando item existente en índice', idx);
    } else {
      arr.push(entradaJson);
      console.log('➕ Agregando nuevo item');
    }

    // Crear el payload para GitHub
    var nuevoContenido = JSON.stringify(arr, null, 2);
    
    // Verificar que el contenido es válido
    try {
      JSON.parse(nuevoContenido);
    } catch(e) {
      console.error('❌ JSON generado no válido:', e.toString());
      return { error: 'El JSON generado no es válido: ' + e.toString() };
    }
    
    var payload = {
      description: 'Datos de equipos para Singular.live - Actualizado',
      files: {}
    };
    payload.files[GIST_FILENAME] = {
      content: nuevoContenido
    };

    console.log('📦 Enviando payload a GitHub...');

    var options = {
      method: 'PATCH',
      headers: {
        'Authorization': 'token ' + GITHUB_TOKEN,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Google-Apps-Script'
      },
      payload: JSON.stringify(payload),
      contentType: 'application/json',
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch('https://api.github.com/gists/' + GITHUB_GIST_ID, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    console.log('📡 Respuesta de GitHub - Código:', responseCode);
    console.log('📡 Respuesta completa:', responseText);

    if (responseCode !== 200) {
      return { 
        error: 'GitHub respondió con código ' + responseCode + ': ' + responseText
      };
    }

    console.log('✅ Publicación exitosa');
    return { ok: true };
    
  } catch(e) {
    console.error('❌ Excepción:', e.toString());
    return { error: 'Error en publicarEquipoJson: ' + e.toString() };
  }
}

function eliminarEquipoJson(equipoId) {
  try {
    console.log('🗑️ Eliminando equipo de GitHub con ID:', equipoId);
    
    var actual = leerGist();
    if (actual.error) return { error: actual.error };

    var arr = JSON.parse(actual.contenido);
    var longitudOriginal = arr.length;
    
    arr = arr.filter(function(e){ return e.id !== equipoId; });
    
    if (arr.length === longitudOriginal) {
      return { ok: true, mensaje: 'El equipo no existía en GitHub' };
    }

    var payload = { 
      files: {} 
    };
    payload.files[GIST_FILENAME] = { 
      content: JSON.stringify(arr, null, 2) 
    };

    var options = {
      method: 'PATCH',
      headers: {
        'Authorization': 'token ' + GITHUB_TOKEN,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Google-Apps-Script'
      },
      payload: JSON.stringify(payload),
      contentType: 'application/json',
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch('https://api.github.com/gists/' + GITHUB_GIST_ID, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();

    if (responseCode !== 200) {
      return { error: 'GitHub respondió con código ' + responseCode + ': ' + responseText };
    }

    console.log('✅ Equipo eliminado de GitHub correctamente');
    return { ok: true };
    
  } catch(e) {
    return { error: 'Error en eliminarEquipoJson: ' + e.toString() };
  }
}

// ══════════════════════════════════════════════════════════════
// FUNCIONES DE DIAGNÓSTICO
// ══════════════════════════════════════════════════════════════

function normalizarNombreHoja(nombre) {
  var upper = nombre.toUpperCase();
  var mapa = {
    'Á':'A', 'É':'E', 'Í':'I', 'Ó':'O', 'Ú':'U',
    'À':'A', 'È':'E', 'Ì':'I', 'Ò':'O', 'Ù':'U',
    'Ü':'U'
  };
  return upper.replace(/[ÁÉÍÓÚÀÈÌÒÙÜ]/g, function(c){ return mapa[c]||c; });
}

function testGithubConnection() {
  try {
    var result = leerGist();
    Logger.log('Resultado de leerGist: ' + JSON.stringify(result));
    
    if (result.error) {
      Logger.log('Error: ' + result.error);
      return 'Error: ' + result.error;
    }
    
    var contenido = JSON.parse(result.contenido);
    Logger.log('Contenido parseado correctamente. Número de items: ' + contenido.length);
    
    return 'Conexión exitosa. Gist contiene ' + contenido.length + ' items.';
  } catch(e) {
    Logger.log('Excepción: ' + e.message);
    return 'Excepción: ' + e.message;
  }
}

function diagnosticarGitHub() {
  try {
    var resultado = {
      paso1: "Iniciando diagnóstico...",
      paso2: "",
      paso3: "",
      paso4: ""
    };
    
    // PASO 1: Verificar que el token existe
    if (!GITHUB_TOKEN) {
      resultado.paso1 = "❌ No hay token configurado";
      return resultado;
    }
    resultado.paso1 = "✅ Token configurado (longitud: " + GITHUB_TOKEN.length + " caracteres)";
    
    // PASO 2: Verificar que el GIST ID existe
    if (!GITHUB_GIST_ID) {
      resultado.paso2 = "❌ No hay GIST ID configurado";
      return resultado;
    }
    resultado.paso2 = "✅ GIST ID configurado: " + GITHUB_GIST_ID;
    
    // PASO 3: Intentar leer el Gist
    var lectura = leerGist();
    if (lectura.error) {
      resultado.paso3 = "❌ Error al leer: " + lectura.error;
      return resultado;
    }
    
    var items = JSON.parse(lectura.contenido);
    resultado.paso3 = "✅ Gist leído correctamente. Contiene " + items.length + " items";
    
    // PASO 4: Intentar escribir (sin cambios reales)
    var testPayload = {
      files: {}
    };
    testPayload.files[GIST_FILENAME] = {
      content: lectura.contenido
    };
    
    var options = {
      method: 'PATCH',
      headers: {
        'Authorization': 'token ' + GITHUB_TOKEN,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Google-Apps-Script'
      },
      payload: JSON.stringify(testPayload),
      contentType: 'application/json',
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch('https://api.github.com/gists/' + GITHUB_GIST_ID, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (responseCode === 200) {
      resultado.paso4 = "✅ Escritura exitosa (código 200) - El Gist se puede modificar";
    } else {
      resultado.paso4 = "❌ Error al escribir. Código " + responseCode + ": " + responseText.substring(0, 200) + "...";
    }
    
    return resultado;
    
  } catch(e) {
    return { error: e.toString() };
  }
}
