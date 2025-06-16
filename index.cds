using { cuid } from '@sap/cds/common';

context plugin.numberrange {
    entity Ranges : cuid {
        RangeName : String(50); 
        StartValue : Integer;
        IncrementBy : Integer;
        CurrentValue : Integer
    }
}

service NumberRangePluginService {
    entity Ranges as projection on plugin.numberrange.Ranges;
}
