#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import inquirer from "inquirer";

const program = new Command();
const filePath = "./study-logs.json";
const promptQuestions = [
  {
    type: "input",
    name: "topic",
    message: "Enter study topic name",
  },
  {
    type: "input",
    name: "hours",
    message: "Enter study topic duration (hours)",
    validate: (value) =>
      (!isNaN(value) && Number(value) > 0) || "Enter a number greater than 0",
  },
];

function readSessions() {
  if (!fs.existsSync(filePath)) return [];
  const fileContent = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(fileContent);
}

function saveSessions(sessions) {
  fs.writeFileSync(filePath, JSON.stringify(sessions, null, 2), "utf-8");
}

program
  .name("study-log-cli")
  .description("CLI to track and log daily study sessions")
  .version("1.0.0");

program
  .command("add")
  .alias("a")
  .description("add a study session")
  .action(async () => {
    try {
      const answers = await inquirer.prompt(promptQuestions);
      console.log(answers); // { topic: 'nodejs', hours: '5' }

      // لو الفايل موجود بالفعل اقرأ
      const sessions = readSessions();
      sessions.push(answers);

      // احفظ في الفايل
      saveSessions(sessions);

      console.log(`Added: ${answers.topic} (${answers.hours}h)`);
    } catch (err) {
      console.error("Something went wrong:", err.message);
    }
  });

program
  .command("list")
  .alias("l")
  .description("show all sessions")
  .action(() => {
    try {
      const sessions = readSessions();
      if (sessions.length === 0) {
        console.log("No sessions yet. Run `add` first.");
        return;
      }
      console.table(sessions);
    } catch (err) {
      console.error("Error reading sessions:", err.message);
    }
  });

// Delete session
program
  .command("remove")
  .alias("rm")
  .description("pick a session to delete")
  .action(async () => {
    try {
      const sessions = await readSessions();
      if (sessions.length === 0) {
        console.log("No sessions to delete");
        return;
      }
      const { index } = await inquirer
        .prompt([
          {
            type: "select",
            name: "index",
            message: "Which session do you want to delete?",
            choices: sessions.map((s, i) => ({
              name: `${s.topic} (${s.hours}h)`,
              value: i,
            })),
          },
          {
            type: "confirm",
            name: "sure",
            message: "Are you sure?",
            default: false,
          },
        ])
        .then((a) => {
          console.log(a);
          return a.sure ? a : { index: null };
        });

      if (index === null) {
        console.log("Cancelled");
        return;
      }

      sessions.splice(index, 1);
      saveSessions(sessions);
      console.log("Deleted");
    } catch (err) {
      console.error("Error: ", err.message);
    }
  });

// Total Hours
program
  .command("total")
  .alias("t")
  .description("show total study hours")
  .action(() => {
    try {
      const sessions = readSessions();

      if (sessions.length === 0) {
        console.log("No sessions yet. Run `add` first.");
        return;
      }

      const total = sessions.reduce((sum, s) => sum + Number(s.hours), 0);
      console.log(`Total: ${total} hours across ${sessions.length} sessions`);
    } catch (err) {
      console.error("Error calculating total:", err.message);
    }
  });

program.parse();
