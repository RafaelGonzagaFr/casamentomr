// Resolve a local wall-clock time without relying on the server's timezone.
export function weddingInstant(date, time, zone = 'America/Bahia') {
  if (!date || !time) return null;
  const local = `${date}T${time}:00`;
  const naive = Date.parse(`${local}Z`);
  if (!Number.isFinite(naive)) throw new Error('Data ou horário inválido.');
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  const format = ms => formatter.format(new Date(ms)).replace(' ', 'T');
  const offsets = new Set();
  for (let hours = -36; hours <= 36; hours += 6) {
    const sample = naive + hours * 3600000;
    offsets.add(Date.parse(`${format(sample)}Z`) - sample);
  }
  const matches = [...offsets].map(offset => naive - offset).filter(ms => format(ms) === local);
  if (matches.length !== 1) throw new Error('Horário inexistente ou ambíguo neste fuso. Escolha outro horário.');
  return new Date(matches[0]).toISOString();
}
