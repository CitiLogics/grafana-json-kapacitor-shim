var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var app = express();
var fetch = require("node-fetch");
const moment = require('moment-timezone');
app.use(bodyParser.json());

let server = ""
let port = ""

// verify that the env variables are set
if(process.env.KAPGRAF_SHIM_KAPACITOR_HOST){
  server = process.env.KAPGRAF_SHIM_KAPACITOR_HOST
} else {
  console.log("Server (KAPGRAF_SHIM_KAPACITOR_HOST) environment variable not found")
  process.exit(0)
}
if(process.env.KAPGRAF_SHIM_KAPACITOR_PORT){
  port = process.env.KAPGRAF_SHIM_KAPACITOR_PORT
}
 else {
  console.log("Port (KAPGRAF_SHIM_KAPACITOR_PORT) environment variable not found")
  process.exit(0)
}


function setCORSHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "accept, content-type");
}

// dummy response to check if server is running
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
  */
  console.log( new Date() + " GET: /search")
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
          let outNode = m.input.substring(m.index).match(quote)[0]
          outNode = outNode.replace(/["']/g, "")
          result.push(taskEndPoint + ":" + outNode)
        }
      } while (m); // there can be more than one http out node in a script so we need to get all the matches and create a json

    })
    res.json(result);
    res.end();
  })

});


app.all('/query', function(req, res){
  // This endpoint gets the data for the requested task
  setCORSHeaders(res);
  console.log( new Date() + " GET: /query")
  var tsResult = [];
  let targets;
  let fromDate;
  let toDate;

  //the request body should have targets attribute set with taskname:nodename
  if(req.body.targets){
    targets = req.body.targets
  } else {
    console.log("Request body does not have a targets property")
    res.status(417).json({'error':'no targets specified'});
    return;
  }
  console.log(`target for req is: ${req.body.targets}`);

  //there should be a time range specified to select the points
  let rangeSpecified = false;
  if (req.body.range && req.body.range.from && req.body.range.to){
    rangeSpecified = true;
    fromDate = new Date(req.body.range.from); //utc time
    toDate = new Date(req.body.range.to); //utc time
  }

  _.each(targets, (targetObject) => {
    // each target will be of the format taskid : nodeid
    //split it by semi colon and then access the API with fetch
    let taskDetails = targetObject.target.split(':')
    console.log(`Accessing http://${server}:${port}/kapacitor/v1/tasks/${taskDetails[0]}/${taskDetails[1]}`)
    fetch(`http://${server}:${port}/kapacitor/v1/tasks/${taskDetails[0]}/${taskDetails[1]}`)
    .then(response => response.json())
    .then((seriesData) => {
      _.each(seriesData.series, function(data) {
        let temp = {}

        if(data.columns){
          //there is a columns object it can have more than one measure.
          _.each(data.columns, (columnName) => {
            if(columnName != "time") {
              let tagsList = '{';
              _.each(data.tags, (v,k,l) => {
                tagsList += `${k}: ${v},`;
              });
              // trim last comma:
              tagsList = tagsList.slice(0,-1);
              tagsList += '}'
              //get all the columns except time and create a series out of it
               temp['target'] = data.name + "." + columnName + ' ' + tagsList
               //store the index of the column so that we can grab that value
               let valueIndex = _.indexOf(data.columns, columnName)
               // if range was specified, then filter the Kapacitor results.
               if (rangeSpecified) {
                 data.values = _.reject(data.values, (val) => {
                   //verify if the date in the kapacitor result is within the requested time range
                   return (new Date(val[0]) < fromDate || new Date(val[0]) > toDate)
                 });
               }

               _.map(data.values, (val) =>{
                 //getting date, value but we need value, date
                 let dataValue = val[valueIndex]
                 let kapacitorOpDate = new Date(val[0]).getTime();
                 val[1] = kapacitorOpDate
                 val[0] = dataValue
               })
               temp['datapoints'] = data.values
               tsResult.push(temp)
            }
          })
        }
      })
      res.json(tsResult);
      res.end();
    })
  })

});

// tag-keys and values doesnt do anything !
// app.all('/tag[\-]keys', function(req, res) {
//   setCORSHeaders(res);
//   res.json({"test" :"test"});
//   res.end();
// });
//
// app.all('/tag[\-]values', function(req, res) {
//   setCORSHeaders(res);
//   console.log(req.url);
//   console.log(req.body);
//
//   res.json({"testval":"testval"})
//   res.end();
// });


app.listen(3333);

console.log("Server is listening to port 3333");
