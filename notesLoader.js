const fs = require("fs");
const path = require("path");
const marked = require("marked");

const basePath = path.join(__dirname, "data", "booknotes-master");

function loadNotes() {
  let notes = [];

  function readFolder(folder, subject) {
    const files = fs.readdirSync(folder);

    files.forEach(file => {
      const filePath = path.join(folder, file);

      if (fs.statSync(filePath).isDirectory()) {
        readFolder(filePath, file);
      } else if (file.endsWith(".md")) {
        const content = fs.readFileSync(filePath, "utf-8");

        notes.push({
          title: file.replace(".md", ""),
          subject: subject,
          content: marked(content)
        });
      }
    });
  }

  readFolder(basePath, "General");
  return notes;
}

module.exports = loadNotes;