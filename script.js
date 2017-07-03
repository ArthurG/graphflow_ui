/*Global objects*/
var queryResult = {};

/*User actions */
$("#query-form").keypress(function (e) {
    var input = $("#query-form textarea").val();
    if(e.which == 13 && !e.shiftKey) {        
        process_query(input);
        e.preventDefault();
    }
});


/*Process functions*/
function process_query(input_str){
    console.log(input_str);
    $.getJSON("sample.json", function(data){
      set_tabular_results(data);
      set_raw_results(data);
      set_graphical_results(data);
    });
}

function set_tabular_results(data){
  var records = data.records;
  if (records.length === 0){
    return
  }
  /*Remove old result-table-header*/
  var header_old = $("#query-result-table th.cloned");
  header_old.remove();

  /*Set the result-table-header*/
  var keys = records[0].keys;
  var header_template = $("#query-result-table thead th#template");
  var header_elem = $("#query-result-table thead tr");
  for(var i = 0;i<keys.length;i++){
    var clone = header_template.clone().removeAttr("id").attr("class", "cloned");
    clone.text(keys[i]);
    header_elem.append(clone);
  }
  console.log(keys);

  /*Remove old result-table-data*/
  var rows_old = $("#query-result-table tbody tr.cloned");


  var table_elem = $("#query-result-table tbody");

  var row_template = $("#query-result-table tbody tr#template");
  var row_data_template = $("#query-result-table tbody tr td#template");
  var row_counter_template = $("#query-result-table tbody th#template");

  for(var i = 0;i<records.length;i++){
    var currRecord = records[i];
    var fields = currRecord._fields;
    var row_elem = row_template.clone().removeAttr("id").attr("class", "cloned");
    var row_counter_template = row_counter_template.clone().removeAttr("id").attr("class", "cloned");
    
    row_counter_template.text(i+1);
    row_elem.append(row_counter_template);
    for (var j = 0;j<fields.length;j++){
      var row_data_elem = row_data_template.clone().removeAttr("id").attr("class", "cloned");
      row_data_elem.text(JSON.stringify(fields[j].properties));
      row_elem.append(row_data_elem);
    }
    table_elem.append(row_elem);
  }


  console.log("Setting tabular results");
}

function set_raw_results(data){
  var elem = $("#query-result-raw");
  elem.text(JSON.stringify(data, undefined, 2));

}

function set_graphical_results(data){}

function copy_result_to_clipboard(elem){
  var $temp = $("<input>");
  $("body").append($temp);
  $temp.val($(elem).text()).select();
  document.execCommand("copy");
  $temp.remove();
}

function removeNodeProperties(d){
    var copiedNode = jQuery.extend({}, d);
    delete copiedNode.x
    delete copiedNode.y
    delete copiedNode.vy
    delete copiedNode.vx
    delete copiedNode.fx
    delete copiedNode.fy
    return copiedNode;
}

function showToolbar(d){
    var copiedNode = removeNodeProperties(d);
    div.transition()        
        .duration(200)      
        .style("opacity", .9);      
    div.html(JSON.stringify(copiedNode)+"<br/>")  
        .style("left", (d3.event.pageX) + "px")     
        .style("top", (d3.event.pageY - 28) + "px");    
}

/* D3 tooltip */
var stickyNode; //Node to determine where the toolbar is currently placed

function hideToolbar(d){
    div.transition()        
        .duration(500)      
        .style("opacity", 0);   
}

//Handling hover nodes
function hoverNode(d){
    showToolbar(d);
    if(d!==stickyNode){
        stickyNode = null;
    }
}

function unhoverNode(d){
    if(!stickyNode){
        hideToolbar();
    }
}

//Handling clicking nodes
function clickNode(d){
    $("#updateNodeModal").modal('show');
    var copiedNode = removeNodeProperties(d);
    $("#node-properties-text").val(JSON.stringify(copiedNode));
    //showUpdateNodeModal();
}

//Handling hover Edges
function hoverLink(d){
    showToolbar(d);
}

function unhoverItem(){
    var $info = $("#hover-info");
    $info.find(".hover-pair").remove()
}

//Handling clicking Edges
function clickLink(d){
    $("#updateNodeModal").modal('show');
    var copiedNode = removeNodeProperties(d);
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
    .force("link", d3.forceLink().id(function(d) { return d.id; }))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2));

    d3.json("miserables.json", function(error, graph) {
        if (error) throw error;

        var link = svg.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(graph.links)
            .enter().append("line")
            .attr("stroke-width", function(d) { return Math.sqrt(d.value); });

        link.on("click", clickLink);
        link.on("mouseover", hoverLink);

        var node = svg.append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(graph.nodes)
            .enter().append("circle")
            .attr("r", 10)
            .attr("fill", function(d) { return color(d.group); })
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
    });

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

