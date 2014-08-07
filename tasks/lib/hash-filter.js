var _ = require('underscore');

var mapping = [
		'ad',
		'ga',
		'pop'
	],
	replaceList = '1234567890';

module.exports = function(str) {
	if (!str) {
		return str;
	}

	_.each(mapping, function(value) {
		str = str.replace(value, replaceList.slice(0, value.length));
	});

	return str;
}