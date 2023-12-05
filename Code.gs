/**
 * AppScript Project: https://script.google.com/u/1/home/projects/14XtLHDKUPwzFKIZ42P8QR4qnoO0L75Pq7ofoF-7QZXFpVgczhVyjp1ey/edit
 * 
 * There are two relevant spreadsheets:
 * 
 * Input, "Scorecard Config", https://docs.google.com/spreadsheets/d/1gWOkslCDj9X2lQUvjN7Qo_tTdoVuYMeHhJpsDLFTgVQ/edit#gid=0
 * Contains info about the course and teams.
 * 
 * Output, "Scorecard Sheet", https://docs.google.com/spreadsheets/d/1UgEI8G1EpqkA786dLZlZoGeeYJXboFYkWD6KGm3tokM/edit#gid=0
 * Where we write scores for each team.
 */

// App Script function to host the html page
function doGet() {
  // https://developers.google.com/apps-script/reference/html/html-service
  // This function is effectively the "server"; users navigating to your WebApp excute this function which produces the page they land on.
  return HtmlService.createHtmlOutputFromFile('index');
}

// App Script function to save data to sheet
function saveData(flatResults) {
  // Documentation: https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app#openbyurlurl
  // https://docs.google.com/spreadsheets/d/1UgEI8G1EpqkA786dLZlZoGeeYJXboFYkWD6KGm3tokM/edit#gid=0
  var sheet = SpreadsheetApp.openById("1UgEI8G1EpqkA786dLZlZoGeeYJXboFYkWD6KGm3tokM");

  flatResults.forEach(result => sheet.appendRow(result));
}