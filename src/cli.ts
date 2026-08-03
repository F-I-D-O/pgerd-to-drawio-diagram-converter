#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { convertPgerdToDrawIo } from './converter';
import { type PgErdDiagramInfo } from './pgerd.types';

const HELP = `Convert a PgAdmin ERD diagram (.pgerd) to a draw.io (diagrams.net) XML file.

Usage:
  pgerd-to-drawio <input.pgerd> [options]

Options:
  -o, --output <file>   Path of the output xml file
                        (default: input path with the extension replaced by .drawio.xml)
  -h, --help            Show this help message
  -v, --version         Show the version number
`;

function fail(message: string): never {
	process.stderr.write(message + '\n');
	process.exit(1);
}

function getVersion(): string {
	const packageJsonPath = path.join(__dirname, '..', 'package.json');
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as { version: string };
	return packageJson.version;
}

function parseArgs(argv: string[]): { inputPath: string; outputPath: string } {
	let inputPath: string | undefined;
	let outputPath: string | undefined;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '-h' || arg === '--help') {
			process.stdout.write(HELP);
			process.exit(0);
		} else if (arg === '-v' || arg === '--version') {
			process.stdout.write(getVersion() + '\n');
			process.exit(0);
		} else if (arg === '-o' || arg === '--output') {
			outputPath = argv[++i];
			if (outputPath === undefined) {
				fail(`Missing value for ${arg}`);
			}
		} else if (arg.startsWith('-')) {
			fail(`Unknown option: ${arg}\n\n${HELP}`);
		} else if (inputPath === undefined) {
			inputPath = arg;
		} else {
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

function main(): void {
	const { inputPath, outputPath } = parseArgs(process.argv.slice(2));

	const pgerdJsonString = fs.readFileSync(inputPath, 'utf-8');
	const pgerdJson = JSON.parse(pgerdJsonString) as PgErdDiagramInfo;
	const drawIoXmlString = convertPgerdToDrawIo(pgerdJson);

	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, drawIoXmlString);
	process.stdout.write(`Written ${outputPath}\n`);

	// The headless cytoscape instance created during layouting keeps the node
	// event loop alive, so exit explicitly once the output file is written
	process.exit(0);
}

main();
