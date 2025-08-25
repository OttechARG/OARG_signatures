import * as node_windows from "node-windows";
import * as path from "path";
import * as fs from "fs";
import * as ini from "ini";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load configuration with property-level fallback
function loadConfiguration(): any {
  // Load defaults first
  let config: any = {};
  const defaultsPath = path.join("config", "signatures-defaults.ini");
  if (fs.existsSync(defaultsPath)) {
    config = ini.parse(fs.readFileSync(defaultsPath, "utf-8"));
  }

  // Override with specific customizations (property by property)
  const customizationsPath = path.join("specific", "signatures-customizations.ini");
  if (fs.existsSync(customizationsPath)) {
    const customConfig: any = ini.parse(fs.readFileSync(customizationsPath, "utf-8"));
    
    // Merge root level properties
    Object.keys(customConfig).forEach(key => {
      if (typeof customConfig[key] === 'object' && config[key]) {
        // Merge section properties (like [db])
        config[key] = { ...config[key], ...customConfig[key] };
      } else {
        // Override root properties
        config[key] = customConfig[key];
      }
    });
  }

  return config;
}

var config: any = loadConfiguration();

// Crear un nuevo objeto de servicio
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

svc.on("uninstall", function () {});

if (process.argv.includes("add")) {
  svc.install();
} else if (process.argv.includes("del")) {
  svc.uninstall();
} else {
  console.log("Debe especificar add o del");
}
