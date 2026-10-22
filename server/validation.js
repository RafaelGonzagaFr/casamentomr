import { weddingInstant } from './wedding-time.js';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function text(value, label, max = 255, optional = false) {
  if (optional && (value === undefined || value === null || value === '')) return null;
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new HttpError(422, `${label}: informe um texto de até ${max} caracteres.`);
  return value.trim();
}
export function integer(value, label, min = -2147483648, max = 2147483647) {
  const n = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isInteger(n) || n < min || n > max) throw new HttpError(422, `${label}: valor inválido.`);
  return n;
}
export function id(value) { return integer(value, 'Identificador', 1, Number.MAX_SAFE_INTEGER); }
export function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new HttpError(422, 'Identificador de presente inválido.');
  return value;
}
export function boolean(value) {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  throw new HttpError(422, 'Situação inválida.');
}
export function giftData(body, update = false) {
  const data = {};
  if (!update || body.category_id !== undefined) data.category_id = id(body.category_id);
  if (!update || body.name !== undefined) data.name = text(body.name, 'Nome');
  if (!update || body.description !== undefined) data.description = text(body.description, 'Descrição', 5000, true);
  if (!update || body.external_url !== undefined) {
    data.external_url = text(body.external_url, 'Link externo', 2048, true);
    if (data.external_url) {
      let link; try { link = new URL(data.external_url); } catch { throw new HttpError(422, 'Link externo inválido.'); }
      if (!['http:', 'https:'].includes(link.protocol)) throw new HttpError(422, 'O link externo deve começar com http ou https.');
    }
  }
  if (!update || body.estimated_price !== undefined) {
    data.estimated_price = null;
    if (body.estimated_price !== undefined && body.estimated_price !== null && body.estimated_price !== '') {
      const price = Number(body.estimated_price);
      if (!Number.isFinite(price) || price < 0 || price > 99999999.99) throw new HttpError(422, 'Valor estimado inválido.');
      data.estimated_price = Math.round(price * 100) / 100;
    }
  }
  if (!update || body.sort_order !== undefined) data.sort_order = integer(body.sort_order ?? 0, 'Ordem');
  if (!update || body.is_active !== undefined) data.is_active = boolean(body.is_active ?? true);
  return data;
}
export function imageData(image) {
  if (!image) return null;
  if (typeof image.base64 !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(image.base64)) throw new HttpError(422, 'Imagem inválida.');
  const buffer = Buffer.from(image.base64, 'base64');
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) throw new HttpError(422, 'A imagem deve ter até 2 MB.');
  const signatures = {
    'image/png': buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
    'image/jpeg': buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255,
    'image/webp': buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP',
  };
  if (!signatures[image.type]) throw new HttpError(422, 'Use uma imagem PNG, JPEG ou WebP válida.');
  return { buffer, type: image.type, extension: { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[image.type] };
}
export function settingsData(body) {
  const data = {
    couple_names: text(body.couple_names, 'Nomes do casal', 255),
    welcome_message: text(body.welcome_message, 'Mensagem', 1000, true),
    wedding_date: body.wedding_date || null, rsvp_deadline_at: body.rsvp_deadline_at || null,
  };
  for (const [key, label, max] of [['photos_drive_url','Link do Google Drive',2048],['photos_title','Título de fotografias',255],['photos_description','Descrição de fotografias',2000],['photos_button','Texto do botão',100]]) {
    if (body[key] !== undefined) data[key] = text(body[key], label, max, true);
  }
  if (data.photos_drive_url) data.photos_drive_url = driveUrl(data.photos_drive_url);
  if (body.photos_visible !== undefined) data.photos_visible = String(boolean(body.photos_visible));
  for (const key of ['partner_one_name','partner_two_name','ceremony_location','ceremony_address','reception_location','reception_address','hero_image_url','maps_url','wedding_story','additional_information','started_message']) {
    if (body[key] !== undefined) data[key] = text(body[key], key, ['wedding_story','additional_information'].includes(key) ? 5000 : key.endsWith('_url') ? 2048 : 500, true);
  }
  for (const key of ['hero_image_url','maps_url']) if (data[key]) {
    let url; try { url = new URL(data[key]); } catch { throw new HttpError(422, 'URL externa inválida.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new HttpError(422, 'Use uma URL HTTPS sem credenciais.');
    data[key] = url.href;
  }
  if (body.ceremony_time !== undefined) {
    data.ceremony_time = body.ceremony_time || null;
    if (data.ceremony_time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.ceremony_time)) throw new HttpError(422, 'Horário da cerimônia inválido.');
  }
  if (body.timezone !== undefined) {
    data.timezone = text(body.timezone, 'Fuso horário', 100);
    try { new Intl.DateTimeFormat('pt-BR', { timeZone: data.timezone }); } catch { throw new HttpError(422, 'Fuso horário inválido.'); }
  }
  if (data.wedding_date && (!/^\d{4}-\d{2}-\d{2}$/.test(data.wedding_date) || Number.isNaN(Date.parse(data.wedding_date)) || new Date(data.wedding_date).toISOString().slice(0, 10) !== data.wedding_date)) throw new HttpError(422, 'Data do casamento inválida.');
  if (data.rsvp_deadline_at) {
    if (typeof data.rsvp_deadline_at !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(data.rsvp_deadline_at) || Number.isNaN(Date.parse(data.rsvp_deadline_at))) throw new HttpError(422, 'Prazo inválido: informe data, hora e fuso.');
    data.rsvp_deadline_at = new Date(data.rsvp_deadline_at).toISOString();
  }
  return data;
}

export function publicWedding(settings, includeAdditional = false) {
  const keys = ['couple_names','wedding_date','ceremony_time','timezone','ceremony_location','maps_url','welcome_message','started_message'];
  if (includeAdditional) keys.push('additional_information');
  const data = Object.fromEntries(keys.map(key => [key, settings[key] || null]));
  data.timezone ||= 'America/Bahia';
  try { data.wedding_at = weddingInstant(data.wedding_date, data.ceremony_time, data.timezone); } catch { data.wedding_at = null; }
  return data;
}

export function driveUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new HttpError(422, 'Link do Google Drive inválido.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'drive.google.com' || url.username || url.password || url.port) throw new HttpError(422, 'Use um link HTTPS de drive.google.com.');
  return url.href;
}
export function publicPhotos(settings) {
  if (settings.photos_visible !== 'true' || !settings.photos_drive_url) return null;
  try { return { url: driveUrl(settings.photos_drive_url), title: settings.photos_title || 'Compartilhe nossos momentos!', description: settings.photos_description || 'Acesse nossas fotografias no Google Drive.', button: settings.photos_button || 'Acessar álbum de fotografias' }; }
  catch { return null; }
}
