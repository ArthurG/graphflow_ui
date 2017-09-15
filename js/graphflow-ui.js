// Global objects
var queryResult = {};
var vertexData = {};
var edgeData = {};

// User actions
$("#query-form").keypress(function (e) {
    var input = $("#query-form textarea").val();
    if(e.which == 13 && !e.shiftKey) {        
        processQuery(input);
        e.preventDefault();
    }
});

function addPropertySection(btn){
   function cloneTemplate(template) {
        return template.clone().removeClass("template").addClass("cloned");
    }
    //Make a new key-value pair form template
    var propTemplate = $(".node-prop-pair.template");
    var cloned = cloneTemplate(propTemplate);

    //Generate unique IDs for fields 
    var idUnique = Math.floor(Math.random()*1000);
    cloned.find("#nodeKey").attr("id", "nodeKey"+idUnique);
    cloned.find("#nodeKeyLabel").attr("id", "nodeKeyLabel"+idUnique)
                                .attr("for", "nodeKey"+idUnique);
    cloned.find("#nodeVal").attr("id", "nodeVal"+idUnique);
    cloned.find("#nodeValLabel").attr("id", "nodeValLabel"+idUnique)
                                .attr("for", "nodeVal"+idUnique);
    //Append the new key-value input fields to the right section
    var relatedSection = $(btn).attr("data-related");
    var divToAddTo = $("#"+relatedSection + "-properties");
    divToAddTo.append(cloned);
}

function addEdge() {
    //Returns an object with the properties required required by the fields
    function getProperties(propertiesSection){
        var children = propertiesSection.children();
        var obj = {};
        for(var i = 0;i<children.size();i++) {
          var child = $(children[i]);
          var key = child.find(".nodeKey").val();
          var val = child.find(".nodeVal").val();
          obj[key] = val;
        }
        return obj;
    }

    //Takes an object and converts it into its string representation as accepted
    //by Graphflow
    function createPropertyString(properties) {
        var answer = "{";
        for(var key in properties) {
            if(key === "") {
                continue;
            }
            answer+=key;
            answer+=':';
            answer+=properties[key];
            answer+=','
        }
        if(answer.length > 1) {
          return answer.slice(0, answer.length-1)+"}";
        } else {
          return "{}";
        }
    }

    //Get the requested properties
    var sourceNodeId = $("#node1Id").val();
    var sourceNodeType = $("#node1Type").val();
    var sourceNodePropElem = $("#node1-properties");
    var sourceProps = getProperties(sourceNodePropElem);

    var destNodeId = $("#node2Id").val();
    var destNodeType = $("#node2Type").val();
    var destNodePropElem = $("#node2-properties");
    var destProps = getProperties(destNodePropElem);

    var edgeType = $("#edgeType").val();
    var edgePropElem = $("#edge-properties");
    var edgeProps = getProperties(edgePropElem);

    //Build up the query
    var query = "CREATE ("+sourceNodeId+":"+sourceNodeType+" " + 
      createPropertyString(sourceProps) +")"+"-[:"+edgeType+" "+
      createPropertyString(edgeProps)+"]->("+destNodeId+":"+destNodeType+" "+
      createPropertyString(destProps)+");";  

    //Run the query
    processQueryNoUpdate(query);
}

function deleteData() {
    //TODO: This is currently not working on Node
    var type = $(".edit-type:first").text();
    var query = "";
    if (type === "Node"){
        var node_id = $("#node-id").text();
        query = "DELETE ("+node_id+");";
    }
    else if (type === "Link"){
        var from_id = $("#from-id").text();
        var to_id = $("#to-id").text();
        var query = "DELETE ("+from_id+")->("+to_id+");";
    }
    processQueryNoUpdate(query);
}

//Handles updating properties of a node or edge
function saveChange() {
    //TODO: This is currently not working
    var newString = $("#node-properties-text").val();

    var query="";
    var type = $(".edit-type:first").text();
    if (type === "Node") {
        var node_id = $("#node-id").text();
        query = "DELETE ("+node_id+")";
    }
    else if (type === "Link") {
        var from_id = $("#from-id").text();
        var to_id = $("#to-id").text();
        var query = "DELETE ("+from_id+")->("+to_id+");";
    }
    console.log("Will run " + query);
    console.log("To update values to be " + newString);
}


// Processing functions

// Runs a query and displays result at the top of the screen
function processQueryNoUpdate(query) {
    warning_box = $("#graphflow-alert");
    warning_box.addClass("hidden");

    function failQuery() {
        warning_box.attr("class", "alert alert-danger col-lg-12");
        warning_box.text("Query has failed!");
    }
    function successDelete() {
        warning_box.attr("class", "alert alert-info col-lg-12");
        warning_box.text("Query sucess! ");
    }

    $.post("http://localhost:8000/query", query, function(data, success, xhr) {
        if (data.is_error) {
            failQuery();
        }
        else {
            successDelete();
        }
    }, "json").fail(failQuery);
}

