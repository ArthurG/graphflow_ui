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

