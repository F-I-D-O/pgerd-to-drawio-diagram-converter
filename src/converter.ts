import {
	type DiagramLinksLayer,
	type DiagramNodesLayer,
	type PgErdDiagramInfo,
} from './pgerd.types';
import { toXML, type XmlElement } from 'jstoxml';
import { generateDrawIoDiagramXml } from './xml-generation';
import { getGraphLayout, type NodePositions } from './layout-graph';

export interface ConvertPgerdToDrawIoOptions {
	/**
	 * When true, node positions are regenerated using an automatic graph layout algorithm.
	 * By default the positions from the pgerd file are preserved.
	 */
	regenerateLayout?: boolean;
}

export function convertPgerdToDrawIo(
	pgDiagram: PgErdDiagramInfo,
	options: ConvertPgerdToDrawIoOptions = {}
): string {
	const diagramNodesLayer: DiagramNodesLayer | undefined = pgDiagram.data.layers.find(
		(layer) => layer.type === 'diagram-nodes'
	) as DiagramNodesLayer | undefined;

	const diagramLinksLayer: DiagramLinksLayer | undefined = pgDiagram.data.layers.find(
		(layer) => layer.type === 'diagram-links'
	) as DiagramLinksLayer | undefined;

	if (diagramNodesLayer === undefined) {
		throw new Error('No diagram nodes found');
	} else {
		const diagramNodes = Object.values(diagramNodesLayer.models);

		let nodePositions: NodePositions;
		if (options.regenerateLayout === true) {
			nodePositions = getGraphLayout(
				diagramNodes,
				Object.values(diagramLinksLayer?.models ?? {})
			);
		} else {
			nodePositions = {};
			diagramNodes.forEach((node) => {
				nodePositions[node.otherInfo.data.schema + '.' + node.otherInfo.data.name] = {
					x: node.x,
					y: node.y,
				};
			});
		}

		const diagramXml: XmlElement = generateDrawIoDiagramXml(
			diagramNodesLayer,
			diagramLinksLayer,
			nodePositions
		);

		return '<?xml version="1.0" encoding="UTF-8"?>' + toXML(diagramXml, { indent: '    ' });
	}
}
