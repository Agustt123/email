const fs = require('fs');
const path = require('path');

function renderTemplate(templateName, vars = {}) {
    const filePath = path.join(__dirname, '../templates', templateName);
    let html = fs.readFileSync(filePath, 'utf8');

    return html.replace(/{{(\w+)}}/g, (_, key) => vars[key] ?? '');
}

module.exports = { renderTemplate };