# grafana-json-kapacitor-shim
A docker-based service that makes Kapacitor httpOut endpoints accessible to the Grafana

![example](https://github.com/CitiLogics/grafana-json-kapacitor-shim/blob/dev/srini/1/screenshot.PNG)


# how do I run this?

Once the task is defined in kapacitor and the endpoint is emitting JSON data configure these environment variables

```
KAPGRAF_SHIM_KAPACITOR_HOST=<server-ip>
KAPGRAF_SHIM_HTTP_NODE=<port>
```
by default your influx kapacitor port is 9092.

to start the server

```
npm install
node index.js
```
runs on port 3333
