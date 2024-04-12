function fetchHTML(url) {
  const response = UrlFetchApp.fetch(url);
  return response.getContentText();
}

function webScrapingBadges() {
  const SPREADHEET_ID = '1RoxYLd8K9fEd3JT9TU8N3I-_TGG9xAuFCzOK6uH-6RU';
  const SHEET_NAME = 'Badges';
  const urls = [
    'https://www.cloudskillsboost.google/public_profiles/0eb350ae-10ac-4381-bc1c-b2d8564e68ea',
    'https://www.cloudskillsboost.google/public_profiles/5caa68c6-2ec1-43c4-bc53-f415370e80fa',
    'https://www.cloudskillsboost.google/public_profiles/fbf26299-7c08-4364-9e03-f9c57e7f067d',
    'https://www.cloudskillsboost.google/public_profiles/adde4b2f-1929-4d6d-9df7-8098b887a892',
  ];

  const spreadsheet = SpreadsheetApp.openById(SPREADHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  sheet
    .getRange('A1:D1')
    .setValues([[`Student's Name`, `Total Num of Badges`, `Badges Names`, `2024 Badges`]])
    .setFontWeight('bold');
  sheet.getRange(`A2:D${sheet.getLastRow() + 1}`).clear();

  const data = [];
  const cache = CacheService.getScriptCache();
  const expirationSeconds = 3600; // 1 hour

  urls.forEach((url) => {
    try {
      const cacheKey = `scraping_data_${url}`;
      const currentHTML = fetchHTML(url);
      const previousHTML = cache.get(`previous_html_${url}`);

      if (currentHTML === previousHTML) {
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
          data.push(JSON.parse(cachedData));
          return;
        }
      }

      const $ = Cheerio.load(currentHTML);

      const studentName = $('.ql-display-small').text().trim();
      const badges = $('.profile-badge');
      const badgeNames = badges.map((i, el) => $(el).find('.ql-title-medium.l-mts').text().trim()).get();
      const badgeDates = badges.map((i, el) => formatDate($(el).find('.ql-body-medium.l-mbs').text().trim())).get();
      const badges2024 = countBadgesPerYear(badgeDates, 2024);

      const scrapingData = [
        studentName,
        badges.length == 1 ? `1 badge` : badges.length > 1 ? `${badges.length} badges` : 'No badges added',
        `${badgeNames.slice(0, -1).join(',\n')}${badgeNames.length > 1 ? ',\n' : ''}${badgeNames.slice(-1)}` || 'No badges added',
        badges2024 == 1 ? 1 : badges2024 > 1 ? `${badges.length}` : 0,
      ];

      //storing data into cache
      cache.put(cacheKey, JSON.stringify(scrapingData), expirationSeconds);
      cache.put(`previous_html${url}`, currentHTML, expirationSeconds);

      data.push(scrapingData);
    } catch (err) {
      Logger.log(`Error processing URL: ${url}`, err);
      data.push(['Error processing URL', '', '', '']);
    }
  });

  const numRows = data.length;
  if (numRows > 0) sheet.getRange(2, 1, numRows, 4).setValues(data);
}

function formatDate(inputDateStr) {
  const parts = inputDateStr.split(/[\s,]+/);

  const monthStr = parts[1];
  let dayStr = parts[2];
  const yearStr = parts[3];

  if (dayStr.length === 2 && dayStr.startsWith('0')) dayStr = dayStr.subString(1);

  const dateStr = new Date(`${monthStr} ${dayStr.padStart(2, '0')}, ${yearStr}`);

  return dateStr;
}

function countBadgesPerYear(dates, year) {
  let count = 0;

  for (const date of dates) {
    if (date.getFullYear() === year) count++;
  }

  return count;
}
