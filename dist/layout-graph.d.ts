import { type DiagramLink, type DiagramNode } from './pgerd.types';
export type NodePositions = Record<string, {
    x: number;
    y: number;
}>;
export declare function getGraphLayout(diagramNodes: DiagramNode[], diagramLinks: DiagramLink[]): NodePositions;
