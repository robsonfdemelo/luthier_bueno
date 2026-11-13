(function () {
  'use strict';
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const HALF_HEIGHT = PAGE_HEIGHT / 2;
  const SCALE = 4;
  const INK = '#1a3026';
  const MUTED = '#58675f';
  const GOLD = '#987246';
  const BORDER = '#dce4dc';
  const PAPER = '#ffffff';
  const FONT = 'Arial, Helvetica, sans-serif';

  function safe(value, fallback = '—') {
    const s = String(value ?? '').trim();
    return s || fallback;
  }
  function n(value) { return Math.max(0, Number(value) || 0); }
  function money(value) {
    return new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(n(value));
  }
  function date(value) {
    if (!value) return '—';
    const a = String(value).slice(0, 10).split('-');
    return a.length === 3 && a[0].length === 4 ? `${a[2]}/${a[1]}/${a[0]}` : safe(value);
  }
  function instrumentLabel(value = {}) {
    return [value.type || 'Instrumento', [value.brand, value.model].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
  }
  function label(ctx, value, x, y, width, options = {}) {
    const size = options.size || 8;
    const weight = options.bold ? '700' : '400';
    const family = options.serif ? 'Georgia, Times New Roman, serif' : FONT;
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.fillStyle = options.color || INK;
    ctx.textAlign = options.align || 'left';
    const text = String(value ?? '').replace(/\s+/g, ' ').trim() || '—';
    const maxWidth = width || 500;
    let output = text;
    if (ctx.measureText(output).width > maxWidth) {
      while (output.length > 1 && ctx.measureText(output + '…').width > maxWidth) output = output.slice(0, -1);
      output += '…';
    }
    ctx.fillText(output, x, y);
    ctx.textAlign = 'left';
  }
  function lines(ctx, text, x, y, width, options = {}) {
    const size = options.size || 8;
    ctx.font = `${options.bold ? '700' : '400'} ${size}px ${FONT}`;
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    const result = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? current + ' ' + word : word;
      if (current && ctx.measureText(candidate).width > width) {
        result.push(current); current = word;
      } else current = candidate;
    }
    if (current) result.push(current);
    if (!result.length) result.push('—');
    const maxLines = options.maxLines || result.length;
    const lineHeight = options.lineHeight || size * 1.2;
    for (let i = 0; i < Math.min(result.length, maxLines); i++) {
      const clipped = (i === maxLines - 1 && result.length > maxLines) ? result[i] + '…' : result[i];
      label(ctx, clipped, x, y + i * lineHeight, width, options);
    }
    return Math.min(result.length, maxLines) * lineHeight;
  }
  function rule(ctx, y, x1 = 38, x2 = 557, color = BORDER, lineWidth = .7) {
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y);
    ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke();
  }
  function field(ctx, title, value, x, y, width) {
    label(ctx, title.toUpperCase(), x, y, width, {size: 6.7, bold: true, color: MUTED});
    label(ctx, safe(value), x, y + 12, width, {size: 8.5});
    rule(ctx, y + 17, x, x + width);
  }
  function section(ctx, title, y) {
    label(ctx, title.toUpperCase(), 38, y, 510, {size: 8, bold: true, color: INK});
  }
  function drawCopy(ctx, base, copy, d, logo) {
    const o = d.order || {};
    const c = d.customer || {};
    const i = d.instrument || {};
    const s = d.settings || {};
    const items = Array.isArray(o.items) ? o.items : [];
    ctx.save(); ctx.translate(0, base);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, PAGE_WIDTH, HALF_HEIGHT);

    // Cabeçalho: somente informações da oficina e número da O.S.
    if (logo) ctx.drawImage(logo, 39, 19, 24, 45);
    else label(ctx, 'BL', 39, 48, 24, {size: 18, bold: true, serif: true, color: GOLD});
    label(ctx, safe(s.name, 'Bueno Luthier'), 68, 36, 240, {size: 15, bold: true, serif: true, color: INK});
    label(ctx, `Endereço: ${safe(s.address)}`, 68, 51, 218, {size: 7.3, color: MUTED});
    label(ctx, `Telefone: ${safe(s.phone)}`, 290, 51, 120, {size: 7.3, color: MUTED});
    label(ctx, `CNPJ: ${safe(s.document)}`, 68, 63, 248, {size: 7.3, color: MUTED});
    label(ctx, 'ORDEM DE SERVIÇO', 556, 33, 132, {size: 10.8, bold: true, align: 'right'});
    label(ctx, safe(o.number), 556, 49, 132, {size: 10.5, bold: true, align: 'right'});
    label(ctx, `Status: ${safe(o.status)}`, 556, 65, 165, {size: 7, align: 'right', color: MUTED});
    rule(ctx, 77, 38, 557, GOLD, 1.2);

    section(ctx, 'Cliente e prazos', 88);
    field(ctx, 'Nome', c.name, 38, 100, 250);
    field(ctx, 'Telefone', c.phone, 307, 100, 250);
    field(ctx, 'Data de entrada', date(o.receivedDate), 38, 124, 250);
    field(ctx, 'Previsão de entrega', date(o.dueDate), 307, 124, 250);

    section(ctx, 'Instrumento', 155);
    field(ctx, 'Instrumento', instrumentLabel(i), 38, 167, 250);
    field(ctx, 'Acessórios recebidos', safe(o.accessories, 'Nenhum informado'), 307, 167, 250);

    let sy = 190;
    if (Array.isArray(o.photos) && o.photos.length) {
      section(ctx, 'Fotos do recebimento', sy);
      label(ctx, `${o.photos.length} foto(s) arquivada(s) na O.S. digital.`, 38, sy + 13, 510, {size: 7.7, color: MUTED});
      sy += 28;
    }
    section(ctx, 'Serviços e orçamento', sy);
    const tableTop = sy + 10;
    ctx.fillStyle = '#f3f6f3';
    ctx.fillRect(38, tableTop, 519, 15);
    label(ctx, 'Serviço', 43, tableTop + 10.3, 265, {size: 7, bold: true});
    label(ctx, 'Qtd.', 342, tableTop + 10.3, 35, {size: 7, bold: true});
    label(ctx, 'Unitário', 425, tableTop + 10.3, 72, {size: 7, bold: true, align: 'right'});
    label(ctx, 'Subtotal', 550, tableTop + 10.3, 75, {size: 7, bold: true, align: 'right'});
    let ty = tableTop + 15;
    const maxPrint = 3;
    const shown = items.slice(0, maxPrint);
    if (!shown.length) {
      label(ctx, 'Serviços pendentes de orçamento.', 43, ty + 10, 480, {size: 8, color: MUTED});
      ty += 17;
      rule(ctx, ty);
    } else {
      for (const item of shown) {
        label(ctx, item.description, 43, ty + 9.5, 288, {size: 8});
        label(ctx, String(item.quantity ?? 1), 342, ty + 9.5, 30, {size: 8});
        label(ctx, money(item.price), 425, ty + 9.5, 87, {size: 7.7, align: 'right'});
        label(ctx, money(n(item.quantity) * n(item.price)), 550, ty + 9.5, 91, {size: 7.7, align: 'right'});
        ty += 13;
        rule(ctx, ty);
      }
    }
    if (items.length > maxPrint) {
      label(ctx, `+ ${items.length - maxPrint} serviço(s) na O.S. digital.`, 43, ty + 9, 320, {size: 7, color: MUTED});
      ty += 12;
    }
    const total = items.reduce((acc, item) => acc + n(item.quantity) * n(item.price), 0);
    label(ctx, `VALOR TOTAL: ${money(total)}`, 556, ty + 14, 280, {size: 10, bold: true, align: 'right'});
    let payY = ty + 28;
    field(ctx, 'Aprovação', o.approval, 38, payY, 250);
    field(ctx, 'Recebido / saldo', `${money(o.paid)} / ${money(Math.max(0, total - n(o.paid)))}`, 307, payY, 250);
    payY += 25;
    field(ctx, 'Pagamento', o.paymentMethod, 38, payY, 250);
    field(ctx, 'Garantia', `${o.warrantyDays || 0} dias`, 307, payY, 250);

    // Espaço para termos resumidos sem comprometer a área de assinaturas.
    const obsY = Math.min(payY + 26, 365);
    if (obsY <= 369) {
      section(ctx, 'Condições e observações', obsY);
      const note = [s.terms, o.notes ? 'Observações: ' + o.notes : ''].filter(Boolean).join('  ');
      lines(ctx, note || '—', 38, obsY + 12, 519, {size: 7.2, color: MUTED, maxLines: 2, lineHeight: 9});
    }

    const signY = 392;
    rule(ctx, signY, 38, 285, INK, .8);
    rule(ctx, signY, 310, 557, INK, .8);
    label(ctx, 'Assinatura do cliente', 161, signY + 10, 240, {size: 7, align: 'center'});
    label(ctx, 'Responsável pela oficina', 433, signY + 10, 240, {size: 7, align: 'center'});
    label(ctx, 'Data: ____/____/________', 161, signY + 19, 240, {size: 6.7, align: 'center'});
    label(ctx, 'Data: ____/____/________', 433, signY + 19, 240, {size: 6.7, align: 'center'});
    rule(ctx, 412, 38, 557, BORDER, .8);
    label(ctx, `${safe(s.name, 'Bueno Luthier')} · ${safe(o.number)}`, 38, 418, 330, {size: 6.2, color: MUTED});
    label(ctx, copy, 557, 418, 150, {size: 6.2, color: MUTED, align: 'right'});
    ctx.restore();
  }
  async function getLogo(src) {
    if (!src) return null;
    try {
      const img = new Image();
      img.src = src;
      if (img.decode) await img.decode();
      else await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
      return img;
    } catch (_) { return null; }
  }
  function binaryPdf(jpg, width, height) {
    const enc = new TextEncoder();
    const parts = [];
    let length = 0;
    function add(data) { const bytes = typeof data === 'string' ? enc.encode(data) : data; parts.push(bytes); length += bytes.length; }
    const offsets = [0];
    add('%PDF-1.4\n%\xF3\xF4\xF5\xF6\n');
    function object(id, content) {
      offsets[id] = length;
      add(`${id} 0 obj\n${content}\nendobj\n`);
    }
    object(1, '<< /Type /Catalog /Pages 2 0 R >>');
    object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>`);
    const content = `q\n${PAGE_WIDTH} 0 0 ${PAGE_HEIGHT} 0 0 cm\n/Im1 Do\nQ\n`;
    object(4, `<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream`);
    offsets[5] = length;
    add(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
    add(jpg);
    add('\nendstream\nendobj\n');
    const start = length;
    add('xref\n0 6\n0000000000 65535 f \n');
    for (let i = 1; i <= 5; i++) add(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
    add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);
    const output = new Uint8Array(length);
    let pos = 0;
    for (const part of parts) { output.set(part, pos); pos += part.length; }
    return new Blob([output], {type: 'application/pdf'});
  }
  async function gerarPdf({order, customer, instrument, settings, logo}) {
    if (!order || !order.number) throw new Error('Número de ordem de serviço ausente.');
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(PAGE_WIDTH * SCALE);
    canvas.height = Math.round(PAGE_HEIGHT * SCALE);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Navegador sem suporte à geração de PDF.');
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = PAPER;ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    const logoImage = await getLogo(logo);
    const data = {order, customer, instrument, settings};
    drawCopy(ctx, 0, 'VIA DA OFICINA', data, logoImage);
    drawCopy(ctx, HALF_HEIGHT, 'VIA DO CLIENTE', data, logoImage);
    ctx.setLineDash([2.5, 3]);
    rule(ctx, HALF_HEIGHT, 38, 557, '#8a958a', .85);
    ctx.setLineDash([]);
    const jpg = await new Promise((resolve, reject) => canvas.toBlob(async blob => {
      if (!blob) return reject(new Error('Não foi possível criar o documento.'));
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, 'image/jpeg', .94));
    return binaryPdf(jpg, canvas.width, canvas.height);
  }
  async function baixar(data) {
    const pdf = await gerarPdf(data);
    const name = String(data.order.number).replace(/[^a-zA-Z0-9_-]/g, '-');
    const filename = `${name} - Bueno Luthier.pdf`;
    const url = URL.createObjectURL(pdf);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 12000);
    return filename;
  }
  window.BuenoPdf = Object.freeze({baixar, gerarPdf});
})();
