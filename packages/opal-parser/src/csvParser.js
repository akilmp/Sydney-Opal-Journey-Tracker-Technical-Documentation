const { parse } = require('csv-parse/sync');
const { DateTime } = require('luxon');

const STOP_COORDS = {
  'Central': { lat: -33.87, lng: 151.21 },
  'Town Hall': { lat: -33.88, lng: 151.22 },
  'Wynyard': { lat: -33.86, lng: 151.2 },
};

function parseCSV(csv, options = {}) {
  const rows = parse(csv, { columns: true, trim: true, skip_empty_lines: true });
  return processRows(rows, options);
}

function processRows(rows, options = {}) {
  const zone = options.timezone || 'Australia/Sydney';
  const records = [];
  const warnings = [];
  const seen = new Set();

  rows.forEach((row, idx) => {
    const record = normalizeRow(row, zone);
    const key = `${record.tap_on_time || ''}|${record.tap_off_time || ''}|${record.from_stop || ''}|${record.to_stop || ''}`;
    if (seen.has(key)) {
      warnings.push({ index: idx, message: 'duplicate row' });
      return;
    }
    seen.add(key);

    if (!record.tap_off_time) {
      warnings.push({ index: idx, message: 'missing tap off' });
    }
    if (record.is_default_fare) {
      warnings.push({ index: idx, message: 'default fare charged' });
    }
    records.push(record);
  });

  return { records, warnings };
}

function normalizeRow(row, zone) {
  function parseDate(str) {
    if (!str) return null;
    let dt = DateTime.fromISO(str, { zone });
    if (!dt.isValid) {
      dt = DateTime.fromFormat(str, 'yyyy-LL-dd HH:mm', { zone });
    }
    if (!dt.isValid) return null;
    return dt.toISO();
  }

  function parseFare(str) {
    if (str === undefined || str === null) {
      return { value: 0, default: true };
    }
    const text = String(str).toLowerCase();
    const number = parseFloat(text.replace(/[^0-9.]/g, '')) || 0;
    const isDefault = text.includes('default') || number === 0;
    return { value: Math.round(number * 100), default: isDefault };
  }

  function inferLine(mode = '', fromStop = '', toStop = '') {
    const m = mode.toLowerCase();
    if (m.includes('train')) return 'train';
    if (m.includes('bus')) return 'bus';
    if (m.includes('ferry')) return 'ferry';
    if (/^t\d/i.test(fromStop)) return 'train';
    if (/^b\d/i.test(fromStop)) return 'bus';
    if (/^f\d/i.test(fromStop)) return 'ferry';
    return '';
  }

  const tapOn = parseDate(row.tap_on_time || row.tap_on || row['Tap On']);
  const tapOff = parseDate(row.tap_off_time || row.tap_off || row['Tap Off']);
  const fare = parseFare(row.fare_cents || row.fare || row['Fare']);
  const fromStop = row.from_stop || row.from || row['From Stop'] || row['From'] || '';
  const toStop = row.to_stop || row.to || row['To Stop'] || row['To'] || '';
  const mode = row.mode || row['Mode'] || '';
  const line = inferLine(mode, fromStop, toStop);

  const fromCoords = STOP_COORDS[fromStop] || {};
  const toCoords = STOP_COORDS[toStop] || {};

  return {
    tap_on_time: tapOn,
    tap_off_time: tapOff,
    fare_cents: fare.value,
    is_default_fare: fare.default,
    from_stop: fromStop,
    to_stop: toStop,
    mode,
    line,
    from_lat: fromCoords.lat ?? null,
    from_lng: fromCoords.lng ?? null,
    to_lat: toCoords.lat ?? null,
    to_lng: toCoords.lng ?? null,
  };
}

module.exports = { parseCSV, processRows, normalizeRow };
