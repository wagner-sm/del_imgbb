const { chromium } = require('playwright');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = '1mf56UH_7u8AYOo8jhRnvrbY9ufRorhku9JnrkLdU0zw'; // entre /d/ e /edit
const SHEET_NAME = 'Página1'; // ajuste se necessário
const H_CELL = 'G2';

// Autoriza Google Sheets usando variáveis de ambiente
async function authorize() {
  const credentials = JSON.parse(process.env.CREDENTIALS_JSON);
  const token = JSON.parse(process.env.TOKEN_JSON);
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

// Lê IDs da célula
async function buscarIds(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!${H_CELL}`
  });
  if (!res.data.values || res.data.values.length === 0) return [];
  return res.data.values[0][0].split(',').map(s => s.trim()).filter(Boolean);
}

// Limpa a célula
async function limparIds(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!${H_CELL}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['']] }
  });
}

// Automação Playwright
async function automateImgbbActions(imgId) {
  const cookies = JSON.parse(process.env.GOOGLE_COOKIES_JSON);

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext();
  await context.addCookies(cookies);
  const page = await context.newPage();

  await page.goto('https://imgbb.com/');
  await page.click('span.text.phone-hide:has-text("Wagner Moreira")');
  await page.click('a:has(span.icon-id-card):has-text("O meu perfil")');
  await page.waitForLoadState('networkidle');

  const searchInputSelector = 'input.search.two-icon-padding[name="q"]';
  await page.fill(searchInputSelector, imgId);
  await page.press(searchInputSelector, 'Enter');
  await page.waitForTimeout(2000);

  await page.click('span.btn-icon.icon-trash-can[title="Eliminar"]');
  await page.waitForSelector('button.btn.btn-input.default[data-action="submit"]');
  await page.click('button.btn.btn-input.default[data-action="submit"]');
  await page.waitForTimeout(2000);

  await browser.close();
}

// Main
(async () => {
  try {
    const auth = await authorize();
    const ids = await buscarIds(auth);

    if (ids.length === 0) {
      console.log('Nenhum ID encontrado na planilha.');
      return;
    }

    console.log('IDs encontrados:', ids);

    for (const id of ids) {
      await automateImgbbActions(id);
    }

    await limparIds(auth);
    console.log('Processo concluído! IDs apagados da planilha.');
  } catch (error) {
    console.error('Erro:', error);
  }
})();