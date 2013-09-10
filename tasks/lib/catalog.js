var fs = require('fs');
var catalogFile = '.build-catalog.json';

module.exports = {
	/**
	 * Loads catalog for current project. If catalog doesn’t exists,
	 * empty object is returned
	 * @return {Object}
	 */
	load: function() {
		if (fs.existsSync(catalogFile)) {
			var content = fs.readFileSync(catalogFile);
			return JSON.parse(content);
		}

		return {};
	},

	/**
	 * Saves given content in catalog file
	 * @param {Object} content Catalog content
	 */
	save: function(content) {
		if (typeof content != 'string') {
			content = JSON.stringify(content, null, '\t');
		}

		fs.writeFileSync(catalogFile, content);
	}
};