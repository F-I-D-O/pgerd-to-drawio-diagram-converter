"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDrawIoDiagramXml = void 0;
const uuid_1 = require("uuid");
const tableHeaderHeight = 45;
const tableRowHeight = 30;
const tableKeyCellWidth = 30;
function generateTable(table, position, tableWidth, hideSchema) {
    return [
        {
            _name: 'mxCell',
            _attrs: {
                id: table.otherInfo.data.schema + '.' + table.otherInfo.data.name,
                value: hideSchema
                    ? table.otherInfo.data.name
                    : table.otherInfo.data.schema + '.' + table.otherInfo.data.name,
                style: `shape=table;startSize=${tableRowHeight};container=1;collapsible=1;childLayout=tableLayout;fixedRows=1;rowLines=0;fontStyle=1;align=center;resizeLast=1;fillColor=#dae8fc;strokeColor=#6c8ebf;rounded=1;swimlaneLine=1;bottom=1;`,
                parent: '1',
                vertex: '1',
            },
            _content: [
                {
                    _name: 'mxGeometry',
                    _attrs: {
                        x: position.x,
                        y: position.y,
                        width: tableWidth,
                        height: table.otherInfo.data.columns.length * tableRowHeight + tableHeaderHeight,
                        as: 'geometry',
                    },
                },
            ],
        },
        ...table.otherInfo.data.columns.flatMap((column, columnIndex) => generateRow(column, columnIndex, table, tableWidth)),
    ];
}
function generateRow(column, columnIndex, table, tableWidth) {
    const rowId = `${table.otherInfo.data.schema}.${table.otherInfo.data.name}.${column.attnum}`;
    return [
        {
            _name: 'mxCell',
            _attrs: {
                id: rowId,
                value: '',
                style: 'shape=partialRectangle;collapsible=0;dropTarget=0;pointerEvents=0;fillColor=none;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;top=0;left=0;right=0;bottom=1;',
                parent: table.otherInfo.data.schema + '.' + table.otherInfo.data.name,
                vertex: '1',
            },
            _content: [
                {
                    _name: 'mxGeometry',
                    _attrs: {
                        y: String(tableRowHeight * columnIndex + tableRowHeight),
                        width: tableWidth,
                        height: tableRowHeight,
                        as: 'geometry',
                    },
                },
            ],
        },
        {
            _name: 'mxCell',
            _attrs: {
                id: (0, uuid_1.v4)(),
                value: column.is_pk ? 'PK' : column.is_fk ? 'FK' : '',
                style: 'shape=partialRectangle;overflow=hidden;connectable=0;fillColor=none;top=0;left=0;bottom=0;right=0;fontStyle=1;',
                parent: rowId,
                vertex: '1',
            },
            _content: [
                {
                    _name: 'mxGeometry',
                    _attrs: {
                        width: tableKeyCellWidth,
                        height: tableRowHeight,
                        as: 'geometry',
                    },
                },
            ],
        },
        {
            _name: 'mxCell',
            _attrs: {
                id: (0, uuid_1.v4)(),
                value: column.name +
                    ' ' +
                    column.typname +
                    ' ' +
                    (column.attnotnull ? 'NOT NULL' : ''),
                style: 'shape=partialRectangle;overflow=hidden;connectable=0;fillColor=none;top=0;left=0;bottom=0;right=0;align=left;spacingLeft=6;',
                parent: rowId,
                vertex: '1',
            },
            _content: [
                {
                    _name: 'mxGeometry',
                    _attrs: {
                        x: tableKeyCellWidth,
                        width: tableWidth - tableKeyCellWidth,
                        height: tableRowHeight,
                        as: 'geometry',
                    },
                },
            ],
        },
    ];
}
function getRowCenterY(tablePosition, rowIndex) {
    // rows start below the table header (which is one row high, see startSize in generateTable)
    return tablePosition.y + tableRowHeight + rowIndex * tableRowHeight + tableRowHeight / 2;
}
function countHorizontalSegmentCrossings(y, xStart, xEnd, obstacles) {
    const low = Math.min(xStart, xEnd);
    const high = Math.max(xStart, xEnd);
    // strict inequalities, so a segment touching a table edge (attachment point) does not count
    return obstacles.filter((obstacle) => obstacle.y < y && y < obstacle.bottom && Math.max(low, obstacle.x) < Math.min(high, obstacle.right)).length;
}
function countVerticalSegmentCrossings(x, yStart, yEnd, obstacles) {
    const low = Math.min(yStart, yEnd);
    const high = Math.max(yStart, yEnd);
    return obstacles.filter((obstacle) => obstacle.x < x && x < obstacle.right && Math.max(low, obstacle.y) < Math.min(high, obstacle.bottom)).length;
}
// segments running alongside a table closer than the clearance margin are not crossings, but
// should keep a buffer distance whenever a free channel exists; returns the violation in pixels
function verticalSegmentClearanceViolation(x, yStart, yEnd, obstacles, clearanceMargin) {
    const low = Math.min(yStart, yEnd);
    const high = Math.max(yStart, yEnd);
    let violation = 0;
    for (const obstacle of obstacles) {
        if (Math.max(low, obstacle.y) >= Math.min(high, obstacle.bottom)) {
            continue;
        }
        if (obstacle.x < x && x < obstacle.right) {
            continue; // running through the table is a crossing, counted separately
        }
        const distance = x <= obstacle.x ? obstacle.x - x : x - obstacle.right;
        violation += Math.max(0, clearanceMargin - distance);
    }
    return violation;
}
function horizontalSegmentClearanceViolation(y, xStart, xEnd, obstacles, clearanceMargin) {
    const low = Math.min(xStart, xEnd);
    const high = Math.max(xStart, xEnd);
    let violation = 0;
    for (const obstacle of obstacles) {
        if (Math.max(low, obstacle.x) >= Math.min(high, obstacle.right)) {
            continue;
        }
        if (obstacle.y < y && y < obstacle.bottom) {
            continue; // running through the table is a crossing, counted separately
        }
        const distance = y <= obstacle.y ? obstacle.y - y : y - obstacle.bottom;
        violation += Math.max(0, clearanceMargin - distance);
    }
    return violation;
}
/**
 * Finds an orthogonal route between two table rows that crosses as few tables as possible
 * (zero whenever the diagram allows it), using Dijkstra over the grid formed by the channels
 * next to each table edge. Crossing a table dominates the cost, then path length, then bends.
 */
