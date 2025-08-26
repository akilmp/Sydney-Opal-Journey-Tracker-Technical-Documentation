const { parseCSV, parseHTML } = require('../src');

describe('opal parser', () => {
  test('parseCSV handles normalization, DST, missing taps and dedup', () => {
    const csv = `tap_on_time,tap_off_time,fare,mode,from_stop,to_stop\n`
      + `2021-04-03 09:00,2021-04-03 09:30,3.00,Train,Station A,Station B\n`
      + `2021-04-05 09:00,,default fare,Bus,Stop X,\n`
      + `2021-04-03 09:00,2021-04-03 09:30,3.00,Train,Station A,Station B\n`;

    const { records, warnings } = parseCSV(csv);
    expect(records).toHaveLength(2);
    expect(records[0].tap_on_time.endsWith('+11:00')).toBe(true); // before DST end
    expect(records[1].tap_on_time.endsWith('+10:00')).toBe(true); // after DST end
    expect(records[1].is_default_fare).toBe(true);
    const messages = warnings.map(w => w.message);
    expect(messages).toContain('missing tap off');
    expect(messages).toContain('default fare charged');
    expect(messages).toContain('duplicate row');
  });

  test('parseHTML parses table input', () => {
    const html = `<table>` +
      `<tr><th>tap_on_time</th><th>tap_off_time</th><th>fare</th><th>mode</th><th>from_stop</th><th>to_stop</th></tr>` +
      `<tr><td>2021-04-03 09:00</td><td>2021-04-03 09:30</td><td>3.00</td><td>Train</td><td>Station A</td><td>Station B</td></tr>` +
      `<tr><td>2021-04-05 09:00</td><td></td><td>default fare</td><td>Bus</td><td>Stop X</td><td></td></tr>` +
      `</table>`;

    const { records, warnings } = parseHTML(html);
    expect(records).toHaveLength(2);
    expect(warnings.length).toBe(2);
  });
});
