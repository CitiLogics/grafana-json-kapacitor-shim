# grafana-json-kapacitor-shim
A docker-based service that makes Kapacitor httpOut endpoints accessible to Grafana

![example](https://github.com/CitiLogics/grafana-json-kapacitor-shim/raw/master/screenshot.PNG)


# Description

This is a simple node-based service that translates Kapacitor httpOut data into a format readable by Grafana's Simple JSON datasource. Grafana will recieve any and all data in you specified httOut node, with groupings and tags intact.

# how do I run this?

Once you have tasks defined in kapacitor and the endpoints are emitting JSON data...

In Docker:

```
docker run -e KAPGRAF_SHIM_KAPACITOR_HOST=<kapacitor_host> -e KAPGRAF_SHIM_KAPACITOR_PORT=<port> -p 3333:3333 citilogics/grafana-json-kapacitor-shim
```

Outside of Docker:

Configure these environment variables

```
KAPGRAF_SHIM_KAPACITOR_HOST=<kapacitor_host>
KAPGRAF_SHIM_KAPACITOR_PORT=<port>
```
by default your influx kapacitor port is 9092.

to start the server

```
npm install
node index.js
```
runs on port 3333
