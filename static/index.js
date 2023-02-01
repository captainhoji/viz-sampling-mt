var aggregate_data;
var options = { verbose: true,
                agg_points: true,
                update_feedback: true };
var chart;
var dataIndex = 0
var humanIndex = 0 
var teacherIndex = 0
var evaluatorIndex = 0

// var feedback_options = [
//   {
//     "display" : "Tell me how far off I am",
//     "call" : "abs_error_seq"
//   },
//   {
//     "display" : "Tell me if I over/underestimate",
//     "call" : "direction_feedback_arrow"
//   },
//   {
//     "display" : "Tell me both",
//     "call" : "direction_feedback_arrow_abs_error"
    
//   },
//   {
//     "display" : "No feedback needed",
//     "call" : "noFeedback"
//   }
// ];

// var text_feedback_initial = document.getElementById("textFeedback").innerHTML

var show_agg = true;

// var feedback_call = feedback_options[2].call;

function make_experiment(dataset) {

  // d3.csv(dataset.user_values,
  //   function(row) {
  //     // Converts from dict to array of pairs: [[year, v1], [year, v2], ...]
  //     var year = +row.Year;
  //     delete row.Year;
  //     vals = _(row).values().map(_.toNumber).value();
  //     return _.zip(_.fill(Array.from(vals), year), vals);
  //   },
  //   function(error, aggregate_data) {
  //     // Inverts the array, so each row is per-subject rather than per-year
  //     aggregate_data = _.spread(_.zip)(aggregate_data);
      d3.csv("data/" + dataset.true_values,
        _.partial(parse_row, dataset),
        function(error, actual_data) {
          true_values = _.zip(_(actual_data).map(dataset.x_prop).value(),
          _(actual_data).map(dataset.y_prop).value());
          chart = new d3.line_ev(true_values, aggregate_data, dataset, options);
          chart.render_chart(960, 500, d3.select("svg"));
          chart.draw_data(true_values);
          // d3.select("#clear").on("click", function () {
          //   d3.select("#next").attr("disabled", false);
          //   d3.select("svg").selectAll("*").remove();
          //   d3.selectAll('.feedback a').attr("class", "abled")
          //   d3.selectAll('.show_agg a').attr("class", "abled")
          //   document.getElementById('next').innerHTML = "I'm done"
            // make_experiment(dataset);
			// document.getElementById("dataDescriptor").innerHTML = "";
			// document.getElementById("textFeedback").innerHTML = text_feedback_initial
			// document.getElementById('feedbackDiv').style.display = "none"
      // document.getElementById('feedbackLegend').innerHTML = "";

          // });
          // d3.select("#next").on("click", display_feedback);
        // });
      });
    }

function display_agg() {
  if (show_agg) {
    chart.draw_agg();
  }
  d3.select("#next").attr("disabled", "disabled");
}

// function display_actual() {
//   chart.draw_data();
//   d3.select("#next").on("click", display_agg);
// }

function draw_feedback() {
  if (chart.user_done) {
    chart[feedback_call]();
    chart.last_feedback = chart[feedback_call];
  }
}

// function display_feedback() {
//   draw_feedback();
//   display_actual();
//   if (show_agg == true) {
//     document.getElementById('next').innerHTML = "Show me how other people did"
//   }
  
  // d3.select("#next").on("click", display_actual);
// }

// function populate_list(id, items, onclick) {
//   d3.select("#" + id)
//     .append("ul")
//     .classed("nav nav-pills mode-switch", true)
//     .selectAll("." + id)
//     .data(items)
//     .enter()
//     .append("li")
//     .classed("switch-measurement " + id, true)
//     .classed("active", function(d, i) { if (id =="feedback") {return i === 2;} else {return i === 0;}})  // First entry is active by default
//     .append("a")
//     .on("click", onclick)
//     .html(function (d) { return d.display; });
// }

function onDataClick(event, id) {
  data = datasets[id]
  d3.selectAll(".datasource").classed("active", false);
  d3.select(event.target.parentNode).classed("active", true);
  d3.select("svg").selectAll("*").remove();
  make_experiment(data);
  dataIndex = id
}

function onHumanClick(event, id) {
  d3.selectAll(".human").classed("active", false);
  d3.select(event.target.parentNode).classed("active", true);
  humanIndex = id
}

function onTeacherClick(event, id) {
  d3.selectAll(".teacher").classed("active", false);
  d3.select(event.target.parentNode).classed("active", true);
  teacherIndex = id
}

function onEvaluatorClick(event, id) {
  d3.selectAll(".evaluator").classed("active", false);
  d3.select(event.target.parentNode).classed("active", true);
  evaluatorIndex = id
}

function runPipeline() {
  const http_request = new XMLHttpRequest();
  const url="pipeline?data="+datasets[dataIndex].true_values+"&h="+humans[humanIndex]+"&t="+teachers[teacherIndex]+"&e="+evaluators[evaluatorIndex];
  http_request.open("GET", url);
  http_request.send();

  http_request.onreadystatechange = function(){
    if(http_request.readyState == 4){
      var jsonObj = JSON.parse(http_request.responseText);
      var sample = jsonObj['sample']
      var score = jsonObj['score']
      var x = jsonObj['x']
      var prediction = jsonObj['prediction']
      // console.log(sample)
      // console.log(score)
      var prediction_data = x.map(function(d, i) {
        return [d, prediction[i]];
      });
      chart.draw_prediction(prediction_data)

      console.log(sample)
      sample = sample[0].map(function (x, i) { return [x, sample[1][i]]; });
      console.log(sample)
      chart.draw_sample(sample)
      
      console.log(prediction_data)

      d3.select("#score").text("score = " + score)
      document.getElementById('feedbackDiv').style.display = "block"
      d3.select("#next").attr("disabled", true);
    }
  }
}

function onResetClick() {
  d3.select("#next").attr("disabled", null);
  d3.select("svg").selectAll("*").remove();
  make_experiment(datasets[dataIndex])
}

// populate_list("datasource", datasets, function (d) {
//     d3.selectAll(".datasource").classed("active", false);
//     d3.select(this.parentNode).classed("active", true);
//     d3.select("svg").selectAll("*").remove();
// 	// document.getElementById("dataDescriptor").innerHTML = "";
// 	// document.getElementById("textFeedback").innerHTML = text_feedback_initial
// 	// document.getElementById('feedbackDiv').style.display = "none"
//   // document.getElementById('feedbackLegend').innerHTML = "";
//   d3.selectAll('.feedback a').attr("class", "abled")
//   d3.selectAll('.show_agg a').attr("class", "abled")
//    // document.getElementById('next').innerHTML = "I'm done"
//     make_experiment(d);
//   });

// populate_list("feedback", feedback_options, function (d) {
//     d3.selectAll(".feedback").classed("active", false);
//     d3.select(this.parentNode).classed("active", true);
//     feedback_call = d.call;
//     // draw_feedback();
//  });

function parse_row(dataset, row) {
  row[dataset.x_prop] = +row[dataset.x_prop];
  row[dataset.y_prop] = +row[dataset.y_prop];
	return row;
}

// d3.select("#agg_on").on("click", function () {
//   d3.selectAll(".show_agg").classed("active", false);
//   d3.select(this.parentNode).classed("active", true);
//   show_agg = true;
// });

// d3.select("#agg_off").on("click", function () {
//   d3.selectAll(".show_agg").classed("active", false);
//   d3.select(this.parentNode).classed("active", true);
//   show_agg = false;
// });

make_experiment(datasets[0])