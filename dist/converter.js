"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertPgerdToDrawIo = void 0;
const jstoxml_1 = require("jstoxml");
const xml_generation_1 = require("./xml-generation");
const layout_graph_1 = require("./layout-graph");
// pgAdmin renders every ERD table at this fixed width (TABLE_WIDTH in pgAdmin's TableNode.jsx)
const DEFAULT_TABLE_WIDTH = 180;
function convertPgerdToDrawIo(pgDiagram, options = {}) {
    var _a;
    const diagramNodesLayer = pgDiagram.data.layers.find((layer) => layer.type === 'diagram-nodes');
    if (diagramNodesLayer === undefined) {
        throw new Error('No diagram nodes found');
    }
    else {
        const diagramNodes = Object.values(diagramNodesLayer.models);
        const tableWidth = (_a = options.tableWidth) !== null && _a !== void 0 ? _a : DEFAULT_TABLE_WIDTH;
        let nodePositions;
        if (options.regenerateLayout === true) {
            // derive the graph edges from the foreign key metadata, the diagram-links layer of
            // the pgerd file is only cached view state and can miss links
            const foreignKeyEdges = diagramNodes.flatMap((node) => node.otherInfo.data.foreign_key.flatMap((foreignKey) => foreignKey.columns.map((fkColumn) => ({
                source: node.id,
                target: fkColumn.references,
            }))));
            nodePositions = (0, layout_graph_1.getGraphLayout)(diagramNodes, foreignKeyEdges, tableWidth);
        }
        else {
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
        const diagramXml = (0, xml_generation_1.generateDrawIoDiagramXml)(diagramNodesLayer, nodePositions, tableWidth, options.hideSchema === true);
        return '<?xml version="1.0" encoding="UTF-8"?>' + (0, jstoxml_1.toXML)(diagramXml, { indent: '    ' });
    }
}
exports.convertPgerdToDrawIo = convertPgerdToDrawIo;
