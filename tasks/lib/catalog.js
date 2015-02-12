var fs = require('fs');
var path = require('path');
var catalogFile = '.build-catalog.json';
var catalogPath;

module.exports = {
	getCatalogPath: function (config) {
		catalogPath = catalogPath ||
		path.resolve(path.join(config.targetdir || '.', catalogFile));
		return catalogPath;
	},

	/**
	 * Loads catalog for current project. If catalog doesn’t exists,
	 * empty object is returned
	 * @return {Object}
	 */
	load: function(config) {
		var catalogPath = this.getCatalogPath(config);
		if (fs.existsSync(catalogPath)) {
			var content = fs.readFileSync(catalogPath);
			return JSON.parse(content);
		}

		return {};
	},

	/**
	 * Saves given content in catalog file
	 * @param {Object} content Catalog content
	 */
	save: function(content, config) {
		if (typeof content != 'string') {
			content = JSON.stringify(content, null, '\t');
		}

		fs.writeFileSync(this.getCatalogPath(config), content);
	}
};