// Runs a query and displays result in the tabs as needed
function processQuery(inputStr) {
    warning_box = $("#graphflow-alert");
    warning_box.addClass("hidden");
    $.post("http://localhost:8000/query", inputStr, function(data) {
        setRawResults(data);
        if (QUERY_RESPONSE_TYPES.SUBGRAPHS === data.response_type) {
            updateTabs([UI_TABS.TABULAR, UI_TABS.GRAPHICAL, UI_TABS.RAW]);
            setTabularResults(data);
            setDownloadResults(data);
            setGraphicalResults(data);
            vertexData = getVertexData(data);
            edgeData = getEdgeData(data);
        }
        else if (QUERY_RESPONSE_TYPES.TUPLES === data.response_type) {
            setTuplesData(data);
            updateTabs([UI_TABS.TABULAR, UI_TABS.RAW]);
        }
        else if (data["plan"]) {
            renderPlan(data["plan"]);
            updateTabs([UI_TABS.EXPLAIN, UI_TABS.RAW]);
        }
        else if (QUERY_RESPONSE_TYPES.MESSAGE === data.response_type 
            && data.isError) {
            updateTabs([UI_TABS.RAW]);
            warning_box.text(data.message);
            warning_box.attr("class", "alert alert-warning col-lg-12");
            warning_box.removeClass("hidden");
        }
        else {
            updateTabs([UI_TABS.RAW]);
        }
    }, "json").fail(function() {
        warning_box.attr("class", "alert alert-danger col-lg-12");
        warning_box.text("Graphflow server is down!");
    });
}

//Hides the tabs for the result-set
function hideTabs() {
    $(".resultset .result-tab").hide();
}

//Shows the tabs in result-set which are also in tabArr, other tabs are hidden
function updateTabs(tabArr) {
    hideTabs();
    for(var i = 0;i<tabArr.length;i++) {
        var tabCssSelector = "."+tabArr[i].toLowerCase()+"-tab";
        $(tabCssSelector).show();
        if (i === 0) {
            $(tabCssSelector +" a").tab('show');
        }
    }
}

function getVertexData(data) {
    return data.vertices;
}

function getEdgeData(data) {
    return data.edges;
}

// Modify the tabular results if the return message is a string
function setTuplesData(data) {
    updateTable(data.column_names, data.tuples)
}

// Mutates the DOM Tabular View to have headers as headers and dataArr as the
// displayed data
function updateTable(headers, dataArr) {
    function cloneTemplate(template) {
        return template.clone().removeClass("template").attr("class", "cloned");
    }

    //Remove old table data
    $("#query-result-table tbody tr.cloned").remove();
    $("#query-result-table thead tr th.cloned").remove();

    //Set the table data
    var resultTable = $("#query-result-table tbody");

    var header = $("#query-result-table thead tr");
    var headerTemplate = $("#query-result-table thead th.template");
    var rowTemplate = $("#query-result-table tbody tr.template");
    var rowDataTemplate = $("#query-result-table tbody tr td.template");
    var rowCounterTemplate = $("#query-result-table tbody th.template");

    //Setup the headers
    for (var headerName in headers) {
        var headerItem = cloneTemplate(headerTemplate);
        headerItem.text(headerName);
        header.append(headerItem);
    }

    //Setup the data
    for (var i = 0;i<dataArr.length;i++) {
        var newRow = cloneTemplate(rowTemplate);
        var rowCounter = cloneTemplate(rowCounterTemplate);
        rowCounter.text(i+1);
        newRow.append(rowCounter);
        var column = dataArr[i];
        for (var j = 0;j<column.length;j++) {
            var rowDataCell = cloneTemplate(rowDataTemplate);
            rowDataCell.text(JSON.stringify(column[j]));
            newRow.append(rowDataCell);
        }
        resultTable.append(newRow);
    }
}

// Modify the tabular section for subbgraphs query results
function setTabularResults(data) {
    var records = data.subgraphs;
    if (records.length === 0) {
        return
    }

    // Set the updated table headers for this query
    var vertexMap = data.vertex_map;
    var headerStrings = [];

    // Populate the headers for the verticies
    // TODO: No headers are being populated for the edges
    for(var headerName in vertexMap) {
        headerStrings.push(headerName);
    }

    // Populate the records (rows of the table)
    var dataArr = []
    for(var i = 0;i<records.length;i++) {
        var row = [];
        var currRecord = records[i];
        var verticiesToAdd = currRecord.vertices;
        for (var headerName in vertexMap) {
            var subgraph_vertex_idx = vertexMap[headerName];
            var graph_vertex_idx = verticiesToAdd[subgraph_vertex_idx];
            var vertex = data.vertices[graph_vertex_idx];
            row.push(vertex);
        }

        // Populate the edges
        var edgesToAdd = currRecord.edges;
        var edges = data.edges;
        for (var j = 0;j<edgesToAdd.length;j++) {
            // TODO: Should I Populate the entire edge object?
            var subgraph_edge = edges[edgesToAdd[j]];
            row.push(subgraph_edge);
        }
        dataArr.push(row)
    }
    updateTable(headerStrings, dataArr);
}

