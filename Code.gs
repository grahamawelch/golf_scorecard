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
  const rootPage = HtmlService.createHtmlOutput();
  const scorecard = HtmlService.createHtmlOutputFromFile('index');

  const config = getConfigAsString();

  rootPage.append("<script>const CONFIG =");
  rootPage.append(config);
  rootPage.append("</script>");

  // In order for the CONFIG variable to be available to the function creating the form
  // it needs to be declared *before* that function.
  // So we start with an empty page, add the CONFIG, *then* add the rest of the form.

  rootPage.append(scorecard.getContent());

  return rootPage;
}


/**
 * Global configuration for sheet IDs between G and G2 via one flag
 */

const USE_PRODUCTION = true;  // Set to false for test setup (G2) and true for G

const SHEET_IDS = {
  config: USE_PRODUCTION
    ? "1gWOkslCDj9X2lQUvjN7Qo_tTdoVuYMeHhJpsDLFTgVQ"
    : "13b1OqtZhmDwV2_1P5mwHJ3KDUS47AuQhir6BKm0szkc",

  scorecard: USE_PRODUCTION
    ? "1UgEI8G1EpqkA786dLZlZoGeeYJXboFYkWD6KGm3tokM"
    : "1H4T27la0hX6kdI4zOaygNw_8AtV1zlw-xsb1hjSGbE4",

  storage: USE_PRODUCTION
    ? "1vA0ZUSpbOKJQcd2S4hReRUXf0XmnGQ2gM_xi4oeaUTQ"
    : "1ItHKfahZZWcpTnFmgHj5roMTOAeR5WVx7vf9efnwpLM",

  scorer: USE_PRODUCTION
    ? "1aON1dd6cw-9AhIUjNXf5rDVYfA2imhTYofY9dX26K_w"
    : "1jJKgV-TVlzjQBEKztHRmnZVEnCHSf_Z1e47EClaUxDc"
};



function getConfigAsString() {
  const rawConfig = extractRawConfig();
  const structuredConfig = constructStructuredConfig(rawConfig);

  const out = JSON.stringify(structuredConfig);
  return out;
}


var debugBuffer = [];

function pushDebug(msg) {
  debugBuffer.push(msg);
}

function clearDebugBuffer() {
  debugBuffer = [];
}

function fetchDebugBuffer() {
  var copy = debugBuffer.slice();
  clearDebugBuffer();
  return copy;
}


function extractRawConfig() {
  // Documentation: https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app

  // G   1gWOkslCDj9X2lQUvjN7Qo_tTdoVuYMeHhJpsDLFTgVQ
  // G2  13b1OqtZhmDwV2_1P5mwHJ3KDUS47AuQhir6BKm0szkc

  const spreadsheet = SpreadsheetApp.openById(SHEET_IDS.config);
  const sheet = spreadsheet.getSheetByName("Config");

  const courseValues = sheet.getRange(1, 1, 1, 20).getValues()[0];

  let allTeamValues = [];
  let currTeamRow = 2;
  while (true) {
    const teamValues = sheet.getRange(currTeamRow, 1, 1, 9).getValues()[0];
    if (teamValues.filter(Boolean).length === 0) {
      break;
    }
    allTeamValues.push(teamValues);
    currTeamRow++;
  }

  const out = [courseValues, allTeamValues];
  return out;
}

function constructStructuredConfig(rawConfig) {
  const courseConfig = {
    "date": rawConfig[0][0],
    "courseName": rawConfig[0][1],
    "pars": rawConfig[0].slice(2)
  };

  let allTeamConfigs = [];
  for (let currTeamConfig of rawConfig[1]) {
    let allPlayerConfigs = [];
    for (let colIndex = 1; colIndex < currTeamConfig.length; colIndex += 2) {
      let playerName = currTeamConfig[colIndex] !== undefined ? currTeamConfig[colIndex] : ''; // Leave playerName empty if it is empty
      let playerTarget = playerName === 'x' ? '' : (currTeamConfig[colIndex + 1] !== undefined ? currTeamConfig[colIndex + 1] : '');

      allPlayerConfigs.push({
        "playerName": playerName,
        "playerTarget": playerTarget
      });
    }

    // Ensure there are always 4 player slots, filling in with 'x' and empty target if missing
    while (allPlayerConfigs.length < 4) {
      allPlayerConfigs.push({"playerName": "x", "playerTarget": ""});
    }

    allTeamConfigs.push({
      "teamName": currTeamConfig[0],
      "players": allPlayerConfigs
    });
  }

  const out = {
    "courseConfig": courseConfig,
    "allTeamConfigs": allTeamConfigs,
  };
  return out;
}



