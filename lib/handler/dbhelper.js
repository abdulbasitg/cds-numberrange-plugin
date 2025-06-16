const cds = global.cds || require('@sap/cds');
const CDS_NUMBERRANGE_PLUGIN = 'cds-numberrange-plugin';
const LOGLEVEL_INFO = 'info';


const logger = cds.log(`${CDS_NUMBERRANGE_PLUGIN}-dbhelper`,process.env.CDS_NUMBERRANGE_PLUGIN_LOGLEVEL || LOGLEVEL_INFO);


class dbhelper {
    constructor() {
    }
    checkRange = async (rangeName) => {
        const { NumberRangePluginService } = cds.services;
        const { Ranges } = NumberRangePluginService.entities;
        const result = await SELECT.one.columns('RangeName').from(Ranges).where({ RangeName: rangeName });
        return (result && result.RangeName && result.RangeName === rangeName) ? true : false;
    }
    createRange = async (rangeName, start, increment) => {          
        const { NumberRangePluginService } = cds.services;
        const { Ranges } = NumberRangePluginService.entities;
        const result = await INSERT.into(Ranges).entries({
            RangeName: rangeName,
            StartValue: start,
            IncrementBy: increment,
            CurrentValue: start
        });        
        return result;
    }
    getNextValue = async (rangeName) => {
        const { NumberRangePluginService } = cds.services;
        const { Ranges } = NumberRangePluginService.entities;
        const nextValueResult = await SELECT.one.columns('CurrentValue','IncrementBy').from(Ranges).where({ RangeName: rangeName });
        const updateResult = await UPDATE(Ranges).where({ RangeName: rangeName }).set({
            CurrentValue: nextValueResult.CurrentValue + nextValueResult.IncrementBy            
        });
        if (updateResult.changes === 0) {
            throw new Error(`Failed to update range ${rangeName}.`);
        }        
        return nextValueResult.CurrentValue;   
    }
}

module.exports = { dbhelper }