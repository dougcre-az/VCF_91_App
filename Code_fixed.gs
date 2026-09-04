const DATA_SPREADSHEET_ID_PROPERTY = 'VCF_DATA_SPREADSHEET_ID';
const CACHE_TTL_SECONDS = 21600;
const CORE_CACHE_KEY = 'vcgcore_v3';
const INTEROP_CACHE_KEY = 'interopdb_v3';
const INTEROP_CACHE_KEY_LEGACY = 'interopdb_v2';
const PRODUCT_BUILD_CACHE_KEY = 'productbuildcatalog_v1';
const IO_DEVICE_CACHE_KEY = 'iodevices_v2';

/**
 * Serve the SPA for Google Sites / web-app embeds.
 * ALLOWALL is required for Sites iframes.
 *
 * Scale note (~50 users): interactive sizing is client-side. Quota pressure is
 * cold-open doGet + catalog RPCs. Core / Interop / IO catalogs use
 * CacheService.getScriptCache() (script-scoped, shared across all users) with a
 * 6h TTL — warm once and everyone benefits. With web-app "Execute as: Me"
 * (USER_DEPLOYING), all RPC runtime still counts against the deployer's daily
 * quota; ScriptCache sharing still holds under "Execute as: User accessing",
 * but runtime quota is then per-user.
 *
 * Deploy dist/Index.html only (see ./deploy.sh) — Babel Standalone cold-compile
 * dominates workshop thundering-herd opens.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('VCF 9.1 Platform Sizer & Validator')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function onOpen() {
  configureDataSpreadsheet();
  SpreadsheetApp.getUi()
    .createMenu('VCF Sizer')
    .addItem('Configure This Sheet as Data Source', 'configureDataSpreadsheet')
    .addSeparator()
    .addItem('Warm Catalog Caches Now', 'warmCatalogCaches')
    .addItem('Install Morning Cache Warm Trigger', 'installMorningCacheWarmTrigger')
    .addSeparator()
    .addItem('Refresh Core Catalog Cache', 'invalidateCoreCache')
    .addItem('Refresh Interop_DB Cache', 'invalidateInteropCache')
    .addItem('Refresh IODevices Cache', 'invalidateIoDeviceCache')
    .addItem('Refresh All Caches', 'invalidateAllCaches')
    .addSeparator()
    .addItem('Ensure Value of VCF Averages Tab', 'ensureValueOfVcfSheet')
    .addToUi();
}

/**
 * Populate ScriptCache for Core / Interop / IODevice catalogs.
 * Safe to call from a time-driven trigger or the VCF Sizer menu.
 * Under Execute-as-Me, this runs as the deployer and fills the shared script cache.
 */
function warmCatalogCaches() {
  const started = Date.now();
  getVcgCoreData();
  getVcgInteropData();
  getIoDeviceData();
  const ms = Date.now() - started;
  Logger.log('warmCatalogCaches completed in %sms', ms);
  try {
    SpreadsheetApp.getUi().alert('Catalog caches warmed (Core, Interop_DB, IODevices) in ' + ms + 'ms.');
  } catch (ignoreUi) {
    // Time-driven triggers have no UI.
  }
  return ms;
}

/**
 * Install a once-daily 6:00 trigger (script timezone) for warmCatalogCaches.
 * Idempotent: removes prior warmCatalogCaches triggers first.
 * Run once from the editor or VCF Sizer menu after deploy.
 */
function installMorningCacheWarmTrigger() {
  const handlers = ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'warmCatalogCaches');
  handlers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('warmCatalogCaches')
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .create();

  try {
    SpreadsheetApp.getUi().alert('Morning cache warm trigger installed (daily ~06:00, script timezone).');
  } catch (ignoreUi) {
    Logger.log('Morning cache warm trigger installed (daily ~06:00).');
  }
}

function configureDataSpreadsheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error(
      'No active spreadsheet. Open the Google Sheet that holds VCF Sizing / App Naming Catalog, ' +
      'then run VCF Sizer → Configure This Sheet as Data Source (or run configureDataSpreadsheet from the editor while that sheet is open). ' +
      'Web App /exec URLs cannot “see” an active sheet — they only use Script Property VCF_DATA_SPREADSHEET_ID.'
    );
  }
  PropertiesService.getScriptProperties()
    .setProperty(DATA_SPREADSHEET_ID_PROPERTY, spreadsheet.getId());
  Logger.log('Configured VCF_DATA_SPREADSHEET_ID=' + spreadsheet.getId() + ' (' + spreadsheet.getName() + ')');
  try {
    SpreadsheetApp.getUi().alert(
      'Data source set to this spreadsheet.\n\nID: ' + spreadsheet.getId() +
      '\n\nWeb App users will load catalogs from this file. Next: Refresh Core Catalog Cache.'
    );
  } catch (ignoreUi) {
    // Editor / trigger contexts may lack UI.
  }
  return spreadsheet.getId();
}

function getDataSpreadsheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties()
    .getProperty(DATA_SPREADSHEET_ID_PROPERTY);
  if (!spreadsheetId) {
    throw new Error(
      'Script property VCF_DATA_SPREADSHEET_ID is not set. ' +
      'Open the data Google Sheet → Extensions → Apps Script is not required if the project is already bound; ' +
      'from the sheet menu run VCF Sizer → Configure This Sheet as Data Source. ' +
      'Or in Project Settings → Script properties add VCF_DATA_SPREADSHEET_ID = <your spreadsheet id from the URL>.'
    );
  }
  try {
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (err) {
    throw new Error(
      'Cannot open data spreadsheet id ' + spreadsheetId + ' (' + (err && err.message ? err.message : err) + '). ' +
      'Confirm the Web App executes as an account that can view that Drive file, then re-run Configure This Sheet as Data Source.'
    );
  }
}

/**
 * Editor/debug helper: prove App Naming Catalog is reachable from the Web App data source.
 * Run from the Apps Script editor → View → Logs.
 */
function debugAppNamingCatalog() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(DATA_SPREADSHEET_ID_PROPERTY);
  Logger.log('VCF_DATA_SPREADSHEET_ID=' + (id || '(not set)'));
  clearCachedChunked_(CacheService.getScriptCache(), CORE_CACHE_KEY);
  const ss = getDataSpreadsheet_();
  Logger.log('opened: ' + ss.getName() + ' (' + ss.getId() + ')');
  const sh = findSheet_(ss, ['App Naming Catalog', 'AppNamingCatalog', 'App Names']);
  Logger.log('App Naming Catalog tab: ' + (sh ? sh.getName() : 'NOT FOUND'));
  const rows = sh ? sheetToObjects_(sh) : [];
  Logger.log('sheet rows: ' + rows.length);
  const payload = JSON.parse(getVcgCoreData());
  if (payload.error) Logger.log('getVcgCoreData error: ' + payload.error);
  Logger.log('payload.appNamingCatalog: ' + ((payload.appNamingCatalog || []).length));
  return {
    spreadsheetId: id,
    spreadsheetName: ss.getName(),
    sheetName: sh ? sh.getName() : null,
    sheetRows: rows.length,
    payloadRows: (payload.appNamingCatalog || []).length,
    error: payload.error || null
  };
}

function normalizeName_(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findSheet_(spreadsheet, aliases) {
  const normalizedAliases = aliases.map(normalizeName_);
  const sheets = spreadsheet.getSheets();
  const exact = sheets.find(sheet => normalizedAliases.includes(normalizeName_(sheet.getName())));
  if (exact) return exact;

  const partialMatches = sheets.filter(sheet => {
    const sheetName = normalizeName_(sheet.getName());
    return normalizedAliases.some(alias => sheetName.includes(alias));
  });
  if (partialMatches.length === 1) return partialMatches[0];
  if (partialMatches.length > 1) {
    throw new Error(`Ambiguous sheet match for ${aliases.join('/')} — matched: ${partialMatches.map(s => s.getName()).join(', ')}`);
  }
  return null;
}

function sheetToObjects_(sheet) {
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];
  const headers = values.shift().map(header => String(header || '').trim());
  return values.map(row => {
    const object = {};
    headers.forEach((header, index) => {
      if (!header) return;
      const value = row[index];
      object[header] = value === null || value === undefined ? '' : String(value);
    });
    return object;
  });
}

