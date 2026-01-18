try {
    console.log('Loading AutomationProcessedEvent...');
    require('./src/modules/automation/models/AutomationProcessedEvent');
    console.log('✅ AutomationProcessedEvent loaded');

    console.log('Loading AutomationQueue...');
    require('./src/modules/automation/services/automationQueue');
    console.log('✅ AutomationQueue loaded');

    console.log('Loading AutomationEngine...');
    require('./src/modules/automation/services/automationEngine');
    console.log('✅ AutomationEngine loaded');

    console.log('Loading AutomationIntegration...');
    require('./src/modules/job-publisher/integrations/automationIntegration');
    console.log('✅ AutomationIntegration loaded');

} catch (error) {
    console.error('❌ FAILED TO LOAD MODULE:', error);
}
