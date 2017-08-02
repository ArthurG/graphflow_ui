/*Global objects*/
var queryResult = {};
var vertexData = {};
var edgeData = {};

/*User actions */
$("#query-form").keypress(function (e) {
  var input = $("#query-form textarea").val();
  if(e.which == 13 && !e.shiftKey) {        
    processQuery(input);
    e.preventDefault();
  }
});

$("#delete-node").click(function(){
  var from_id = $("#from-id").text();
  var to_id = $("#to-id").text();
  var query = "DELETE ("+from_id+")->("+to_id+");";
  console.log(query);

  $.post("http://localhost:8000/query", query).fail(function(){
    warning_box.attr("class", "alert alert-danger col-lg-12");
    warning_box.text("Deletion has failed!");
  });
  $.getJSON("http://localhost:8000/json", function(data, status, xhr){
    warning_box.attr("class", "alert alert-danger col-lg-12");
    warning_box.text(data);
  });
  
});


/*Process functions*/
function processQuery(inputStr){
  warning_box = $("#graphflow-alert");
  warning_box.addClass("hidden");
  $.post("http://localhost:8000/query", inputStr).fail(function(){
    warning_box.attr("class", "alert alert-danger col-lg-12");
    warning_box.text("Graphflow server is down!");
  });

  $.getJSON("http://localhost:8000/json", function(data, status, xhr){
    setRawResults(data);
    if ("SUBGRAPHS" === data.response_type){
      updateTabs(["TABULAR", "GRAPHICAL", "RAW"]);
      setTabularResults(data);
      setDownloadResults(data);
      setGraphicalResults(data);
      vertexData = getVertexData(data);
      edgeData = getEdgeData(data);
    }
    //TODO: Tuples and strings are both rendered as message
    /*
    else if ("STRING" === data.response_type){
      updateTabs(["RAW"]);
    }
    else if ("TUPLES" === data.response_type){
      updateTabs(["TABULAR", "RAW"]);
    }
    */
    else if ("EXPLAIN" === data.response_type){
      updateTabs(["EXPLAIN", "RAW"]);
    }
    else if ("MESSAGE" === data.response_type && data.isError){
      updateTabs(["RAW"]);
      warning_box.text(data.message);
      warning_box.attr("class", "alert alert-warning col-lg-12");
      warning_box.removeClass("hidden");
    }
    else if ("MESSAGE" === data.response_type){
      updateTabs(["RAW"]);
    }
    else{
      //Probably a planviewer result
      renderPlan(data);
      updateTabs(["EXPLAIN", "RAW"]);
    }
  });
}

//Hides the tabs for the result-set
function hideTabs(){
  $(".resultset .result-tab").addClass("hidden");
  $(".resultset .result-tab").removeClass("active");
  $(".tab-pane").removeClass("active");
}

//Shows the tabs in result-set which are also in tabArr, oither tabs are hidden
function updateTabs(tabArr){
  hideTabs();
  for(var i = 0;i<tabArr.length;i++){
    var tabCssSelector = "."+tabArr[i].toLowerCase()+"-tab";
    var tabContentCssSelector = "#"+tabArr[i].toLowerCase()+"-rs";
    if (i === 0){
      $(tabCssSelector).addClass("active");
      $(tabContentCssSelector).addClass("active");
    }
    tab = tabArr[i];
    $(tabCssSelector).removeClass("hidden");
  }
}

function getVertexData(data){
  console.log(data.vertex_data);
  return data.vertex_data;
}

function getEdgeData(data){
  var edge = []
  for(var i = 0;i<data.subgraphs.length;i++){
    var subgraph = data.subgraphs[i];
    for (var j=0;j<subgraph.edges.length;j++){
      edge.push(subgraph.edges[j]);
    }
  }
  return edge;
}

function setTabularResults(data){

  function cloneTemplate(template){
    return template.clone().removeClass("template").attr("class", "cloned");
  }

  var records = data.subgraphs;
  if (records.length === 0){
    return
  }

  /*Remove old table headers*/
  $("#query-result-table th.cloned").remove();

  /*Set the updated table headers for this query*/
  var header = $("#query-result-table thead tr");
  var headerTemplate = $("#query-result-table thead th.template");
  var vertexMap = data.vertex_map;
  //Populate the headers for the verticies
  //TODO: No headers are being populated for the edges
  for(var headerName in vertexMap){
    var headerItem = cloneTemplate(headerTemplate);
    headerItem.text(headerName);
    header.append(headerItem);
  }

  /*Remove old table data*/
  $("#query-result-table tbody tr.cloned").remove();

  /*Set the table data*/
  var resultTable = $("#query-result-table tbody");

  var rowTemplate = $("#query-result-table tbody tr.template");
  var rowDataTemplate = $("#query-result-table tbody tr td.template");
  var rowCounterTemplate = $("#query-result-table tbody th.template");

  //Populate the rows
  for(var i = 0;i<records.length;i++){
    var currRecord = records[i];
    var newRow = cloneTemplate(rowTemplate);
    var rowCounter = cloneTemplate(rowCounterTemplate);

    rowCounter.text(i+1);
    newRow.append(rowCounter);

    //Populate the verticies
    var verticiesToAdd = currRecord.vertices;
    for (var headerName in vertexMap){
      var subgraph_vertex_idx = vertexMap[headerName];
      var graph_vertex_idx = verticiesToAdd[subgraph_vertex_idx];
      var vertex = data.vertex_data[graph_vertex_idx];

      var rowDataCell = cloneTemplate(rowDataTemplate);
      rowDataCell.text(JSON.stringify(vertex.properties));
      newRow.append(rowDataCell);
    }

    //Populate the edges
    var edgesToAdd = currRecord.edges;
    for (var j = 0;j<edgesToAdd.length;j++){
      var rowDataCell = cloneTemplate(rowDataTemplate);
      //TODO: Should I Populate the entire edge object?
      rowDataCell.text(JSON.stringify(edgesToAdd[j]));
      newRow.append(rowDataCell);
    }
    resultTable.append(newRow);
  }
}

