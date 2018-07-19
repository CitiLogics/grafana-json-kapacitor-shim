# grafana-json-kapacitor-shim
A docker-based service that makes Kapacitor httpOut endpoints accessible to the Grafana

# how do I run this?

Once the task is defined in kapacitor and the endpoint is emitting JSON data configure these environment variables

```
kapacitor_server=<serverip>
kapacitor_port=<port>
```
by default your influx kapacitor port is 9092.

to start the server runs on port 3333

```
npm install
node index.js
```