function saveData(flatResults, scorekeeperName) {
  clearDebugBuffer(); // Step 1: Clear previous logs

  pushDebug("=== saveData started ===");
  pushDebug("Received scorekeeperName: " + scorekeeperName);
  pushDebug("Flat results received: " + JSON.stringify(flatResults));

  let sheet;
  try {
    sheet = SpreadsheetApp
        // G   1UgEI8G1EpqkA786dLZlZoGeeYJXboFYkWD6KGm3tokM
        // G2  1H4T27la0hX6kdI4zOaygNw_8AtV1zlw-xsb1hjSGbE4

    sheet = SpreadsheetApp.openById(SHEET_IDS.scorecard)
                          .getSheetByName("Scores");

    pushDebug("Sheet opened successfully");
  } catch (e) {
    pushDebug("ERROR opening sheet: " + e.message);
    return fetchDebugBuffer();
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(3000);
    pushDebug("Lock acquired");

    flatResults.forEach((result, i) => {
      pushDebug(`Appending row ${i + 1}: ` + JSON.stringify(result));
      sheet.appendRow(result);
    });

    sheet.appendRow(["***"]);
    pushDebug("All rows appended including separator");

    sendFlatResultsEmail(flatResults, scorekeeperName);
    pushDebug("Email sent successfully");

  } catch (e) {
    pushDebug("ERROR during saveData: " + e.message);
  } finally {
    try {
      lock.releaseLock();
      pushDebug("Lock released");
    } catch (releaseError) {
      pushDebug("ERROR releasing lock: " + releaseError.message);
    }
  }

  pushDebug("=== saveData finished ===");
  return fetchDebugBuffer();
}





function sendFlatResultsEmail(flatResults, scorekeeperName){
  // G config sheet Id  1gWOkslCDj9X2lQUvjN7Qo_tTdoVuYMeHhJpsDLFTgVQ 
  //G2 config sheet Id  13b1OqtZhmDwV2_1P5mwHJ3KDUS47AuQhir6BKm0szkc


  const sheetId = SHEET_IDS.config;
  
  const teeTime = flatResults.length > 0 ? flatResults[0][1] : "Unknown Tee Time";
  const subject = `Your ${new Date().toLocaleDateString()} ${teeTime} Springfield Seniors Submitted Golf Scores`;

  const header = [
    "Date", "Tee Time", "Course", "Player Name",
    "H1", "H2", "H3", "H4", "H5", "H6", "H7", "H8", "H9", "H10", "H11", "H12", "H13", "H14", "H15", "H16", "H17", "H18",
    "Target", "Total Score", "Total Points", "Total Net",
    "Front Score", "Front Points", "Front Net", "Back Score", "Back Points", "Back Net"
  ];

  // STEP 1: Read pars from external sheet
  const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
  const parValues = sheet.getRange('C1:T1').getValues()[0];

  // STEP 2: Build second header row (pars)
  const secondHeader = [
    "", "", "", "<b>Pars</b>",
    ...parValues,
    "", "", "", "", "", "", ""
  ];

  // STEP 3: Read player names and emails (dynamic based on USE_PRODUCTION)
  const pastPointsSheetId = USE_PRODUCTION
    ? "1UAxip680bg0TiE72jKas_qExCYn7fLEg8nrmH7SnytQ"
    : "1wCUrPeEXs4mPeGMByxTEWab91CB0W3Iq9CJcswFfFjI";

  const pastPointSheet = SpreadsheetApp.openById(pastPointsSheetId).getSheetByName('Sheet1');
  const playersData = pastPointSheet.getRange('A2:B' + pastPointSheet.getLastRow()).getValues();
  Logger.log("Loaded playersData: " + playersData.length + " entries");

const playerEmails = {};
playersData.forEach(row => {
  const playerName = row[0];
  const email = row[1];
  if (playerName && email) {
    playerEmails[playerName] = email;
  }
});

let toList = [];
flatResults.forEach(row => {
  let playerNameRaw = row[3];
  if (playerNameRaw) {
    let cleanedName = playerNameRaw.replace(/!/g, "").trim();
    let bestMatch = null;
    let highestScore = 0;

    Object.keys(playerEmails).forEach(storedName => {
      const score = getSimilarityScore(cleanedName, storedName);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = storedName;
      }
    });

    if (highestScore >= 0.7 && bestMatch) {
      const email = playerEmails[bestMatch];
      toList.push(email);
      Logger.log(`Matched "${cleanedName}" to "${bestMatch}" with score ${highestScore.toFixed(2)} → Email: ${email}`);
    } else {
      Logger.log(`No match found for "${cleanedName}". Best score: ${highestScore.toFixed(2)}`);
    }
  }
});


  // Format current time as EST
  const timestampEST = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York'
  });


