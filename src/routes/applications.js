const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// Helper: convert snake_case DB row to camelCase for frontend
function toCamel(row) {
  if (!row) return null;
  const result = {};
  for (const key of Object.keys(row)) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    let val = row[key];
    // Parse JSON fields
    if (['equipment','testSelection','performanceData','eccentricityData',
         'repeatabilityData','discriminationData','tareData','additionalData',
         'compliance'].includes(camelKey) && typeof val === 'string') {
      try { val = JSON.parse(val); } catch { val = null; }
    }
    result[camelKey] = val;
  }
  return result;
}

// Helper: convert camelCase frontend data to snake_case for DB
function toSnake(data) {
  const map = {
    mfg:'manufacturer', mfgA:'manufacturer_agent', mdl:'model', ser:'serial_no',
    sw:'software_ver', indType:'indication_type', cls:'accuracy_class',
    mx:'max_cap', mn:'min_cap', mi:'multi_interval',
    e1:'e1', mx1:'max1', d1:'d1', n1:'n1', e2:'e2', mx2:'max2', d2:'d2', n2:'n2',
    tareDev:'tare_device', tareType:'tare_type', maxTare:'max_tare',
    zeroDev:'zero_device', zeroTrk:'zero_tracking', izRange:'initial_zero_range',
    pwr:'power_type', unom:'nominal_voltage', ufreq:'frequency',
    tempR:'temp_range', prn:'printer',
    lab:'lab_name', labC:'lab_code', obs:'observer', evl:'evaluator',
    tS:'temp_start', tE:'temp_end', hum:'humidity', bar:'bar_pressure',
    equip:'equipment', tests:'test_selection',
    perfD:'performance_data', eccD:'eccentricity_data',
    repD:'repeatability_data', discD:'discrimination_data',
    tareD:'tare_data', addD:'additional_data',
    comp:'compliance', rem:'remarks', revRem:'reviewer_remarks'
  };
  const result = {};
  for (const [key, val] of Object.entries(data)) {
    const dbKey = map[key] || key;
    // Serialize objects/arrays to JSON for DB
    if (val !== null && typeof val === 'object') {
      result[dbKey] = JSON.stringify(val);
    } else {
      result[dbKey] = val;
    }
  }
  return result;
}

