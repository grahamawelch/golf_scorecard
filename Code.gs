// App Script function to host the html page
function doGet() {
  // https://developers.google.com/apps-script/reference/html/html-service
  // This function is effectively the "server"; users navigating to your WebApp excute this function which produces the page they land on.
  return HtmlService.createHtmlOutputFromFile('index');
}

// App Script function to save data to sheet
function saveData(flatResults) {
  // Documentation: https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app#openbyurlurl
  var sheet = SpreadsheetApp.openById("secret?");
  
  flatResults.forEach(result => sheet.appendRow(result));
}