// Modify the data in the raw results tab
function setRawResults(data) {
    var elem = $("#query-result-raw");
    elem.text(JSON.stringify(data, undefined, 2));
}

// Modify the results for the download button
function setDownloadResults(data) {
    $("#download-btn").attr("href", 
            "data:text/plain;charset=UTF-8," + 
            encodeURIComponent(JSON.stringify(data, undefined, 2)));
    $("#download-btn").attr("download", "query-result.txt");
}

// Modify the results for Graphical results tab
function setGraphicalResults(data) {
    var nodes = [];
    var edges = []; 
    var seenItems = new Set();

    var vertex_data = data.vertices;
    var edge_data = data.edges;

    //Populate the nodes
    for(var i in vertex_data){
        var curr_vertex = vertex_data[i];

        var copiedNode = jQuery.extend({type: curr_vertex.type, id: i}, 
                curr_vertex.properties);
        nodes.push(copiedNode);
    }

    //Populate the edges
    for(var i in edge_data){
        var edge = edge_data[i];

        var copiedEdge = {};
        copiedEdge.id = i;
        copiedEdge.source = edge.from_vertex_id;
        copiedEdge.target = edge.to_vertex_id;
        edges.push(copiedEdge);
    }

    //Render the graph
    var graph = {nodes: nodes, links: edges};
    render(graph);
}

function copyResultToClipboard(elem) {
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val($(elem).text()).select();
    document.execCommand("copy");
    $temp.remove();
}

/* D3 tooltip */
function showToolbarNode(d) {
    var currNode = vertexData[d.id.toString()];
    showToolbar(currNode);
}

function showToolbarEdge(d) {
    for(var i in edgeData) {
        if (edgeData[i].from_vertex_id.toString() === d.source.id && 
                edgeData[i].to_vertex_id.toString() === d.target.id) {
            var edge = edgeData[i];
            showToolbar(edge);
            return;
        }
    }
}

//Show node description with toolbarData
function showToolbar(toolbarData) {
    div.transition()        
        .duration(200)      
        .style("opacity", .9);      
    div.html(JSON.stringify(toolbarData)+"<br/>")  
        .style("left", (d3.event.pageX) + "px")     
        .style("top", (d3.event.pageY - 28) + "px");    
}

function hideToolbar(d) {
    div.transition()        
        .duration(500)      
        .style("opacity", 0);   
}

//Handling hover nodes
function hoverNode(d) {
    showToolbarNode(d);
}

function unhoverNode(d) {
    hideToolbar();
}

function clickNode(d) {
    $("#update-node-modal").modal('show');

    var currNode = vertexData[d.id.toString()];
    $(".edit-type").text("Node");
    $("#node-id").text(currNode.id);

    $("#node-properties-text").val(JSON.stringify(currNode));
}

//Handling hover Edges
function hoverLink(d) {
    showToolbarEdge(d);
}

function clickLink(d) {
    $("#update-node-modal").modal('show');
    var copiedNode = {};
    for(var i in edgeData){
        if (edgeData[i].from_vertex_id.toString() === d.source.id && 
                edgeData[i].to_vertex_id.toString() === d.target.id) {
            copiedNode = edgeData[i];
            break;
        }
    }

    $("#from-id").text(copiedNode.from_vertex_id);
    $("#to-id").text(copiedNode.to_vertex_id);
    $(".edit-type").text("Link");
    $("#node-properties-text").val(JSON.stringify(copiedNode));
}

// Define the div for the tooltip
var div = d3.select("body").append("div")    
.attr("class", "tooltip")                
.style("opacity", 0);

var svg = d3.select("svg#d3-root"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

var color = d3.scaleOrdinal(d3.schemeCategory20);

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }).distance(100))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2));

function render(graph) {
    svg.selectAll(".links").remove();
    svg.selectAll(".nodes").remove();

    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter().append("line")
        .attr("stroke-width", 5);

    link.on("mouseover", hoverLink)
        .on("mouseout", unhoverNode);

    link.on("click", clickLink);

    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("r", 20)
        .attr("fill", function(d) { return color(d.type); })
        .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

    node.append("title")
        .text(function(d) { return d.id; });

    node.on("mouseover", hoverNode)
        .on("mouseout", unhoverNode);

    node.on("click", clickNode);

    simulation
        .nodes(graph.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(graph.links);

    function ticked() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    }
    simulation.restart();
}

function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}