function getField_(row, aliases) {
  const keys = Object.keys(row || {});
  const normalizedKeyMap = {};
  keys.forEach(key => {
    normalizedKeyMap[normalizeName_(key)] = key;
  });
  for (const alias of aliases) {
    const originalKey = normalizedKeyMap[normalizeName_(alias)];
    if (originalKey !== undefined) return String(row[originalKey] || '');
  }
  return '';
}

function getVcgCoreData() {
  try {
    const cache = CacheService.getScriptCache();
    const cached = getCachedChunked_(cache, CORE_CACHE_KEY);
    if (cached) return JSON.stringify(cached);

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const cachedAfterLock = getCachedChunked_(cache, CORE_CACHE_KEY);
      if (cachedAfterLock) return JSON.stringify(cachedAfterLock);

      const spreadsheet = getDataSpreadsheet_();
      const payload = {
        vcfSizing: sheetToObjects_(findSheet_(spreadsheet, ['VCF Sizing', 'VCFSizing'])),
        designIds: sheetToObjects_(findSheet_(spreadsheet, ['Design IDs', 'DesignIDs'])),
        sizingDesignBridge: sheetToObjects_(findSheet_(spreadsheet, ['Sizing Design Bridge', 'SizingDesignBridge', 'Design Bridge'])),
        designDecisions: sheetToObjects_(findSheet_(spreadsheet, ['Design Decisions', 'DesignDecisions'])),
        baselineBundles: sheetToObjects_(findSheet_(spreadsheet, ['Baseline Bundles', 'BaselineBundles'])),
        decisionRequirementMap: sheetToObjects_(findSheet_(spreadsheet, ['Decision Requirement Map', 'DecisionRequirementMap'])),
        appNamingCatalog: sheetToObjects_(findSheet_(spreadsheet, ['App Naming Catalog', 'AppNamingCatalog', 'App Names'])),
        cpus: sheetToObjects_(findSheet_(spreadsheet, ['CPUs', 'CPU'])),
        guestOs: sheetToObjects_(findSheet_(spreadsheet, ['Guest OS', 'GuestOS'])),
        valueOfVcf: sheetToObjects_(findSheet_(spreadsheet, ['Value of VCF', 'ValueOfVcf', 'TCO Averages']))
      };
      setCachedChunked_(cache, CORE_CACHE_KEY, payload);
      return JSON.stringify(payload);
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return JSON.stringify({ error: error.message });
  }
}

function getVcgInteropData() {
  try {
    const rows = getCachedSheetData_(['Interop_DB', 'Interop DB'], INTEROP_CACHE_KEY, row => ({
      Product: getField_(row, ['Product']),
      Source_Version: getField_(row, ['Source Version', 'Source_Version']),
      Target_Version: getField_(row, ['Target Version', 'Target_Version']),
      Status: getField_(row, ['Status']),
      Upgrade_Path_Notes: getField_(row, ['Upgrade Path Notes', 'Upgrade_Path_Notes', 'Notes'])
    }));
    let productBuilds = [];
    try {
      productBuilds = getCachedSheetData_(['Product Build Catalog', 'ProductBuildCatalog'], PRODUCT_BUILD_CACHE_KEY, row => ({
        Product_Key: getField_(row, ['Product Key', 'Product_Key']),
        Product: getField_(row, ['Product']),
        Release_Name: getField_(row, ['Release Name', 'Release_Name']),
        Version: getField_(row, ['Version']),
        Build_Number: getField_(row, ['Build Number', 'Build_Number', 'Build']),
        Release_Date: getField_(row, ['Release Date', 'Release_Date']),
        Build_Type: getField_(row, ['Build Type', 'Build_Type']),
        Source_Article_ID: getField_(row, ['Source Article ID', 'Source_Article_ID']),
        Source_URL: getField_(row, ['Source URL', 'Source_URL']),
        Last_Verified: getField_(row, ['Last Verified', 'Last_Verified']),
        Active: getField_(row, ['Active'])
      }));
    } catch (buildCatalogError) {
      console.warn('Product Build Catalog is not configured yet: ' + buildCatalogError.message);
    }
    return JSON.stringify({ interopDb: rows, productBuilds: productBuilds });
  } catch (error) {
    return JSON.stringify({ interopDb: [], productBuilds: [], error: error.message });
  }
}

