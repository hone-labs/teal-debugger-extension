//
// Stamps the version into the package.json file.
//

const fs = require("fs");
const package = JSON.parse(fs.readFileSync("package.json", "utf8"));
package.version = process.env.VERSION;
fs.writeFileSync("package.json", JSON.stringify(package, null, 4));