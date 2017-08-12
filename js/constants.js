/**
 * @type {Object.<string, string>}
 */
var GRAPH_VERSIONS = {
    MERGED: 'MERGED',
    PERMANENT: 'PERMANENT',
    DIFF_MINUS: 'DIFF_MINUS',
    DIFF_PLUS: 'DIFF_PLUS'
};

/**
 * @type {Object.<string, string>}
 */
var EDGE_DIRECTIONS = {
    FORWARD: 'FORWARD',
    BACKWARD: 'BACKWARD'
};

/**
 * @type {Object.<string, string>}
 */
var ASCII_ARROW = {
    FORWARD: '------>',
    BACKWARD: '<------'
};

/**
 * @type {Object.<string, string>}
 */
var SYMBOLS = {
    MERGED: 'N',
    PERMANENT: 'C',
    DIFF_MINUS: '&Delta;',
    DIFF_PLUS: '&Delta;'
};

/**
 * @type {Object.<string, string>}
 */
var FILTER_TYPES = {
    EDGE_TYPE: 'edgeType',
    FROM_VERTEX_TYPE: 'fromVertexType',
    TO_VERTEX_TYPE: 'toVertexType'
};

var QUERY_RESPONSE_TYPES = {
    SUBGRAPHS: 'SUBGRAPHS',
    TUPLES: 'TUPLES',
    MESSAGE: 'MESSAGE',
}

var UI_TABS = {
    TABULAR: 'TABULAR',
    GRAPHICAL: 'GRAPHICAL',
    RAW: 'RAW',
    EXPLAIN: 'EXPLAIN',
}
