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

function getConfigAsString() {
  const rawConfig = extractRawConfig();
  const structuredConfig = constructStructuredConfig(rawConfig);

  const out = JSON.stringify(structuredConfig);
  return out;
}

/**
 * Returns an array of two elements
 * - [Date, CourseName, par1, par2, ... par18]
 * - [[TeamName, Player1, Target1, ...] ...]
 */

function extractRawConfig() {
  // Documentation: https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app
   // G   https://docs.google.com/spreadsheets/d/1gWOkslCDj9X2lQUvjN7Qo_tTdoVuYMeHhJpsDLFTgVQ/edit#gid=0
   // G2  https://docs.google.com/spreadsheets/d/13b1OqtZhmDwV2_1P5mwHJ3KDUS47AuQhir6BKm0szkc/edit?gid=1521471540#gid=1521471540

  const spreadsheet = SpreadsheetApp.openById("1gWOkslCDj9X2lQUvjN7Qo_tTdoVuYMeHhJpsDLFTgVQ");
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



function saveData(flatResults) {
  //G const sheet = SpreadsheetApp.openById("1UgEI8G1EpqkA786dLZlZoGeeYJXboFYkWD6KGm3tokM");
  //G2 const sheet = SpreadsheetApp.openById("1H4T27la0hX6kdI4zOaygNw_8AtV1zlw-xsb1hjSGbE4");

  const sheet = SpreadsheetApp.openById("1UgEI8G1EpqkA786dLZlZoGeeYJXboFYkWD6KGm3tokM");

  Logger.log("Saving data: " + JSON.stringify(flatResults));

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(3000);

    flatResults.forEach(result => {
      Logger.log("Appending row: " + result); // Log each row being appended
      sheet.appendRow(result);
    });
    sheet.appendRow(["***"]);

    Logger.log("Data saved successfully.");

    sendFlatResultsEmail(flatResults);

    Logger.log("Emails sent successfully.");

  } catch (e) {
    Logger.log("Error during saveData: " + e.message);
  } finally {
    lock.releaseLock();
  }
}





