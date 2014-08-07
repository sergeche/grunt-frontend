var replaceList = '1234567890';

module.exports = function(str) {
	if (!str) {
		return str;
	}

	return ('' + str).replace(/ad|ga|pop/gi, function(match) {
		return replaceList.slice(0, match.length);
	});
}