function getIoDeviceData() {
  try {
    const rows = getCachedSheetData_(['IODevices', 'IO Devices'], IO_DEVICE_CACHE_KEY, row => ({
      BrandName: getField_(row, ['Brand Name', 'BrandName', 'Brand']),
      Model: getField_(row, ['Model']),
      DeviceType: getField_(row, ['Device Type', 'DeviceType']),
      SupportedReleases: getField_(row, ['Supported Releases', 'SupportedReleases', 'Releases'])
    }));
    return JSON.stringify({ ioDevices: rows });
  } catch (error) {
    return JSON.stringify({ ioDevices: [], error: error.message });
  }
}

function getCachedSheetData_(sheetAliases, cacheKey, rowMapper) {
  const cache = CacheService.getScriptCache();
  const cached = getCachedChunked_(cache, cacheKey);
  if (cached) return cached;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const cachedAfterLock = getCachedChunked_(cache, cacheKey);
    if (cachedAfterLock) return cachedAfterLock;

    const spreadsheet = getDataSpreadsheet_();
    const sheet = findSheet_(spreadsheet, sheetAliases);
    const rows = sheetToObjects_(sheet).map(rowMapper);
    setCachedChunked_(cache, cacheKey, rows);
    return rows;
  } finally {
    lock.releaseLock();
  }
}

function setCachedChunked_(cache, cacheKey, data) {
  const json = JSON.stringify(data);
  const chunkSize = 20000;
  const chunks = [];
  for (let index = 0; index < json.length; index += chunkSize) {
    chunks.push(json.substring(index, index + chunkSize));
  }

  const payload = {};
  chunks.forEach((chunk, index) => {
    payload[`${cacheKey}_chunk_${index}`] = chunk;
  });
  payload[`${cacheKey}_meta`] = String(chunks.length);
  cache.putAll(payload, CACHE_TTL_SECONDS);
}

function getCachedChunked_(cache, cacheKey) {
  const countString = cache.get(`${cacheKey}_meta`);
  if (!countString) return null;
  const count = parseInt(countString, 10);
  if (!Number.isInteger(count) || count < 0) return null;

  const keys = [];
  for (let index = 0; index < count; index++) keys.push(`${cacheKey}_chunk_${index}`);
  const cachedChunks = cache.getAll(keys);
  let json = '';
  for (let index = 0; index < count; index++) {
    const chunk = cachedChunks[`${cacheKey}_chunk_${index}`];
    if (!chunk) return null;
    json += chunk;
  }

  try {
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

function clearCachedChunked_(cache, cacheKey) {
  const countString = cache.get(`${cacheKey}_meta`);
  if (!countString) return;
  const count = parseInt(countString, 10);
  const keys = [`${cacheKey}_meta`];
  for (let index = 0; index < count; index++) keys.push(`${cacheKey}_chunk_${index}`);
  cache.removeAll(keys);
}

function invalidateCoreCache() {
  clearCachedChunked_(CacheService.getScriptCache(), CORE_CACHE_KEY);
  SpreadsheetApp.getUi().alert('Core catalog cache cleared. The next load will reread VCF Sizing / Design / Value of VCF sheets.');
}

/**
 * Create (or leave intact) a Value of VCF tab with industry-average and
 * vendor-specific TCO takeout percentages. Existing rows are never overwritten.
 * After creating, run Refresh Core Catalog Cache so the web app picks them up.
 */
function ensureValueOfVcfSheet() {
  const spreadsheet = getDataSpreadsheet_();
  const sheet = ensureValueOfVcfSheet_(spreadsheet);
  const rowCount = Math.max(0, sheet.getLastRow() - 1);
  try {
    SpreadsheetApp.getUi().alert(
      'Value of VCF averages tab is ready.\n\nSheet: ' + sheet.getName() +
      '\nData rows: ' + rowCount +
      '\n\nColumns: Lane, VendorCode, Vendor, StoragePlay, Pct3, Pct5, Pct7, Source, Notes.\n' +
      'Operations spend templates are in Notes: VMs × $190 (Turbonomic), (Hosts+VMs) × $8/mo (SolarWinds), VMs × $29/mo (Dynatrace), VMs × $15/mo (Datadog).\n' +
      'Missing seed rows are appended; existing rows are never overwritten.\n' +
      'StoragePlay = HCI_DEFEND (vs Nutanix HCI), DISAGG_REPLACE (vs Nimble/NetApp arrays), or blank for any play.\n' +
      'VendorCode = INDUSTRY for the lane baseline. Next: VCF Sizer → Refresh Core Catalog Cache.'
    );
  } catch (ignoreUi) {
    Logger.log('Value of VCF sheet ready: %s (%s rows)', sheet.getName(), rowCount);
  }
  return sheet.getName();
}

function ensureValueOfVcfSheet_(spreadsheet) {
  let sheet = findSheet_(spreadsheet, ['Value of VCF', 'ValueOfVcf', 'TCO Averages']);
  const headers = ['Lane', 'VendorCode', 'Vendor', 'StoragePlay', 'Pct3', 'Pct5', 'Pct7', 'Source', 'Notes'];
  const seed = valueOfVcfSeedRows_();
  if (!sheet) {
    sheet = spreadsheet.insertSheet('Value of VCF');
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.getRange(2, 1, seed.length, headers.length).setValues(seed);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
    return sheet;
  }
  if (sheet.getLastRow() < 2) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.getRange(2, 1, seed.length, headers.length).setValues(seed);
    sheet.setFrozenRows(1);
  }
  mergeValueOfVcfSeed_(sheet, headers, seed);
  return sheet;
}

function mergeValueOfVcfSeed_(sheet, headers, seed) {
  const lastRow = sheet.getLastRow();
  const existing = {};
  if (lastRow >= 2) {
    const width = Math.min(4, sheet.getLastColumn());
    const values = sheet.getRange(2, 1, lastRow - 1, width).getValues();
    values.forEach((row) => {
      const key = String(row[0] || '').toLowerCase() + '|' + String(row[1] || '').toUpperCase() + '|' + String(row[3] || '').toUpperCase();
      existing[key] = true;
    });
  }
  const missing = seed.filter((row) => {
    const key = String(row[0] || '').toLowerCase() + '|' + String(row[1] || '').toUpperCase() + '|' + String(row[3] || '').toUpperCase();
    return !existing[key];
  });
  if (!missing.length) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, missing.length, headers.length).setValues(missing);
}