// GET /api/applications — list with search/filter
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { id, manufacturer, status, class: cls } = req.query;
    let sql = 'SELECT * FROM applications WHERE 1=1';
    const params = [];

    if (id) { sql += ' AND id LIKE ?'; params.push('%' + id + '%'); }
    if (manufacturer) { sql += ' AND manufacturer LIKE ?'; params.push('%' + manufacturer + '%'); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (cls) { sql += ' AND accuracy_class = ?'; params.push(cls); }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows.map(toCamel));
  } catch (err) {
    console.error('[APP] List error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// GET /api/applications/:id — single application with full data
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Application not found' });
    res.json(toCamel(rows[0]));
  } catch (err) {
    console.error('[APP] Get error:', err);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// POST /api/applications — create new
router.post('/', authMiddleware, async (req, res) => {
  try {
    const data = toSnake(req.body);
    data.created_by = req.user.username;
    data.n_intervals = Math.round((data.max_cap || 0) / (data.e || 1));

    const [result] = await pool.query(
      `INSERT INTO applications (
        id, manufacturer, manufacturer_agent, model, serial_no, software_ver,
        category, indication_type, accuracy_class, max_cap, min_cap, e, d,
        n_intervals, multi_interval, e1, max1, d1, n1, e2, max2, d2, n2,
        tare_device, tare_type, max_tare, zero_device, zero_tracking,
        initial_zero_range, power_type, nominal_voltage, frequency,
        temp_range, printer, lab_name, lab_code, observer, evaluator,
        temp_start, temp_end, humidity, bar_pressure, status, created_by,
        equipment, test_selection, performance_data, eccentricity_data,
        repeatability_data, discrimination_data, tare_data, additional_data,
        compliance, remarks, reviewer_remarks
      ) VALUES (
        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
      )`,
      [
        data.id, data.manufacturer, data.manufacturer_agent, data.model,
        data.serial_no, data.software_ver, data.category, data.indication_type,
        data.accuracy_class, data.max_cap, data.min_cap, data.e, data.d,
        data.n_intervals, data.multi_interval, data.e1, data.max1, data.d1,
        data.n1, data.e2, data.max2, data.d2, data.n2, data.tare_device,
        data.tare_type, data.max_tare, data.zero_device, data.zero_tracking,
        data.initial_zero_range, data.power_type, data.nominal_voltage,
        data.frequency, data.temp_range, data.printer, data.lab_name,
        data.lab_code, data.observer, data.evaluator, data.temp_start,
        data.temp_end, data.humidity, data.bar_pressure, data.status || 'draft',
        data.created_by, data.equipment, data.test_selection,
        data.performance_data, data.eccentricity_data, data.repeatability_data,
        data.discrimination_data, data.tare_data, data.additional_data,
        data.compliance, data.remarks, data.reviewer_remarks
      ]
    );

    // Log audit
    await pool.query(
      'INSERT INTO audit_log (user_id, username, action, endpoint, payload, ip_address) VALUES (?,?,?,?,?,?)',
      [req.user.id, req.user.username, 'POST', '/api/applications', JSON.stringify(data).slice(0, 2000), req.ip]
    );

    res.status(201).json({ id: data.id, message: 'Application created successfully' });
    console.log('[DEBUG] Inserted ID:', data.id, '| DB:', pool.pool.config.connectionConfig.database, '| Host:', pool.pool.config.connectionConfig.host);
  } catch (err) {
    console.error('[APP] Create error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Application ID already exists' });
    }
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// PUT /api/applications/:id — update existing
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const data = toSnake(req.body);
    data.n_intervals = Math.round((data.max_cap || 0) / (data.e || 1));
    data.updated_at = new Date();

    await pool.query(
      `UPDATE applications SET
        manufacturer=?, manufacturer_agent=?, model=?, serial_no=?, software_ver=?,
        category=?, indication_type=?, accuracy_class=?, max_cap=?, min_cap=?, e=?, d=?,
        n_intervals=?, multi_interval=?, e1=?, max1=?, d1=?, n1=?, e2=?, max2=?, d2=?, n2=?,
        tare_device=?, tare_type=?, max_tare=?, zero_device=?, zero_tracking=?,
        initial_zero_range=?, power_type=?, nominal_voltage=?, frequency=?,
        temp_range=?, printer=?, lab_name=?, lab_code=?, observer=?, evaluator=?,
        temp_start=?, temp_end=?, humidity=?, bar_pressure=?, status=?,
        equipment=?, test_selection=?, performance_data=?, eccentricity_data=?,
        repeatability_data=?, discrimination_data=?, tare_data=?, additional_data=?,
        compliance=?, remarks=?, reviewer_remarks=?
      WHERE id = ?`,
      [
        data.manufacturer, data.manufacturer_agent, data.model, data.serial_no,
        data.software_ver, data.category, data.indication_type, data.accuracy_class,
        data.max_cap, data.min_cap, data.e, data.d, data.n_intervals,
        data.multi_interval, data.e1, data.max1, data.d1, data.n1, data.e2,
        data.max2, data.d2, data.n2, data.tare_device, data.tare_type,
        data.max_tare, data.zero_device, data.zero_tracking, data.initial_zero_range,
        data.power_type, data.nominal_voltage, data.frequency, data.temp_range,
        data.printer, data.lab_name, data.lab_code, data.observer, data.evaluator,
        data.temp_start, data.temp_end, data.humidity, data.bar_pressure,
        data.status, data.equipment, data.test_selection, data.performance_data,
        data.eccentricity_data, data.repeatability_data, data.discrimination_data,
        data.tare_data, data.additional_data, data.compliance, data.remarks,
        data.reviewer_remarks, req.params.id
      ]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, username, action, endpoint, payload, ip_address) VALUES (?,?,?,?,?,?)',
      [req.user.id, req.user.username, 'PUT', '/api/applications/' + req.params.id, JSON.stringify(data).slice(0, 2000), req.ip]
    );

    res.json({ message: 'Application updated successfully' });
  } catch (err) {
    console.error('[APP] Update error:', err);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// DELETE /api/applications/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM applications WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

module.exports = router;