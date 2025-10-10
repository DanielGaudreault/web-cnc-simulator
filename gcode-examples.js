// Update the loadGCodeExample function to handle templates
function loadGCodeExample(exampleName) {
    if (gcodeExamples[exampleName]) {
        document.getElementById('gcodeEditor').value = gcodeExamples[exampleName];
        if (simulator) {
            simulator.parseGCode(gcodeExamples[exampleName]);
        }
        showNotification(`Loaded example: ${exampleName}`);
    } else if (cncTemplates[exampleName]) {
        loadTemplate(exampleName);
    }
}