function routeLink(sourcePosition, targetPosition, sourceRowY, targetRowY, tableWidth, obstacles) {
    const channelMargin = 20;
    const bendCost = 30;
    const crossingCost = 10000000;
    // keep a buffer between lines and the tables they pass by
    const clearanceMargin = 10;
    const clearanceCostPerPixel = 100;
    // keep bends away from the attachment points, so the ER cardinality symbols stay readable
    const stubMargin = 25;
    const stubViolationCostPerPixel = 20;
    const sourceLeftX = sourcePosition.x;
    const sourceRightX = sourcePosition.x + tableWidth;
    const targetLeftX = targetPosition.x;
    const targetRightX = targetPosition.x + tableWidth;
    const xValues = new Set([sourceLeftX, sourceRightX, targetLeftX, targetRightX]);
    const yValues = new Set([sourceRowY, targetRowY]);
    for (const obstacle of obstacles) {
        xValues.add(obstacle.x - channelMargin);
        xValues.add(obstacle.right + channelMargin);
        yValues.add(obstacle.y - channelMargin);
        yValues.add(obstacle.bottom + channelMargin);
    }
    // midpoint of the gap between the two tables, for nicer routes in the common case
    if (sourceRightX < targetLeftX) {
        xValues.add((sourceRightX + targetLeftX) / 2);
    }
    else if (targetRightX < sourceLeftX) {
        xValues.add((targetRightX + sourceLeftX) / 2);
    }
    // columns at exactly the minimal stub distance from the attachment edges
    xValues.add(sourceLeftX - stubMargin);
    xValues.add(sourceRightX + stubMargin);
    xValues.add(targetLeftX - stubMargin);
    xValues.add(targetRightX + stubMargin);
    // midpoint channels inside narrow gaps between tables, where the regular channels of one
    // table would run too close along the other table
    for (const a of obstacles) {
        for (const b of obstacles) {
            const xGap = b.x - a.right;
            if (xGap > 0 && xGap < 2 * channelMargin) {
                xValues.add(a.right + xGap / 2);
            }
            const yGap = b.y - a.bottom;
            if (yGap > 0 && yGap < 2 * channelMargin) {
                yValues.add(a.bottom + yGap / 2);
            }
        }
    }
    const xs = Array.from(xValues).sort((a, b) => a - b);
    const ys = Array.from(yValues).sort((a, b) => a - b);
    const xCount = xs.length;
    // node = grid intersection + direction of the segment used to arrive (0 horizontal, 1 vertical)
    const nodeId = (xIndex, yIndex, direction) => (yIndex * xCount + xIndex) * 2 + direction;
    const distances = new Float64Array(xs.length * ys.length * 2).fill(Infinity);
    const previous = new Int32Array(xs.length * ys.length * 2).fill(-1);
    // binary min-heap of [cost, nodeId]
    const heap = [];
    const heapPush = (entry) => {
        heap.push(entry);
        let index = heap.length - 1;
        while (index > 0) {
            const parent = (index - 1) >> 1;
            if (heap[parent][0] <= heap[index][0]) {
                break;
            }
            [heap[parent], heap[index]] = [heap[index], heap[parent]];
            index = parent;
        }
    };
    const heapPop = () => {
        const top = heap[0];
        const last = heap.pop();
        if (heap.length > 0) {
            heap[0] = last;
            let index = 0;
            for (;;) {
                const left = index * 2 + 1;
                const right = left + 1;
                let smallest = index;
                if (left < heap.length && heap[left][0] < heap[smallest][0]) {
                    smallest = left;
                }
                if (right < heap.length && heap[right][0] < heap[smallest][0]) {
                    smallest = right;
                }
                if (smallest === index) {
                    break;
                }
                [heap[smallest], heap[index]] = [heap[index], heap[smallest]];
                index = smallest;
            }
        }
        return top;
    };
    const sourceYIndex = ys.indexOf(sourceRowY);
    const targetYIndex = ys.indexOf(targetRowY);
    // the connection leaves the source row horizontally, from either the left or the right edge
    for (const startX of [sourceLeftX, sourceRightX]) {
        const startId = nodeId(xs.indexOf(startX), sourceYIndex, 0);
        distances[startId] = 0;
        heapPush([0, startId]);
    }
    // ...and enters the target row horizontally, at either the left or the right edge
    const endIds = [targetLeftX, targetRightX].map((endX) => nodeId(xs.indexOf(endX), targetYIndex, 0));
    while (heap.length > 0) {
        const [cost, currentId] = heapPop();
        if (cost > distances[currentId]) {
            continue;
        }
        if (endIds.includes(currentId)) {
            break;
        }
        const direction = currentId % 2;
        const xIndex = (currentId >> 1) % xCount;
        const yIndex = ((currentId >> 1) - xIndex) / xCount;
        for (const [xStep, yStep] of [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ]) {
            const nextXIndex = xIndex + xStep;
            const nextYIndex = yIndex + yStep;
            if (nextXIndex < 0 || nextXIndex >= xs.length || nextYIndex < 0 || nextYIndex >= ys.length) {
                continue;
            }
            const nextDirection = yStep === 0 ? 0 : 1;
            const segmentCrossings = nextDirection === 0
                ? countHorizontalSegmentCrossings(ys[yIndex], xs[xIndex], xs[nextXIndex], obstacles)
                : countVerticalSegmentCrossings(xs[xIndex], ys[yIndex], ys[nextYIndex], obstacles);
            const clearanceViolation = nextDirection === 0
                ? horizontalSegmentClearanceViolation(ys[yIndex], xs[xIndex], xs[nextXIndex], obstacles, clearanceMargin)
                : verticalSegmentClearanceViolation(xs[xIndex], ys[yIndex], ys[nextYIndex], obstacles, clearanceMargin);
            let stubViolation = 0;
            if (nextDirection === 1) {
                const x = xs[xIndex];
                const lowY = Math.min(ys[yIndex], ys[nextYIndex]);
                const highY = Math.max(ys[yIndex], ys[nextYIndex]);
                if (lowY <= sourceRowY && sourceRowY <= highY) {
                    const distance = Math.min(Math.abs(x - sourceLeftX), Math.abs(x - sourceRightX));
                    stubViolation += Math.max(0, stubMargin - distance);
                }
                if (lowY <= targetRowY && targetRowY <= highY) {
                    const distance = Math.min(Math.abs(x - targetLeftX), Math.abs(x - targetRightX));
                    stubViolation += Math.max(0, stubMargin - distance);
                }
            }
            const segmentLength = nextDirection === 0
                ? Math.abs(xs[nextXIndex] - xs[xIndex])
                : Math.abs(ys[nextYIndex] - ys[yIndex]);
            const nextCost = cost +
                segmentLength +
                (direction === nextDirection ? 0 : bendCost) +
                stubViolation * stubViolationCostPerPixel +
                clearanceViolation * clearanceCostPerPixel +
                segmentCrossings * crossingCost;
            const nextId = nodeId(nextXIndex, nextYIndex, nextDirection);
            if (nextCost < distances[nextId]) {
                distances[nextId] = nextCost;
                previous[nextId] = currentId;
                heapPush([nextCost, nextId]);
            }
        }
    }
    const endId = distances[endIds[0]] <= distances[endIds[1]] ? endIds[0] : endIds[1];
    const entryX = endId === endIds[0] ? 0 : 1;
    // walk back to the start to collect the grid points of the route
    const pathPoints = [];
    let walkId = endId;
    while (walkId !== -1) {
        const xIndex = (walkId >> 1) % xCount;
        const yIndex = ((walkId >> 1) - xIndex) / xCount;
        pathPoints.unshift({ x: xs[xIndex], y: ys[yIndex] });
        walkId = previous[walkId];
    }
    const exitX = pathPoints[0].x === sourceRightX ? 1 : 0;
    // drop collinear points; the remaining interior points are the bends
    const waypoints = pathPoints.filter((point, index) => {
        if (index === 0 || index === pathPoints.length - 1) {
            return false;
        }
        const before = pathPoints[index - 1];
        const after = pathPoints[index + 1];
        return !((before.x === point.x && point.x === after.x) ||
            (before.y === point.y && point.y === after.y));
    });
    return { exitX, entryX, waypoints };
}
function generateLink(localTable, fkColumn, tableNodes, tablesByQualifiedName, nodePositions, tableWidth, obstacles) {
    var _a, _b;
    // The referenced table is the "one" side (edge source), the FK table the "many" side.
    // Depending on the pgAdmin version, fkColumn.references holds the node uid of the
    // referenced table, or the table has to be found via references_table_name ("(schema) name")
    const referencedNameMatch = /^\((.+)\) (.+)$/.exec((_a = fkColumn.references_table_name) !== null && _a !== void 0 ? _a : '');
    const sourceTable = (_b = tableNodes[fkColumn.references]) !== null && _b !== void 0 ? _b : (referencedNameMatch !== null
        ? tablesByQualifiedName[referencedNameMatch[1] + '.' + referencedNameMatch[2]]
        : undefined);
    const targetTable = localTable;
    if (sourceTable === undefined) {
        console.warn(`failed to find the table referenced by foreign key column ${targetTable.otherInfo.data.name}.${fkColumn.local_column}: ${fkColumn.references_table_name} (${fkColumn.references})`);
        return [];
    }
    const sourceTableId = sourceTable.otherInfo.data.schema + '.' + sourceTable.otherInfo.data.name;
    const targetTableId = targetTable.otherInfo.data.schema + '.' + targetTable.otherInfo.data.name;
    const sourceRowIndex = sourceTable.otherInfo.data.columns.findIndex((column) => column.name === fkColumn.referenced);
    const targetRowIndex = targetTable.otherInfo.data.columns.findIndex((column) => column.name === fkColumn.local_column);
    if (sourceRowIndex === -1 || targetRowIndex === -1) {
        console.warn(`failed to find link between: ${sourceTableId}.${fkColumn.referenced} => ${targetTableId}.${fkColumn.local_column}`);
        return [];
    }
    const sourceRowAttnum = sourceTable.otherInfo.data.columns[sourceRowIndex].attnum;
    const targetRowAttnum = targetTable.otherInfo.data.columns[targetRowIndex].attnum;
    const sourcePosition = nodePositions[sourceTableId];
    const targetPosition = nodePositions[targetTableId];
    const sourceRowY = getRowCenterY(sourcePosition, sourceRowIndex);
    const targetRowY = getRowCenterY(targetPosition, targetRowIndex);
    const { exitX, entryX, waypoints } = routeLink(sourcePosition, targetPosition, sourceRowY, targetRowY, tableWidth, obstacles);
    return [
        {
            _name: 'mxCell',
            _attrs: {
                id: (0, uuid_1.v4)(),
                value: '',
                style: `edgeStyle=orthogonalEdgeStyle;rounded=0;exitX=${exitX};exitY=0.5;exitDx=0;exitDy=0;entryX=${entryX};entryY=0.5;entryDx=0;entryDy=0;endArrow=ERzeroToMany;startArrow=ERone;endFill=1;startFill=0;`,
                parent: '1',
                source: `${sourceTableId}.${sourceRowAttnum}`,
                target: `${targetTableId}.${targetRowAttnum}`,
                edge: '1',
            },
            _content: [
                Object.assign({ _name: 'mxGeometry', _attrs: {
                        width: '100',
                        height: '100',
                        relative: '1',
                        as: 'geometry',
                    } }, (waypoints.length > 0
                    ? {
                        _content: [
                            {
                                _name: 'Array',
                                _attrs: {
                                    as: 'points',
                                },
                                _content: waypoints.map((point) => ({
                                    _name: 'mxPoint',
                                    _attrs: {
                                        x: point.x,
                                        y: point.y,
                                    },
                                })),
                            },
                        ],
                    }
                    : {})),
            ],
        },
    ];
}
function generateDrawIoDiagramXml(diagramNodesLayer, nodePositions, tableWidth, hideSchema) {
    const tableDiagrams = Object.values(diagramNodesLayer.models);
    const tables = tableDiagrams.flatMap((table) => {
        return generateTable(table, nodePositions[table.otherInfo.data.schema + '.' + table.otherInfo.data.name], tableWidth, hideSchema);
    });
    const obstacles = tableDiagrams.map((table) => {
        const position = nodePositions[table.otherInfo.data.schema + '.' + table.otherInfo.data.name];
        return {
            x: position.x,
            y: position.y,
            right: position.x + tableWidth,
            bottom: position.y +
                table.otherInfo.data.columns.length * tableRowHeight +
                tableHeaderHeight,
        };
    });
    // connections are derived from the foreign key metadata of the tables; the diagram-links
    // layer of the pgerd file is only cached view state and can miss links (pgAdmin itself
    // rebuilds the connections from the foreign keys when loading a diagram)
    const tablesByQualifiedName = {};
    tableDiagrams.forEach((table) => {
        tablesByQualifiedName[table.otherInfo.data.schema + '.' + table.otherInfo.data.name] = table;
    });
    const links = tableDiagrams.flatMap((table) => table.otherInfo.data.foreign_key.flatMap((foreignKey) => foreignKey.columns.flatMap((fkColumn) => generateLink(table, fkColumn, diagramNodesLayer.models, tablesByQualifiedName, nodePositions, tableWidth, obstacles))));
    return {
        _name: 'mxfile',
        _attrs: {
            host: 'app.diagrams.net',
            modified: new Date().toISOString(),
            agent: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
            etag: 'xz4sYTl0PLk-L4-nLoLk',
            version: '26.2.2',
            type: 'google',
        },
        _content: {
            _name: 'diagram',
            _attrs: {
                id: 'R2lEEEUBdFMjLlhIrx00',
                name: 'Page-1',
            },
            _content: {
                _name: 'mxGraphModel',
                _attrs: {
                    grid: '1',
                    gridSize: '10',
                    guides: '1',
                    tooltips: '1',
                    connect: '1',
                    arrows: '1',
                    fold: '1',
                    page: '1',
                    pageScale: '1',
                    math: '0',
                    shadow: '0',
                    extFonts: 'Permanent Marker^https://fonts.googleapis.com/css?family=Permanent+Marker',
                },
                _content: {
                    _name: 'root',
                    _content: [
                        {
                            _name: 'mxCell',
                            _attrs: {
                                id: '0',
                            },
                        },
                        {
                            _name: 'mxCell',
                            _attrs: {
                                id: '1',
                                parent: '0',
                            },
                        },
                        ...tables,
                        ...links,
                    ],
                },
            },
        },
    };
}
exports.generateDrawIoDiagramXml = generateDrawIoDiagramXml;
