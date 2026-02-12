// ============================================
// NORMALIZACIÓN Y FORMATEO
// ============================================

function normalizeBodega(bodegaCode) {
    return bodegasMap[bodegaCode] || bodegaCode.toUpperCase();
}

function normalizeTipo(tipoCode) {
    return tiposMap[tipoCode] || tipoCode;
}

function normalizeText(text) {
    if (!text) return '';
    return text
        .replace(/�/g, 'Ñ')
        .replace(/Ã‘/g, 'Ñ')
        .replace(/Ã±/g, 'ñ')
        .replace(/Ã/g, 'Ó')
        .replace(/Ã³/g, 'ó')
        .replace(/Ã/g, 'Í')
        .replace(/Ã­/g, 'í')
        .replace(/Ã©/g, 'é')
        .replace(/Ã¡/g, 'á')
        .replace(/Ãº/g, 'ú')
        .replace(/Ã/g, 'Ú');
}

function limpiarTextoPromocion(texto) {
    if (!texto) return texto;
    return texto.replace(/PROMOCION/gi, '').replace(/PROMO/gi, '').replace(/\s+/g, ' ').trim();
}

function formatDate(dateString) {
    if (!dateString) return '';
    return dateString.split(' ')[0];
}

function formatCosto(costo) {
    return Math.floor(costo).toString();
}

// ============================================
// EXTRACCIÓN DE NÚMEROS
// ============================================

function extractTrasladoNumber(traslado) {
    if (!traslado) return '';
    return traslado.replace(/\D/g, '').replace(/^0+/, '');
}

function extractOSNumber(os) {
    if (!os) return '';
    return os.replace(/\D/g, '').replace(/^0+/, '');
}

// ============================================
// VALIDACIONES
// ============================================

function validarEstado(op) {
    if (!op) return 'PENDIENTE';
    return data2Map.has(op.trim()) ? 'CONFIRMADA' : 'PENDIENTE';
}

// ============================================
// CONSULTAS A MAPAS
// ============================================

function getRepresentativeItem(items) {
    if (!items || items.length === 0) return null;
    const itemPrimeras = items.find(item => item.BODEGA === 'PRIMERAS');
    return itemPrimeras || items[0];
}

function getSisproData(op) {
    if (!op) return { PRENDA: '', LINEA: '', GENERO: '' };
    return sisproMap.get(op.trim()) || { PRENDA: '', LINEA: '', GENERO: '' };
}

function getColorName(codigo) {
    if (!codigo) return '';
    return coloresMap.get(codigo.trim()) || codigo;
}

function getPvp(referencia) {
    if (!referencia) return '';
    return preciosMap.get(referencia.trim()) || '';
}

function getReferenciaHistorica(refprov) {
    if (!refprov) return refprov;
    return historicasMap.get(refprov.trim()) || refprov;
}

function getClienteData(id) {
    if (!id) return null;
    return clientesMap.get(id.trim()) || null;
}

// ============================================
// CÁLCULOS DE NEGOCIO
// ============================================

function getMarca(genero) {
    if (!genero) return '';
    const generoUpper = genero.toUpperCase();
    if (generoUpper.includes('DAMA') || generoUpper.includes('NIÑA')) return 'CHICA CHIC';
    if (generoUpper.includes('HOMBRE') || generoUpper.includes('NIÑO')) return '80 GRADOS';
    return '';
}

function getClaseByPVP(pvp) {
    const valor = parseFloat(pvp);
    if (isNaN(valor)) return "";
    if (valor <= 39900) return "LINEA";
    if (valor <= 59900) return "MODA";
    if (valor > 59900) return "PRONTAMODA";
}

function getDescripcion(prenda, genero, marca, refprov) {
    const partes = [];
    if (prenda) partes.push(prenda);
    if (genero) partes.push(genero);
    if (marca) partes.push(marca);
    if (refprov) partes.push(refprov);
    return partes.join(' ');
}