function sendFlatResultsEmail(flatResults) {
   // G config sheet Id  1gWOkslCDj9X2lQUvjN7Qo_tTdoVuYMeHhJpsDLFTgVQ 
   // G2 "      "    Id  13b1OqtZhmDwV2_1P5mwHJ3KDUS47AuQhir6BKm0szkc
  const sheetId = '1gWOkslCDj9X2lQUvjN7Qo_tTdoVuYMeHhJpsDLFTgVQ'; // The config sheet containing par ratings
  const subject = `Your ${new Date().toLocaleDateString()} Springfield Seniors Submitted Golf Scores`;


  const header = [
    "Date", "Tee Time", "Course", "Player Name",
    "H1", "H2", "H3", "H4", "H5", "H6", "H7", "H8", "H9", "H10", "H11", "H12", "H13", "H14", "H15", "H16", "H17", "H18",
    "Target", "Total Score", "Total Points", "Total Net",
    "Front Score", "Front Points", "Front Net", "Back Score", "Back Points", "Back Net"
  ];


  // STEP 1: Read pars from external sheet
  const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
  const parValues = sheet.getRange('C1:T1').getValues()[0]; // Get the par values from C1:T1


  // STEP 2: Build second header row (pars)
  const secondHeader = [
    "", "", "", "<b>Pars</b>",   // Bold "Pars"
    ...parValues,                 // H1 - H18 pars
    "",                          // Target
    "", "", "",                  // Total Score, Total Points, Total Net
    "", "", "",                  // Front Score, Front Points, Front Net
    "", "", ""                   // Back Score, Back Points, Back Net
  ];


  // STEP 3: Read player names and emails from another sheet (Players Past Poionts Email Sheet)
   // G Player Past Points sheet Id  1UAxip680bg0TiE72jKas_qExCYn7fLEg8nrmH7SnytQ
   // G2 "      "                Id  1U6Ugwd6uXTWYimMQdOOf-5ngDBzJtmaDiVSyqrBbogA

  const parsSheet = SpreadsheetApp.openById('1UAxip680bg0TiE72jKas_qExCYn7fLEg8nrmH7SnytQ').getSheetByName('Sheet1');
  const playersData = parsSheet.getRange('A2:B' + parsSheet.getLastRow()).getValues();
 
  const playerEmails = {};
  playersData.forEach(row => {
    const playerName = row[0];
    const email = row[1];
    if (playerName && email) {
      playerEmails[playerName] = email;
    }
  });


  // Now we build the email addresses for the players in the flatResults
  let toList = [];
  flatResults.forEach(row => {
    let playerNameRaw = row[3]; // Player Name is in column 4 of each row
    if (playerNameRaw) {
      let cleanedName = playerNameRaw.replace(/!/g, "").trim(); // remove any "!" and extra spaces
      const email = playerEmails[cleanedName];
      if (email) {
        toList.push(email);  // Add to the recipient list
      }
    }
  });


    // Email body with headers and data
 let htmlBody = 
  `<div style="font-family: Arial, sans-serif; font-size: 14px;">
    <p>Thank you for playing today in the Springfield Seniors Group! Below is your group's resulting scorecard.</p>
    <br><br>
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr style="background-color: #d9edf7;">
          ${header.map(col => 
            `<th style="padding: 8px; border: 1px solid #ccc; text-align: center;">
              ${col}
            </th>`
          ).join('')}
        </tr>
        <tr style="background-color: #d9edf7;">
          ${secondHeader.map(par => 
            `<th style="padding: 6px; border: 1px solid #ccc; text-align: center;">
              ${par !== "" ? par : ""}
            </th>`
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
    <br><br>
    <p>Scores submitted on: ${new Date().toLocaleString()}</p>
    <br><br>
    <p><b><i>Powered by GoogleGolf Scoring System!</i></b></p>
  </div>`;


  // Send email
  MailApp.sendEmail({
    to: toList.join(','),  // Players' emails in the "To" field
    cc: "welch_misc@yahoo.com",  // CC emails
    subject: subject,
    htmlBody: htmlBody
  });


  // Log the recipients (optional for debugging)
  Logger.log("Email sent to: " + toList.join(', ') + " CC: welch_misc@yahoo.com");
}


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

   // G  Storage Sheet https://docs.google.com/spreadsheets/d/1vA0ZUSpbOKJQcd2S4hReRUXf0XmnGQ2gM_xi4oeaUTQ/edit#gid=0
  // G2  Starage  https://docs.google.com/spreadsheets/d/1ItHKfahZZWcpTnFmgHj5roMTOAeR5WVx7vf9efnwpLM/edit?gid=1733728784#gid=1733728784

  const spreadsheet = SpreadsheetApp.openById("1vA0ZUSpbOKJQcd2S4hReRUXf0XmnGQ2gM_xi4oeaUTQ");
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
  
  // G  Storage Sheet https://docs.google.com/spreadsheets/d/1vA0ZUSpbOKJQcd2S4hReRUXf0XmnGQ2gM_xi4oeaUTQ/edit#gid=0
  // G2  Starage      https://docs.google.com/spreadsheets/d/1ItHKfahZZWcpTnFmgHj5roMTOAeR5WVx7vf9efnwpLM/edit?gid=1733728784#gid=1733728784

  const spreadsheet = SpreadsheetApp.openById("1vA0ZUSpbOKJQcd2S4hReRUXf0XmnGQ2gM_xi4oeaUTQ");
  const teamSheet = spreadsheet.getSheetByName(teamName);

  if (teamSheet == null) {
    return [];
  }

  return teamSheet.getDataRange().getValues();
}

function testLoadScoresForTeam() {
  console.log(loadScoresForTeam("9:30"));
}