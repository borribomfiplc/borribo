import packageJson from "../../package.json";

const versionParts = String(packageJson.version || "1.0.0").split(".");

export const APP_VERSION = String(packageJson.version || "1.0.0");
export const APP_VERSION_LABEL = `v${versionParts.at(-1) || "0"}`;
export const COPYRIGHT_YEAR = new Date().getFullYear();
