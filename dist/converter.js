"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertPgerdToDrawIo = void 0;
const jstoxml_1 = require("jstoxml");
const xml_generation_1 = require("./xml-generation");
const layout_graph_1 = require("./layout-graph");
function convertPgerdToDrawIo(pgDiagram, options = {}) {
    var _a;
    const diagramNodesLayer = pgDiagram.data.layers.find((layer) => layer.type === 'diagram-nodes');
    const diagramLinksLayer = pgDiagram.data.layers.find((layer) => layer.type === 'diagram-links');
    if (diagramNodesLayer === undefined) {
        throw new Error('No diagram nodes found');
    }
    else {
        const diagramNodes = Object.values(diagramNodesLayer.models);
        let nodePositions;
        if (options.regenerateLayout === true) {
            nodePositions = (0, layout_graph_1.getGraphLayout)(diagramNodes, Object.values((_a = diagramLinksLayer === null || diagramLinksLayer === void 0 ? void 0 : diagramLinksLayer.models) !== null && _a !== void 0 ? _a : {}));
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
        const diagramXml = (0, xml_generation_1.generateDrawIoDiagramXml)(diagramNodesLayer, diagramLinksLayer, nodePositions);
        return '<?xml version="1.0" encoding="UTF-8"?>' + (0, jstoxml_1.toXML)(diagramXml, { indent: '    ' });
    }
}
exports.convertPgerdToDrawIo = convertPgerdToDrawIo;
