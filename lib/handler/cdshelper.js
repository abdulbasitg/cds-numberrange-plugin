const cds = require("@sap/cds/lib");
const { dbhelper } = require("./dbhelper");
const CDS_NUMBERRANGE_PLUGIN = 'cds-numberrange-plugin';
const CDS_NUMBERRANGE_PLUGIN_ANNOTATION = '@plugin.numberrange.rangeid';
const LOGLEVEL_INFO = 'info';

const logger = cds.log(`${CDS_NUMBERRANGE_PLUGIN}-cdshelper`,process.env.CDS_NUMBERRANGE_PLUGIN_LOGLEVEL || LOGLEVEL_INFO);

class cdshelper {
    constructor() {
    }
    getElementsToHandle = async (serviceEntity) => {
        let elementsToHandle = [];
        const ranges = cds.env[CDS_NUMBERRANGE_PLUGIN].ranges;
        for (const element of serviceEntity.elements) {
            const range = element[CDS_NUMBERRANGE_PLUGIN_ANNOTATION];
            if (!range) {
                // no range is defined for this element, skipping
                continue; 
            }           
            
            // Check if the range is defined in the cds-numberrange-plugin configuration
            const rangeDefinition = ranges.find(seq => seq.name === range);

            if (range && ! rangeDefinition) {
                logger.error(`Range ${range} defined in entity ${serviceEntity} and element ${element} is not configured in cds-numberange-plugin. Please check your configuration.`);
                continue;
            }            
            
            // Check if key field is defined, parent entity supports drafts but not configured to create on draft.
            if (element.key && element.parent.drafts && !rangeDefinition.createOnDraft) {
                logger.error(`Element ${element.name} in entity ${serviceEntity} is a key field but not configured to create on draft. Please check your configuration.`);
                continue;
            }


            if (element.type === 'cds.String' && rangeDefinition.additionalProperties) {
                // Check if configuration is valid against the element definition
                let totalLength = rangeDefinition.additionalProperties.padCount;
                if (rangeDefinition.additionalProperties.prefix) {
                    totalLength += rangeDefinition.additionalProperties.prefix.length;
                }
                if (rangeDefinition.additionalProperties.suffix) {
                    totalLength += rangeDefinition.additionalProperties.suffix.length;
                }
                if (totalLength > element.length) {
                    logger.error(`Total length of range ${range} exceeds the defined length for element ${element} in entity ${serviceEntity}. Please check your configuration.`);
                    continue;
                }
            }
            logger.debug(`Adding handler for range ${range} for entity ${serviceEntity} and element ${element}`);    
            elementsToHandle.push({ 
                element: element, 
                range: range,
                type: element.type,
                length: element.length
            });           
        }  
        return elementsToHandle;        
    }
    getNextValue = async (rangesConfiguration,elementToHandle) => {
        const dbutil = new dbhelper();
        let nextValue = await dbutil.getNextValue(elementToHandle.range);                
        if (elementToHandle.type === 'cds.String') {
            let finalValue = "";
            const rangeConfiguration = rangesConfiguration.find(seq => seq.name === elementToHandle.range);                    
            if (rangeConfiguration && rangeConfiguration.additionalProperties) {
                if (rangeConfiguration.additionalProperties.padCount && 
                    rangeConfiguration.additionalProperties.padCount>0 &&
                    rangeConfiguration.additionalProperties.padValue &&
                    rangeConfiguration.additionalProperties.padValue.length === 1) {
                    finalValue = nextValue.toString().padStart(rangeConfiguration.additionalProperties.padCount, rangeConfiguration.additionalProperties.padValue);
                }
                if (rangeConfiguration.additionalProperties.prefix) {
                    finalValue = rangeConfiguration.additionalProperties.prefix + finalValue;
                }
                if (rangeConfiguration.additionalProperties.suffix) {
                    finalValue = finalValue + rangeConfiguration.additionalProperties.suffix;
                }                                
                nextValue = finalValue;  
            }                            
        }    
        return nextValue;       
    }
    addBeforeCreateHandler = async (service, serviceEntity, elementsToHandle, rangesConfiguration) => {                
        for (const elementToHandle of elementsToHandle) {                    
            const rangeConfiguration = rangesConfiguration.find(seq => seq.name === elementToHandle.range); 
            if (rangeConfiguration.createOnDraft && serviceEntity.drafts) {
                service.before('CREATE', serviceEntity.drafts, async (context) => {
                    logger.debug(`DRAFT: Field ${elementToHandle.element.name} value before plugin processing: ${context.data[elementToHandle.element.name]}`);                
                    const nextValue = await this.getNextValue(rangesConfiguration,elementToHandle);
                    context.data[elementToHandle.element.name] = nextValue;
                    logger.debug(`DRAFT: Field ${elementToHandle.element.name} value after plugin processing: ${context.data[elementToHandle.element.name]}`);                                                                                        
                });    
                service.before('CREATE', serviceEntity, async (context) => {
                    logger.debug(`Check if draft is bypassed for ${elementToHandle.element.name}`);
                    if (!context.data[elementToHandle.element.name]) {
                        const nextValue = await this.getNextValue(rangesConfiguration,elementToHandle);
                        context.data[elementToHandle.element.name] = nextValue;    
                        logger.debug(`The value for ${elementToHandle.element.name} is not set on draft, setting it to ${nextValue}`);
                    }                                    
                });    
            } else {
                service.before('CREATE', serviceEntity, async (context) => {
                    logger.debug(`Field ${elementToHandle.element.name} value before plugin processing: ${context.data[elementToHandle.element.name]}`);                
                    const nextValue = await this.getNextValue(rangesConfiguration,elementToHandle);
                    context.data[elementToHandle.element.name] = nextValue;
                    logger.debug(`Field ${elementToHandle.element.name} value after plugin processing: ${context.data[elementToHandle.element.name]}`);                                                                                        
                });    
            }
        }        
    }
}

module.exports = { cdshelper }