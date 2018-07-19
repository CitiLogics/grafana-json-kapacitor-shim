var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var app = express();
var fetch = require("node-fetch");

app.use(bodyParser.json());

let server = ""
let port = ""


if(process.env.kapacitor_server){
  server = process.env.kapacitor_server
} else {
  console.log("Server (kapacitor_server) environment variable not found")
  process.exit(0)
}
if(process.env.kapacitor_port){
  port = process.env.kapacitor_port
}
 else {
  console.log("Port (kapacitor_port) environment variable not found")
  process.exit(0)
}


function setCORSHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "accept, content-type");
}

app.all('/', function(req, res) {
  setCORSHeaders(res);
  res.status(200).send('Kapcitor-JSON-Grafana-shim');
  res.end();
});


app.all('/search', function(req, res){
  /*
  This get request should retrun
  [taskname1:nodename1,
  taskname1:nodename2,
  ....]
   when selected will return the data as we need from /query
  */
  console.log( new Date() + " /:GET/search")
  setCORSHeaders(res);
  let result = [];
  fetch(`http://${server}:${port}/kapacitor/v1/tasks`)
  .then(response => response.json())
  .then(function(responseData) {

    //response data has a parent object { tasks : [{}, {}, {}]}
    _.each(responseData.tasks, (task) => {
      //each task has id attribute which is the task endpoint
      let taskEndPoint = task.id
      //the httpOut are found in script part of the responseObject -
      // since its a string the best way is to use regex methods to find httpOut nodes and get the enclosing values
      let script = task.script
      let re = /\|httpOut/g;
      let quote = /'([^']+)'/g; // we need to find quoted string within the httpOut node
      do {
        m = re.exec(script)
        if(m){
          console.log(m)
          let outNode = m.input.substring(m.index).match(quote)[0]
          outNode = outNode.replace(/["']/g, "")
          result.push(taskEndPoint + ":" + outNode)
        }
      } while (m);

    })
    res.json(result);
    res.end();
  })

});


app.all('/query', function(req, res){
  // This endpoint gets the data
  setCORSHeaders(res);
console.log( new Date() + " /:GET/query")
  var tsResult = [];
  let targets = req.body.targets
  _.each(targets, (targetObject) => {
    // each target will be of the format taskid : nodeid
    //split it by semi colon and then access the API with fetch
    let taskDetails = targetObject.target.split(':')
    fetch(`http://${server}:${port}/kapacitor/v1/tasks/${taskDetails[0]}/${taskDetails[1]}`)
    .then(response => response.json())
    .then((seriesData) => {
      _.each(seriesData.series, function(data) {
        let temp = {}
        temp['target'] = data.tags[0]
        _.map(data.values, (val) =>{
          //getting date, value but we need value, date
          let newtemp = val[1]
          val[1] = new Date(val[0]).getTime();
          val[0] = newtemp
        })
        temp['datapoints'] = data.values
        tsResult.push(temp)
      })
      res.json(tsResult);
      res.end();
    })
  })

});


app.listen(3333);

console.log("Server is listening to port 3333");
