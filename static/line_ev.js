d3.line_ev = function (true_values, aggregate_values, dataset, options) {
/**
 * Line Chart for Expectation Visualization.
 * @param {Array} true_values An array of pairs [[x1, y1], [x2, y2], ...] corresponding
 *  to the true values. See below note on how to access this data.
 * @param aggregate_values An array of array of paris, with each subject being an outer array,
 *  and each inner array corresponding to an array of guess pairs: [[1776 4] [1777 6]]
 * @param {Object} dataset Data pertaining to the processing and display of the
 *  true_values.
 * @param {Object} options A set of options to change how the chart is displayed.
 *    demo {boolean} default false. If true will create a chart suitable for background.
 *    agg_points {boolean} default false. If true will create a circle at each aggregate point.
 *
 * An important note about how values may be represented.
 * There are two ways we represent values here:
 *  1) As a javascript object, where the keys are x values, and values are
 *     y values. In the CO2 example x is years, y is tons of carbon.
 *  2) As an array of pairs: [[x1 y1], [x2 y2], ...]. For the CO2 example
 *     xn will be the years, yn will be tons of carbon.
 * You can easily switch between these two representations using lodash,
 * (https://lodash.com/docs) specifically the _.toPairs and _.fromPairs method.
 * Note that the _.toPairs will result in x1 being a string, which might not be
 * desireable. If so, feel free to use convert_obj_to_array.
 *
 * Useful tips for dealing with the array of pairs:
 *  1) To extract all the x values from true_value you can do: _(true_values).map(0).value()
 *  2) Extract y values: _(true_values).map(1).value()
 *
 * Second, be aware of the various coordinate systems we are dealing with:
 * 1) SVG space. Note that for SVG the upper left is (0,0). This will be the
 *    result of a mouse onclick() call.
 * 2) Chart space. Basically SVG space minus the margins. When using the x or y
 *    scales (e.g. x.invert()) you are operating in chart space. Use the
 *    svg_to_chart function to switch between these two spaces.
 */
  MARGIN_DEFAULT = {top: 20, right: 20, bottom: 30, left: 50};
  var opts = _.merge({
    verbose: true,
    update_feedback: false,
    agg_points: false,
	agg_fade: false,
	agg_animate: false,
    demo : false},
    options);
  var line_ev = {};
  var x;
  var y;
  var xAxis = null;
  var yAxis = null;
  var margin = MARGIN_DEFAULT;
  var svg = null;
  var xTicks = null;
  var user_guess = null;
  var user_guess_input = null;
  var clicked = false;
  var chart_height;
  var chart_width;
  var LEFT_BUTTON = 0;
  var MIDDLE_BUTTON = 1;
  var RIGHT_BUTTON = 2;
  var can_edit = true;
  var indexed_data = [];
  line_ev.user_done = false; // true if a user has guessed for all data points
  line_ev.last_feedback = null;

  var line_feedbacks = {
	  "0" : ["Excellent!", "Well done!", "Super impressive!"], // over 90% of the inflextion slopes are correct.
	  "1" : ["You did pretty good.", "Not too shabby.", "Close but no cigar."], // over 50%
	  "2" : ["Not bad.", "Not quite there yet.", "Better than bad but worse than good."], // 33%
	  "3" : ["Hm. Not so good.", "Seems like you were a ways off.", "I think you need more training, grasshopper."] // less 1/3
	}

  //TODO: Create screen<->chart conversion functions
  var guess_line = d3.svg.line()
    .interpolate("linear")
    .x(function(d) { return d[0]; })
    .y(function(d) { return d[1]; });

  var actual_line = d3.svg.line()
    .x(function(d) { return x(d[0]); })
    .y(function(d) { return y(d[1]); });

  var aggregate_line = d3.svg.line()
    .interpolate("linear")
		.x(function(d) { return x(d[0]); })
		.y(function(d) { return y(d[1]); });

  function svg_to_chart(pt) {
    return [pt[0] - margin.left, pt[1] - margin.top];
  }

  document.onmousedown = function(e) {
    if (e.button == LEFT_BUTTON) {
      e.preventDefault();
      clicked = true;
    }
  };

  document.onmouseup = function(e) {
    if (e.button == LEFT_BUTTON) {
      clicked = false;
    }
  };

  function type(n) { return typeof(n);}

  line_ev.render_chart = function (total_width, total_height, elem) {
    if (opts.verbose) {
      console.log("\n==== Render Chart: " + dataset.display + " ===");
      console.log("First data point: " + true_values[0] +"\t" + true_values[0].map(type));
    }
    chart_width = total_width - margin.left - margin.right;
    chart_height = total_height - margin.top - margin.bottom;

    x = d3.scale.linear()
        .range([0, chart_width]);

    y = d3.scale.linear()
        .range([chart_height, 0]);

    xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    svg = elem;
    svg = svg.attr("width", total_width)
       .attr("height", total_height)
       .on("mousemove", function() { if (clicked) { tick(d3.mouse(this));} })
       .on("click", function() { tick(d3.mouse(this)); })
       .append("g")
       .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(d3.extent(_(true_values).map(0).value()));
    y.domain(d3.extent(_(true_values).map(1).value()));
    if (opts.verbose) {
      console.log("x domain: " + x.domain());
      console.log("y domain: " + y.domain());
    }
    // console.log(total_width)
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + chart_height + ")")
        .call(xAxis.tickFormat(d3.format()))
        .append("text")
        .attr("x", total_width - 70)
        .attr("y", -5)
        .style("text-anchor", "end")
        .text(dataset.x_label);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(dataset.y_label);

  	if (opts.demo) {
  		svg.append("rect")
  			.attr("width", "100%")
  			.attr("height", "100%")
  			.attr("fill", "#f2f2f2");
  	}

  	if (opts.demo === false) {
  		svg.append("g")
  			.attr("class", "grid")
  			.attr("transform", "translate(0," + chart_height + ")")
  			.call(xAxis
  				.tickSize(-chart_height, 0, 0)
  				.tickFormat("")
  			);

  		svg.append("g")
  			 .attr("class", "grid")
  			 .call(yAxis
  				 .tickSize(-chart_width, 0, 0)
  				 .tickFormat("")
  			 );
  	}

    svg.append("path").attr("class", "line");
    user_guess = init_user_data(_(true_values).map(0).value().map(x));
  };

  line_ev.reset = function() {
    can_edit = true;
    clear(user_guess);
    svg.selectAll(".comparisonLine").remove();
    d3.select("#next").attr("disabled", "disabled");
    line_ev.user_done = false;
    can_edit = true;
    return line_ev.update(convert_obj_to_array(user_guess));
  };

  line_ev.disable_edit = function() {
    can_edit = false;
    d3.selectAll('.feedback a').attr("class", "disabled")
    d3.selectAll('.show_agg a').attr("class", "disabled")
  };

  line_ev.update = function (data) {
    var points = svg.selectAll(".group-points").data(data, function(d) { return d[0]; });
    points.enter()
          .append("g")
          .attr("class", "group-points")
          // .append("circle")
          // .attr("r", 5)
          // .attr("class", "points");

    // points.select("circle")
    //       .attr("cx", function (d) { return d[0]; })
    //       .attr("cy", function (d) { return d[1]; });

    points.exit().remove();

    if (opts.update_feedback && line_ev.last_feedback) {
      line_ev.last_feedback();
    }

    d3.select(".line").attr("d", guess_line(data));
  };

  line_ev.draw_actual = function() {
    line_ev.disable_edit()
  	// user_guess_slope = slope_by_inflections(user_guess_to_data(user_guess));
  	// actual_data_slope = slope_by_inflections(true_values);
    // text_feedback();
    // var indices =  data_to_ticks(true_values, x.ticks(), false);
    // indexed_data = index_data(true_values, indices, false);

    // var path = svg.append("path")
    // .datum(indexed_data)
		// .attr("class", "comparisonLine")
		// .attr("d", actual_line(indexed_data));


    var path = svg.append("path")
      .datum(true_values)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", d3.svg.line()
        .x(function(d) { return x(d[0]) })
        .y(function(d) { return y(d[1]) })
        )

    var totalLength = path.node().getTotalLength();

    path.attr("stroke-dasharray", totalLength + ' ' + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
        .duration(1000)
        .ease("linear")
        .attr('stroke-dashoffset', 0);
  };


    line_ev.abs_error_diverging = function() {
      var colors = ['#ca0020','#f4a582','#f7f7f7','#92c5de','#0571b0'].reverse();
      var bin = d3.scale.quantize().domain([-y.domain()[1], y.domain()[1]]).range(colors);
      svg.selectAll(".points")
         .data(_(line_ev.user_error()).map(1).value())
         .transition()
         .style("fill", bin);
    };

    line_ev.abs_error_seq = function() {
      var colors = ['#fef0d9','#fdcc8a','#fc8d59','#d7301f'];
      var bin = d3.scale.quantize().domain([0, y.domain()[1]]).range(colors);
      getMagnitudeLegend()
      svg.selectAll(".points")
         .data(_(line_ev.user_error()).map(1).map(Math.abs).value())
         .transition()
         .style("fill", function(d) {if (d == 0) {return "#fff";} else {return bin(d);}});
   };

   line_ev.noFeedback = function() {

   }

    line_ev.direction_feedback_arrow_abs_error = function() {
      getBothLegend();
      var colors = ['#fef0d9','#fdcc8a','#fc8d59','#d7301f'];
      var bin = d3.scale.quantize().domain([0, y.domain()[1]]).range(colors);
      svg.selectAll(".points")
         .data(_(line_ev.user_error()).map(1).map(Math.abs).value())
         .transition()
         .style("fill", function(d) {if (d == 0) {return "#fff";} else {return bin(d);}});
      
      user_error = _(line_ev.user_error()).map(1).value();
      var year_map = true_values.map(function (n) { return n[0]; });
        svg.selectAll(".group-points")
         .data(convert_obj_to_array(user_guess))
         .append("polygon")
         .attr("points",function(d,i) {if (user_error[i] > 0) {return getStringForPoint("n", d[0] - 10,d[1] + 8); } else {return getStringForPoint("p", d[0] - 10,d[1] - 24); } })
         .attr("fill",'steelblue')
          .attr("width", "20px")
          .attr("height", "20px");



    }

    line_ev.direction_feedback_arrow = function() {
      user_error = _(line_ev.user_error()).map(1).value();
      var year_map = true_values.map(function (n) { return n[0]; });
      getDirectionLegend()
        svg.selectAll(".group-points")
         .data(convert_obj_to_array(user_guess))
         .append("polygon")
         .attr("points",function(d,i) {if (user_error[i] > 0) {return getStringForPoint("n", d[0] - 10,d[1] + 8); } else {return getStringForPoint("p", d[0] - 10,d[1] - 24); } })
         .attr("fill",'steelblue')
          .attr("width", "20px")
          .attr("height", "20px");
    };

   

    
    line_ev.pow_size = function() {
      var error_scale = d3.scale.pow().domain([0, y.domain()[1]]).range([3,10]);
      svg.selectAll(".points")
         .data(_(line_ev.user_error()).map(1).map(Math.abs).value())
         .transition()
         .attr("r", function (d) { return error_scale(d); });
     };


    line_ev.color_arrow = function() {
      user_error = _(line_ev.user_error()).map(1).value();
      var year_map = true_values.map(function (n) { return n[0]; });
      var colors = ['#ca0020','#f4a582','#f7f7f7','#92c5de','#0571b0'].reverse();
      var bin = d3.scale.quantize().domain([-y.domain()[1], y.domain()[1]]).range(colors);
        svg.selectAll(".group-points")
         .data(convert_obj_to_array(user_guess))
         .append("polygon")
         .attr("points",function(d,i) {if (user_error[i] > 0) {return getStringForPoint("n", d[0] - 10,d[1] + 8); } else {return getStringForPoint("p", d[0] - 10,d[1] - 24); } })
         .attr("fill",function(d,i) {return bin(user_error[i])})
          .attr("width", "20px")
          .attr("height", "20px");
    };

    line_ev.size_arrow = function() {
      var size = ["32px", "26px", "20px", "14px", "8px"].reverse();
      var bin = d3.scale.quantize().domain([-y.domain()[1], y.domain()[1]]).range(size);
      var user_error = _(line_ev.user_error()).map(1).value();
        svg.selectAll(".group-points")
         .data(convert_obj_to_array(user_guess))
         .append("polygon")
         .attr("points",function(d,i) {if (user_error[i] > 0) {return getStringForPoint("n", d[0] - 10,d[1] + 8); } else {return getStringForPoint("p", d[0] - 10,d[1] - 24); } })
         .attr("fill",'steelblue')
        .attr("width", function(d,i) {return bin(Math.abs(user_error[i])); })
        .attr("height", function(d,i) {return bin(Math.abs(user_error[i])); });
    };

    function getDirectionLegend() {
        var legend = document.getElementById('feedbackLegend')
        legend.innerHTML = "<div class='legendline'><svg width='20px' height='15px'><polygon fill=steelblue points='10,3 0,10 0,14 10,7 20,14 20,10'/> </svg> <span> &nbsp; Underestimated </span></div> <div class='legendline'><svg width='20px' height='16px'><polygon fill='steelblue' points='0,5 0,9 10,16 20,9 20,5 10,12'/> </svg> <span> &nbsp;  Overestimated </span></div>";
    }

    function getMagnitudeLegend() {
       var colors = ['#fff','#fef0d9','#fdcc8a','#fc8d59','#d7301f'];
       var description = ["No error","Less than 25%","25% - 50%","50% - 75%","More than 75%"];
       var legend = document.getElementById('feedbackLegend');
       stringToReturn = ''
       stringToReturn = "<div class='legendline'><svg width='120'>";
       
       for (i = 0; i < colors.length; i++) { 
        stringToReturn+= "<circle cx=12" + " cy=" +(i * 30 + 12)+  " fill=" + colors[i] + " r='10' stroke='steelblue' stroke-width='2' /><text x=26 y=" +(i * 30 + 16) + ">" + description[i] + "</text>";
    }
    stringToReturn += "</svg><p style='font-size:8pt;'><i>(all errors are relative to the max of the y-axis)</i></p></div>";
    legend.innerHTML = stringToReturn;
    }

    function getBothLegend() {
       var colors = ['#fff','#fef0d9','#fdcc8a','#fc8d59','#d7301f'];
       var description = ["No error","Less than 25%","25% - 50%","50% - 75%","More than 75%"];
       var legend = document.getElementById('feedbackLegend');
       stringToReturn = ''
        stringToReturn += "<div class='legendline'><svg width='20px' height='15px'><polygon fill=steelblue points='10,3 0,10 0,14 10,7 20,14 20,10'></svg> <span> &nbsp; Underestimated </span></div> <div class='legendline'><svg width='20px' height='16px'><polygon fill=steelblue points='0,5 0,9 10,16 20,9 20,5 10,12'> </svg> <span> &nbsp;  Overestimated </span></div>";
       stringToReturn += "<hr width='100%' class='greyhr'>"
       stringToReturn += "<div class='legendline'><svg width='120'>"; 
       for (i = 0; i < colors.length; i++) { 
        stringToReturn+= "<circle cx=12" + " cy=" +(i * 30 + 12)+  " fill=" + colors[i] + " r='10' stroke='steelblue' stroke-width='2' /><text x=26 y=" +(i * 30 + 16) + ">" + description[i] + "</text>";
       }
        stringToReturn += "</svg><p style='font-size:8pt;'><i>(all errors are relative to the max of the y-axis)</i></p></div>";

        

    // console.log(stringToReturn)
    legend.innerHTML = stringToReturn;
    }

    function getStringForPoint(direction, bufferX, bufferY) {
      var pointArrayUp = [10,3,0,10,0,14,10,7,20,14,20,10];
      var pointArrayDown = [0,3,0,7,10,14,20,7,20,3,10,10];
      var thisArray;
      if (direction == "p") {
        thisArray = pointArrayUp;
      } else {
        thisArray = pointArrayDown;
      }
    var finalPointString = '';
      for (i = 0; i < thisArray.length; i++) {
          if (i === 0) {
            finalPointString += (parseFloat(thisArray[i]) + bufferX);
          }
          else if (i % 2 === 0) {
            finalPointString += " " + (parseFloat(thisArray[i]) + bufferX);
          } else {
            finalPointString += "," + (parseFloat(thisArray[i]) + bufferY);
          }
      }
    return finalPointString;
  }

  line_ev.draw_agg = function() {
    // Only include values that match a tick
    filtered_agg_values = _(aggregate_values).map(
      function (row) {
        return _(row).filter(
          function (e) {
            return _.includes(x.ticks(), e[0]);
          }).value();
        }).value();

    if (opts.verbose) {
      console.log("Filtered aggregates");
      console.log(filtered_agg_values);
    }

	var series = svg.selectAll(".series")
		.data(filtered_agg_values)
		.enter().append("g")
		.attr("class", "series");
      
    if (opts.agg_points) {
      series.selectAll("circle")
            .data(function (d) { return d; })
            .enter()
            .append("circle")
            .attr("class", "aggregatePoint")
            .attr("cx", function (d) { return x(d[0]); })
            .attr("cy", function (d) { return y(d[1]); });
    }

	  var path = svg.selectAll(".aggregateLine")
      .data(filtered_agg_values)
      .enter()
      .append("path")
		.attr("class", "aggregateLine")
		.attr("d", aggregate_line)
		.attr("stroke-dasharray", function() {
			var totalLength = this.getTotalLength();
			return totalLength + ' ' + totalLength
		})
		.attr("stroke-dashoffset", function() {
            var totalLength = this.getTotalLength();
            return totalLength;
		})
		.transition()
			.duration(4000)
			.ease("linear")
			.attr('stroke-dashoffset', 0);
  };

  /* Takes raw user guesses, matches them to the nearest ticks, converts from chart to input data,
     and returns array pairs [[1700 1934], [1880 2333], ...]  of results suitable for comparing to the
     input data */
  // function user_guess_to_data() {
  //   g = convert_obj_to_array(user_guess);
  //   g = _.unzip(g);
  //   xs = g[0].map(x.invert); // Convert chart coordinates to data x values (e.g. years)
  //   ys = g[1].map(y.invert); // Convert chart coordinates to data y values (e.g. co2)
  //   return _.zip(xs, ys); // Zip em up!
  // }

  /* Returns an array of pairs [[x_val, error]] corresponding to the error at each user value.
     Note that error is positive if a user guess is above the line and negative if below it,
  > line_ev.user_error();
  [[1760, 1343], [1780, -4576]]
  */
  line_ev.user_error = function () {
    guess = user_guess_to_data();
    value_map = _.fromPairs(true_values);
    delta = guess.map(function (d) { return [d[0], d[1] - value_map[d[0]]]; });
    return delta;
  };

  function tick(pt) {
    if (can_edit === false)
      return;

      /* Ticks are generated in SVG space */
    pt = svg_to_chart(pt);
    pt[0] = find_closest(d3.keys(user_guess), pt[0]);
    pt[1] = Math.min(pt[1], chart_height);
    pt[1] = Math.max(pt[1], margin.top);
    user_guess[pt[0]] = pt[1];
    if (d3.values(user_guess).every(function (v) { return v !== null; })) {
      d3.select("#next").attr("disabled", null);
      line_ev.user_done = true;
    }
    var buggedArray = convert_obj_to_array(user_guess)
    buggedArray.sort((a, b) => {return a[0] - b[0];})
    return line_ev.update(buggedArray);
  }

  /* Set all values to null on an object */
  function clear(obj) {
    for (var key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      obj[key] = null;
    }
  }

  /* Given an array of values (haystack) [x1, x2,  ...] and a target
     value (needle) x, return the nearest x value from haystack */
  function find_closest(haystack, needle) {
    var dist = haystack.map(function (n, idx) { return [Math.abs( needle - n ), n];});
    dist.sort(function (a, b) {
      if (a[0] < b[0]) {
        return -1;
      } else if (a[0] > b[0]) {
        return 1;
      } else {
        return 0;
      }
    });
      return dist[0][1];
  }

  function init_user_data(ticks) {
    var user_guess = {};
    ticks.forEach(function (n) {
      user_guess[n] = null;
    });
    return user_guess;
  }

  /* Covert an object to a array of arrays: {k1:v1, k2:v2} -> [[k1 v1], [k2 v2]] */
  function convert_obj_to_array(obj) {
    return d3.zip(d3.keys(obj).map(parseFloat),
                  d3.values(obj)).filter(function (n) { return n[1] !== null;});
  }

  function data_to_ticks(data, ticks, values_are_nested) {
	var indices_out = [];
	var data_to_scan = data;
	if (values_are_nested) {
		data_to_scan = data.values;
	}
	for (var i = 0; i < data_to_scan.length; i++) {
		var current = data_to_scan[i];
		if (ticks.indexOf(Number(current[0])) >= 0) {
			indices_out.push(i);
		}
	}
	return indices_out;
  }

  // function index_data(data, indices, is_aggregate) {
	// var values_out = [];
	// if (is_aggregate) {
	// 	data.forEach(function (n) {
	// 		var output = n;
	// 		var current = output.values;
	// 		var current_out = [];
	// 		indices.forEach(function (m) {
	// 			current_out.push(current[m]);
	// 		});
	// 		output.values = current_out;
	// 		values_out.push(output);
	// 	});
	// }
	// else {
	// 	indices.forEach(function (n) {
	// 	  values_out.push(data[n]);
	// 	});
	// }
	// return values_out;
  // }

  // function text_feedback() {
	//   var user_slopes = check_slope();
	//   var correctness = check_slope_correctness(user_slopes)
	//   var correctness_feedback = correctness_to_feedback(correctness)
	//   var slope_sequences = get_slope_sequences(user_slopes) 
	  
	//   var describe_line = ""
	//   if (slope_sequences.length == 1) {
	// 	  describe_line = "The line you drew is generally " + slope_description_to_trend(user_slopes[0]) + "throughout."
	//   }
	//   else {
	// 	  var describe_line = slopes_to_descriptions(slope_sequences)
	//   }
	  
	//   var text_to_display = [correctness_feedback, describe_line, dataset.descriptor]
	  
	//   var descriptor_div = document.getElementById('dataDescriptor');
	//   descriptor_div.innerHTML = descriptor_div.innerHTML + dataset.descriptor;
	  
	//   var feedback_div = document.getElementById('textFeedback');
	//   feedback_div.innerHTML = feedback_div.innerHTML + "<br>" + correctness_feedback + " " + describe_line + "<br>" + dataset.trend_description;
	//   document.getElementById('feedbackDiv').style.display = "block"
  // }
  
  function slopes_to_descriptions(slopes_in) {
	  var text_out = "The line you drew "
	  var line_feedbacks = ["is ", "before ", "and then "]
	  var descriptors = ""
	  for (var i = 0; i < slopes_in.length; i++) {
		  var current = slope_description_to_trend(slopes_in[i])
		  if ((current == "flat ") && (i > 0)) {
			  current = "leveling off "
		  }
		  text_out = text_out + line_feedbacks[i] + current
	  }
	  return (text_out.substring(0, text_out.length - 1) + ".")
  }
  
  function slope_description_to_trend(description) {
	  switch (description) {
		  case "flat":
			description = 'flat ';
			break;
		  case "positive":
			description = 'increasing ';
			break;
		  case "negative":
			description = 'decreasing ';
			break;
	  }
	  return description;
  }
  
  function get_slope_sequences (slopes_in) {
	  var slope_order = [slopes_in[0]]
	  for (var i = 1; i < slopes_in.length; i++) {
		  if (slope_order.slice(-1)[0] != slopes_in[i]) {
			  slope_order.push(slopes_in[i]);
		  }
	  }
	  return slope_order
  }
  
  function correctness_to_feedback(correctness) {
	  var feedback_array = []
	  if (correctness >= 33) {
		  if (correctness >= 50) {
			  if (correctness > 90) {
				  feedback_array = line_feedbacks["0"]
			  }
			  else {
				  feedback_array = line_feedbacks["1"]
			  }
		  }
		  else {
			  feedback_array = line_feedbacks["2"]
		  }
	  }
	  else {
		  feedback_array = line_feedbacks["3"]
	  }
	  return _.sample(feedback_array)
  }

  function check_slope_correctness(slopes_in) {
	  var total_correct = 0
	  for (var i = 0; i < slopes_in.length; i++) {
		  var user_value = slopes_in[i]
		  var actual_value = dataset.expected_slopes[i]
		  if (user_value == actual_value) {
			  total_correct += 1
		  }
	  }
	  var percentage = total_correct / slopes_in.length * 100
	  return percentage
  }

  // function slope_by_inflections(data) {
	// var output = [];
	// var break_points = dataset.inflection_points;
	// var indices = get_break_indices(data, break_points);
	// var index = 0;
	// for (var i = 0; i < indices.length; i++) {
	// 	var end_index = indices[i];
	// 	output.push(calc_mean(calc_slope(data.slice(index, end_index))));
	// 	index = end_index;
	// }
	// output.push(calc_mean(calc_slope(data.slice(index))));
	// return output;
  // }

  // function get_break_indices(data, break_points) {
	//   var indices = [];
	//   var haystack = [];
  //   // Note: this likely could be haystack = _(data).map(0).value();
	//   for (var i = 0; i < data.length; i++) {
	// 	  haystack.push(data[i][0]);
	//   }

	//   for (var i = 0; i < break_points.length; i++) {
	// 	  indices.push(haystack.indexOf(find_closest(haystack, break_points[i])));
	//   }
	//   return indices;
  // }

  function calc_slope(data) {
	var output = [];
	for (var i = 0; i < data.length - 1; i++) {
		output.push(data[i + 1][1] - data[i][1]);
	}
	return output;
  }

  function calc_mean(data) {
	  var sum = 0;
	  for (var i = 0; i < data.length; i++) {
		  sum = sum + data[i];
	  }
	  return sum / (data.length);
  }

  // function check_slope() {
	//   var slope_signs = [];
	//   for (var i = 0; i < user_guess_slope.length; i++) {
	// 	  var current = user_guess_slope[i];
	// 	  var sign_user_slope = 0
	// 	  if (Math.abs(current) > dataset.flat_slope_magnitude) {
	// 		  sign_user_slope = current < 0 ? -1:1;
	// 	  }
	// 	  slope_signs.push(pos_or_neg_slope(sign_user_slope));
	//   }
	//   return slope_signs;
  // }

  // function pos_or_neg_slope (slope_in) {
	//   var description = '';
	//   switch (slope_in) {
	// 	  case 0:
	// 		description = 'flat';
	// 		break;
	// 	  case 1:
	// 		description = 'positive';
	// 		break;
	// 	  case -1:
	// 		description = 'negative';
	// 		break;
	//   }
	//   return description;
  // }

  return line_ev;
};
