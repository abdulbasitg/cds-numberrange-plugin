# Getting Started

This samples demonstrates the plugin in a sidecar configuration.

To run it locally, perform npm install first:

```
npm install
```

Then, open two terminal windows. In the first window, execute:

```
cds watch mtx/sidecar
```
This will launch the sidecar on port `4005`

In the second terminal window, execute:
```
cds watch --profile local-multitenancy
```

Use the `tests.http` to execute manual tests 
