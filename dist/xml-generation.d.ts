import { type DiagramNodesLayer } from './pgerd.types';
import { type XmlElement } from 'jstoxml';
import { type NodePositions } from './layout-graph';
export declare function generateDrawIoDiagramXml(diagramNodesLayer: DiagramNodesLayer, nodePositions: NodePositions, tableWidth: number, hideSchema: boolean): XmlElement;
