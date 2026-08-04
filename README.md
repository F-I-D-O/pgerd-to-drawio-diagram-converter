# pgerd-to-drawio-diagram-converter

![https://github.com/bertyhell/pgerd-to-drawio-diagram-converter/blob/main/images/hero.jpg](images/hero.jpg)

Try it out on: https://bertyhell.github.io/pgerd-to-drawio-diagram-converter

![https://github.com/bertyhell/pgerd-to-drawio-diagram-converter/blob/main/images/manual.jpg](images/manual.jpg)

## Command line interface

Convert a file directly from the terminal without writing any code:

```shell
npx pgerd-to-drawio-diagram-converter ./diagram.pgerd
```

This writes the converted diagram next to the input file as `./diagram.drawio.xml`.
Use `-o` / `--output` to pick a different output path:

```shell
npx pgerd-to-drawio-diagram-converter ./diagram.pgerd -o ./exports/diagram.drawio.xml
```

Connections are drawn as orthogonal (right-angle) lines that are routed through the space
between the tables, from the referenced column row to the foreign key column row. By default
the node positions from the pgerd file are preserved. Pass `-l` / `--layout` to regenerate the
positions using an automatic graph layout algorithm instead:

```shell
npx pgerd-to-drawio-diagram-converter ./diagram.pgerd --layout
```

Tables are rendered 180 pixels wide, matching the fixed table width used by pgAdmin.
Pass `-w` / `--table-width` to use a different width (long column texts are clipped when
they don't fit):

```shell
npx pgerd-to-drawio-diagram-converter ./diagram.pgerd --table-width 300
```

Table headers show the schema-qualified name (e.g. `public.users`). Pass `-n` / `--no-schema`
to show only the table name:

```shell
npx pgerd-to-drawio-diagram-converter ./diagram.pgerd --no-schema
```

If you install the package (globally or as a dependency), the command is also available as `pgerd-to-drawio`:

```shell
npm install -g pgerd-to-drawio-diagram-converter
pgerd-to-drawio ./diagram.pgerd
```

## Programmatic interface

Installation:

```shell
npm install pgerd-to-drawio-diagram-converter
```



Use inside node:

```javascript
import {convertPgerdToDrawIo} from 'pgerd-to-drawio-diagram-converter';
import * as fs from "fs";

// Read the pgerd file as a string
const pgerdJsonString = fs.readFileSync('./diagram.pgerd').toString('utf-8');

// Interpret the string as json
const pgerdJson = JSON.parse(pgerdJsonString);

// Convert the json diagram info to a draw io xml format
// Options (both optional):
//   regenerateLayout: regenerate node positions with an automatic graph layout algorithm
//                     (default: preserve the positions from the pgerd file)
//   tableWidth:       width of the generated tables in pixels
//                     (default: 180, the fixed table width used by pgAdmin)
//   hideSchema:       show only the table name in table headers, without the schema prefix
const drawIoXmlString = convertPgerdToDrawIo(pgerdJson);

// Write the xml string to an xml file
fs.writeFileSync('./diagram.drawio.xml', drawIoXmlString);
```



Use inside a browser:

```javascript
import { saveAs } from 'file-saver';

const pgerdDiagramJson: PgErdDiagramInfo = JSON.parse(pgerdJsonString);
const drawIoXml = convertPgerdToDrawIo(pgerdDiagramJson);

const blob = new Blob([drawIoXml], { type: 'text/xml;charset=utf-8' });
saveAs(blob, 'diagram.drawio.xml');
```



React example:

[App.tsx](demo/src/App.tsx)
