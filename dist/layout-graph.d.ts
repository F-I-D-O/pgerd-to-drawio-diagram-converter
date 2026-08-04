import { type DiagramNode } from './pgerd.types';
export type NodePositions = Record<string, {
    x: number;
    y: number;
}>;
export declare function getGraphLayout(diagramNodes: DiagramNode[], diagramLinks: Array<{
    source: string;
    target: string;
}>, tableWidth: number): NodePositions;