//const scorekeeperName = localStorage.getItem('scorekeeperName') || 'Unknown';

// Build HTML email body with name embedded
let htmlBody = `
  <div style="font-family: Arial, sans-serif; font-size: 14px;">
    <p>Thank you for playing today in the Springfield Seniors Group! Below is your group's resulting scorecard.</p>
    <br>
    <p><b>Submitted by: ${scorekeeperName}</b><i> - Who should monitor their email for the next ~2 hours in case any questions arise.</i></p>
    <br>
    <p><b>If this scorecard is correct, no need to text/email a picture of your scorecard.</b></p>
    <p>   -  If you mis-scored some holes, please bring the App back up, correct, Submit again, and then email Alan with an explanation.<p>
    <p>   -  Only if you have further problems, then email a picture of socecard to Ken and Alan with an explanation-- so they can figure out what to do,
    <br><br>
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr style="background-color: #d9edf7;">
          <th rowspan="2" style="padding: 8px; border: 1px solid #ccc; text-align: center;">Date</th>
          <th rowspan="2" style="padding: 8px; border: 1px solid #ccc; text-align: center;">Tee Time</th>
          <th rowspan="2" style="padding: 8px; border: 1px solid #ccc; text-align: center;">Course</th>
          <th style="padding: 8px; border: 1px solid #ccc; text-align: center;">Player Name</th>
          ${Array.from({length: 18}, (_, i) => 
            `<th style="padding: 8px; border: 1px solid #ccc; text-align: center;">H${i + 1}</th>`
          ).join('')}
          <th rowspan="2" style="padding: 8px; border: 1px solid #ccc; text-align: center;">Target</th>
          <th rowspan="2" style="padding: 8px; border: 1px solid #ccc; text-align: center;">Total Score</th>
          <th rowspan="2" style="padding: 8px; border: 1px solid #ccc; text-align: center;">Total Points</th>
          <th rowspan="2" style="padding: 8px; border: 1px solid #ccc; text-align: center;">Total Net</th>
          <th rowspan="2" style="padding: 8px; border: 1px solid #ccc; text-align: center;">Front Score</th>
          <th rowspan="2" style="padding: 8px; border: 1px solid #ccc; text-align: center;">Front Points</th>
          <th rowspan="2" style="padding: 8px; border: 1px solid #ccc; text-align: center;">Front Net</th>
          <th rowspan="2" style="padding: 8px; border: 1px solid #ccc; text-align: center;">Back Score</th>
          <th rowspan="2" style="padding: 8px; border: 1px solid #ccc; text-align: center;">Back Points</th>
          <th rowspan="2" style="padding: 8px; border: 1px solid #ccc; text-align: center;">Back Net</th>
        </tr>
        <tr style="background-color: #d9edf7;">
          <th style="padding: 6px; border: 1px solid #ccc; text-align: center;"><b>Pars</b></th>
          ${parValues.map(par =>
            `<th style="padding: 6px; border: 1px solid #ccc; text-align: center;">${par}</th>`
          ).join('')}
        </tr>
      </thead>
      <tbody>
        ${flatResults.map(row =>
          `<tr>
            ${row.map((cell, index) => {
              const align = (index <= 3) ? "left" : "center";
              return `<td style="padding: 6px; border: 1px solid #ccc; text-align: ${align};">
                        ${cell !== undefined && cell !== null ? cell : ""}
                      </td>`;
            }).join('')}
          </tr>`
        ).join('')}
      </tbody>
    </table>
    <br>
    <p><i>The last line in the scorecard (with the tee time for the Player Name) is the team's result-- but without any +-2 changes that the system makes later.  <br><br>
    You can do it manually-- e,g., Tim is a +-2 player and he socres a +3 on the Front Net and -4 on the Back Net, so the correction would be reduce 1 on the Front (to +2), add 2 (to -2) on the back, and  add 1 to the Total Net = +1.  And, so those adjustements would be made to the the team scores respectively for the Front Net, Back Net, and Total Net.</i></p> 
    <br><br>
    <p>Scores submitted on: ${timestampEST} EST</p>
    <br><br>
    <p><b><i>Powered by GoogleGolf Scoring System!</i></b></p>
  </div>`;


  / // Send email
  MailApp.sendEmail({
    to: toList.join(','),
    cc: "welch_misc@yahoo.com, kendunnett@comporium.net",
    subject: subject,
    htmlBody: htmlBody
  });

  Logger.log("Email sent to: " + toList.join(', ') + " CC: welch_misc@yahoo.com, kendunnett@comporium.net");

