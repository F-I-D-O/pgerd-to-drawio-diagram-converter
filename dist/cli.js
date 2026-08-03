#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const converter_1 = require("./converter");
const HELP = `Convert a PgAdmin ERD diagram (.pgerd) to a draw.io (diagrams.net) XML file.

Usage:
  pgerd-to-drawio <input.pgerd> [options]

Options:
  -o, --output <file>   Path of the output xml file
                        (default: input path with the extension replaced by .drawio.xml)
  -h, --help            Show this help message
  -v, --version         Show the version number
`;
function fail(message) {
    process.stderr.write(message + '\n');
    process.exit(1);
}
function getVersion() {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
}
function parseArgs(argv) {
    let inputPath;
    let outputPath;
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '-h' || arg === '--help') {
            process.stdout.write(HELP);
            process.exit(0);
        }
        else if (arg === '-v' || arg === '--version') {
            process.stdout.write(getVersion() + '\n');
            process.exit(0);
        }
        else if (arg === '-o' || arg === '--output') {
            outputPath = argv[++i];
            if (outputPath === undefined) {
                fail(`Missing value for ${arg}`);
            }
        }
        else if (arg.startsWith('-')) {
            fail(`Unknown option: ${arg}\n\n${HELP}`);
        }
        else if (inputPath === undefined) {
            inputPath = arg;
        }
        else {
            fail(`Unexpected argument: ${arg}\n\n${HELP}`);
        }
    }
    if (inputPath === undefined) {
        fail(`Missing input file\n\n${HELP}`);
    }
    if (outputPath === undefined) {
        const extension = path.extname(inputPath);
        outputPath = inputPath.slice(0, inputPath.length - extension.length) + '.drawio.xml';
    }
    return { inputPath, outputPath };
}
function main() {
    const { inputPath, outputPath } = parseArgs(process.argv.slice(2));
    const pgerdJsonString = fs.readFileSync(inputPath, 'utf-8');
    const pgerdJson = JSON.parse(pgerdJsonString);
    const drawIoXmlString = (0, converter_1.convertPgerdToDrawIo)(pgerdJson);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, drawIoXmlString);
    process.stdout.write(`Written ${outputPath}\n`);
    // The headless cytoscape instance created during layouting keeps the node
    // event loop alive, so exit explicitly once the output file is written
    process.exit(0);
}
main();
