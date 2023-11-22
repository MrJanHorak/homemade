const addMaterials = () => {
  let container = document.getElementById('add-materials-container');

  let input = document.createElement('input');

  input.type = 'text';
  input.name = 'materialsNeeded';
  input.placeholder = 'Material Needed';
  input.id = 'addMaterialLink';
  input.size = '57';

  container.appendChild(document.createElement('br'));
  container.appendChild(input);
  container.appendChild(document.createElement('br'));
};

const addTools = () => {
  let container = document.getElementById('add-tool-container');

  let input = document.createElement('input');

  input.type = 'text';
  input.name = 'toolsNeeded';
  input.placeholder = 'additional tool needed';
  input.id = 'toolsNeeded';
  input.size = '57';

  container.appendChild(document.createElement('br'));
  container.appendChild(input);
  container.appendChild(document.createElement('br'));
};

const addLinks = () => {
  let container = document.getElementById('external-link-container');

  let input = document.createElement('input');

  input.type = 'text';
  input.name = 'externalLinks';
  input.placeholder = 'additiional link';
  input.id = 'addLink';
  input.size = '57';

  container.appendChild(document.createElement('br'));
  container.appendChild(input);
  container.appendChild(document.createElement('br'));
};

const addSteps = () => {
  let container = document.getElementById('buildInstructions');

  let textArea = document.createElement('textarea');

  textArea.name = 'buildInstructions';
  textArea.placeholder = 'Next Step';
  textArea.id = 'buildInstructions';
  textArea.rows = '17';
  textArea.cols = '53';
  textArea.wrap = 'soft';
  textArea.spellcheck = 'true';

  container.appendChild(document.createElement('br'));
  container.appendChild(textArea);
  container.appendChild(document.createElement('br'));
};