function valueOfVcfSeedRows_() {
  // Conservative planning haircuts — not VVM dollar NPV. Tune per-account in this tab.
  return [
    ['hypervisor', 'INDUSTRY', 'Industry average', '', 22, 28, 32, 'Broadcom TCO WP Sept 2025 (haircut vs 51% 3-tier)', 'Always-on lane. Hypervisor-only slice vs a second stack.'],
    ['hypervisor', 'HYPERV', 'Microsoft Hyper-V', '', 22, 28, 32, 'Industry average', ''],
    ['hypervisor', 'AHV', 'Nutanix AHV', '', 20, 26, 30, 'Industry average (HCI overlap)', 'Pair with storage HCI_DEFEND when competing Nutanix.'],
    ['hypervisor', 'OPENSHIFT_VIRT', 'OpenShift Virtualization', '', 18, 24, 28, 'Industry average', ''],
    ['hypervisor', 'PROXMOX', 'Proxmox', '', 24, 30, 34, 'Industry average', ''],
    ['hypervisor', 'XEN', 'Citrix Xen / Hypervisor', '', 22, 28, 32, 'Industry average', ''],
    ['containers', 'INDUSTRY', 'Industry average', '', 18, 24, 28, 'VKS vs second K8s operating model', ''],
    ['containers', 'OPENSHIFT', 'Red Hat OpenShift', '', 18, 24, 28, 'Industry average', ''],
    ['containers', 'RANCHER', 'SUSE Rancher', '', 16, 22, 26, 'Industry average', ''],
    ['containers', 'AKS', 'Azure Kubernetes Service', '', 14, 20, 24, 'Industry average (egress/ops haircut)', ''],
    ['containers', 'EKS', 'Amazon EKS', '', 14, 20, 24, 'Industry average (egress/ops haircut)', ''],
    ['containers', 'GKE', 'Google GKE', '', 14, 20, 24, 'Industry average (egress/ops haircut)', ''],
    ['containers', 'DOCKER', 'Docker Enterprise / Swarm', '', 20, 26, 30, 'Industry average', ''],
    ['containers', 'EZMERAL', 'HPE Ezmeral', '', 18, 24, 28, 'Industry average', ''],
    ['containers', 'OSSK8', 'Upstream / OSS Kubernetes', '', 12, 18, 22, 'Industry average (lower license takeout)', ''],
    ['storage', 'INDUSTRY', 'Industry average', 'HCI_DEFEND', 18, 24, 28, 'Conservative vs Nutanix HCI TCO studies', 'Defend VCF HCI vs Nutanix AOS.'],
    ['storage', 'INDUSTRY', 'Industry average', 'DISAGG_REPLACE', 22, 28, 34, 'Array + SAN tax vs vSAN ESA disaggregated', 'Replace Nimble/NetApp/Pure/Dell arrays.'],
    ['storage', 'NUTANIX', 'Nutanix AOS / HCI', 'HCI_DEFEND', 16, 22, 26, 'Haircut vs Nutanix-published HCI TCO', 'Compete/defend. Do not use DISAGG_REPLACE vs Nutanix.'],
    ['storage', 'NETAPP', 'NetApp ONTAP', 'DISAGG_REPLACE', 22, 28, 34, 'Industry average (array refresh)', 'vSAN disaggregated storage cluster takeout.'],
    ['storage', 'NIMBLE', 'HPE Nimble / Alletra 5000-6000', 'DISAGG_REPLACE', 24, 30, 36, 'Industry average (Nimble refresh window)', 'Common 3-tier replacement play.'],
    ['storage', 'HPE', 'HPE Alletra / Primera', 'DISAGG_REPLACE', 22, 28, 34, 'Industry average', ''],
    ['storage', 'PURE', 'Pure Storage', 'DISAGG_REPLACE', 18, 24, 28, 'Conservative vs Pure Evergreen TCO', ''],
    ['storage', 'DELL', 'Dell PowerStore / PowerFlex', 'DISAGG_REPLACE', 20, 26, 32, 'Industry average', ''],
    ['networking', 'INDUSTRY', 'Industry average', '', 25, 30, 34, 'Broadcom TCO WP overlay vs siloed fabric', ''],
    ['networking', 'CISCO', 'Cisco ACI / Nexus', '', 25, 30, 34, 'Industry average', ''],
    ['networking', 'ARISTA', 'Arista', '', 22, 28, 32, 'Industry average', ''],
    ['networking', 'DELL_NET', 'Dell PowerSwitch / OS10', '', 24, 30, 34, 'Industry average', ''],
    ['networking', 'JUNIPER', 'Juniper', '', 24, 30, 34, 'Industry average', ''],
    ['networking', 'EXTREME', 'Extreme', '', 24, 30, 34, 'Industry average', ''],
    ['networking', 'SONIC', 'SONiC', '', 18, 24, 28, 'Industry average (lower license takeout)', ''],
    ['firewall', 'INDUSTRY', 'Industry average', '', 35, 42, 48, 'vDefend Value Modeling ~50% vs HW FW (haircut)', ''],
    ['firewall', 'PALO', 'Palo Alto', '', 35, 42, 48, 'Industry average', ''],
    ['firewall', 'FORTINET', 'Fortinet', '', 32, 40, 46, 'Industry average', ''],
    ['firewall', 'CISCO_FW', 'Cisco Firepower / ASA', '', 34, 42, 48, 'Industry average', ''],
    ['firewall', 'CHECKPOINT', 'Check Point', '', 34, 40, 46, 'Industry average', ''],
    ['firewall', 'JUNIPER_FW', 'Juniper SRX', '', 32, 38, 44, 'Industry average', ''],
    ['firewall', 'ZSCALER', 'Zscaler', '', 20, 26, 30, 'Industry average (SASE overlap, not full takeout)', ''],
    ['loadbalancer', 'INDUSTRY', 'Industry average', '', 28, 34, 38, 'VVM DC hardware LB takeout', ''],
    ['loadbalancer', 'F5', 'F5 BIG-IP', '', 28, 34, 38, 'Industry average', ''],
    ['loadbalancer', 'NETSCALER', 'Citrix NetScaler / ADC', '', 26, 32, 36, 'Industry average', ''],
    ['loadbalancer', 'HAPROXY', 'HAProxy', '', 12, 16, 20, 'Industry average (lower license takeout)', ''],
    ['loadbalancer', 'A10', 'A10 Thunder', '', 24, 30, 34, 'Industry average', ''],
    ['loadbalancer', 'LOADMASTER', 'Kemp LoadMaster', '', 22, 28, 32, 'Industry average', ''],
    ['backup', 'INDUSTRY', 'Industry average', '', 20, 26, 30, 'IDC Live Recovery Mar 2024 (cost-avoidance haircut)', 'Coexistence vs full displacement.'],
    ['backup', 'VEEAM', 'Veeam', '', 18, 24, 28, 'Industry average', 'Often coexistence — use only when DR platform is in play.'],
    ['backup', 'RUBRIK', 'Rubrik', '', 20, 26, 30, 'Industry average', ''],
    ['backup', 'COMMVAULT', 'Commvault', '', 20, 26, 30, 'Industry average', ''],
    ['backup', 'COHESITY', 'Cohesity', '', 20, 26, 30, 'Industry average', ''],
    ['backup', 'DELL_DPS', 'Dell DPS / PowerProtect', '', 18, 24, 28, 'Industry average', ''],
    ['operations', 'INDUSTRY', 'Industry average', '', 30, 36, 40, 'VCF Operations vs second monitoring stack', 'Annual spend template: VMs × $190 / year (Turbonomic AWS Marketplace band).'],
    ['operations', 'TURBO', 'IBM Turbonomic', '', 30, 36, 40, 'AWS Marketplace $37910 / 200 MVS = $190/VM/year', 'Annual spend template: VMs × $190 / year'],
    ['operations', 'SOLARWINDS', 'SolarWinds Observability Self-Hosted', '', 28, 34, 38, 'SolarWinds list $8 / node / month Essentials', 'Annual spend template: (Hosts + VMs) × $8 / month × 12'],
    ['operations', 'DYNATRACE', 'Dynatrace', '', 22, 28, 32, 'Dynatrace list Infrastructure $29 / host / month', 'Annual spend template: VMs × $29 / month × 12'],
    ['operations', 'DATADOG', 'Datadog Infrastructure Pro', '', 20, 26, 30, 'Datadog list $15 / host / month annual commit', 'Annual spend template: VMs × $15 / month × 12'],
    ['automation', 'INDUSTRY', 'Industry average', '', 40, 48, 52, 'VCF Automation / Salt vs Ansible or MECM', 'Annual spend template: (Hosts + VMs) × $175 / year (AAP Standard band)'],
    ['automation', 'ANSIBLE', 'Ansible Automation Platform', '', 40, 48, 52, 'Redress / Vendr ~$175 / managed node / year', 'Annual spend template: (Hosts + VMs) × $175 / year'],
    ['automation', 'MICROSOFT', 'Microsoft Configuration Manager', '', 38, 46, 50, 'System Center Datacenter MSRP $3607 × 25% SA / host', 'Annual spend template: Hosts × $3607 × 25%']
  ];
}

