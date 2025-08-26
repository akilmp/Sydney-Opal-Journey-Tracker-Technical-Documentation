const cheerio = require('cheerio');
const { processRows } = require('./csvParser');

function parseHTML(html, options = {}) {
  const $ = cheerio.load(html);
  const headers = [];
  $('table').first().find('tr').first().find('th,td').each((i, el) => {
    headers.push($(el).text().trim());
  });
  const rows = [];
  $('table').first().find('tr').slice(1).each((i, row) => {
    const obj = {};
    $(row).find('td').each((j, cell) => {
      obj[headers[j]] = $(cell).text().trim();
    });
    if (Object.keys(obj).length) rows.push(obj);
  });
  return processRows(rows, options);
}

module.exports = { parseHTML };