// kendunnett@comporium.net






// You can directly execute this method in the AppsScript UI.
function testSaveData() {
  const flatResults = [
    ["date", "team", "course", "player0", 1, 2, 3],
    ["date", "team", "course", "player1", 4, 5, 6]
  ];

  saveData(flatResults);
}

function saveScoresForTeam(teamName, allPlayerScores) {
  // teamName: String
  // allPlayerScores: [["name", "target", "hole0", "hole1", ...], ...]

   // G  Storage Sheet 1vA0ZUSpbOKJQcd2S4hReRUXf0XmnGQ2gM_xi4oeaUTQ
  // G2  Storage       1ItHKfahZZWcpTnFmgHj5roMTOAeR5WVx7vf9efnwpLM

  const spreadsheet = SpreadsheetApp.openById(SHEET_IDS.storage);
  let teamSheet = spreadsheet.getSheetByName(teamName);

  if (teamSheet == null) {
    teamSheet = spreadsheet.insertSheet(teamName);
  }

  teamSheet.clear();

  allPlayerScores.forEach(playerScores => teamSheet.appendRow(playerScores))

}

function testSaveScoresForTeam() {
  saveScoresForTeam("9:30", [
    ["AAA", 27, 3, 3, 3, 0, 0, 0],
    ["BBB", 20, 4, 4, 0, 0],
    ["CCC", 1]
  ]);
}


function loadScoresForTeam(teamName) {
  
  // G  Storage Sheet 1vA0ZUSpbOKJQcd2S4hReRUXf0XmnGQ2gM_xi4oeaUTQ
  // G2 Storage Sheet 1ItHKfahZZWcpTnFmgHj5roMTOAeR5WVx7vf9efnwpLM

  const spreadsheet = SpreadsheetApp.openById(SHEET_IDS.storage);
  const teamSheet = spreadsheet.getSheetByName(teamName);

  if (teamSheet == null) {
    return [];
  }

  return teamSheet.getDataRange().getValues();
}

function testLoadScoresForTeam() {
  console.log(loadScoresForTeam("9:30"));
}


function recordScorer({ teamName, playerName, activity, timestamp }) {
  // scorer sheet G   ID 1aON1dd6cw-9AhIUjNXf5rDVYfA2imhTYofY9dX26K_w
  // scorer sheet G2  ID  1jJKgV-TVlzjQBEKztHRmnZVEnCHSf_Z1e47EClaUxDc
  
  const ss = SpreadsheetApp.openById(SHEET_IDS.scorer);
  const sheet = ss.getSheetByName("Scorer");
  const email = Session.getActiveUser().getEmail();

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    sheet.appendRow([teamName, timestamp, playerName, activity, email]);
  } finally {
    lock.releaseLock();
  }
}


function recordScorerActivity(data) {
  // scorer sheet G   ID 1aON1dd6cw-9AhIUjNXf5rDVYfA2imhTYofY9dX26K_w
  // scorer sheet G2  ID  1jJKgV-TVlzjQBEKztHRmnZVEnCHSf_Z1e47EClaUxDc

   const sheet = SpreadsheetApp.openById(SHEET_IDS.scorer).getSheetByName("Sheet1");

  if (!sheet) {
    Logger.log("Sheet named 'Scorers' not found.");
    return;
  }

  Logger.log("Recording scorer activity: " + JSON.stringify(data));

  const row = [
    new Date(),
    data.teamName || '',
    data.playerName || '',
    data.activity || 'Scorekeeper'
  ];

  sheet.appendRow(row);
}


function getSimilarityScore(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return maxLength === 0 ? 1.0 : (1 - distance / maxLength);
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}



