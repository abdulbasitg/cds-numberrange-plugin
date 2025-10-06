const cds = require("@sap/cds/lib")
const { dbhelper } = require("./handler/dbhelper");
const { cdshelper } = require("./handler/cdshelper");
const CDS_NUMBERRANGE_PLUGIN = 'cds-numberrange-plugin';
const LOGLEVEL_INFO = 'info';

const logger = cds.log(CDS_NUMBERRANGE_PLUGIN,process.env.CDS_NUMBERRANGE_PLUGIN_LOGLEVEL || LOGLEVEL_INFO);

cds.on('served', async (services) => {
    logger.debug(`Initializing ${CDS_NUMBERRANGE_PLUGIN}...`);    
    // Check if cds-numberrange-plugin configuration is defined and has ranges
    if (!cds.env[CDS_NUMBERRANGE_PLUGIN] || !cds.env[CDS_NUMBERRANGE_PLUGIN].ranges || cds.env[CDS_NUMBERRANGE_PLUGIN].ranges.length === 0) {  
        logger.debug(`Configuration not found for ${CDS_NUMBERRANGE_PLUGIN} in package.json. Skipping plugin initialization.`);
        return;
    }    
    
    const cdsutil = new cdshelper();
    const ranges = cds.env[CDS_NUMBERRANGE_PLUGIN].ranges;

    //Check for multitenancy
    if (cds.env.requires.multitenancy) {  
        //Check if deployment service exists (mtxs could be served in either sidecar or embedded))
        if (cds.services["cds.xt.DeploymentService"]) {
            logger.debug(`Multitenant application detected - registering handlers.`);
            const { 'cds.xt.DeploymentService': ds } = cds.services;
            ds.after ('subscribe', (_,req) => { loadRanges() });
            ds.after ('upgrade', (_,req) => { loadRanges() });
        }
    } else {
        loadRanges();
    }    


    logger.debug('Iterate over all services and entities to register handlers for elements with range annotation...');
    let numberOfELements = 0;
    for (let service of cds.services) {
        if (service instanceof cds.ApplicationService) {
            for (const serviceEntity of service.entities) {
                let elementsToHandle = await cdsutil.getElementsToHandle(serviceEntity);
                numberOfELements += elementsToHandle.length;
                await cdsutil.addBeforeCreateHandler(service, serviceEntity, elementsToHandle, ranges);                                   
            }
        }
    }         
    logger.debug(`... all services and entities checked and handlers registered for ${numberOfELements} element(s) with range annotation`);  
    logger.debug(`... completed ${CDS_NUMBERRANGE_PLUGIN} initialization`);    
});

async function loadRanges() {
    if (cds.env.requires.multitenancy) {
        const t0 = cds.env.requires.multitenancy?.t0 ?? 't0';
        if (cds.context.tenant == t0) {
            return;
        };
        logger.info('Loading Ranges on new subscription or upgrade...');
    };

    const dbutil = new dbhelper();
    
    logger.debug(`Check if ranges are already created on database. If not, create it...`);
    const ranges = cds.env[CDS_NUMBERRANGE_PLUGIN].ranges;
    for (const element of ranges) {
        const checkRange = await dbutil.checkRange(element.name);
        if (!checkRange) {
            logger.debug(`Range ${element.name} doesn't exist on database. Creating...`);
            try {
                const rangeCreate = await dbutil.createRange(element.name, element.start || 1, element.increment || 1);
                logger.debug(`... range ${element.name} created: ${JSON.stringify(rangeCreate)}`);
            } catch (error) {
                logger.error(`... error creating range ${element.name}: ${error.message}`);
            }
        } else {
            logger.debug(`Range ${element.name} exists in database. No action needed.`);
        }        
    };
    logger.debug(`... all ranges checked and created if necessary`);
   
}