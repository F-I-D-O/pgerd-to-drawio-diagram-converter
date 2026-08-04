import { type DiagramNodesLayer, type PgErdDiagramInfo } from './pgerd.types';
import { toXML, type XmlElement } from 'jstoxml';
import { generateDrawIoDiagramXml } from './xml-generation';
import { getGraphLayout, type NodePositions } from './layout-graph';

// pgAdmin renders every ERD table at this fixed width (TABLE_WIDTH in pgAdmin's TableNode.jsx)
const DEFAULT_TABLE_WIDTH = 180;

export interface ConvertPgerdToDrawIoOptions {
	/**
	 * When true, node positions are regenerated using an automatic graph layout algorithm.
	 * By default the positions from the pgerd file are preserved.
	 */
	regenerateLayout?: boolean;
	/**
	 * Width of the generated draw.io tables in pixels.
	 * Defaults to 180, the fixed table width used by pgAdmin.
	 */
	tableWidth?: number;
	/**
	 * When true, table headers show only the table name without the schema prefix.
	 */
	hideSchema?: boolean;
}

export function convertPgerdToDrawIo(
	pgDiagram: PgErdDiagramInfo,
	options: ConvertPgerdToDrawIoOptions = {}
): string {
	const diagramNodesLayer: DiagramNodesLayer | undefined = pgDiagram.data.layers.find(
		(layer) => layer.type === 'diagram-nodes'
	) as DiagramNodesLayer | undefined;

	if (diagramNodesLayer === undefined) {
		throw new Error('No diagram nodes found');
	} else {
		const diagramNodes = Object.values(diagramNodesLayer.models);
		const tableWidth = options.tableWidth ?? DEFAULT_TABLE_WIDTH;

		let nodePositions: NodePositions;
		if (options.regenerateLayout === true) {
			// derive the graph edges from the foreign key metadata, the diagram-links layer of
			// the pgerd file is only cached view state and can miss links
			const foreignKeyEdges = diagramNodes.flatMap((node) =>
				node.otherInfo.data.foreign_key.flatMap((foreignKey) =>
					foreignKey.columns.map((fkColumn) => ({
						source: node.id,
						target: fkColumn.references,
					}))
				)
			);
			nodePositions = getGraphLayout(diagramNodes, foreignKeyEdges, tableWidth);
		} else {
			nodePositions = {};
			diagramNodes.forEach((node) => {
				nodePositions[node.otherInfo.data.schema + '.' + node.otherInfo.data.name] = {
					x: node.x,
					y: node.y,
				};
			});
		}

		// normalize the positions so the diagram starts near the origin, otherwise it can end up
		// far away on a huge canvas (pgAdmin diagrams are often drawn at large coordinate offsets)
		const positionValues = Object.values(nodePositions);
		if (positionValues.length > 0) {
			const margin = 20;
			const offsetX = Math.min(...positionValues.map((position) => position.x)) - margin;
			const offsetY = Math.min(...positionValues.map((position) => position.y)) - margin;
			positionValues.forEach((position) => {
				position.x -= offsetX;
				position.y -= offsetY;
			});
		}

		const diagramXml: XmlElement = generateDrawIoDiagramXml(
			diagramNodesLayer,
			nodePositions,
			tableWidth,
			options.hideSchema === true
		);

		return '<?xml version="1.0" encoding="UTF-8"?>' + toXML(diagramXml, { indent: '    ' });
	}
}
