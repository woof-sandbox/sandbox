const fs = require('fs');
const path = require('path');

module.exports = {
  skipFiles: ['test/', 'ERC20.sol', 'interfaces/'],
  copyNodeModules: true,
  onPreCompile: async () => {
    console.log("Pre-processing .sol files for coverage");

    const contractsDir = path.resolve(__dirname, 'contracts');

    // Recursive function to get all .sol files in the contracts directory
    function getAllSolidityFiles(dirPath, arrayOfFiles = []) {
      const files = fs.readdirSync(dirPath);
      

      files.forEach((file) => {
        const currentPath = path.join(dirPath, file);

        if (fs.statSync(currentPath).isDirectory()) {
          arrayOfFiles = getAllSolidityFiles(currentPath, arrayOfFiles);
        } else if (file.endsWith('.sol')) {
          arrayOfFiles.push(currentPath);
        }
      });
      return arrayOfFiles;
    }
    // Get all Solidity files from the contracts directory recursively
    const allSolFiles = getAllSolidityFiles(contractsDir);
    allSolFiles.forEach((file) => {
      let content = fs.readFileSync(file, 'utf8');

      content = content.replace(
        /@openzeppelin/g,
        "lib/openzeppelin-contracts"
      );

      fs.writeFileSync(file, content, 'utf8');
    });
  },
  onCompileComplete: async () => {
    console.log("Postprocessing .sol files after coverage");

    const contractsDir = path.resolve(__dirname, 'contracts');

    // Recursive function to get all .sol files in the contracts directory
    function getAllSolidityFiles(dirPath, arrayOfFiles = []) {
      const files = fs.readdirSync(dirPath);

      files.forEach((file) => {
        const currentPath = path.join(dirPath, file);
        if (fs.statSync(currentPath).isDirectory()) {
          arrayOfFiles = getAllSolidityFiles(currentPath, arrayOfFiles);
        } else if (file.endsWith('.sol')) {
          arrayOfFiles.push(currentPath);
        }
      });

      return arrayOfFiles;
    }

    // Get all Solidity files from the contracts directory recursively
    const allSolFiles = getAllSolidityFiles(contractsDir);

    allSolFiles.forEach((file) => {
      let content = fs.readFileSync(file, 'utf8');

      content = content.replace(
        /lib\/openzeppelin-contracts/g,
        "@openzeppelin"
      );

      fs.writeFileSync(file, content, 'utf8');
    });
  },
};