var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var app = express();
var fetch = require("node-fetch");
const moment = require('moment-timezone');
app.use(bodyParser.json());

let server = ""
let port = ""


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
        let tempTag = ""
        // for(let [key, value] of Object.entries(data.tags)){
        //     tempTag = tempTag + key + " = " + value + "|"
        // }
        if(data.columns){
          //there is a columns object it can have more than one measure.
          _.each(data.columns, (columnName) => {
            if(columnName != "time") {
               temp['target'] = data.name + "." + columnName + JSON.stringify(data.tags)
               //store the index of the column so that we can grab that value
               let valueIndex = _.indexOf(data.columns, columnName)
               _.map(data.values, (val) =>{
                 //getting date, value but we need value, date
                 let dataValue = val[valueIndex]
                 val[1] = new Date(val[0]).getTime();
                 val[0] = dataValue
               })
               temp['datapoints'] = data.values
               tsResult.push(temp)
            }
          })
        }
      })

      if(req.headers.format && req.headers.format == 'datalyzer') {
        let datalyzerRes = []
        // check and exit if daterange header is not set
        let dateRange = req.headers.daterange
        let generator = req.headers.generator
        let today = new Date()
        // the daterange is a string witnh 120d / 60d / 30d so we need to remove the 'd' and parse it as int
        dateRange = dateRange.toString().replace( /d/g, '')
        dateRange = parseInt(dateRange)


        //here send the data in the right format
        _.each(tsResult, (obj) => {
          //each obj has target prop which has all the details for each datapoint generate one object
          let re = /\{.*\}/i;
          let match = obj.target.match(re);
          let tagData = JSON.parse(match[0])
          _.each(obj.datapoints, (values) => {
            //check if the date falls within the daterange
            let diffDays = parseInt((today - new Date(values[1])) / (1000 * 60 * 60 * 24))

            if(tagData.generator == generator && diffDays <= dateRange){
              let temp = {}
              temp['generator'] = tagData.generator
              temp['number'] = tagData.number
              temp['site'] = tagData.site
              temp['units'] = tagData.units
              temp['elapsed'] = values[0]
              temp['time'] = moment(new Date(values[1])).tz('America/New_York')
              temp['location'] = tagData.location? tagData.location : ''
              temp['method'] = tagData.method? tagData.method : ''
              datalyzerRes.push(temp)
            }
          })
        })
        res.json(datalyzerRes);
      } else {
        res.json(tsResult);
      }
      res.end();
    })
  })

});

app.all('/tag[\-]keys', function(req, res) {
  setCORSHeaders(res);
  res.json({"test" :"test"});
  res.end();
});

app.all('/tag[\-]values', function(req, res) {
  setCORSHeaders(res);
  console.log(req.url);
  console.log(req.body);

  res.json({"testval":"testval"})
  res.end();
});


app.listen(3333);

console.log("Server is listening to port 3333");