function setRawResults(data){
  var elem = $("#query-result-raw");
  elem.text(JSON.stringify(data, undefined, 2));
}

function setDownloadResults(data){
  $("#download-btn").attr("href", "data:text/plain;charset=UTF-8," + encodeURIComponent(JSON.stringify(data, undefined, 2)));
  $("#download-btn").attr("download", "query-result.txt");
}

function setGraphicalResults(data){
  var nodes = [];
  var edges = []; 
  var seenItems = new Set();

  var vertex_data = data.vertex_data;
  for(var i in vertex_data){
    var curr_vertex = vertex_data[i];

    var copiedNode = jQuery.extend({type: curr_vertex.type, id: i}, curr_vertex.properties);
    nodes.push(copiedNode);
    i+=1;
  }
  for (var i = 0;i<data.subgraphs.length;i++){
    var subgraph=data.subgraphs[i];
    for (var j = 0;j<subgraph.edges.length;j++){
      var edge = subgraph.edges[j];
      var copiedEdge = {};
      copiedEdge.id = i*subgraph.edges.length+j;
      copiedEdge.source = edge.from_vertex_id;
      copiedEdge.target = edge.to_vertex_id;
      edges.push(copiedEdge);
    }
  }

  //Render the graph
  var graph = {nodes: nodes, links: edges};
  render(graph);
}

function copyResultToClipboard(elem){
  var $temp = $("<input>");
  $("body").append($temp);
  $temp.val($(elem).text()).select();
  document.execCommand("copy");
  $temp.remove();
}



/* D3 tooltip */
function showToolbarNode(d){
  var currNode = vertexData[d.id.toString()];
  showToolbar(currNode);
}

function showToolbarEdge(d){
  for(var i = 0;i<edgeData.length;i++){
    if (edgeData[i].from_vertex_id.toString() === d.source.id && edgeData[i].to_vertex_id.toString() === d.target.id){
      var edge = edgeData[i];
      showToolbar(edge);
      return;
    }
  }
}

//Show node description with toolbarData
function showToolbar(toolbarData){
  div.transition()        
    .duration(200)      
    .style("opacity", .9);      
  div.html(JSON.stringify(toolbarData)+"<br/>")  
    .style("left", (d3.event.pageX) + "px")     
    .style("top", (d3.event.pageY - 28) + "px");    
}

function hideToolbar(d){
  div.transition()        
    .duration(500)      
    .style("opacity", 0);   
}

//Handling hover nodes
function hoverNode(d){
  showToolbarNode(d);
}

function unhoverNode(d){
  hideToolbar();
}

//Handling clicking nodes
function clickNode(d){
  $("#updateNodeModal").modal('show');
  var currNode = vertexData[d.id.toString()];
  $("#node-properties-text").val(JSON.stringify(currNode));
}

//Handling hover Edges
function hoverLink(d){
  showToolbarEdge(d);
}

//Handling clicking Edges
function clickLink(d){
  $("#updateNodeModal").modal('show');
  var copiedNode = {};
  for(var i = 0;i<edgeData.length;i++){
    if (edgeData[i].from_vertex_id.toString() === d.source.id && edgeData[i].to_vertex_id.toString() === d.target.id){
      copiedNode = edgeData[i];
    }
  }
  $("#from-id").text(copiedNode.from_vertex_id);
  $("#to-id").text(copiedNode.to_vertex_id);
  $("#node-properties-text").val(JSON.stringify(copiedNode));
}


// Define the div for the tooltip
var div = d3.select("body").append("div")    
.attr("class", "tooltip")                
.style("opacity", 0);

var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

var color = d3.scaleOrdinal(d3.schemeCategory20);

var simulation = d3.forceSimulation()
  .force("link", d3.forceLink().id(function(d) { return d.id; }).distance(100))
  .force("charge", d3.forceManyBody())
  .force("center", d3.forceCenter(width / 2, height / 2));

function render(graph){
  svg.selectAll(".links").remove();
  svg.selectAll(".nodes").remove();

  var link = svg.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(graph.links)
    .enter().append("line")
    .attr("stroke-width", 5);

  link.on("click", clickLink);
  link.on("mouseover", hoverLink)
      .on("mouseout", unhoverNode);

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

  node.on("click", clickNode);

  node.on("mouseover", hoverNode)
    .on("mouseout", unhoverNode);

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

