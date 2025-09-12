# golf_scorecard

A website that uses a UI to mimick a golf score card and does more-- auto math, uses targeted Stableford points for indiviuals and teams, works with the backend to show a scoreboard (skins for 2 groups and team Stableford scores after each 9), and then once done, a submission works with the backend to email all of the players.

It should automatically compute scores as Stableford values are entered.  It auto saves every 20 seconds
and if problems arise, can use the RELOAD button to reload the saved scores. 

Once done with the round, the SUBMIT button then sends the scores to a Google spreadsheet-- where
further scripting ID's: Top Players for the day, a listing of scores/players, the team scores and winning teams
for the Front 9, Back 9, and Total, and the skin winners for both the A/B and C/D groups.


