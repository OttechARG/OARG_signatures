import * as node_windows from "node-windows";
import * as path from "path";
import * as fs from "fs";
import * as ini from "ini";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
var config = ini.parse(fs.readFileSync("signatures.ini", "utf-8"));
// Create a new service object
var svc = new node_windows.Service({
    name: config.winservice || "OARG_signatures",
    description: "OARG servicio de firmas Ottech ARG.",
    script: path.join(__dirname, "server.js"),
    /*env: {
      name: "PATH",
      value: path.join(__dirname, "../bin") + ";" + process.env["PATH"],
    },*/
});
svc.on("install", function () {
    svc.start();
});
svc.on("uninstall", function () { });
if (process.argv.includes("add")) {
    svc.install();
}
else if (process.argv.includes("del")) {
    svc.uninstall();
}
else {
    console.log("Debe especificar add o del");
}
