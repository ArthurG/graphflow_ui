$("#query-form").keypress(function (e) {
    var input = $("#query-form textarea").val();
    if(e.which == 13 && !e.shiftKey) {        
        process_query(input);
        e.preventDefault();
    }
});

function process_query(input_str){
    console.log(input_str);
}


//Helper function to update info at the bottom of the graph
function updateHoverInfo(info){
    unhoverItem();
    var $info = $("#hover-info");
    var $template = $("#hover-pair-template");
    Object.keys(info).forEach(function(attribute){
        var $clone = $template.clone();
        $clone.attr("id", "").attr("class", "hover-pair");
        $clone.find(".hover-key").text(attribute)
            $clone.find(".hover-value").text(info[attribute]);
        $clone.appendTo($info);
    });
}

//Handling hover nodes
function hoverNode(d){
    console.log(d);
    updateHoverInfo(d);
}

//Handling hover Edges
function hoverEdge(d){
    unhoverItem();
    updateHoverInfo(info);
}

function unhoverItem(){
    var $info = $("#hover-info");
    $info.find(".hover-pair").remove()
}

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

    link.on("click", hoverNode);

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

    node.on("click", hoverNode);

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




