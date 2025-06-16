# cds-numberrange-plugin

This is a plugin for [CAP](https://cap.cloud.sap/) framework to let you easily add database ranges into your applications. 

# Features

You can use this plugin to add autoincremented fields into your database fields. There are different options to format auto incrementation:

- Basic Configuration allows you configure integer fields starting from specific number and increment by configured number. 
- It is also possible to format the generated number with prefix, suffix characters and also pad the generated number with a character like 0 or any other characters. 

# Usage

Installing plugin with **npm install**

```
npm install cds-numberrange-plugin
```

In your package.json file, add the following path into the CDS node:

```json
    "cds-numberrange-plugin": {
      "ranges": [
        {
          "name": "<RANGE NAME>",
          "start": 1,
          "increment": 1,
          "createOnDraf": true,
          "additionalProperties": {
            "prefix": "P",
            "suffix": "S",
            "padCount": 10,
            "padValue": "0"
          }
        }
      ]
    }   
```

Then, you can annotate your fields in your database schema with special **@plugin.numberrange.rangeid** annotation. 
```
annotate <ENTITY> with {
  <FIELD> @plugin.numberrange.rangeid: '<RANGE NAME>';  
}
```
This annotation make this field automatically filled with range format configured in your package.json file. 

## Parameters:
- **name**: (Required) Range Name created in the database.
- **start**: (Required) Start index value for the range.
- **increment**: (Required) Increment value every time new value is created.
- **createOnDraft**: (Optional) true or false - Whether the next value is retrieved during draft creation or not.
- **additionalProperties**: (Optional) This part can be used to have additional features to create string based formatted values.
  - **prefix**: You and add prefix characters into the generated range number. 
  - **suffix**: You can add suffix characters into the generated range number. 
  - **padCount**: You can pad generated range number with a special character. 
  - **padValue**: This parameter specifies the character to be used for padding. 

## Samples

#### samples/sample-01-sqlite-in-memory

This samples demonstrates the plugin in sqlite-in-memory database with different configuration options.

#### samples/sample-02-sqlite-persistent

This samples demonstrates the plugin in sqlite persistent database with different configuration options.

#### samples/sample-03-hana

This samples demonstrates the plugin in SAP HANA database with different configuration options.

#### samples/sampl3-04-draft

This sample demonstrates the plugin with draft activated entities. You can configure your ranges to be created either in draft mode or after draft activation. Keep in mind that key fields must be configured in draft mode. 

## Remarks

- Make sure you don't modify manually the field values that has been configured to use the plugin. 

## TODO
- Test with PostgreSQL