function invalidateInteropCache() {
  const cache = CacheService.getScriptCache();
  clearCachedChunked_(cache, INTEROP_CACHE_KEY);
  clearCachedChunked_(cache, INTEROP_CACHE_KEY_LEGACY);
  clearCachedChunked_(cache, PRODUCT_BUILD_CACHE_KEY);
  SpreadsheetApp.getUi().alert('Interop_DB cache cleared. The next load will reread the sheet.');
}

function invalidateIoDeviceCache() {
  clearCachedChunked_(CacheService.getScriptCache(), IO_DEVICE_CACHE_KEY);
  SpreadsheetApp.getUi().alert('IODevices cache cleared. The next load will reread the sheet.');
}

function invalidateAllCaches() {
  const cache = CacheService.getScriptCache();
  clearCachedChunked_(cache, CORE_CACHE_KEY);
  clearCachedChunked_(cache, INTEROP_CACHE_KEY);
  clearCachedChunked_(cache, INTEROP_CACHE_KEY_LEGACY);
  clearCachedChunked_(cache, PRODUCT_BUILD_CACHE_KEY);
  clearCachedChunked_(cache, IO_DEVICE_CACHE_KEY);
  SpreadsheetApp.getUi().alert('All VCF Sizer caches were cleared. The next load will reread the sheets.');
}
