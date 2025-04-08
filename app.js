document.addEventListener('DOMContentLoaded', () => {
  const viewer = new ThreeDViewer('viewer-container');
  const fileInput = document.getElementById('file-input');

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const parser = new McamParser(arrayBuffer);
      const result = parser.parse();

      if (result.geometry) {
        viewer.loadGeometry(result.geometry);
      }
      if (result.toolpaths) {
        viewer.renderToolpaths(result.toolpaths);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Failed to process MCAM file: ' + error.message);
    }
  });

  async function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
});
